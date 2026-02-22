use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::{AppError, AppErrorKind, AppResult};
use crate::fs_query::clear_gdrive_read_cache_impl;
use crate::gdrive_auth::gdrive_auth_report_write_conflict_impl;
use crate::types::{ResourceRef, StorageProvider};

const GDRIVE_EDIT_WORK_DIR_NAME: &str = "reflexfiles-gdrive-edit-work";
const GDRIVE_EDIT_WORK_MAX_AGE_SECS: u64 = 3 * 24 * 60 * 60;
const GDRIVE_EDIT_WORK_MAX_FILES: usize = 200;
const GDRIVE_EDIT_WORK_MAX_TOTAL_BYTES: u64 = 1024 * 1024 * 1024;
const GDRIVE_EDIT_META_SUFFIX: &str = ".meta.json";
const GDRIVE_EDIT_META_SCHEMA_VERSION: u32 = 1;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GdriveRevisionSnapshot {
    pub resource_id: String,
    pub file_id: String,
    pub modified: String,
    pub size: u64,
    pub md5_checksum: Option<String>,
    pub version: Option<String>,
    pub local_sha256: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GdriveEditWorkcopy {
    pub local_path: String,
    pub file_name: String,
    pub revision: GdriveRevisionSnapshot,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GdriveApplyEditResult {
    pub uploaded: bool,
    pub unchanged: bool,
    pub conflict: bool,
    pub revision: GdriveRevisionSnapshot,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GdriveEditWorkcopyState {
    pub resource_id: String,
    pub exists: bool,
    pub dirty: bool,
    pub file_name: String,
    pub local_path: String,
    pub revision: Option<GdriveRevisionSnapshot>,
    pub updated_at_ms: Option<u64>,
    pub size_bytes: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GdriveEditWorkcopyCleanupResult {
    pub removed_files: u64,
    pub removed_bytes: u64,
}

#[derive(Clone, Debug)]
struct CacheEntryMeta {
    path: std::path::PathBuf,
    modified: SystemTime,
    size: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GdriveEditWorkcopyMeta {
    schema_version: u32,
    resource_id: String,
    file_name: String,
    local_path: String,
    revision: GdriveRevisionSnapshot,
    created_at_ms: u64,
    updated_at_ms: u64,
}

fn ensure_gdrive_ref(resource_ref: &ResourceRef) -> AppResult<()> {
    if resource_ref.provider != StorageProvider::Gdrive {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "provider mismatch for gdrive resource ref",
        ));
    }
    if resource_ref.resource_id.trim().is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "gdrive resource id is empty",
        ));
    }
    Ok(())
}

fn sanitize_file_name(raw: &str) -> String {
    let mut out = String::new();
    for ch in raw.trim().chars() {
        let invalid = matches!(ch, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')
            || ch.is_control();
        if invalid {
            out.push('_');
            continue;
        }
        out.push(ch);
    }
    let trimmed = out.trim_matches([' ', '.']).trim();
    if trimmed.is_empty() {
        "gdrive_file".to_string()
    } else {
        trimmed.to_string()
    }
}

fn now_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn gdrive_edit_work_dir() -> PathBuf {
    let mut dir = std::env::temp_dir();
    dir.push(GDRIVE_EDIT_WORK_DIR_NAME);
    dir
}

fn cache_key_for_snapshot(snapshot: &GdriveRevisionSnapshot) -> String {
    let mut hasher = DefaultHasher::new();
    snapshot.resource_id.hash(&mut hasher);
    snapshot.modified.hash(&mut hasher);
    snapshot.size.hash(&mut hasher);
    snapshot.file_id.hash(&mut hasher);
    normalize_optional(&snapshot.version).hash(&mut hasher);
    normalize_optional(&snapshot.md5_checksum).hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn cache_key_from_file_name(name: &str) -> Option<String> {
    if let Some(key) = name.strip_suffix(GDRIVE_EDIT_META_SUFFIX) {
        if key.len() == 16 && key.chars().all(|ch| ch.is_ascii_hexdigit()) {
            return Some(key.to_string());
        }
    }
    let (key, _) = name.split_once('_')?;
    if key.len() == 16 && key.chars().all(|ch| ch.is_ascii_hexdigit()) {
        Some(key.to_string())
    } else {
        None
    }
}

fn meta_path_for_cache_key(dir: &Path, cache_key: &str) -> PathBuf {
    dir.join(format!("{cache_key}{GDRIVE_EDIT_META_SUFFIX}"))
}

fn read_meta_file(path: &Path) -> Option<GdriveEditWorkcopyMeta> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str::<GdriveEditWorkcopyMeta>(&text).ok()
}

fn write_meta_file(path: &Path, meta: &GdriveEditWorkcopyMeta) -> AppResult<()> {
    let payload = serde_json::to_vec_pretty(meta)
        .map_err(|err| AppError::with_kind(AppErrorKind::Io, format!("serialize meta failed: {err}")))?;
    let mut tmp_path = path.to_path_buf();
    tmp_path.set_extension(format!(
        "{}.{}.tmp",
        std::process::id(),
        now_unix_ms()
    ));
    fs::write(&tmp_path, payload)?;
    if fs::rename(&tmp_path, path).is_err() {
        let _ = fs::remove_file(&tmp_path);
        fs::write(path, serde_json::to_vec_pretty(meta).map_err(|err| {
            AppError::with_kind(AppErrorKind::Io, format!("serialize meta failed: {err}"))
        })?)?;
    }
    Ok(())
}

fn collect_latest_meta_by_resource(dir: &Path) -> HashMap<String, (PathBuf, GdriveEditWorkcopyMeta)> {
    let mut map: HashMap<String, (PathBuf, GdriveEditWorkcopyMeta)> = HashMap::new();
    let Ok(iter) = fs::read_dir(dir) else {
        return map;
    };
    for item in iter.flatten() {
        let path = item.path();
        let Ok(meta) = item.metadata() else {
            continue;
        };
        if !meta.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|v| v.to_str()) else {
            continue;
        };
        if !name.ends_with(GDRIVE_EDIT_META_SUFFIX) {
            continue;
        }
        let Some(parsed) = read_meta_file(&path) else {
            continue;
        };
        if parsed.resource_id.trim().is_empty() {
            continue;
        }
        let replace = match map.get(parsed.resource_id.trim()) {
            None => true,
            Some((_, existing)) => {
                parsed.updated_at_ms > existing.updated_at_ms
                    || (parsed.updated_at_ms == existing.updated_at_ms
                        && parsed.created_at_ms > existing.created_at_ms)
            }
        };
        if replace {
            map.insert(parsed.resource_id.trim().to_string(), (path, parsed));
        }
    }
    map
}

fn load_state_from_meta(resource_id: &str, meta: &GdriveEditWorkcopyMeta) -> GdriveEditWorkcopyState {
    let local_path = meta.local_path.trim().to_string();
    let local_file = PathBuf::from(&local_path);
    let mut exists = false;
    let mut dirty = false;
    let mut size_bytes = 0u64;
    if local_file.is_file() {
        exists = true;
        if let Ok(file_meta) = fs::metadata(&local_file) {
            size_bytes = file_meta.len();
        }
        if let Ok(bytes) = fs::read(&local_file) {
            let current_sha = sha256_hex(&bytes);
            if !meta.revision.local_sha256.trim().is_empty() {
                dirty = !meta
                    .revision
                    .local_sha256
                    .trim()
                    .eq_ignore_ascii_case(current_sha.trim());
            }
        } else {
            dirty = true;
        }
    }
    GdriveEditWorkcopyState {
        resource_id: resource_id.to_string(),
        exists,
        dirty,
        file_name: meta.file_name.clone(),
        local_path,
        revision: Some(meta.revision.clone()),
        updated_at_ms: Some(meta.updated_at_ms),
        size_bytes,
    }
}

fn empty_state(resource_id: &str) -> GdriveEditWorkcopyState {
    GdriveEditWorkcopyState {
        resource_id: resource_id.to_string(),
        exists: false,
        dirty: false,
        file_name: String::new(),
        local_path: String::new(),
        revision: None,
        updated_at_ms: None,
        size_bytes: 0,
    }
}

fn upsert_meta_for_resource(
    dir: &Path,
    resource_id: &str,
    file_name: &str,
    local_path: &str,
    revision: &GdriveRevisionSnapshot,
) -> AppResult<()> {
    let latest = collect_latest_meta_by_resource(dir);
    let existing = latest.get(resource_id);
    let created_at_ms = existing
        .map(|(_, meta)| meta.created_at_ms)
        .unwrap_or_else(now_unix_ms);
    let target_path = existing
        .map(|(path, _)| path.clone())
        .unwrap_or_else(|| meta_path_for_cache_key(dir, &cache_key_for_snapshot(revision)));
    let payload = GdriveEditWorkcopyMeta {
        schema_version: GDRIVE_EDIT_META_SCHEMA_VERSION,
        resource_id: resource_id.to_string(),
        file_name: file_name.to_string(),
        local_path: local_path.to_string(),
        revision: revision.clone(),
        created_at_ms,
        updated_at_ms: now_unix_ms(),
    };
    write_meta_file(&target_path, &payload)
}

fn cleanup_cache_dir_with_limits(
    dir: &Path,
    max_age_secs: u64,
    max_files: usize,
    max_total_bytes: u64,
) {
    let now = SystemTime::now();
    let mut entries: Vec<CacheEntryMeta> = Vec::new();
    let Ok(iter) = fs::read_dir(dir) else {
        return;
    };
    let mut kept_data_keys = std::collections::HashSet::new();
    for item in iter.flatten() {
        let path = item.path();
        let Ok(meta) = item.metadata() else {
            continue;
        };
        if !meta.is_file() {
            continue;
        }
        let modified = meta.modified().unwrap_or(UNIX_EPOCH);
        if now
            .duration_since(modified)
            .map(|d| d.as_secs() > max_age_secs)
            .unwrap_or(false)
        {
            let _ = fs::remove_file(&path);
            continue;
        }
        let file_name = path.file_name().and_then(|v| v.to_str()).unwrap_or_default();
        if file_name.ends_with(GDRIVE_EDIT_META_SUFFIX) {
            continue;
        }
        if let Some(key) = cache_key_from_file_name(file_name) {
            kept_data_keys.insert(key);
        }
        entries.push(CacheEntryMeta {
            path,
            modified,
            size: meta.len(),
        });
    }
    entries.sort_by_key(|entry| std::cmp::Reverse(entry.modified));
    let mut total_size = 0u64;
    for (idx, entry) in entries.into_iter().enumerate() {
        let over_count = idx >= max_files;
        let over_size = total_size.saturating_add(entry.size) > max_total_bytes;
        if over_count || over_size {
            if let Some(name) = entry.path.file_name().and_then(|v| v.to_str()) {
                if let Some(key) = cache_key_from_file_name(name) {
                    let meta_path = meta_path_for_cache_key(dir, &key);
                    let _ = fs::remove_file(meta_path);
                    kept_data_keys.remove(&key);
                }
            }
            let _ = fs::remove_file(&entry.path);
            continue;
        }
        total_size = total_size.saturating_add(entry.size);
    }

    let Ok(iter) = fs::read_dir(dir) else {
        return;
    };
    for item in iter.flatten() {
        let path = item.path();
        let Some(name) = path.file_name().and_then(|v| v.to_str()) else {
            continue;
        };
        if !name.ends_with(GDRIVE_EDIT_META_SUFFIX) {
            continue;
        }
        let Some(key) = cache_key_from_file_name(name) else {
            continue;
        };
        if !kept_data_keys.contains(&key) {
            let _ = fs::remove_file(path);
        }
    }
}

fn normalize_optional(value: &Option<String>) -> String {
    value
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase()
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    let mut out = String::with_capacity(digest.len() * 2);
    for b in digest {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

fn snapshot_from_revision_info(
    resource_id: &str,
    revision: &crate::gdrive_real::GdriveRevisionInfo,
    local_sha256: String,
) -> GdriveRevisionSnapshot {
    GdriveRevisionSnapshot {
        resource_id: resource_id.to_string(),
        file_id: revision.file_id.clone(),
        modified: revision.modified.clone(),
        size: revision.size,
        md5_checksum: revision.md5_checksum.clone(),
        version: revision.version.clone(),
        local_sha256,
    }
}

#[cfg(not(feature = "gdrive-readonly-stub"))]
fn revision_has_conflict(
    base: &GdriveRevisionSnapshot,
    current: &crate::gdrive_real::GdriveRevisionInfo,
) -> bool {
    if base.modified.trim() != current.modified.trim() {
        return true;
    }
    if base.size != current.size {
        return true;
    }
    if normalize_optional(&base.version) != normalize_optional(&current.version) {
        return true;
    }
    if normalize_optional(&base.md5_checksum) != normalize_optional(&current.md5_checksum) {
        return true;
    }
    false
}

#[cfg(not(feature = "gdrive-readonly-stub"))]
pub(crate) fn gdrive_prepare_edit_workcopy_impl(resource_ref: ResourceRef) -> AppResult<GdriveEditWorkcopy> {
    use crate::gdrive_real::{
        gdrive_download_file_bytes_for_ref_impl, gdrive_entry_info_for_ref_impl,
        gdrive_revision_for_ref_impl,
    };

    ensure_gdrive_ref(&resource_ref)?;
    let entry = gdrive_entry_info_for_ref_impl(&resource_ref)?;
    if entry.is_dir {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("gdrive resource is a directory: {}", resource_ref.resource_id),
        ));
    }
    let revision = gdrive_revision_for_ref_impl(&resource_ref)?;
    let bytes = gdrive_download_file_bytes_for_ref_impl(&resource_ref)?;
    let local_sha256 = sha256_hex(&bytes);

    let cache_dir = gdrive_edit_work_dir();
    fs::create_dir_all(&cache_dir)?;
    cleanup_cache_dir_with_limits(
        &cache_dir,
        GDRIVE_EDIT_WORK_MAX_AGE_SECS,
        GDRIVE_EDIT_WORK_MAX_FILES,
        GDRIVE_EDIT_WORK_MAX_TOTAL_BYTES,
    );

    let file_name = sanitize_file_name(&entry.name);
    let snapshot = snapshot_from_revision_info(&resource_ref.resource_id, &revision, local_sha256);
    let cache_key = cache_key_for_snapshot(&snapshot);
    let mut out_path = cache_dir.clone();
    out_path.push(format!("{cache_key}_{file_name}"));
    if !out_path.exists() {
        let mut tmp_path = cache_dir.clone();
        tmp_path.push(format!(
            "{cache_key}.{}.{}.tmp",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| AppError::msg(e.to_string()))?
                .as_nanos()
        ));
        fs::write(&tmp_path, bytes)?;
        match fs::rename(&tmp_path, &out_path) {
            Ok(_) => {}
            Err(_) => {
                let _ = fs::remove_file(&tmp_path);
            }
        }
    }
    if !out_path.exists() {
        return Err(AppError::with_kind(
            AppErrorKind::Io,
            "failed to persist gdrive edit workcopy",
        ));
    }
    let local_path = out_path.to_string_lossy().to_string();
    upsert_meta_for_resource(
        &cache_dir,
        resource_ref.resource_id.trim(),
        entry.name.trim(),
        local_path.as_str(),
        &snapshot,
    )?;

    Ok(GdriveEditWorkcopy {
        local_path: out_path.to_string_lossy().to_string(),
        file_name: entry.name,
        revision: snapshot,
    })
}

#[cfg(feature = "gdrive-readonly-stub")]
pub(crate) fn gdrive_prepare_edit_workcopy_impl(_resource_ref: ResourceRef) -> AppResult<GdriveEditWorkcopy> {
    Err(AppError::with_kind(
        AppErrorKind::Permission,
        "gdrive edit workcopy is unavailable in stub mode",
    ))
}

#[cfg(not(feature = "gdrive-readonly-stub"))]
pub(crate) fn gdrive_check_edit_conflict_impl(
    resource_ref: ResourceRef,
    base_revision: GdriveRevisionSnapshot,
) -> AppResult<bool> {
    use crate::gdrive_real::gdrive_revision_for_ref_impl;

    ensure_gdrive_ref(&resource_ref)?;
    if base_revision.resource_id.trim() != resource_ref.resource_id.trim() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "resource_id mismatch between target and base revision",
        ));
    }
    let current = gdrive_revision_for_ref_impl(&resource_ref)?;
    Ok(revision_has_conflict(&base_revision, &current))
}

#[cfg(feature = "gdrive-readonly-stub")]
pub(crate) fn gdrive_check_edit_conflict_impl(
    _resource_ref: ResourceRef,
    _base_revision: GdriveRevisionSnapshot,
) -> AppResult<bool> {
    Err(AppError::with_kind(
        AppErrorKind::Permission,
        "gdrive conflict check is unavailable in stub mode",
    ))
}

#[cfg(not(feature = "gdrive-readonly-stub"))]
pub(crate) fn gdrive_apply_edit_workcopy_impl(
    resource_ref: ResourceRef,
    local_path: String,
    base_revision: GdriveRevisionSnapshot,
) -> AppResult<GdriveApplyEditResult> {
    use crate::gdrive_real::{gdrive_revision_for_ref_impl, gdrive_upload_file_from_path_for_ref_impl};

    ensure_gdrive_ref(&resource_ref)?;
    if base_revision.resource_id.trim() != resource_ref.resource_id.trim() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "resource_id mismatch between target and base revision",
        ));
    }
    let local_path = local_path.trim();
    if local_path.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "local_path is empty",
        ));
    }
    let local_file = std::path::PathBuf::from(local_path);
    if !local_file.exists() {
        return Err(AppError::with_kind(
            AppErrorKind::NotFound,
            format!("local workcopy not found: {}", local_file.display()),
        ));
    }
    if !local_file.is_file() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("local workcopy is not a file: {}", local_file.display()),
        ));
    }
    let bytes = fs::read(&local_file)?;
    let local_sha256 = sha256_hex(&bytes);
    if !base_revision.local_sha256.trim().is_empty()
        && base_revision.local_sha256.trim().eq_ignore_ascii_case(&local_sha256)
    {
        let cache_dir = gdrive_edit_work_dir();
        if fs::create_dir_all(&cache_dir).is_ok() {
            let file_name = local_file
                .file_name()
                .and_then(|v| v.to_str())
                .unwrap_or("file");
            let _ = upsert_meta_for_resource(
                &cache_dir,
                resource_ref.resource_id.trim(),
                file_name,
                local_file.to_string_lossy().as_ref(),
                &base_revision,
            );
        }
        return Ok(GdriveApplyEditResult {
            uploaded: false,
            unchanged: true,
            conflict: false,
            revision: base_revision,
        });
    }

    let current = gdrive_revision_for_ref_impl(&resource_ref)?;
    if revision_has_conflict(&base_revision, &current) {
        gdrive_auth_report_write_conflict_impl();
        return Ok(GdriveApplyEditResult {
            uploaded: false,
            unchanged: false,
            conflict: true,
            revision: snapshot_from_revision_info(&resource_ref.resource_id, &current, local_sha256),
        });
    }

    let uploaded = gdrive_upload_file_from_path_for_ref_impl(&resource_ref, &local_file)?;
    let _ = clear_gdrive_read_cache_impl();
    let next_revision = snapshot_from_revision_info(&resource_ref.resource_id, &uploaded, local_sha256);
    let cache_dir = gdrive_edit_work_dir();
    if fs::create_dir_all(&cache_dir).is_ok() {
        let file_name = local_file
            .file_name()
            .and_then(|v| v.to_str())
            .unwrap_or("file");
        let _ = upsert_meta_for_resource(
            &cache_dir,
            resource_ref.resource_id.trim(),
            file_name,
            local_file.to_string_lossy().as_ref(),
            &next_revision,
        );
    }
    Ok(GdriveApplyEditResult {
        uploaded: true,
        unchanged: false,
        conflict: false,
        revision: next_revision,
    })
}

#[cfg(feature = "gdrive-readonly-stub")]
pub(crate) fn gdrive_apply_edit_workcopy_impl(
    _resource_ref: ResourceRef,
    _local_path: String,
    _base_revision: GdriveRevisionSnapshot,
) -> AppResult<GdriveApplyEditResult> {
    Err(AppError::with_kind(
        AppErrorKind::Permission,
        "gdrive apply edit workcopy is unavailable in stub mode",
    ))
}

pub(crate) fn gdrive_get_edit_workcopy_state_impl(
    resource_ref: ResourceRef,
) -> AppResult<GdriveEditWorkcopyState> {
    ensure_gdrive_ref(&resource_ref)?;
    let resource_id = resource_ref.resource_id.trim().to_string();
    let cache_dir = gdrive_edit_work_dir();
    if !cache_dir.exists() {
        return Ok(empty_state(&resource_id));
    }
    let latest = collect_latest_meta_by_resource(&cache_dir);
    if let Some((_, meta)) = latest.get(&resource_id) {
        return Ok(load_state_from_meta(&resource_id, meta));
    }
    Ok(empty_state(&resource_id))
}

pub(crate) fn gdrive_get_edit_workcopy_states_impl(
    resource_refs: Vec<ResourceRef>,
) -> AppResult<Vec<GdriveEditWorkcopyState>> {
    let cache_dir = gdrive_edit_work_dir();
    let latest = if cache_dir.exists() {
        collect_latest_meta_by_resource(&cache_dir)
    } else {
        HashMap::new()
    };
    let mut out = Vec::with_capacity(resource_refs.len());
    for resource_ref in resource_refs {
        ensure_gdrive_ref(&resource_ref)?;
        let resource_id = resource_ref.resource_id.trim().to_string();
        if let Some((_, meta)) = latest.get(&resource_id) {
            out.push(load_state_from_meta(&resource_id, meta));
        } else {
            out.push(empty_state(&resource_id));
        }
    }
    Ok(out)
}

pub(crate) fn gdrive_list_edit_workcopies_impl() -> AppResult<Vec<GdriveEditWorkcopyState>> {
    let cache_dir = gdrive_edit_work_dir();
    if !cache_dir.exists() {
        return Ok(Vec::new());
    }
    let latest = collect_latest_meta_by_resource(&cache_dir);
    let mut states = latest
        .iter()
        .map(|(resource_id, (_, meta))| load_state_from_meta(resource_id, meta))
        .collect::<Vec<_>>();
    states.sort_by(|a, b| {
        b.updated_at_ms
            .unwrap_or(0)
            .cmp(&a.updated_at_ms.unwrap_or(0))
    });
    Ok(states)
}

pub(crate) fn gdrive_delete_edit_workcopy_impl(resource_ref: ResourceRef) -> AppResult<bool> {
    ensure_gdrive_ref(&resource_ref)?;
    let resource_id = resource_ref.resource_id.trim().to_string();
    let cache_dir = gdrive_edit_work_dir();
    if !cache_dir.exists() {
        return Ok(false);
    }
    let latest = collect_latest_meta_by_resource(&cache_dir);
    let Some((meta_path, meta)) = latest.get(&resource_id) else {
        return Ok(false);
    };
    let mut removed = false;
    let local_path = PathBuf::from(meta.local_path.trim());
    if local_path.is_file() && fs::remove_file(&local_path).is_ok() {
        removed = true;
    }
    if fs::remove_file(meta_path).is_ok() {
        removed = true;
    }
    Ok(removed)
}

pub(crate) fn gdrive_cleanup_edit_workcopies_impl(
    max_age_days: Option<u32>,
) -> AppResult<GdriveEditWorkcopyCleanupResult> {
    let mut removed_files = 0u64;
    let mut removed_bytes = 0u64;
    let cache_dir = gdrive_edit_work_dir();
    if !cache_dir.exists() {
        return Ok(GdriveEditWorkcopyCleanupResult {
            removed_files,
            removed_bytes,
        });
    }

    let keep_days = max_age_days.unwrap_or(3).clamp(1, 365);
    let max_age_secs = u64::from(keep_days) * 24 * 60 * 60;
    let now = SystemTime::now();

    if let Ok(iter) = fs::read_dir(&cache_dir) {
        for item in iter.flatten() {
            let path = item.path();
            let Ok(meta) = item.metadata() else {
                continue;
            };
            if !meta.is_file() {
                continue;
            }
            let modified = meta.modified().unwrap_or(UNIX_EPOCH);
            let is_old = now
                .duration_since(modified)
                .map(|d| d.as_secs() > max_age_secs)
                .unwrap_or(false);
            if !is_old {
                continue;
            }
            let len = meta.len();
            if fs::remove_file(path).is_ok() {
                removed_files = removed_files.saturating_add(1);
                removed_bytes = removed_bytes.saturating_add(len);
            }
        }
    }

    cleanup_cache_dir_with_limits(
        &cache_dir,
        max_age_secs,
        GDRIVE_EDIT_WORK_MAX_FILES,
        GDRIVE_EDIT_WORK_MAX_TOTAL_BYTES,
    );
    Ok(GdriveEditWorkcopyCleanupResult {
        removed_files,
        removed_bytes,
    })
}

#[cfg(test)]
mod tests {
    use super::sanitize_file_name;

    #[test]
    fn sanitize_file_name_replaces_invalid_chars() {
        let value = sanitize_file_name("a<b>:c?.txt");
        assert_eq!(value, "a_b__c_.txt");
    }

    #[test]
    fn sanitize_file_name_falls_back_when_empty() {
        let value = sanitize_file_name(" . ");
        assert_eq!(value, "gdrive_file");
    }
}

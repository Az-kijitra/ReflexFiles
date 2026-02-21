use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::{AppError, AppErrorKind, AppResult};
use crate::fs_query::clear_gdrive_read_cache_impl;
use crate::types::{ResourceRef, StorageProvider};

const GDRIVE_EDIT_WORK_DIR_NAME: &str = "reflexfiles-gdrive-edit-work";
const GDRIVE_EDIT_WORK_MAX_AGE_SECS: u64 = 3 * 24 * 60 * 60;
const GDRIVE_EDIT_WORK_MAX_FILES: usize = 200;
const GDRIVE_EDIT_WORK_MAX_TOTAL_BYTES: u64 = 1024 * 1024 * 1024;

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

#[derive(Clone, Debug)]
struct CacheEntryMeta {
    path: std::path::PathBuf,
    modified: SystemTime,
    size: u64,
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
            let _ = fs::remove_file(&entry.path);
            continue;
        }
        total_size = total_size.saturating_add(entry.size);
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

    let mut cache_dir = std::env::temp_dir();
    cache_dir.push(GDRIVE_EDIT_WORK_DIR_NAME);
    fs::create_dir_all(&cache_dir)?;
    cleanup_cache_dir_with_limits(
        &cache_dir,
        GDRIVE_EDIT_WORK_MAX_AGE_SECS,
        GDRIVE_EDIT_WORK_MAX_FILES,
        GDRIVE_EDIT_WORK_MAX_TOTAL_BYTES,
    );

    let mut hasher = DefaultHasher::new();
    resource_ref.resource_id.hash(&mut hasher);
    revision.modified.hash(&mut hasher);
    revision.size.hash(&mut hasher);
    revision.file_id.hash(&mut hasher);
    normalize_optional(&revision.version).hash(&mut hasher);
    normalize_optional(&revision.md5_checksum).hash(&mut hasher);
    let cache_key = format!("{:016x}", hasher.finish());

    let file_name = sanitize_file_name(&entry.name);
    let mut out_path = cache_dir.clone();
    out_path.push(format!("{cache_key}_{file_name}"));
    if !out_path.exists() {
        let mut tmp_path = cache_dir;
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
    Ok(GdriveEditWorkcopy {
        local_path: out_path.to_string_lossy().to_string(),
        file_name: entry.name,
        revision: snapshot_from_revision_info(&resource_ref.resource_id, &revision, local_sha256),
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
        return Ok(GdriveApplyEditResult {
            uploaded: false,
            unchanged: true,
            conflict: false,
            revision: base_revision,
        });
    }

    let current = gdrive_revision_for_ref_impl(&resource_ref)?;
    if revision_has_conflict(&base_revision, &current) {
        return Ok(GdriveApplyEditResult {
            uploaded: false,
            unchanged: false,
            conflict: true,
            revision: snapshot_from_revision_info(&resource_ref.resource_id, &current, local_sha256),
        });
    }

    let uploaded = gdrive_upload_file_from_path_for_ref_impl(&resource_ref, &local_file)?;
    let _ = clear_gdrive_read_cache_impl();
    Ok(GdriveApplyEditResult {
        uploaded: true,
        unchanged: false,
        conflict: false,
        revision: snapshot_from_revision_info(&resource_ref.resource_id, &uploaded, local_sha256),
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

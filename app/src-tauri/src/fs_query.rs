use base64::Engine as _;
use once_cell::sync::Lazy;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::{mpsc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::error::{AppError, AppErrorKind, AppResult};
use crate::storage_provider::{provider_capabilities, provider_registry, resolve_legacy_path};
use crate::types::{
    DirStats, Entry, EntryType, Properties, PropertyKind, ProviderCapabilities, ResourceRef,
    SortKey, SortOrder, StorageProvider,
};
use crate::utils::{is_hidden, system_time_to_rfc3339};

#[cfg(not(feature = "gdrive-readonly-stub"))]
use crate::gdrive_real::{
    gdrive_can_write_into_ref_impl, gdrive_download_file_bytes_for_ref_impl,
    gdrive_entry_info_for_ref_impl,
};

#[cfg(feature = "gdrive-readonly-stub")]
use crate::gdrive_stub::{
    gdrive_stub_image_payload_for_resource_ref, gdrive_stub_is_probably_text_for_resource_ref,
    gdrive_stub_resource_ext, gdrive_stub_resource_kind, gdrive_stub_resource_name,
    gdrive_stub_text_content_for_resource_ref, GdriveStubNodeKind,
};

const IMAGE_CACHE_MAX_AGE_SECS: u64 = 7 * 24 * 60 * 60;
const IMAGE_CACHE_MAX_FILES: usize = 400;
const IMAGE_CACHE_MAX_TOTAL_BYTES: u64 = 512 * 1024 * 1024;
const GDRIVE_READ_CACHE_DIR_NAME: &str = "reflexfiles-gdrive-read-cache";
const GDRIVE_READ_CACHE_MAX_AGE_SECS: u64 = 24 * 60 * 60;
const GDRIVE_READ_CACHE_MAX_FILES: usize = 400;
const GDRIVE_READ_CACHE_MAX_TOTAL_BYTES: u64 = 1024 * 1024 * 1024;
const TEXT_INDEX_LINE_STEP: usize = 1024;
const TEXT_VIEWPORT_MAX_LINES: usize = 4000;
const TEXT_INDEX_CACHE_MAX_ENTRIES: usize = 16;

#[derive(Clone, Debug)]
struct SparseLineIndex {
    file_size: u64,
    modified_nanos: u128,
    line_step: usize,
    total_lines: usize,
    offsets: Vec<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextViewportInfo {
    pub file_size: u64,
    pub total_lines: usize,
    pub line_step: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextViewportChunk {
    pub start_line: usize,
    pub total_lines: usize,
    pub lines: Vec<String>,
}

static TEXT_INDEX_CACHE: Lazy<Mutex<HashMap<String, SparseLineIndex>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug)]
struct CacheEntryMeta {
    path: PathBuf,
    modified: SystemTime,
    size: u64,
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

fn cleanup_viewer_image_cache_dir(dir: &Path) {
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
        if !path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("png"))
            .unwrap_or(false)
        {
            continue;
        }

        let modified = meta.modified().unwrap_or(UNIX_EPOCH);
        if now
            .duration_since(modified)
            .map(|d| d.as_secs() > IMAGE_CACHE_MAX_AGE_SECS)
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
        let over_count = idx >= IMAGE_CACHE_MAX_FILES;
        let over_size = total_size.saturating_add(entry.size) > IMAGE_CACHE_MAX_TOTAL_BYTES;
        if over_count || over_size {
            let _ = fs::remove_file(&entry.path);
            continue;
        }
        total_size = total_size.saturating_add(entry.size);
    }
}

fn entry_from_resource_ref(resource_ref: ResourceRef) -> AppResult<Entry> {
    let registry = provider_registry();
    let provider = registry.provider_for_ref(&resource_ref)?;
    let capabilities = provider_capabilities(provider);

    #[cfg(feature = "gdrive-readonly-stub")]
    if matches!(resource_ref.provider, StorageProvider::Gdrive) {
        let name = gdrive_stub_resource_name(&resource_ref).ok_or_else(|| {
            AppError::with_kind(
                AppErrorKind::NotFound,
                format!("gdrive resource not found: {}", resource_ref.resource_id),
            )
        })?;
        let kind = gdrive_stub_resource_kind(&resource_ref).ok_or_else(|| {
            AppError::with_kind(
                AppErrorKind::NotFound,
                format!("gdrive resource not found: {}", resource_ref.resource_id),
            )
        })?;
        let entry_type = match kind {
            GdriveStubNodeKind::Dir => EntryType::Dir,
            GdriveStubNodeKind::File => EntryType::File,
        };
        let ext = gdrive_stub_resource_ext(&resource_ref).unwrap_or_default();
        let display_path = provider.display_path(&resource_ref);
        return Ok(Entry {
            name,
            path: display_path.clone(),
            display_path,
            provider: resource_ref.provider,
            resource_ref,
            capabilities,
            entry_type,
            size: 0,
            modified: String::new(),
            hidden: false,
            ext,
        });
    }

    #[cfg(not(feature = "gdrive-readonly-stub"))]
    if matches!(resource_ref.provider, StorageProvider::Gdrive) {
        let info = gdrive_entry_info_for_ref_impl(&resource_ref)?;
        let display_path = provider.display_path(&resource_ref);
        return Ok(Entry {
            name: info.name,
            path: display_path.clone(),
            display_path,
            provider: resource_ref.provider,
            resource_ref,
            capabilities,
            entry_type: if info.is_dir {
                EntryType::Dir
            } else {
                EntryType::File
            },
            size: info.size,
            modified: info.modified,
            hidden: false,
            ext: info.ext,
        });
    }

    let path = provider.resolve_path(&resource_ref)?;
    let metadata = provider.metadata(&resource_ref)?;
    let entry_type = if metadata.is_dir() {
        EntryType::Dir
    } else {
        EntryType::File
    };
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or_default()
        .to_string();
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e))
        .unwrap_or_default();
    let modified = system_time_to_rfc3339(metadata.modified().ok());
    let size = if matches!(entry_type, EntryType::File) {
        metadata.len()
    } else {
        0
    };
    let display_path = provider.display_path(&resource_ref);
    Ok(Entry {
        name,
        path: display_path.clone(),
        display_path,
        provider: resource_ref.provider,
        resource_ref,
        capabilities,
        entry_type,
        size,
        modified,
        hidden: is_hidden(&path),
        ext,
    })
}

fn resolve_existing_file_path(path: &str) -> AppResult<PathBuf> {
    #[cfg(not(feature = "gdrive-readonly-stub"))]
    if let Some(resource_ref) = gdrive_resource_ref_from_legacy_path(path)? {
        return gdrive_cached_file_path_for_resource_ref(&resource_ref);
    }

    let path_buf = resolve_legacy_path(path)?;
    if !path_buf.exists() {
        return Err(AppError::msg(format!(
            "file not found: {}",
            path_buf.display()
        )));
    }
    if !path_buf.is_file() {
        return Err(AppError::msg(format!("not a file: {}", path_buf.display())));
    }
    Ok(path_buf)
}

fn gdrive_resource_ref_from_legacy_path(path: &str) -> AppResult<Option<ResourceRef>> {
    let trimmed = path.trim();
    if !trimmed.starts_with("gdrive://") {
        return Ok(None);
    }
    let registry = provider_registry();
    let resource_ref = registry.resource_ref_from_legacy_path(trimmed)?;
    if !matches!(resource_ref.provider, StorageProvider::Gdrive) {
        return Ok(None);
    }
    Ok(Some(resource_ref))
}

#[cfg(not(feature = "gdrive-readonly-stub"))]
fn sanitize_cache_ext(raw_ext: &str) -> String {
    let trimmed = raw_ext.trim().trim_start_matches('.');
    if trimmed.is_empty() {
        return String::new();
    }
    let mut out = String::new();
    for ch in trimmed.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
        }
    }
    if out.is_empty() {
        String::new()
    } else {
        format!(".{out}")
    }
}

#[cfg(not(feature = "gdrive-readonly-stub"))]
fn gdrive_cached_file_path_for_resource_ref(resource_ref: &ResourceRef) -> AppResult<PathBuf> {
    let info = gdrive_entry_info_for_ref_impl(resource_ref)?;
    if info.is_dir {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("gdrive resource is a directory: {}", resource_ref.resource_id),
        ));
    }

    let mut cache_dir = std::env::temp_dir();
    cache_dir.push(GDRIVE_READ_CACHE_DIR_NAME);
    fs::create_dir_all(&cache_dir)?;
    cleanup_cache_dir_with_limits(
        &cache_dir,
        GDRIVE_READ_CACHE_MAX_AGE_SECS,
        GDRIVE_READ_CACHE_MAX_FILES,
        GDRIVE_READ_CACHE_MAX_TOTAL_BYTES,
    );

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    resource_ref.resource_id.hash(&mut hasher);
    info.modified.hash(&mut hasher);
    info.size.hash(&mut hasher);
    let cache_key = format!("{:016x}", hasher.finish());
    let ext = sanitize_cache_ext(&info.ext);

    let mut cached_path = cache_dir.clone();
    cached_path.push(format!("{cache_key}{ext}"));
    if cached_path.exists() {
        return Ok(cached_path);
    }

    let bytes = gdrive_download_file_bytes_for_ref_impl(resource_ref)?;
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
    match fs::rename(&tmp_path, &cached_path) {
        Ok(_) => {}
        Err(_) => {
            let _ = fs::remove_file(&tmp_path);
        }
    }
    if !cached_path.exists() {
        return Err(AppError::with_kind(
            AppErrorKind::Io,
            "failed to persist gdrive temp file",
        ));
    }
    Ok(cached_path)
}

pub(crate) fn clear_gdrive_read_cache_impl() -> AppResult<()> {
    let mut cache_dir = std::env::temp_dir();
    cache_dir.push(GDRIVE_READ_CACHE_DIR_NAME);
    if !cache_dir.exists() {
        return Ok(());
    }
    fs::remove_dir_all(cache_dir)?;
    Ok(())
}

#[cfg(feature = "gdrive-readonly-stub")]
fn text_line_count(content: &str) -> usize {
    if content.is_empty() {
        return 1;
    }
    let newline_count = content.as_bytes().iter().filter(|&&b| b == b'\n').count();
    if content.ends_with('\n') {
        newline_count.max(1)
    } else {
        (newline_count + 1).max(1)
    }
}

#[cfg(feature = "gdrive-readonly-stub")]
fn text_lines_for_viewport(content: &str) -> Vec<String> {
    let mut lines = content
        .split('\n')
        .map(|line| line.strip_suffix('\r').unwrap_or(line).to_string())
        .collect::<Vec<_>>();
    if content.ends_with('\n') && !lines.is_empty() {
        lines.pop();
    }
    if lines.is_empty() {
        lines.push(String::new());
    }
    lines
}

fn dir_stats(path: &Path) -> (u64, u64, u64) {
    let mut total_size = 0u64;
    let mut file_count = 0u64;
    let mut dir_count = 0u64;
    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return (0, 0, 0),
    };
    for entry in entries.flatten() {
        let entry_path = entry.path();
        let metadata = match fs::metadata(&entry_path) {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        if metadata.is_dir() {
            dir_count += 1;
            let (child_size, child_files, child_dirs) = dir_stats(&entry_path);
            total_size += child_size;
            file_count += child_files;
            dir_count += child_dirs;
        } else {
            file_count += 1;
            total_size += metadata.len();
        }
    }
    (total_size, file_count, dir_count)
}

fn sort_entries(entries: &mut [Entry], sort_key: &str, sort_order: &str) {
    let key = SortKey::parse(sort_key);
    let order = SortOrder::parse(sort_order);
    entries.sort_by(|a, b| {
        let cmp = match key {
            SortKey::Name => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            SortKey::Size => a.size.cmp(&b.size),
            SortKey::Type => {
                let a_group = if matches!(a.entry_type, EntryType::Dir) {
                    0
                } else {
                    1
                };
                let b_group = if matches!(b.entry_type, EntryType::Dir) {
                    0
                } else {
                    1
                };
                a_group
                    .cmp(&b_group)
                    .then_with(|| a.ext.to_lowercase().cmp(&b.ext.to_lowercase()))
                    .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
            }
            SortKey::Modified => a.modified.cmp(&b.modified),
            SortKey::Unknown => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        };
        match order {
            SortOrder::Asc => cmp,
            SortOrder::Desc => cmp.reverse(),
            SortOrder::Unknown => cmp,
        }
    });
}

pub(crate) fn fs_list_dir_by_ref_impl(
    dir_ref: ResourceRef,
    show_hidden: bool,
    sort_key: String,
    sort_order: String,
) -> AppResult<Vec<Entry>> {
    let registry = provider_registry();
    let provider = registry.provider_for_ref(&dir_ref)?;

    let mut entries: Vec<Entry> = vec![];
    let resource_refs = provider.list_dir_refs(&dir_ref)?;
    for resource_ref in resource_refs {
        let entry = entry_from_resource_ref(resource_ref)?;
        if !show_hidden && entry.hidden {
            continue;
        }
        entries.push(entry);
    }
    sort_entries(&mut entries, &sort_key, &sort_order);
    Ok(entries)
}

pub(crate) fn fs_list_dir_impl(
    path: String,
    show_hidden: bool,
    sort_key: String,
    sort_order: String,
) -> AppResult<Vec<Entry>> {
    let registry = provider_registry();
    let (dir_ref, _) = registry.provider_for_legacy_path(&path)?;
    fs_list_dir_by_ref_impl(dir_ref, show_hidden, sort_key, sort_order)
}

fn display_path_for_read(resource_ref: &ResourceRef) -> AppResult<String> {
    let registry = provider_registry();
    let provider = registry.provider_for_ref(resource_ref)?;
    let capabilities = provider_capabilities(provider);
    if !capabilities.can_read {
        return Err(AppError::with_kind(
            AppErrorKind::Permission,
            "provider capability denied: read",
        ));
    }
    Ok(provider.display_path(resource_ref))
}

pub(crate) fn fs_read_text_by_ref_impl(
    resource_ref: ResourceRef,
    max_bytes: usize,
) -> AppResult<String> {
    let path = display_path_for_read(&resource_ref)?;
    fs_read_text_impl(path, max_bytes)
}

pub(crate) fn fs_is_probably_text_by_ref_impl(
    resource_ref: ResourceRef,
    sample_bytes: usize,
) -> AppResult<bool> {
    let path = display_path_for_read(&resource_ref)?;
    fs_is_probably_text_impl(path, sample_bytes)
}

pub(crate) fn fs_read_text_impl(path: String, max_bytes: usize) -> AppResult<String> {
    if max_bytes == 0 {
        return Ok(String::new());
    }

    #[cfg(feature = "gdrive-readonly-stub")]
    if let Some(resource_ref) = gdrive_resource_ref_from_legacy_path(&path)? {
        let text = gdrive_stub_text_content_for_resource_ref(&resource_ref)?;
        let bytes = text.as_bytes();
        let take = bytes.len().min(max_bytes);
        return Ok(String::from_utf8_lossy(&bytes[..take]).to_string());
    }

    let resolved_path = resolve_existing_file_path(&path)?;
    let file = fs::File::open(&resolved_path)?;
    let mut limited = file.take(max_bytes as u64);
    let mut data = Vec::with_capacity(max_bytes.min(1024 * 1024));
    limited.read_to_end(&mut data)?;

    let text = String::from_utf8_lossy(&data).to_string();
    Ok(text)
}

pub(crate) fn fs_is_probably_text_impl(path: String, sample_bytes: usize) -> AppResult<bool> {
    #[cfg(feature = "gdrive-readonly-stub")]
    if let Some(resource_ref) = gdrive_resource_ref_from_legacy_path(&path)? {
        return gdrive_stub_is_probably_text_for_resource_ref(&resource_ref);
    }

    let max = sample_bytes.max(1);
    let resolved_path = resolve_existing_file_path(&path)?;
    let file = fs::File::open(&resolved_path)?;
    let mut limited = file.take(max as u64);
    let mut data = Vec::with_capacity(max.min(64 * 1024));
    limited.read_to_end(&mut data)?;

    if data.is_empty() {
        return Ok(true);
    }

    // UTF BOMs should be treated as text even when containing NUL bytes.
    if data.starts_with(&[0xEF, 0xBB, 0xBF]) // UTF-8 BOM
        || data.starts_with(&[0xFF, 0xFE]) // UTF-16 LE BOM
        || data.starts_with(&[0xFE, 0xFF]) // UTF-16 BE BOM
        || data.starts_with(&[0xFF, 0xFE, 0x00, 0x00]) // UTF-32 LE BOM
        || data.starts_with(&[0x00, 0x00, 0xFE, 0xFF])
    // UTF-32 BE BOM
    {
        return Ok(true);
    }

    if data.contains(&0x00) {
        return Ok(false);
    }

    let control_count = data
        .iter()
        .filter(|&&b| {
            (b < 0x20 && b != b'\t' && b != b'\n' && b != b'\r' && b != 0x0C && b != 0x08)
                || b == 0x7F
        })
        .count();
    let control_ratio = (control_count as f64) / (data.len() as f64);
    if control_ratio > 0.10 {
        return Ok(false);
    }

    Ok(true)
}

fn text_index_signature(path: &Path) -> AppResult<(u64, u128)> {
    let metadata = fs::metadata(path)?;
    let modified_nanos = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    Ok((metadata.len(), modified_nanos))
}

fn text_index_cache_key(path: &Path) -> String {
    path.to_string_lossy().to_lowercase()
}

fn build_sparse_line_index(
    path: &Path,
    file_size: u64,
    modified_nanos: u128,
) -> AppResult<SparseLineIndex> {
    let mut reader = BufReader::new(fs::File::open(path)?);
    let mut buf = Vec::with_capacity(4096);
    let mut offset = 0u64;
    let mut line_count = 0usize;
    let mut offsets = vec![0u64];

    loop {
        buf.clear();
        let read = reader.read_until(b'\n', &mut buf)?;
        if read == 0 {
            break;
        }
        offset = offset.saturating_add(read as u64);
        line_count = line_count.saturating_add(1);
        if line_count % TEXT_INDEX_LINE_STEP == 0 {
            offsets.push(offset);
        }
    }

    let total_lines = if line_count == 0 { 1 } else { line_count };

    Ok(SparseLineIndex {
        file_size,
        modified_nanos,
        line_step: TEXT_INDEX_LINE_STEP,
        total_lines,
        offsets,
    })
}

fn get_or_build_sparse_line_index(path: &Path) -> AppResult<SparseLineIndex> {
    let key = text_index_cache_key(path);
    let (file_size, modified_nanos) = text_index_signature(path)?;

    if let Ok(cache) = TEXT_INDEX_CACHE.lock() {
        if let Some(index) = cache.get(&key) {
            if index.file_size == file_size && index.modified_nanos == modified_nanos {
                return Ok(index.clone());
            }
        }
    }

    let built = build_sparse_line_index(path, file_size, modified_nanos)?;

    if let Ok(mut cache) = TEXT_INDEX_CACHE.lock() {
        if cache.len() >= TEXT_INDEX_CACHE_MAX_ENTRIES {
            cache.clear();
        }
        cache.insert(key, built.clone());
    }

    Ok(built)
}

fn decode_line_bytes(bytes: &[u8]) -> String {
    let mut end = bytes.len();
    if end > 0 && bytes[end - 1] == b'\n' {
        end -= 1;
    }
    if end > 0 && bytes[end - 1] == b'\r' {
        end -= 1;
    }
    String::from_utf8_lossy(&bytes[..end]).to_string()
}

pub(crate) fn fs_text_viewport_info_impl(path: String) -> AppResult<TextViewportInfo> {
    #[cfg(feature = "gdrive-readonly-stub")]
    if let Some(resource_ref) = gdrive_resource_ref_from_legacy_path(&path)? {
        let text = gdrive_stub_text_content_for_resource_ref(&resource_ref)?;
        return Ok(TextViewportInfo {
            file_size: text.as_bytes().len() as u64,
            total_lines: text_line_count(&text),
            line_step: TEXT_INDEX_LINE_STEP,
        });
    }

    let path_buf = resolve_existing_file_path(&path)?;

    let index = get_or_build_sparse_line_index(&path_buf)?;
    Ok(TextViewportInfo {
        file_size: index.file_size,
        total_lines: index.total_lines,
        line_step: index.line_step,
    })
}

pub(crate) fn fs_text_viewport_info_by_ref_impl(
    resource_ref: ResourceRef,
) -> AppResult<TextViewportInfo> {
    let path = display_path_for_read(&resource_ref)?;
    fs_text_viewport_info_impl(path)
}

pub(crate) fn fs_read_text_viewport_lines_impl(
    path: String,
    start_line: usize,
    line_count: usize,
) -> AppResult<TextViewportChunk> {
    #[cfg(feature = "gdrive-readonly-stub")]
    if let Some(resource_ref) = gdrive_resource_ref_from_legacy_path(&path)? {
        let text = gdrive_stub_text_content_for_resource_ref(&resource_ref)?;
        let lines = text_lines_for_viewport(&text);
        let total_lines = lines.len().max(1);
        let safe_start = start_line.min(total_lines.saturating_sub(1));
        let mut requested = line_count.max(1).min(TEXT_VIEWPORT_MAX_LINES);
        if safe_start + requested > total_lines {
            requested = total_lines - safe_start;
        }

        let chunk_lines = lines
            .iter()
            .skip(safe_start)
            .take(requested)
            .cloned()
            .collect::<Vec<_>>();

        return Ok(TextViewportChunk {
            start_line: safe_start,
            total_lines,
            lines: chunk_lines,
        });
    }

    let path_buf = resolve_existing_file_path(&path)?;

    let index = get_or_build_sparse_line_index(&path_buf)?;
    let total_lines = index.total_lines.max(1);
    let safe_start = start_line.min(total_lines.saturating_sub(1));
    let mut requested = line_count.max(1).min(TEXT_VIEWPORT_MAX_LINES);
    if safe_start + requested > total_lines {
        requested = total_lines - safe_start;
    }

    if index.file_size == 0 {
        return Ok(TextViewportChunk {
            start_line: 0,
            total_lines,
            lines: vec![String::new()],
        });
    }

    let block_index = safe_start / index.line_step;
    let block_line = block_index * index.line_step;
    let block_offset = *index.offsets.get(block_index).unwrap_or(&0u64);

    let mut reader = BufReader::new(fs::File::open(&path_buf)?);
    reader.seek(SeekFrom::Start(block_offset))?;

    let mut buf = Vec::with_capacity(4096);

    for _ in block_line..safe_start {
        buf.clear();
        let read = reader.read_until(b'\n', &mut buf)?;
        if read == 0 {
            break;
        }
    }

    let mut lines = Vec::with_capacity(requested);
    while lines.len() < requested {
        buf.clear();
        let read = reader.read_until(b'\n', &mut buf)?;
        if read == 0 {
            break;
        }
        lines.push(decode_line_bytes(&buf));
    }

    Ok(TextViewportChunk {
        start_line: safe_start,
        total_lines,
        lines,
    })
}

pub(crate) fn fs_read_text_viewport_lines_by_ref_impl(
    resource_ref: ResourceRef,
    start_line: usize,
    line_count: usize,
) -> AppResult<TextViewportChunk> {
    let path = display_path_for_read(&resource_ref)?;
    fs_read_text_viewport_lines_impl(path, start_line, line_count)
}

pub(crate) fn fs_read_image_data_url_by_ref_impl(
    resource_ref: ResourceRef,
    normalize: bool,
) -> AppResult<String> {
    let path = display_path_for_read(&resource_ref)?;
    fs_read_image_data_url_impl(path, normalize)
}

pub(crate) fn fs_read_image_normalized_temp_path_by_ref_impl(
    resource_ref: ResourceRef,
) -> AppResult<String> {
    let path = display_path_for_read(&resource_ref)?;
    fs_read_image_normalized_temp_path_impl(path)
}

fn infer_image_mime(path: &Path, bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G', b'\r', b'\n', 0x1A, b'\n']) {
        return Some("image/png");
    }
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some("image/jpeg");
    }
    if bytes.len() >= 2 && bytes[0] == b'B' && bytes[1] == b'M' {
        return Some("image/bmp");
    }
    match path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => Some("image/png"),
        Some("jpg" | "jpeg") => Some("image/jpeg"),
        Some("bmp") => Some("image/bmp"),
        _ => None,
    }
}

pub(crate) fn fs_read_image_data_url_impl(path: String, normalize: bool) -> AppResult<String> {
    if normalize {
        // Reuse cached normalized PNG path when available.
        let normalized_path = fs_read_image_normalized_temp_path_impl(path)?;
        let out = fs::read(&normalized_path)?;
        let body = base64::engine::general_purpose::STANDARD.encode(out);
        return Ok(format!("data:image/png;base64,{body}"));
    }

    #[cfg(feature = "gdrive-readonly-stub")]
    if let Some(resource_ref) = gdrive_resource_ref_from_legacy_path(&path)? {
        let (mime, bytes) = gdrive_stub_image_payload_for_resource_ref(&resource_ref)?;
        let body = base64::engine::general_purpose::STANDARD.encode(bytes);
        return Ok(format!("data:{mime};base64,{body}"));
    }

    let path_buf = resolve_existing_file_path(&path)?;
    let bytes = fs::read(&path_buf)?;
    let mime = infer_image_mime(&path_buf, &bytes)
        .ok_or_else(|| AppError::msg("unsupported image mime".to_string()))?;
    let body = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{mime};base64,{body}"))
}

pub(crate) fn fs_read_image_normalized_temp_path_impl(path: String) -> AppResult<String> {
    let mut dir = std::env::temp_dir();
    dir.push("reflexfiles-viewer-image-cache");
    fs::create_dir_all(&dir)?;
    cleanup_viewer_image_cache_dir(&dir);

    #[cfg(feature = "gdrive-readonly-stub")]
    if let Some(resource_ref) = gdrive_resource_ref_from_legacy_path(&path)? {
        let (_, bytes) = gdrive_stub_image_payload_for_resource_ref(&resource_ref)?;
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        resource_ref.resource_id.hash(&mut hasher);
        bytes.hash(&mut hasher);
        let cache_key = format!("{:016x}", hasher.finish());

        let mut out_path = dir.clone();
        out_path.push(format!("{cache_key}.png"));
        if out_path.exists() {
            return Ok(out_path.to_string_lossy().to_string());
        }

        let image = image::load_from_memory(bytes).map_err(|e| AppError::msg(e.to_string()))?;
        let mut out = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut out);
        image
            .write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|e| AppError::msg(e.to_string()))?;

        let mut tmp_path = dir;
        tmp_path.push(format!(
            "{cache_key}.{}.{}.tmp",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| AppError::msg(e.to_string()))?
                .as_nanos()
        ));
        fs::write(&tmp_path, out)?;
        match fs::rename(&tmp_path, &out_path) {
            Ok(_) => {}
            Err(_) => {
                let _ = fs::remove_file(&tmp_path);
            }
        }

        return Ok(out_path.to_string_lossy().to_string());
    }

    let path_buf = resolve_existing_file_path(&path)?;
    let metadata = fs::metadata(&path_buf)?;
    let modified_nanos = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let canonical = fs::canonicalize(&path_buf).unwrap_or(path_buf.clone());

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    canonical.to_string_lossy().hash(&mut hasher);
    metadata.len().hash(&mut hasher);
    modified_nanos.hash(&mut hasher);
    let cache_key = format!("{:016x}", hasher.finish());

    let mut out_path = dir.clone();
    out_path.push(format!("{cache_key}.png"));
    if out_path.exists() {
        return Ok(out_path.to_string_lossy().to_string());
    }

    let bytes = fs::read(&path_buf)?;
    let image = image::load_from_memory(&bytes).map_err(|e| AppError::msg(e.to_string()))?;

    let mut out = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut out);
    image
        .write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|e| AppError::msg(e.to_string()))?;

    let mut tmp_path = dir;
    tmp_path.push(format!(
        "{cache_key}.{}.{}.tmp",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| AppError::msg(e.to_string()))?
            .as_nanos()
    ));
    fs::write(&tmp_path, out)?;
    match fs::rename(&tmp_path, &out_path) {
        Ok(_) => {}
        Err(_) => {
            let _ = fs::remove_file(&tmp_path);
        }
    }

    Ok(out_path.to_string_lossy().to_string())
}

pub(crate) fn fs_get_properties_by_ref_impl(resource_ref: ResourceRef) -> AppResult<Properties> {
    let registry = provider_registry();
    let provider = registry.provider_for_ref(&resource_ref)?;
    let capabilities = provider_capabilities(provider);
    let display_path = provider.display_path(&resource_ref);

    #[cfg(feature = "gdrive-readonly-stub")]
    if matches!(resource_ref.provider, StorageProvider::Gdrive) {
        let name = gdrive_stub_resource_name(&resource_ref).ok_or_else(|| {
            AppError::with_kind(
                AppErrorKind::NotFound,
                format!("gdrive resource not found: {}", resource_ref.resource_id),
            )
        })?;
        let kind = gdrive_stub_resource_kind(&resource_ref).ok_or_else(|| {
            AppError::with_kind(
                AppErrorKind::NotFound,
                format!("gdrive resource not found: {}", resource_ref.resource_id),
            )
        })?;
        let property_kind = match kind {
            GdriveStubNodeKind::Dir => PropertyKind::Dir,
            GdriveStubNodeKind::File => PropertyKind::File,
        };
        let ext = gdrive_stub_resource_ext(&resource_ref).unwrap_or_default();
        return Ok(Properties {
            name,
            path: display_path.clone(),
            display_path,
            provider: resource_ref.provider,
            resource_ref,
            capabilities,
            kind: property_kind,
            size: 0,
            created: String::new(),
            modified: String::new(),
            accessed: String::new(),
            hidden: false,
            readonly: true,
            system: false,
            ext,
            files: 0,
            dirs: 0,
            dir_stats_pending: false,
            dir_stats_timeout: false,
        });
    }

    #[cfg(not(feature = "gdrive-readonly-stub"))]
    if matches!(resource_ref.provider, StorageProvider::Gdrive) {
        let info = gdrive_entry_info_for_ref_impl(&resource_ref)?;
        return Ok(Properties {
            name: info.name,
            path: display_path.clone(),
            display_path,
            provider: resource_ref.provider,
            resource_ref,
            capabilities,
            kind: if info.is_dir {
                PropertyKind::Dir
            } else {
                PropertyKind::File
            },
            size: info.size,
            created: String::new(),
            modified: info.modified,
            accessed: String::new(),
            hidden: false,
            readonly: true,
            system: false,
            ext: info.ext,
            files: 0,
            dirs: 0,
            dir_stats_pending: false,
            dir_stats_timeout: false,
        });
    }

    let path_buf = provider.resolve_path(&resource_ref)?;
    let metadata = provider.metadata(&resource_ref)?;
    let kind = if metadata.is_dir() {
        PropertyKind::Dir
    } else {
        PropertyKind::File
    };
    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or_default()
        .to_string();
    let ext = path_buf
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e))
        .unwrap_or_default();
    let created = system_time_to_rfc3339(metadata.created().ok());
    let modified = system_time_to_rfc3339(metadata.modified().ok());
    let accessed = system_time_to_rfc3339(metadata.accessed().ok());
    let readonly = metadata.permissions().readonly();
    let hidden = is_hidden(&path_buf);
    let system = {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::fs::MetadataExt;
            const FILE_ATTRIBUTE_SYSTEM: u32 = 0x4;
            let attrs = metadata.file_attributes();
            (attrs & FILE_ATTRIBUTE_SYSTEM) != 0
        }
        #[cfg(not(target_os = "windows"))]
        {
            false
        }
    };
    let (size, files, dirs, pending) = if matches!(kind, PropertyKind::Dir) {
        (0u64, 0u64, 0u64, true)
    } else {
        (metadata.len(), 0u64, 0u64, false)
    };
    Ok(Properties {
        name,
        path: display_path.clone(),
        display_path,
        provider: resource_ref.provider,
        resource_ref,
        capabilities,
        kind,
        size,
        created,
        modified,
        accessed,
        hidden,
        readonly,
        system,
        ext,
        files,
        dirs,
        dir_stats_pending: pending,
        dir_stats_timeout: false,
    })
}

pub(crate) fn fs_get_properties_impl(path: String) -> AppResult<Properties> {
    let registry = provider_registry();
    let (resource_ref, _) = registry.provider_for_legacy_path(&path)?;
    fs_get_properties_by_ref_impl(resource_ref)
}

pub(crate) fn fs_get_capabilities_impl(path: String) -> AppResult<ProviderCapabilities> {
    let registry = provider_registry();
    let (_, provider) = registry.provider_for_legacy_path(&path)?;
    Ok(provider_capabilities(provider))
}

pub(crate) fn fs_get_capabilities_by_ref_impl(
    resource_ref: ResourceRef,
) -> AppResult<ProviderCapabilities> {
    let registry = provider_registry();
    let provider = registry.provider_for_ref(&resource_ref)?;
    let mut capabilities = provider_capabilities(provider);

    #[cfg(not(feature = "gdrive-readonly-stub"))]
    if matches!(resource_ref.provider, StorageProvider::Gdrive) && capabilities.can_copy {
        // Fail-safe: when the write-capability probe fails, disable copy for destination checks.
        capabilities.can_copy = gdrive_can_write_into_ref_impl(&resource_ref).unwrap_or(false);
    }

    Ok(capabilities)
}

pub(crate) fn fs_dir_stats_impl(path: String, timeout_ms: u64) -> AppResult<DirStats> {
    let resolved_path = resolve_legacy_path(&path)?;
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let (size, files, dirs) = dir_stats(Path::new(&resolved_path));
        let _ = tx.send((size, files, dirs));
    });
    match rx.recv_timeout(Duration::from_millis(timeout_ms)) {
        Ok((size, files, dirs)) => Ok(DirStats {
            size,
            files,
            dirs,
            timed_out: false,
        }),
        Err(mpsc::RecvTimeoutError::Timeout) => Ok(DirStats {
            size: 0,
            files: 0,
            dirs: 0,
            timed_out: true,
        }),
        Err(err) => Err(AppError::msg(err.to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        cleanup_viewer_image_cache_dir, clear_gdrive_read_cache_impl,
        fs_get_capabilities_by_ref_impl,
        fs_get_properties_by_ref_impl, fs_is_probably_text_impl, fs_list_dir_by_ref_impl,
        fs_read_image_data_url_impl, fs_read_image_normalized_temp_path_impl, fs_read_text_impl,
        fs_read_text_viewport_lines_impl, fs_text_viewport_info_impl, infer_image_mime,
    };
    #[cfg(feature = "gdrive-readonly-stub")]
    use super::{
        fs_is_probably_text_by_ref_impl, fs_read_image_data_url_by_ref_impl,
        fs_read_image_normalized_temp_path_by_ref_impl, fs_read_text_by_ref_impl,
        fs_read_text_viewport_lines_by_ref_impl, fs_text_viewport_info_by_ref_impl,
    };
    use crate::types::{PropertyKind, ResourceRef, StorageProvider};
    use image::{DynamicImage, ImageBuffer, ImageFormat, Rgb};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_temp_dir(prefix: &str) -> PathBuf {
        let mut dir = std::env::temp_dir();
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        dir.push(format!("{prefix}-{}-{stamp}", std::process::id()));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    fn write_temp_file(dir: &Path, name: &str, bytes: &[u8]) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, bytes).expect("write temp file");
        path
    }

    fn write_temp_image(dir: &Path, name: &str, format: ImageFormat) -> PathBuf {
        let path = dir.join(name);
        let pixels = ImageBuffer::from_fn(4, 3, |x, y| {
            if (x + y) % 2 == 0 {
                Rgb([240, 40, 40])
            } else {
                Rgb([40, 120, 240])
            }
        });
        let image = DynamicImage::ImageRgb8(pixels);
        image
            .save_with_format(&path, format)
            .expect("write temp image");
        path
    }

    #[test]
    fn fs_read_text_respects_max_bytes() {
        let dir = unique_temp_dir("rf-fs-query-text");
        let path = write_temp_file(&dir, "a.txt", b"abcdef");
        let text = fs_read_text_impl(path.to_string_lossy().to_string(), 3).expect("read text");
        assert_eq!(text, "abc");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn fs_text_viewport_info_and_lines_work_for_large_text() {
        let dir = unique_temp_dir("rf-fs-query-viewport");
        let path = dir.join("large.txt");

        let mut text = String::new();
        for i in 0..5000 {
            text.push_str(&format!("line-{i:05}\n"));
        }
        fs::write(&path, text.as_bytes()).expect("write viewport sample");

        let info =
            fs_text_viewport_info_impl(path.to_string_lossy().to_string()).expect("viewport info");
        assert!(info.file_size > 0);
        assert_eq!(info.total_lines, 5000);

        let chunk = fs_read_text_viewport_lines_impl(path.to_string_lossy().to_string(), 1234, 5)
            .expect("viewport chunk");

        assert_eq!(chunk.start_line, 1234);
        assert_eq!(chunk.total_lines, 5000);
        assert_eq!(chunk.lines.len(), 5);
        assert_eq!(chunk.lines[0], "line-01234");
        assert_eq!(chunk.lines[4], "line-01238");

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn fs_text_viewport_empty_file_returns_single_empty_line() {
        let dir = unique_temp_dir("rf-fs-query-viewport-empty");
        let path = write_temp_file(&dir, "empty.txt", b"");

        let info = fs_text_viewport_info_impl(path.to_string_lossy().to_string())
            .expect("viewport info empty");
        assert_eq!(info.total_lines, 1);

        let chunk = fs_read_text_viewport_lines_impl(path.to_string_lossy().to_string(), 0, 10)
            .expect("viewport empty chunk");
        assert_eq!(chunk.start_line, 0);
        assert_eq!(chunk.total_lines, 1);
        assert_eq!(chunk.lines, vec![String::new()]);

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn fs_is_probably_text_detects_ascii_text() {
        let dir = unique_temp_dir("rf-fs-query-text-like");
        let path = write_temp_file(&dir, "a.unknown", b"hello\nworld\t123");
        let is_text =
            fs_is_probably_text_impl(path.to_string_lossy().to_string(), 4096).expect("is text");
        assert!(is_text);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn fs_is_probably_text_rejects_binary_with_nul() {
        let dir = unique_temp_dir("rf-fs-query-binary-like");
        let path = write_temp_file(&dir, "a.bin", &[0x01, 0x02, 0x00, 0x03, 0x04]);
        let is_text =
            fs_is_probably_text_impl(path.to_string_lossy().to_string(), 4096).expect("is text");
        assert!(!is_text);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn fs_is_probably_text_accepts_utf16_bom() {
        let dir = unique_temp_dir("rf-fs-query-utf16-like");
        // UTF-16 LE BOM + "a" + LF
        let path = write_temp_file(&dir, "a.dat", &[0xFF, 0xFE, b'a', 0x00, b'\n', 0x00]);
        let is_text =
            fs_is_probably_text_impl(path.to_string_lossy().to_string(), 4096).expect("is text");
        assert!(is_text);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn infer_image_mime_detects_signature_and_extension() {
        let png = infer_image_mime(
            Path::new("a.bin"),
            &[0x89, b'P', b'N', b'G', b'\r', b'\n', 0x1A, b'\n'],
        );
        assert_eq!(png, Some("image/png"));
        let jpeg = infer_image_mime(Path::new("a.bin"), &[0xFF, 0xD8, 0xFF, 0x00]);
        assert_eq!(jpeg, Some("image/jpeg"));
        let bmp = infer_image_mime(Path::new("a.bin"), &[b'B', b'M', 0x00]);
        assert_eq!(bmp, Some("image/bmp"));
        let by_ext = infer_image_mime(Path::new("a.jpeg"), &[0x00]);
        assert_eq!(by_ext, Some("image/jpeg"));
    }

    #[test]
    fn fs_read_image_data_url_returns_data_url_for_supported_image() {
        let dir = unique_temp_dir("rf-fs-query-image");
        let path = write_temp_image(&dir, "a.jpg", ImageFormat::Jpeg);
        let data_url = fs_read_image_data_url_impl(path.to_string_lossy().to_string(), false)
            .expect("data url");
        assert!(data_url.starts_with("data:image/jpeg;base64,"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn fs_read_image_data_url_fails_for_unknown_mime() {
        let dir = unique_temp_dir("rf-fs-query-unknown-mime");
        let path = write_temp_file(&dir, "a.bin", &[0x11, 0x22, 0x33, 0x44]);
        let result = fs_read_image_data_url_impl(path.to_string_lossy().to_string(), false);
        assert!(result.is_err());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn fs_read_image_normalized_temp_path_is_stable_for_same_source() {
        let dir = unique_temp_dir("rf-fs-query-normalized");
        let path = write_temp_image(&dir, "a.jpg", ImageFormat::Jpeg);

        let first = fs_read_image_normalized_temp_path_impl(path.to_string_lossy().to_string())
            .expect("first normalized path");
        let second = fs_read_image_normalized_temp_path_impl(path.to_string_lossy().to_string())
            .expect("second normalized path");
        assert_eq!(first, second);
        assert!(Path::new(&first).exists());
        let _ = fs::remove_file(first);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn cleanup_viewer_image_cache_dir_keeps_png_count_limit_and_non_png() {
        let dir = unique_temp_dir("rf-fs-query-cache-cleanup");
        for idx in 0..405 {
            let name = format!("p{idx:03}.png");
            let _ = write_temp_file(&dir, &name, &[idx as u8]);
        }
        let _ = write_temp_file(&dir, "keep.txt", b"keep");

        cleanup_viewer_image_cache_dir(&dir);

        let mut png_count = 0usize;
        let mut txt_exists = false;
        for entry in fs::read_dir(&dir).expect("read dir").flatten() {
            let path = entry.path();
            let ext = path
                .extension()
                .and_then(|v| v.to_str())
                .unwrap_or_default()
                .to_ascii_lowercase();
            if ext == "png" {
                png_count += 1;
            }
            if path.file_name().and_then(|v| v.to_str()) == Some("keep.txt") {
                txt_exists = true;
            }
        }
        assert!(png_count <= 400);
        assert!(txt_exists);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn clear_gdrive_read_cache_impl_removes_cache_dir() {
        let mut cache_dir = std::env::temp_dir();
        cache_dir.push(super::GDRIVE_READ_CACHE_DIR_NAME);
        let _ = fs::remove_dir_all(&cache_dir);
        fs::create_dir_all(&cache_dir).expect("create gdrive cache dir");
        let cache_file = cache_dir.join("dummy.bin");
        fs::write(&cache_file, b"dummy").expect("write gdrive cache file");
        assert!(cache_file.exists());

        clear_gdrive_read_cache_impl().expect("clear gdrive cache");
        assert!(!cache_dir.exists());
    }

    #[test]
    fn fs_list_dir_by_ref_lists_local_entries() {
        let dir = unique_temp_dir("rf-fs-query-list-by-ref");
        let file_path = write_temp_file(&dir, "a.txt", b"hello");
        let entries = fs_list_dir_by_ref_impl(
            ResourceRef {
                provider: StorageProvider::Local,
                resource_id: dir.to_string_lossy().to_string(),
            },
            true,
            "name".to_string(),
            "asc".to_string(),
        )
        .expect("list by ref");
        assert!(entries.iter().any(|e| e.path.ends_with("a.txt")));
        let _ = fs::remove_file(file_path);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn fs_get_properties_by_ref_reads_local_file() {
        let dir = unique_temp_dir("rf-fs-query-props-by-ref");
        let file_path = write_temp_file(&dir, "a.txt", b"hello");
        let properties = fs_get_properties_by_ref_impl(ResourceRef {
            provider: StorageProvider::Local,
            resource_id: file_path.to_string_lossy().to_string(),
        })
        .expect("properties by ref");
        assert_eq!(properties.provider, StorageProvider::Local);
        assert_eq!(properties.name, "a.txt");
        assert!(matches!(properties.kind, PropertyKind::File));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_list_dir_by_ref_returns_virtual_entries_for_gdrive_stub() {
        let entries = fs_list_dir_by_ref_impl(
            ResourceRef {
                provider: StorageProvider::Gdrive,
                resource_id: "root".to_string(),
            },
            true,
            "name".to_string(),
            "asc".to_string(),
        )
        .expect("gdrive list by ref");
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].name, "my-drive");
        assert_eq!(entries[0].path, "gdrive://root/my-drive");
        assert!(matches!(
            entries[0].entry_type,
            crate::types::EntryType::Dir
        ));
        assert_eq!(entries[1].name, "shared-with-me");
        assert_eq!(entries[1].path, "gdrive://root/shared-with-me");
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_list_dir_by_ref_includes_file_nodes_for_gdrive_stub() {
        let entries = fs_list_dir_by_ref_impl(
            ResourceRef {
                provider: StorageProvider::Gdrive,
                resource_id: "root/my-drive".to_string(),
            },
            true,
            "name".to_string(),
            "asc".to_string(),
        )
        .expect("gdrive my-drive list by ref");
        assert_eq!(entries.len(), 4);
        let readme = entries
            .iter()
            .find(|entry| entry.name == "readme.txt")
            .expect("readme entry");
        assert!(matches!(readme.entry_type, crate::types::EntryType::File));
        assert_eq!(readme.ext, ".txt");
        let cover = entries
            .iter()
            .find(|entry| entry.name == "cover.png")
            .expect("cover entry");
        assert!(matches!(cover.entry_type, crate::types::EntryType::File));
        assert_eq!(cover.ext, ".png");
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_get_properties_by_ref_returns_gdrive_stub_dir() {
        let properties = fs_get_properties_by_ref_impl(ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root/my-drive".to_string(),
        })
        .expect("gdrive properties by ref");
        assert_eq!(properties.provider, StorageProvider::Gdrive);
        assert_eq!(properties.path, "gdrive://root/my-drive");
        assert_eq!(properties.display_path, "gdrive://root/my-drive");
        assert_eq!(properties.name, "my-drive");
        assert!(matches!(properties.kind, PropertyKind::Dir));
        assert!(properties.readonly);
        assert!(properties.capabilities.can_read);
        assert!(!properties.capabilities.can_create);
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_get_properties_by_ref_returns_gdrive_stub_file() {
        let properties = fs_get_properties_by_ref_impl(ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root/my-drive/readme.txt".to_string(),
        })
        .expect("gdrive file properties by ref");
        assert!(matches!(properties.kind, PropertyKind::File));
        assert_eq!(properties.name, "readme.txt");
        assert_eq!(properties.ext, ".txt");
        assert!(properties.readonly);
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_get_capabilities_by_ref_reports_gdrive_readonly() {
        let capabilities = fs_get_capabilities_by_ref_impl(ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root".to_string(),
        })
        .expect("gdrive capabilities");
        assert!(capabilities.can_read);
        assert!(!capabilities.can_create);
        assert!(!capabilities.can_rename);
        assert!(!capabilities.can_copy);
        assert!(!capabilities.can_move);
        assert!(!capabilities.can_delete);
        assert!(!capabilities.can_archive_create);
        assert!(!capabilities.can_archive_extract);
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_read_text_reads_gdrive_stub_file() {
        let text = fs_read_text_impl("gdrive://root/my-drive/readme.txt".to_string(), 4096)
            .expect("gdrive text read");
        assert!(text.contains("Google Drive read-only stub"));
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_read_text_by_ref_reads_gdrive_stub_file() {
        let text = fs_read_text_by_ref_impl(
            ResourceRef {
                provider: StorageProvider::Gdrive,
                resource_id: "root/my-drive/readme.txt".to_string(),
            },
            4096,
        )
        .expect("gdrive text read by ref");
        assert!(text.contains("Google Drive read-only stub"));
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_text_viewport_info_and_chunk_work_for_gdrive_stub_file() {
        let info =
            fs_text_viewport_info_impl("gdrive://root/shared-with-me/welcome.md".to_string())
                .expect("gdrive viewport info");
        assert!(info.file_size > 0);
        assert!(info.total_lines >= 2);

        let chunk = fs_read_text_viewport_lines_impl(
            "gdrive://root/shared-with-me/welcome.md".to_string(),
            0,
            2,
        )
        .expect("gdrive viewport lines");
        assert_eq!(chunk.start_line, 0);
        assert!(chunk.total_lines >= 2);
        assert_eq!(chunk.lines[0], "# Welcome");
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_text_viewport_info_and_chunk_by_ref_work_for_gdrive_stub_file() {
        let resource_ref = ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root/shared-with-me/welcome.md".to_string(),
        };
        let info = fs_text_viewport_info_by_ref_impl(resource_ref.clone())
            .expect("gdrive viewport info by ref");
        assert!(info.file_size > 0);
        assert!(info.total_lines >= 2);

        let chunk = fs_read_text_viewport_lines_by_ref_impl(resource_ref, 0, 2)
            .expect("gdrive viewport lines by ref");
        assert_eq!(chunk.start_line, 0);
        assert!(chunk.total_lines >= 2);
        assert_eq!(chunk.lines[0], "# Welcome");
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_is_probably_text_returns_false_for_gdrive_directory() {
        let is_text = fs_is_probably_text_impl("gdrive://root/my-drive".to_string(), 1024)
            .expect("gdrive is text");
        assert!(!is_text);
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_is_probably_text_by_ref_returns_false_for_gdrive_directory() {
        let is_text = fs_is_probably_text_by_ref_impl(
            ResourceRef {
                provider: StorageProvider::Gdrive,
                resource_id: "root/my-drive".to_string(),
            },
            1024,
        )
        .expect("gdrive is text by ref");
        assert!(!is_text);
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_read_image_data_url_reads_gdrive_stub_image() {
        let data_url =
            fs_read_image_data_url_impl("gdrive://root/my-drive/cover.png".to_string(), false)
                .expect("gdrive image data url");
        assert!(data_url.starts_with("data:image/png;base64,"));
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_read_image_normalized_temp_path_writes_gdrive_stub_image() {
        let path =
            fs_read_image_normalized_temp_path_impl("gdrive://root/my-drive/cover.png".to_string())
                .expect("gdrive normalized temp path");
        assert!(path.ends_with(".png"));
        assert!(std::path::Path::new(&path).exists());
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_read_image_data_url_by_ref_reads_gdrive_stub_image() {
        let data_url = fs_read_image_data_url_by_ref_impl(
            ResourceRef {
                provider: StorageProvider::Gdrive,
                resource_id: "root/my-drive/cover.png".to_string(),
            },
            false,
        )
        .expect("gdrive image data url by ref");
        assert!(data_url.starts_with("data:image/png;base64,"));
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn fs_read_image_normalized_temp_path_by_ref_writes_gdrive_stub_image() {
        let path = fs_read_image_normalized_temp_path_by_ref_impl(ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root/my-drive/cover.png".to_string(),
        })
        .expect("gdrive normalized temp path by ref");
        assert!(path.ends_with(".png"));
        assert!(std::path::Path::new(&path).exists());
    }

    #[test]
    #[cfg(not(feature = "gdrive-readonly-stub"))]
    fn fs_get_capabilities_by_ref_reports_gdrive_copy_when_stub_disabled() {
        let capabilities = fs_get_capabilities_by_ref_impl(ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root".to_string(),
        })
        .expect("gdrive capabilities");
        assert!(capabilities.can_read);
        assert!(!capabilities.can_create);
        assert!(!capabilities.can_rename);
        assert!(capabilities.can_copy);
        assert!(!capabilities.can_move);
        assert!(!capabilities.can_delete);
        assert!(!capabilities.can_archive_create);
        assert!(!capabilities.can_archive_extract);
    }
}

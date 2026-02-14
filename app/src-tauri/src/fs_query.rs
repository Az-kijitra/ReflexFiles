use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::hash::{Hash, Hasher};
use std::sync::mpsc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use base64::Engine as _;

use crate::error::{AppError, AppResult};
use crate::types::{DirStats, Entry, EntryType, Properties, PropertyKind, SortKey, SortOrder};
use crate::utils::{is_hidden, system_time_to_rfc3339};

const IMAGE_CACHE_MAX_AGE_SECS: u64 = 7 * 24 * 60 * 60;
const IMAGE_CACHE_MAX_FILES: usize = 400;
const IMAGE_CACHE_MAX_TOTAL_BYTES: u64 = 512 * 1024 * 1024;

#[derive(Debug)]
struct CacheEntryMeta {
    path: PathBuf,
    modified: SystemTime,
    size: u64,
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

fn entry_from_path(path: PathBuf) -> AppResult<Entry> {
    let metadata = fs::metadata(&path)?;
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
    Ok(Entry {
        name,
        path: path.to_string_lossy().to_string(),
        entry_type,
        size,
        modified,
        hidden: is_hidden(&path),
        ext,
    })
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

pub(crate) fn fs_list_dir_impl(
    path: String,
    show_hidden: bool,
    sort_key: String,
    sort_order: String,
) -> AppResult<Vec<Entry>> {
    let mut entries: Vec<Entry> = vec![];
    let read_dir = fs::read_dir(&path)?;
    for item in read_dir {
        let entry = item?;
        let path = entry.path();
        let entry = entry_from_path(path)?;
        if !show_hidden && entry.hidden {
            continue;
        }
        entries.push(entry);
    }

    let key = SortKey::parse(&sort_key);
    let order = SortOrder::parse(&sort_order);
    entries.sort_by(|a, b| {
        let cmp = match key {
            SortKey::Name => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            SortKey::Size => a.size.cmp(&b.size),
            SortKey::Type => {
                let a_group = if matches!(a.entry_type, EntryType::Dir) { 0 } else { 1 };
                let b_group = if matches!(b.entry_type, EntryType::Dir) { 0 } else { 1 };
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

    Ok(entries)
}

pub(crate) fn fs_read_text_impl(path: String, max_bytes: usize) -> AppResult<String> {
    if max_bytes == 0 {
        return Ok(String::new());
    }

    let file = fs::File::open(&path)?;
    let mut limited = file.take(max_bytes as u64);
    let mut data = Vec::with_capacity(max_bytes.min(1024 * 1024));
    limited.read_to_end(&mut data)?;

    let text = String::from_utf8_lossy(&data).to_string();
    Ok(text)
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

    let path_buf = PathBuf::from(&path);
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

    let path_buf = PathBuf::from(&path);
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

pub(crate) fn fs_get_properties_impl(path: String) -> AppResult<Properties> {
    let path_buf = PathBuf::from(&path);
    let metadata = fs::metadata(&path_buf)?;
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
        path,
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

pub(crate) fn fs_dir_stats_impl(path: String, timeout_ms: u64) -> AppResult<DirStats> {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let (size, files, dirs) = dir_stats(Path::new(&path));
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

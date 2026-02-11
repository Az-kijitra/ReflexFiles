use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Duration;

use crate::error::{AppError, AppResult};
use crate::types::{DirStats, Entry, EntryType, Properties, PropertyKind, SortKey, SortOrder};
use crate::utils::{is_hidden, system_time_to_rfc3339};

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
    let data = fs::read(&path)?;
    let slice = if data.len() > max_bytes {
        &data[..max_bytes]
    } else {
        &data[..]
    };
    let text = String::from_utf8_lossy(slice).to_string();
    Ok(text)
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

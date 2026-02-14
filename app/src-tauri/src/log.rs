use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};

use chrono::Local;
use once_cell::sync::Lazy;

use crate::config::load_config;

const MAX_LOG_SIZE_BYTES: u64 = 10 * 1024 * 1024;
const LOG_RETENTION_DAYS: u64 = 14;
static LOG_WRITE_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

fn rotate_log_if_needed(path: &Path) {
    if let Ok(meta) = fs::metadata(path) {
        if meta.len() < MAX_LOG_SIZE_BYTES {
            return;
        }
    }

    let rotated = build_rotated_log_path(path);
    let _ = fs::rename(path, rotated);
}

fn build_rotated_log_path(path: &Path) -> PathBuf {
    let parent = path
        .parent()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    let stem = path
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("app")
        .to_string();
    let ext = path
        .extension()
        .and_then(|v| v.to_str())
        .map(|v| format!(".{v}"))
        .unwrap_or_default();
    let suffix = Local::now().format("%Y%m%d-%H%M%S-%3f").to_string();
    parent.join(format!("{stem}-{suffix}{ext}"))
}

fn cleanup_old_logs(dir: &Path) {
    let retention = Duration::from_secs(LOG_RETENTION_DAYS * 24 * 60 * 60);
    let now = SystemTime::now();
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(meta) = entry.metadata() else {
            continue;
        };
        if !meta.is_file() {
            continue;
        }
        let Ok(modified) = meta.modified() else {
            continue;
        };
        let Ok(age) = now.duration_since(modified) else {
            continue;
        };
        if age > retention {
            let _ = fs::remove_file(path);
        }
    }
}

pub(crate) fn log_event(event: &str, src: &str, dst: &str, detail: &str) {
    let config = load_config();
    if !config.log_enabled {
        return;
    }
    let path = PathBuf::from(&config.log_path);
    let Ok(_guard) = LOG_WRITE_LOCK.lock() else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
        cleanup_old_logs(parent);
    }
    rotate_log_if_needed(&path);
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
    let line = format!("{}\t{}\t{}\t{}\t{}\n", timestamp, event, src, dst, detail);
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = file.write_all(line.as_bytes());
    }
}

pub(crate) fn log_error(operation: &str, src: &str, dst: &str, err: &str) {
    let detail = format!("op={}; error={}", operation, err);
    log_event("ERROR", src, dst, &detail);
}

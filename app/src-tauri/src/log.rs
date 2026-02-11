use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use chrono::Local;

use crate::config::load_config;

fn rotate_log_if_needed(path: &Path) {
    const MAX_SIZE: u64 = 5 * 1024 * 1024;
    if let Ok(meta) = fs::metadata(path) {
        if meta.len() >= MAX_SIZE {
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                let rotated = path.with_file_name(format!("{}.1", file_name));
                let _ = fs::remove_file(&rotated);
                let _ = fs::rename(path, rotated);
            }
        }
    }
}

pub(crate) fn log_event(event: &str, src: &str, dst: &str, detail: &str) {
    let config = load_config();
    if !config.log_enabled {
        return;
    }
    let path = PathBuf::from(&config.log_path);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
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

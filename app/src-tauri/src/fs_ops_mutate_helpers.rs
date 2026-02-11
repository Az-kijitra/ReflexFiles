use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::types::OpFailure;

pub fn validate_name(name: &str) -> Result<&str, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("name is required".to_string());
    }
    if trimmed == "." || trimmed == ".." {
        return Err("invalid name".to_string());
    }
    let invalid = ['\\', '/', ':', '*', '?', '"', '<', '>', '|'];
    if trimmed.chars().any(|c| invalid.contains(&c)) {
        return Err("invalid characters in name".to_string());
    }
    Ok(trimmed)
}

pub fn ensure_parent_exists(parent: &PathBuf) -> Result<(), String> {
    if !parent.exists() {
        return Err("parent not found".to_string());
    }
    Ok(())
}

pub fn log_and_fail(action: &str, src: &str, dst: &str, err: &str) -> Result<(), String> {
    let message = crate::error::ensure_error_string(err);
    crate::log_error(action, src, dst, &message);
    Err(message)
}

pub fn move_recursively(from: &Path, to: &Path) -> io::Result<()> {
    let rename_result = fs::rename(from, to);
    match rename_result {
        Ok(_) => Ok(()),
        Err(_err) => {
            if from.is_dir() {
                fs::create_dir_all(to)?;
                for entry in fs::read_dir(from)? {
                    let entry = entry?;
                    let child_from = entry.path();
                    let child_to = to.join(entry.file_name());
                    move_recursively(&child_from, &child_to)?;
                }
                fs::remove_dir_all(from)?;
            } else {
                if let Some(parent) = to.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::copy(from, to)?;
                fs::remove_file(from)?;
            }
            Ok(())
        }
    }
}

pub fn record_failure(
    failures: &mut Vec<OpFailure>,
    item: &str,
    code: &str,
    err: &str,
) {
    failures.push(OpFailure {
        path: item.to_string(),
        code: code.to_string(),
        error: err.to_string(),
    });
}

pub fn io_error_code(err: &io::Error) -> &'static str {
    use io::ErrorKind;
    match err.kind() {
        ErrorKind::NotFound => "not_found",
        ErrorKind::PermissionDenied => "permission_denied",
        ErrorKind::AlreadyExists => "already_exists",
        ErrorKind::InvalidInput => "invalid_input",
        _ => "io_error",
    }
}

pub fn undo_trash_root() -> Result<PathBuf, String> {
    let config_path = crate::config::config_path();
    let base = config_path
        .parent()
        .ok_or_else(|| crate::error::format_error(crate::error::AppErrorKind::InvalidPath, "config path invalid"))?;
    Ok(base.join("undo_trash"))
}

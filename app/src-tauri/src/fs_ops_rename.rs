use crate::fs_ops_mutate_helpers::{io_error_code, log_and_fail};
use crate::fs_ops_preflight::preflight_rename;
use crate::storage_provider::{resolve_legacy_path_for, ProviderCapability};
use std::fs;
use std::time::Instant;

#[tauri::command]
pub fn fs_rename(path: String, new_name: String) -> Result<(), String> {
    let started = Instant::now();
    let resolved_path = match resolve_legacy_path_for(&path, ProviderCapability::Rename) {
        Ok(path_buf) => path_buf,
        Err(err) => {
            crate::log_error(
                "rename",
                &path,
                &new_name,
                &format!("code={}; {}", err.code(), err),
            );
            return Err(format!("code={}; {}", err.code(), err));
        }
    };
    let resolved_path_text = resolved_path.to_string_lossy().to_string();
    let (from, to) = match preflight_rename(&resolved_path_text, &new_name) {
        Ok(result) => result,
        Err(err) => {
            crate::log_error(
                "rename",
                &path,
                &new_name,
                &format!("code={}; {}", err.code, err.message),
            );
            return Err(format!("code={}; {}", err.code, err.message));
        }
    };
    if let Err(err) = fs::rename(&from, &to) {
        let code = io_error_code(&err);
        return log_and_fail(
            "rename",
            &path,
            &to.to_string_lossy(),
            &format!("code={}; {}", code, err),
        );
    }
    crate::log_event(
        "RENAME",
        &path,
        &to.to_string_lossy(),
        &format!("ms={}", started.elapsed().as_millis()),
    );
    Ok(())
}

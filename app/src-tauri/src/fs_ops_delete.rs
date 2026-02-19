use std::fs;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use trash::delete;

use crate::fs_ops_mutate_helpers::{
    io_error_code, log_and_fail, move_recursively, record_failure, undo_trash_root,
};
use crate::fs_ops_preflight::preflight_delete;
use crate::storage_provider::{resolve_legacy_paths_for, ProviderCapability};
use crate::types::dto::{DeleteSummary, TrashItem};

#[tauri::command]
pub fn fs_delete_trash(items: Vec<String>) -> Result<(), String> {
    let started = Instant::now();
    let resolved_items = match resolve_legacy_paths_for(&items, ProviderCapability::Delete) {
        Ok(paths) => paths,
        Err(err) => {
            crate::log_error(
                "delete",
                "batch",
                "-",
                &format!("code={}; {}", err.code(), err),
            );
            return Err(format!("code={}; {}", err.code(), err));
        }
    };
    let preflight_items: Vec<String> = resolved_items
        .iter()
        .map(|path| path.to_string_lossy().to_string())
        .collect();
    if let Err(err) = preflight_delete(&preflight_items) {
        crate::log_error(
            "delete",
            "batch",
            "-",
            &format!("code={}; {}", err.code, err.message),
        );
        return Err(format!("code={}; {}", err.code, err.message));
    }
    let total = resolved_items.len();
    for (raw_item, resolved_item) in items.into_iter().zip(resolved_items.into_iter()) {
        if let Err(err) = delete(&resolved_item).map_err(|e| e.to_string()) {
            return log_and_fail("delete", &raw_item, "-", &format!("code=io_error; {}", err));
        }
        if let Err(err) = fs::metadata(&resolved_item) {
            if err.kind() != std::io::ErrorKind::NotFound {
                let msg = format!("delete failed: {}", err);
                let code = io_error_code(&err);
                return log_and_fail("delete", &raw_item, "-", &format!("code={}; {}", code, msg));
            }
        } else {
            let err = "delete failed: path still exists".to_string();
            return log_and_fail("delete", &raw_item, "-", &format!("code=unknown; {}", err));
        }
        crate::log_event(
            "DELETE",
            &raw_item,
            "-",
            &format!("count={}; ms={}", total, started.elapsed().as_millis()),
        );
    }
    Ok(())
}

#[tauri::command]
pub fn fs_delete_with_undo(items: Vec<String>) -> Result<DeleteSummary, String> {
    let started = Instant::now();
    let resolved_items = match resolve_legacy_paths_for(&items, ProviderCapability::Delete) {
        Ok(paths) => paths,
        Err(err) => {
            crate::log_error(
                "delete",
                "batch",
                "-",
                &format!("code={}; {}", err.code(), err),
            );
            return Err(format!("code={}; {}", err.code(), err));
        }
    };
    let preflight_items: Vec<String> = resolved_items
        .iter()
        .map(|path| path.to_string_lossy().to_string())
        .collect();
    if let Err(err) = preflight_delete(&preflight_items) {
        crate::log_error(
            "delete",
            "batch",
            "-",
            &format!("code={}; {}", err.code, err.message),
        );
        return Err(format!("code={}; {}", err.code, err.message));
    }
    let total = resolved_items.len();
    let mut ok = 0u64;
    let mut failed = 0u64;
    let mut failures = Vec::new();
    let mut trashed = Vec::new();
    let root = undo_trash_root()?;
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    for (index, (raw_item, from)) in items
        .into_iter()
        .zip(resolved_items.into_iter())
        .enumerate()
    {
        let name = match from.file_name() {
            Some(name) => name.to_owned(),
            None => {
                let err = "invalid path";
                crate::log_error("delete", &raw_item, "-", err);
                failed += 1;
                record_failure(&mut failures, &raw_item, "invalid_path", err);
                continue;
            }
        };
        let bucket = root.join(format!("{}_{}", stamp, index));
        if let Err(err) = fs::create_dir_all(&bucket) {
            let msg = err.to_string();
            crate::log_error("delete", &raw_item, &bucket.to_string_lossy(), &msg);
            failed += 1;
            record_failure(&mut failures, &raw_item, io_error_code(&err), &msg);
            continue;
        }
        let to = bucket.join(name);
        if let Err(err) = move_recursively(&from, &to) {
            let code = io_error_code(&err);
            let msg = err.to_string();
            crate::log_error("delete", &raw_item, &to.to_string_lossy(), &msg);
            failed += 1;
            record_failure(&mut failures, &raw_item, code, &msg);
            continue;
        }
        crate::log_event(
            "DELETE",
            &raw_item,
            &to.to_string_lossy(),
            &format!("count={}; ms={}", total, started.elapsed().as_millis()),
        );
        ok += 1;
        trashed.push(TrashItem {
            original: raw_item,
            trashed: to.to_string_lossy().to_string(),
        });
    }
    Ok(DeleteSummary {
        ok,
        failed,
        total: total as u64,
        failures,
        trashed,
    })
}

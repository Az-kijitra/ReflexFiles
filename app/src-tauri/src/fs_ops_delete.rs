use std::fs;
use std::path::PathBuf;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use trash::delete;

use crate::fs_ops_mutate_helpers::{
    io_error_code, log_and_fail, move_recursively, record_failure, undo_trash_root,
};
use crate::fs_ops_preflight::preflight_delete;
use crate::types::dto::{DeleteSummary, TrashItem};

#[tauri::command]
pub fn fs_delete_trash(items: Vec<String>) -> Result<(), String> {
    let started = Instant::now();
    if let Err(err) = preflight_delete(&items) {
        crate::log_error(
            "delete",
            "batch",
            "-",
            &format!("code={}; {}", err.code, err.message),
        );
        return Err(format!("code={}; {}", err.code, err.message));
    }
    let total = items.len();
    for item in items {
        if let Err(err) = delete(&item).map_err(|e| e.to_string()) {
            return log_and_fail("delete", &item, "-", &format!("code=io_error; {}", err));
        }
        if let Err(err) = fs::metadata(&item) {
            if err.kind() != std::io::ErrorKind::NotFound {
                let msg = format!("delete failed: {}", err);
                let code = io_error_code(&err);
                return log_and_fail("delete", &item, "-", &format!("code={}; {}", code, msg));
            }
        } else {
            let err = "delete failed: path still exists".to_string();
            return log_and_fail("delete", &item, "-", &format!("code=unknown; {}", err));
        }
        crate::log_event(
            "DELETE",
            &item,
            "-",
            &format!("count={}; ms={}", total, started.elapsed().as_millis()),
        );
    }
    Ok(())
}

#[tauri::command]
pub fn fs_delete_with_undo(items: Vec<String>) -> Result<DeleteSummary, String> {
    let started = Instant::now();
    if let Err(err) = preflight_delete(&items) {
        crate::log_error(
            "delete",
            "batch",
            "-",
            &format!("code={}; {}", err.code, err.message),
        );
        return Err(format!("code={}; {}", err.code, err.message));
    }
    let total = items.len();
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
    for (index, item) in items.into_iter().enumerate() {
        let from = PathBuf::from(&item);
        let name = match from.file_name() {
            Some(name) => name.to_owned(),
            None => {
                let err = "invalid path";
                crate::log_error("delete", &item, "-", err);
                failed += 1;
                record_failure(&mut failures, &item, "invalid_path", err);
                continue;
            }
        };
        let bucket = root.join(format!("{}_{}", stamp, index));
        if let Err(err) = fs::create_dir_all(&bucket) {
            let msg = err.to_string();
            crate::log_error("delete", &item, &bucket.to_string_lossy(), &msg);
            failed += 1;
            record_failure(&mut failures, &item, io_error_code(&err), &msg);
            continue;
        }
        let to = bucket.join(name);
        if let Err(err) = move_recursively(&from, &to) {
            let code = io_error_code(&err);
            let msg = err.to_string();
            crate::log_error("delete", &item, &to.to_string_lossy(), &msg);
            failed += 1;
            record_failure(&mut failures, &item, code, &msg);
            continue;
        }
        crate::log_event(
            "DELETE",
            &item,
            &to.to_string_lossy(),
            &format!("count={}; ms={}", total, started.elapsed().as_millis()),
        );
        ok += 1;
        trashed.push(TrashItem {
            original: item,
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

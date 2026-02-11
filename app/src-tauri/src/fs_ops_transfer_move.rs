use std::fs;
use std::path::PathBuf;
use std::time::Instant;

use tauri::AppHandle;

use crate::fs_ops_preflight::preflight_transfer;
use crate::fs_ops_transfer_helpers::{
    cancel_requested, copy_recursively, emit_progress, io_error_code, record_failure,
    remove_recursively, reset_cancel_request,
};
use crate::types::{OpKind, OpStatus, OpSummary};

#[tauri::command]
pub fn fs_move(app: AppHandle, items: Vec<String>, destination: String) -> Result<OpSummary, String> {
    let started = Instant::now();
    reset_cancel_request();
    let dest = match preflight_transfer(&items, &destination) {
        Ok(dest) => dest,
        Err(err) => {
            crate::log_error(
                "move",
                "batch",
                &destination,
                &format!("code={}; {}", err.code, err.message),
            );
            return Err(format!("code={}; {}", err.code, err.message));
        }
    };
    let total = items.len();
    let mut ok = 0u64;
    let mut failed = 0u64;
    let mut failures = Vec::new();
    for (index, item) in items.into_iter().enumerate() {
        if cancel_requested() {
            break;
        }
        emit_progress(
            &app,
            OpKind::Move,
            item.clone(),
            index,
            total,
            OpStatus::Start,
            String::new(),
        );
        let from = PathBuf::from(&item);
        let name = match from.file_name() {
            Some(name) => name.to_owned(),
            None => {
                let err = "invalid path";
                crate::log_error("move", &item, "-", err);
                failed += 1;
                record_failure(&mut failures, &item, "invalid_path", err);
                emit_progress(
                    &app,
                    OpKind::Move,
                    item.clone(),
                    index,
                    total,
                    OpStatus::Fail,
                    err.to_string(),
                );
                continue;
            }
        };
        let to = dest.join(name);
        if let (Ok(from_canon), Ok(to_canon)) = (fs::canonicalize(&from), fs::canonicalize(&to)) {
            if from_canon == to_canon {
                let err = "source and destination are the same";
                crate::log_error("move", &item, &to.to_string_lossy(), err);
                failed += 1;
                record_failure(&mut failures, &item, "same_path", err);
                emit_progress(
                    &app,
                    OpKind::Move,
                    item.clone(),
                    index,
                    total,
                    OpStatus::Fail,
                    err.to_string(),
                );
                continue;
            }
        }
        let rename_result = fs::rename(&from, &to);
        let result = match rename_result {
            Ok(_) => Ok(()),
            Err(err) => {
                if let Err(copy_err) = copy_recursively(&from, &to) {
                    crate::log_error("move", &item, &to.to_string_lossy(), &copy_err.to_string());
                    Err(copy_err)
                } else if let Err(remove_err) = remove_recursively(&from) {
                    crate::log_error(
                        "move",
                        &item,
                        &to.to_string_lossy(),
                        &remove_err.to_string(),
                    );
                    Err(remove_err)
                } else {
                    Err(err)
                }
            }
        };
        if let Err(err) = result {
            let code = io_error_code(&err);
            let message = err.to_string();
            crate::log_error("move", &item, &to.to_string_lossy(), &message);
            failed += 1;
            record_failure(&mut failures, &item, code, &message);
            emit_progress(
                &app,
                OpKind::Move,
                item.clone(),
                index,
                total,
                OpStatus::Fail,
                message,
            );
            if cancel_requested() {
                break;
            }
            continue;
        }
        crate::log_event(
            "MOVE",
            &item,
            &to.to_string_lossy(),
            &format!("count={}; ms={}", total, started.elapsed().as_millis()),
        );
        ok += 1;
        emit_progress(
            &app,
            OpKind::Move,
            item.clone(),
            index,
            total,
            OpStatus::Done,
            String::new(),
        );
    }
    Ok(OpSummary {
        ok,
        failed,
        total: total as u64,
        failures,
    })
}

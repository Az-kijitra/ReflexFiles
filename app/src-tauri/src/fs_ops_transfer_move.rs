use std::fs;
use std::path::PathBuf;
use std::time::Instant;

use tauri::AppHandle;

use crate::fs_ops_preflight::preflight_transfer;
use crate::fs_ops_transfer_helpers::{
    cancel_requested, copy_recursively, emit_progress, io_error_code, record_failure,
    remove_recursively, reset_cancel_request,
};
use crate::storage_provider::{resolve_legacy_path_for, ProviderCapability};
use crate::types::{OpKind, OpStatus, OpSummary};

#[tauri::command]
pub fn fs_move(
    app: AppHandle,
    items: Vec<String>,
    destination: String,
) -> Result<OpSummary, String> {
    let started = Instant::now();
    reset_cancel_request();
    let resolved_destination = match resolve_legacy_path_for(&destination, ProviderCapability::Move)
    {
        Ok(path) => path,
        Err(err) => {
            crate::log_error(
                "move",
                "batch",
                &destination,
                &format!("code={}; {}", err.code(), err),
            );
            return Err(format!("code={}; {}", err.code(), err));
        }
    };
    let mut resolved_items: Vec<(String, PathBuf)> = Vec::with_capacity(items.len());
    for item in &items {
        let resolved = match resolve_legacy_path_for(item, ProviderCapability::Move) {
            Ok(path) => path,
            Err(err) => {
                crate::log_error("move", item, &destination, &format!("code={}; {}", err.code(), err));
                return Err(format!("code={}; {}", err.code(), err));
            }
        };
        resolved_items.push((item.clone(), resolved));
    }
    let preflight_items: Vec<String> = resolved_items
        .iter()
        .map(|(_, path)| path.to_string_lossy().to_string())
        .collect();
    let resolved_destination_text = resolved_destination.to_string_lossy().to_string();
    let dest = match preflight_transfer(&preflight_items, &resolved_destination_text) {
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
    let total = resolved_items.len();
    let mut ok = 0u64;
    let mut failed = 0u64;
    let mut failures = Vec::new();
    for (index, (raw_item, from)) in resolved_items.into_iter().enumerate() {
        if cancel_requested() {
            break;
        }
        emit_progress(
            &app,
            OpKind::Move,
            raw_item.clone(),
            index,
            total,
            OpStatus::Start,
            String::new(),
        );
        let name = match from.file_name() {
            Some(name) => name.to_owned(),
            None => {
                let err = "invalid path";
                crate::log_error("move", &raw_item, "-", err);
                failed += 1;
                record_failure(&mut failures, &raw_item, "invalid_path", err);
                emit_progress(
                    &app,
                    OpKind::Move,
                    raw_item.clone(),
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
                crate::log_error("move", &raw_item, &to.to_string_lossy(), err);
                failed += 1;
                record_failure(&mut failures, &raw_item, "same_path", err);
                emit_progress(
                    &app,
                    OpKind::Move,
                    raw_item.clone(),
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
                    crate::log_error("move", &raw_item, &to.to_string_lossy(), &copy_err.to_string());
                    Err(copy_err)
                } else if let Err(remove_err) = remove_recursively(&from) {
                    crate::log_error(
                        "move",
                        &raw_item,
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
            crate::log_error("move", &raw_item, &to.to_string_lossy(), &message);
            failed += 1;
            record_failure(&mut failures, &raw_item, code, &message);
            emit_progress(
                &app,
                OpKind::Move,
                raw_item.clone(),
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
            &raw_item,
            &to.to_string_lossy(),
            &format!("count={}; ms={}", total, started.elapsed().as_millis()),
        );
        ok += 1;
        emit_progress(
            &app,
            OpKind::Move,
            raw_item.clone(),
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

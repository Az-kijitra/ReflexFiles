use std::fs;
use std::path::PathBuf;
use std::time::Instant;

use tauri::AppHandle;

use crate::fs_ops_preflight::{preflight_copy_pairs, preflight_transfer};
use crate::fs_ops_transfer_helpers::{
    cancel_requested, copy_recursively, emit_progress, io_error_code, record_failure,
    reset_cancel_request,
};
use crate::types::{OpKind, OpStatus, OpSummary};

#[derive(serde::Deserialize)]
pub struct CopyPair {
    pub from: String,
    pub to: String,
}

#[tauri::command]
pub fn fs_copy(
    app: AppHandle,
    items: Vec<String>,
    destination: String,
) -> Result<OpSummary, String> {
    let started = Instant::now();
    reset_cancel_request();
    let dest = match preflight_transfer(&items, &destination) {
        Ok(dest) => dest,
        Err(err) => {
            crate::log_error(
                "copy",
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
            OpKind::Copy,
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
                crate::log_error("copy", &item, "-", err);
                failed += 1;
                record_failure(&mut failures, &item, "invalid_path", err);
                emit_progress(
                    &app,
                    OpKind::Copy,
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
        if from == to {
            let err = "source and destination are the same";
            crate::log_error("copy", &item, &to.to_string_lossy(), err);
            failed += 1;
            record_failure(&mut failures, &item, "same_path", err);
            emit_progress(
                &app,
                OpKind::Copy,
                item.clone(),
                index,
                total,
                OpStatus::Fail,
                err.to_string(),
            );
            continue;
        }
        if let (Ok(from_canon), Ok(to_canon)) = (fs::canonicalize(&from), fs::canonicalize(&to)) {
            if from_canon == to_canon {
                let err = "source and destination are the same";
                crate::log_error("copy", &item, &to.to_string_lossy(), err);
                failed += 1;
                record_failure(&mut failures, &item, "same_path", err);
                emit_progress(
                    &app,
                    OpKind::Copy,
                    item.clone(),
                    index,
                    total,
                    OpStatus::Fail,
                    err.to_string(),
                );
                continue;
            }
        }
        if let Err(err) = copy_recursively(&from, &to) {
            let code = io_error_code(&err);
            let message = err.to_string();
            crate::log_error("copy", &item, &to.to_string_lossy(), &message);
            failed += 1;
            record_failure(&mut failures, &item, code, &message);
            emit_progress(
                &app,
                OpKind::Copy,
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
            "COPY",
            &item,
            &to.to_string_lossy(),
            &format!("count={}; ms={}", total, started.elapsed().as_millis()),
        );
        ok += 1;
        emit_progress(
            &app,
            OpKind::Copy,
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

#[tauri::command]
pub fn fs_copy_pairs(app: AppHandle, pairs: Vec<CopyPair>) -> Result<OpSummary, String> {
    let started = Instant::now();
    reset_cancel_request();
    let pair_inputs: Vec<(String, String)> = pairs
        .iter()
        .map(|pair| (pair.from.clone(), pair.to.clone()))
        .collect();
    if let Err(err) = preflight_copy_pairs(&pair_inputs) {
        crate::log_error(
            "copy",
            "pairs",
            "-",
            &format!("code={}; {}", err.code, err.message),
        );
        return Err(format!("code={}; {}", err.code, err.message));
    }
    let total = pairs.len();
    let mut ok = 0u64;
    let mut failed = 0u64;
    let mut failures = Vec::new();
    for (index, pair) in pairs.into_iter().enumerate() {
        if cancel_requested() {
            break;
        }
        let from_path = pair.from;
        let to_path = pair.to;
        emit_progress(
            &app,
            OpKind::Copy,
            from_path.clone(),
            index,
            total,
            OpStatus::Start,
            String::new(),
        );
        if from_path.trim().is_empty() || to_path.trim().is_empty() {
            let err = "invalid path";
            crate::log_error("copy", &from_path, &to_path, err);
            failed += 1;
            record_failure(&mut failures, &from_path, "invalid_path", err);
            emit_progress(
                &app,
                OpKind::Copy,
                from_path.clone(),
                index,
                total,
                OpStatus::Fail,
                err.to_string(),
            );
            continue;
        }
        let from = PathBuf::from(&from_path);
        let to = PathBuf::from(&to_path);
        if from == to {
            let err = "source and destination are the same";
            crate::log_error("copy", &from_path, &to_path, err);
            failed += 1;
            record_failure(&mut failures, &from_path, "same_path", err);
            emit_progress(
                &app,
                OpKind::Copy,
                from_path.clone(),
                index,
                total,
                OpStatus::Fail,
                err.to_string(),
            );
            continue;
        }
        if let (Ok(from_canon), Ok(to_canon)) = (fs::canonicalize(&from), fs::canonicalize(&to)) {
            if from_canon == to_canon {
                let err = "source and destination are the same";
                crate::log_error("copy", &from_path, &to_path, err);
                failed += 1;
                record_failure(&mut failures, &from_path, "same_path", err);
                emit_progress(
                    &app,
                    OpKind::Copy,
                    from_path.clone(),
                    index,
                    total,
                    OpStatus::Fail,
                    err.to_string(),
                );
                continue;
            }
        }
        if let Err(err) = copy_recursively(&from, &to) {
            let code = io_error_code(&err);
            let message = err.to_string();
            crate::log_error("copy", &from_path, &to_path, &message);
            failed += 1;
            record_failure(&mut failures, &from_path, code, &message);
            emit_progress(
                &app,
                OpKind::Copy,
                from_path.clone(),
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
            "COPY",
            &from_path,
            &to_path,
            &format!("count={}; ms={}", total, started.elapsed().as_millis()),
        );
        ok += 1;
        emit_progress(
            &app,
            OpKind::Copy,
            from_path.clone(),
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

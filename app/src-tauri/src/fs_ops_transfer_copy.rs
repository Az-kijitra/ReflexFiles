use std::fs;
use std::path::PathBuf;
use std::time::Instant;

use tauri::AppHandle;

use crate::fs_ops_preflight::{preflight_copy_pairs, preflight_transfer};
use crate::fs_ops_transfer_helpers::{
    cancel_requested, copy_recursively, emit_progress, io_error_code, record_failure,
    reset_cancel_request,
};
use crate::storage_provider::{resolve_legacy_path_for, ProviderCapability};
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
    let resolved_destination = match resolve_legacy_path_for(&destination, ProviderCapability::Copy)
    {
        Ok(path) => path,
        Err(err) => {
            crate::log_error(
                "copy",
                "batch",
                &destination,
                &format!("code={}; {}", err.code(), err),
            );
            return Err(format!("code={}; {}", err.code(), err));
        }
    };
    let mut resolved_items: Vec<(String, PathBuf)> = Vec::with_capacity(items.len());
    for item in &items {
        let resolved = match resolve_legacy_path_for(item, ProviderCapability::Copy) {
            Ok(path) => path,
            Err(err) => {
                crate::log_error(
                    "copy",
                    item,
                    &destination,
                    &format!("code={}; {}", err.code(), err),
                );
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
                "copy",
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
            OpKind::Copy,
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
                crate::log_error("copy", &raw_item, "-", err);
                failed += 1;
                record_failure(&mut failures, &raw_item, "invalid_path", err);
                emit_progress(
                    &app,
                    OpKind::Copy,
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
        if from == to {
            let err = "source and destination are the same";
            crate::log_error("copy", &raw_item, &to.to_string_lossy(), err);
            failed += 1;
            record_failure(&mut failures, &raw_item, "same_path", err);
            emit_progress(
                &app,
                OpKind::Copy,
                raw_item.clone(),
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
                crate::log_error("copy", &raw_item, &to.to_string_lossy(), err);
                failed += 1;
                record_failure(&mut failures, &raw_item, "same_path", err);
                emit_progress(
                    &app,
                    OpKind::Copy,
                    raw_item.clone(),
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
            crate::log_error("copy", &raw_item, &to.to_string_lossy(), &message);
            failed += 1;
            record_failure(&mut failures, &raw_item, code, &message);
            emit_progress(
                &app,
                OpKind::Copy,
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
            "COPY",
            &raw_item,
            &to.to_string_lossy(),
            &format!("count={}; ms={}", total, started.elapsed().as_millis()),
        );
        ok += 1;
        emit_progress(
            &app,
            OpKind::Copy,
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

#[tauri::command]
pub fn fs_copy_pairs(app: AppHandle, pairs: Vec<CopyPair>) -> Result<OpSummary, String> {
    let started = Instant::now();
    reset_cancel_request();
    let pair_inputs: Vec<(String, String)> = pairs
        .iter()
        .map(|pair| (pair.from.clone(), pair.to.clone()))
        .collect();
    let mut resolved_pairs: Vec<(String, String, PathBuf, PathBuf)> =
        Vec::with_capacity(pair_inputs.len());
    for (from_raw, to_raw) in &pair_inputs {
        let resolved_from = match resolve_legacy_path_for(from_raw, ProviderCapability::Copy) {
            Ok(path) => path,
            Err(err) => {
                crate::log_error(
                    "copy",
                    from_raw,
                    to_raw,
                    &format!("code={}; {}", err.code(), err),
                );
                return Err(format!("code={}; {}", err.code(), err));
            }
        };
        let resolved_to = match resolve_legacy_path_for(to_raw, ProviderCapability::Create) {
            Ok(path) => path,
            Err(err) => {
                crate::log_error(
                    "copy",
                    from_raw,
                    to_raw,
                    &format!("code={}; {}", err.code(), err),
                );
                return Err(format!("code={}; {}", err.code(), err));
            }
        };
        resolved_pairs.push((from_raw.clone(), to_raw.clone(), resolved_from, resolved_to));
    }
    let resolved_pair_inputs: Vec<(String, String)> = resolved_pairs
        .iter()
        .map(|(_, _, from, to)| {
            (
                from.to_string_lossy().to_string(),
                to.to_string_lossy().to_string(),
            )
        })
        .collect();
    if let Err(err) = preflight_copy_pairs(&resolved_pair_inputs) {
        crate::log_error(
            "copy",
            "pairs",
            "-",
            &format!("code={}; {}", err.code, err.message),
        );
        return Err(format!("code={}; {}", err.code, err.message));
    }
    let total = resolved_pairs.len();
    let mut ok = 0u64;
    let mut failed = 0u64;
    let mut failures = Vec::new();
    for (index, (from_raw, to_raw, from, to)) in resolved_pairs.into_iter().enumerate() {
        if cancel_requested() {
            break;
        }
        emit_progress(
            &app,
            OpKind::Copy,
            from_raw.clone(),
            index,
            total,
            OpStatus::Start,
            String::new(),
        );
        if from_raw.trim().is_empty() || to_raw.trim().is_empty() {
            let err = "invalid path";
            crate::log_error("copy", &from_raw, &to_raw, err);
            failed += 1;
            record_failure(&mut failures, &from_raw, "invalid_path", err);
            emit_progress(
                &app,
                OpKind::Copy,
                from_raw.clone(),
                index,
                total,
                OpStatus::Fail,
                err.to_string(),
            );
            continue;
        }
        if from == to {
            let err = "source and destination are the same";
            crate::log_error("copy", &from_raw, &to_raw, err);
            failed += 1;
            record_failure(&mut failures, &from_raw, "same_path", err);
            emit_progress(
                &app,
                OpKind::Copy,
                from_raw.clone(),
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
                crate::log_error("copy", &from_raw, &to_raw, err);
                failed += 1;
                record_failure(&mut failures, &from_raw, "same_path", err);
                emit_progress(
                    &app,
                    OpKind::Copy,
                    from_raw.clone(),
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
            crate::log_error("copy", &from_raw, &to_raw, &message);
            failed += 1;
            record_failure(&mut failures, &from_raw, code, &message);
            emit_progress(
                &app,
                OpKind::Copy,
                from_raw.clone(),
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
            &from_raw,
            &to_raw,
            &format!("count={}; ms={}", total, started.elapsed().as_millis()),
        );
        ok += 1;
        emit_progress(
            &app,
            OpKind::Copy,
            from_raw.clone(),
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

use std::fs;
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Instant;

use tauri::AppHandle;

use crate::fs_ops_preflight::{preflight_copy_pairs, preflight_transfer};
use crate::fs_ops_transfer_helpers::{
    cancel_requested, copy_recursively, emit_progress, io_error_code, record_failure,
    reset_cancel_request,
};
#[cfg(not(feature = "gdrive-readonly-stub"))]
use crate::gdrive_real::{
    gdrive_copy_file_to_gdrive_for_ref_impl, gdrive_copy_file_to_local_for_ref_impl,
    gdrive_entry_info_for_ref_impl, gdrive_upload_file_from_path_to_dir_for_ref_impl,
};
use crate::storage_provider::{provider_registry, resolve_legacy_path_for, ProviderCapability};
use crate::types::{OpKind, OpStatus, OpSummary, ResourceRef, StorageProvider};

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
    name_overrides: Option<HashMap<String, String>>,
) -> Result<OpSummary, String> {
    let started = Instant::now();
    reset_cancel_request();
    let registry = provider_registry();
    let destination_ref = match registry.resource_ref_from_legacy_path(&destination) {
        Ok(value) => value,
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
    let mut item_refs: Vec<(String, ResourceRef)> = Vec::with_capacity(items.len());
    for item in &items {
        match registry.resource_ref_from_legacy_path(item) {
            Ok(resource_ref) => item_refs.push((item.clone(), resource_ref)),
            Err(err) => {
                crate::log_error(
                    "copy",
                    item,
                    &destination,
                    &format!("code={}; {}", err.code(), err),
                );
                return Err(format!("code={}; {}", err.code(), err));
            }
        }
    }

    let all_local = matches!(destination_ref.provider, StorageProvider::Local)
        && item_refs
            .iter()
            .all(|(_, resource_ref)| matches!(resource_ref.provider, StorageProvider::Local));

    if all_local {
        return fs_copy_all_local(app, items, destination, started);
    }
    fs_copy_mixed(
        app,
        item_refs,
        destination,
        destination_ref,
        name_overrides,
        started,
    )
}

fn fs_copy_all_local(
    app: AppHandle,
    items: Vec<String>,
    destination: String,
    started: Instant,
) -> Result<OpSummary, String> {
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

fn fs_copy_mixed(
    app: AppHandle,
    item_refs: Vec<(String, ResourceRef)>,
    destination_raw: String,
    destination_ref: ResourceRef,
    name_overrides: Option<HashMap<String, String>>,
    started: Instant,
) -> Result<OpSummary, String> {
    let local_destination = if matches!(destination_ref.provider, StorageProvider::Local) {
        match resolve_legacy_path_for(&destination_raw, ProviderCapability::Copy) {
            Ok(path) => Some(path),
            Err(err) => {
                crate::log_error(
                    "copy",
                    "batch",
                    &destination_raw,
                    &format!("code={}; {}", err.code(), err),
                );
                return Err(format!("code={}; {}", err.code(), err));
            }
        }
    } else {
        None
    };

    if let Some(dest) = &local_destination {
        if !dest.exists() {
            let err = "code=not_found; destination not found";
            crate::log_error("copy", "batch", &destination_raw, err);
            return Err(err.to_string());
        }
        if !dest.is_dir() {
            let err = "code=invalid_path; destination is not a directory";
            crate::log_error("copy", "batch", &destination_raw, err);
            return Err(err.to_string());
        }
    }

    let total = item_refs.len();
    let mut ok = 0u64;
    let mut failed = 0u64;
    let mut failures = Vec::new();

    for (index, (raw_item, source_ref)) in item_refs.into_iter().enumerate() {
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

        let copy_result = if let Some(dest_dir) = &local_destination {
            match source_ref.provider {
                StorageProvider::Local => {
                    let from = match resolve_legacy_path_for(&raw_item, ProviderCapability::Copy) {
                        Ok(path) => path,
                        Err(err) => {
                            let text = format!("code={}; {}", err.code(), err);
                            crate::log_error("copy", &raw_item, &destination_raw, &text);
                            let (_code, message) = split_error_code_and_message(&text);
                            failed += 1;
                            record_failure(&mut failures, &raw_item, err.code(), &message);
                            emit_progress(
                                &app,
                                OpKind::Copy,
                                raw_item.clone(),
                                index,
                                total,
                                OpStatus::Fail,
                                message,
                            );
                            continue;
                        }
                    };
                    copy_local_source_to_local_destination(&from, dest_dir)
                }
                StorageProvider::Gdrive => {
                    #[cfg(not(feature = "gdrive-readonly-stub"))]
                    {
                        let source_info = match gdrive_entry_info_for_ref_impl(&source_ref) {
                            Ok(info) => info,
                            Err(err) => {
                                let text = format!("code={}; {}", err.code(), err);
                                crate::log_error("copy", &raw_item, &destination_raw, &text);
                                let (code, message) = split_error_code_and_message(&text);
                                failed += 1;
                                record_failure(&mut failures, &raw_item, &code, &message);
                                emit_progress(
                                    &app,
                                    OpKind::Copy,
                                    raw_item.clone(),
                                    index,
                                    total,
                                    OpStatus::Fail,
                                    message,
                                );
                                continue;
                            }
                        };
                        if source_info.is_dir {
                            Err(format!(
                                "code=invalid_path; gdrive directory copy is not supported: {}",
                                source_ref.resource_id
                            ))
                        } else {
                            let to = dest_dir.join(source_info.name);
                            gdrive_copy_file_to_local_for_ref_impl(&source_ref, &to)
                                .map(|actual| actual.to_string_lossy().to_string())
                                .map_err(|err| format!("code={}; {}", err.code(), err))
                        }
                    }
                    #[cfg(feature = "gdrive-readonly-stub")]
                    {
                        Err("code=permission_denied; provider capability denied: copy".to_string())
                    }
                }
                StorageProvider::Unknown => {
                    Err("code=invalid_path; unsupported storage provider".to_string())
                }
            }
        } else {
            let override_name = name_overrides
                .as_ref()
                .and_then(|map| map.get(&raw_item))
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty());
            match destination_ref.provider {
                StorageProvider::Gdrive => match source_ref.provider {
                    StorageProvider::Local => {
                        let from = match resolve_legacy_path_for(&raw_item, ProviderCapability::Copy) {
                            Ok(path) => path,
                            Err(err) => {
                                let text = format!("code={}; {}", err.code(), err);
                                crate::log_error("copy", &raw_item, &destination_raw, &text);
                                let (_code, message) = split_error_code_and_message(&text);
                                failed += 1;
                                record_failure(&mut failures, &raw_item, err.code(), &message);
                                emit_progress(
                                    &app,
                                    OpKind::Copy,
                                    raw_item.clone(),
                                    index,
                                    total,
                                    OpStatus::Fail,
                                    message,
                                );
                                continue;
                            }
                        };
                        if from.is_dir() {
                            Err(format!(
                                "code=invalid_path; local directory copy to gdrive is not supported: {}",
                                from.to_string_lossy()
                            ))
                        } else {
                            #[cfg(not(feature = "gdrive-readonly-stub"))]
                            {
                                gdrive_upload_file_from_path_to_dir_for_ref_impl(
                                    &destination_ref,
                                    &from,
                                    override_name.as_deref(),
                                )
                                .map(|revision| {
                                    format!(
                                        "gdrive://{}/{}",
                                        destination_ref.resource_id, revision.file_id
                                    )
                                })
                                .map_err(|err| format!("code={}; {}", err.code(), err))
                            }
                            #[cfg(feature = "gdrive-readonly-stub")]
                            {
                                Err(
                                    "code=permission_denied; provider capability denied: copy"
                                        .to_string(),
                                )
                            }
                        }
                    }
                    StorageProvider::Gdrive => {
                        #[cfg(not(feature = "gdrive-readonly-stub"))]
                        {
                            gdrive_copy_file_to_gdrive_for_ref_impl(
                                &source_ref,
                                &destination_ref,
                                override_name.as_deref(),
                            )
                                .map(|revision| {
                                    format!(
                                        "gdrive://{}/{}",
                                        destination_ref.resource_id, revision.file_id
                                    )
                                })
                                .map_err(|err| format!("code={}; {}", err.code(), err))
                        }
                        #[cfg(feature = "gdrive-readonly-stub")]
                        {
                            Err("code=permission_denied; provider capability denied: copy".to_string())
                        }
                    }
                    StorageProvider::Unknown => {
                        Err("code=invalid_path; unsupported storage provider".to_string())
                    }
                },
                StorageProvider::Local => {
                    Err("code=invalid_path; mixed copy destination is invalid".to_string())
                }
                StorageProvider::Unknown => {
                    Err("code=invalid_path; unsupported storage provider".to_string())
                }
            }
        };

        match copy_result {
            Ok(to_display) => {
                crate::log_event(
                    "COPY",
                    &raw_item,
                    &to_display,
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
            Err(text) => {
                let (code, message) = split_error_code_and_message(&text);
                crate::log_error("copy", &raw_item, &destination_raw, &message);
                failed += 1;
                record_failure(&mut failures, &raw_item, &code, &message);
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
            }
        }
    }

    Ok(OpSummary {
        ok,
        failed,
        total: total as u64,
        failures,
    })
}

fn copy_local_source_to_local_destination(from: &PathBuf, destination_dir: &PathBuf) -> Result<String, String> {
    let name = from.file_name().ok_or_else(|| "code=invalid_path; invalid path".to_string())?;
    let to = destination_dir.join(name);
    if from == &to {
        return Err("code=same_path; source and destination are the same".to_string());
    }
    if let (Ok(from_canon), Ok(to_canon)) = (fs::canonicalize(from), fs::canonicalize(&to)) {
        if from_canon == to_canon {
            return Err("code=same_path; source and destination are the same".to_string());
        }
    }
    copy_recursively(from, &to)
        .map(|_| to.to_string_lossy().to_string())
        .map_err(|err| format!("code={}; {}", io_error_code(&err), err))
}

fn split_error_code_and_message(text: &str) -> (String, String) {
    let trimmed = text.trim();
    if let Some(rest) = trimmed.strip_prefix("code=") {
        if let Some((code, message)) = rest.split_once(';') {
            return (code.trim().to_string(), message.trim().to_string());
        }
    }
    ("io_error".to_string(), trimmed.to_string())
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

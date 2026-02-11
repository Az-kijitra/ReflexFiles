use std::fs;
use std::io;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Emitter};

use crate::types::{OpFailure, OpKind, OpProgress, OpStatus, EVENT_OP_PROGRESS};

static OP_CANCEL_REQUESTED: AtomicBool = AtomicBool::new(false);

pub fn reset_cancel_request() {
    OP_CANCEL_REQUESTED.store(false, Ordering::SeqCst);
}

pub fn request_cancel() {
    OP_CANCEL_REQUESTED.store(true, Ordering::SeqCst);
}

pub fn cancel_requested() -> bool {
    OP_CANCEL_REQUESTED.load(Ordering::SeqCst)
}

fn cancel_error() -> io::Error {
    io::Error::new(io::ErrorKind::Interrupted, "canceled")
}

fn ensure_not_canceled() -> io::Result<()> {
    if cancel_requested() {
        Err(cancel_error())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn op_cancel() {
    request_cancel();
}

pub fn copy_recursively(from: &Path, to: &Path) -> io::Result<()> {
    ensure_not_canceled()?;
    if from.is_dir() {
        fs::create_dir_all(to)?;
        for entry in fs::read_dir(from)? {
            ensure_not_canceled()?;
            let entry = entry?;
            let child_from = entry.path();
            let child_to = to.join(entry.file_name());
            copy_recursively(&child_from, &child_to)?;
        }
    } else {
        if let Some(parent) = to.parent() {
            fs::create_dir_all(parent)?;
        }
        ensure_not_canceled()?;
        fs::copy(from, to)?;
    }
    Ok(())
}

pub fn remove_recursively(path: &Path) -> io::Result<()> {
    ensure_not_canceled()?;
    if path.is_dir() {
        fs::remove_dir_all(path)?;
    } else {
        fs::remove_file(path)?;
    }
    Ok(())
}

pub fn emit_progress(
    app: &AppHandle,
    op: OpKind,
    path: String,
    index: usize,
    total: usize,
    status: OpStatus,
    error: String,
) {
    let _ = app.emit(
        EVENT_OP_PROGRESS,
        OpProgress {
            op,
            path,
            index: (index + 1) as u64,
            total: total as u64,
            status,
            error,
        },
    );
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
        ErrorKind::Interrupted => "canceled",
        _ => "io_error",
    }
}

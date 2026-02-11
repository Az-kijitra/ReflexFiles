use crate::clipboard::{clipboard_get_files_impl, clipboard_set_files_impl, ClipboardFiles};
use crate::error::{format_error, AppErrorKind};

#[tauri::command]
pub fn clipboard_set_files(
    paths: Vec<String>,
    cut: bool,
    effect: Option<String>,
) -> Result<(), String> {
    clipboard_set_files_impl(paths, cut, effect)
        .map_err(|err| format_error(AppErrorKind::Io, err))
}

#[tauri::command]
pub fn clipboard_get_files() -> Result<ClipboardFiles, String> {
    clipboard_get_files_impl().map_err(|err| format_error(AppErrorKind::Io, err))
}

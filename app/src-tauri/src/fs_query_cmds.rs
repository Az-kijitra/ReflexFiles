use crate::fs_query::{
    fs_dir_stats_impl, fs_get_properties_impl, fs_list_dir_impl, fs_read_image_data_url_impl,
    fs_read_text_impl,
};
use crate::types::{DirStats, Entry, Properties};

#[tauri::command]
pub fn fs_list_dir(
    path: String,
    show_hidden: bool,
    sort_key: String,
    sort_order: String,
) -> Result<Vec<Entry>, String> {
    fs_list_dir_impl(path, show_hidden, sort_key, sort_order)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_read_text(path: String, max_bytes: usize) -> Result<String, String> {
    fs_read_text_impl(path, max_bytes).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_read_image_data_url(path: String, normalize: Option<bool>) -> Result<String, String> {
    fs_read_image_data_url_impl(path, normalize.unwrap_or(false))
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_get_properties(path: String) -> Result<Properties, String> {
    fs_get_properties_impl(path).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_dir_stats(path: String, timeout_ms: u64) -> Result<DirStats, String> {
    fs_dir_stats_impl(path, timeout_ms).map_err(|err| format!("code={}; {}", err.code(), err))
}

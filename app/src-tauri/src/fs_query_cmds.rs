use crate::fs_query::{
    fs_dir_stats_impl, fs_get_capabilities_by_ref_impl, fs_get_capabilities_impl,
    fs_get_properties_by_ref_impl, fs_get_properties_impl, fs_is_probably_text_by_ref_impl,
    fs_is_probably_text_impl, fs_list_dir_by_ref_impl, fs_list_dir_impl,
    fs_read_image_data_url_by_ref_impl, fs_read_image_data_url_impl,
    fs_read_image_normalized_temp_path_by_ref_impl, fs_read_image_normalized_temp_path_impl,
    fs_read_text_by_ref_impl, fs_read_text_impl, fs_read_text_viewport_lines_by_ref_impl,
    fs_read_text_viewport_lines_impl, fs_text_viewport_info_by_ref_impl,
    fs_text_viewport_info_impl, TextViewportChunk, TextViewportInfo,
};
use crate::types::{DirStats, Entry, Properties, ProviderCapabilities, ResourceRef};

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
pub fn fs_list_dir_by_ref(
    resource_ref: ResourceRef,
    show_hidden: bool,
    sort_key: String,
    sort_order: String,
) -> Result<Vec<Entry>, String> {
    fs_list_dir_by_ref_impl(resource_ref, show_hidden, sort_key, sort_order)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_read_text(path: String, max_bytes: usize) -> Result<String, String> {
    fs_read_text_impl(path, max_bytes).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_read_text_by_ref(resource_ref: ResourceRef, max_bytes: usize) -> Result<String, String> {
    fs_read_text_by_ref_impl(resource_ref, max_bytes)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_is_probably_text(path: String, sample_bytes: usize) -> Result<bool, String> {
    fs_is_probably_text_impl(path, sample_bytes)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_is_probably_text_by_ref(
    resource_ref: ResourceRef,
    sample_bytes: usize,
) -> Result<bool, String> {
    fs_is_probably_text_by_ref_impl(resource_ref, sample_bytes)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_read_image_data_url(path: String, normalize: Option<bool>) -> Result<String, String> {
    fs_read_image_data_url_impl(path, normalize.unwrap_or(false))
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_read_image_data_url_by_ref(
    resource_ref: ResourceRef,
    normalize: Option<bool>,
) -> Result<String, String> {
    fs_read_image_data_url_by_ref_impl(resource_ref, normalize.unwrap_or(false))
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_read_image_normalized_temp_path(path: String) -> Result<String, String> {
    fs_read_image_normalized_temp_path_impl(path)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_read_image_normalized_temp_path_by_ref(
    resource_ref: ResourceRef,
) -> Result<String, String> {
    fs_read_image_normalized_temp_path_by_ref_impl(resource_ref)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}
#[tauri::command]
pub fn fs_get_properties(path: String) -> Result<Properties, String> {
    fs_get_properties_impl(path).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_get_properties_by_ref(resource_ref: ResourceRef) -> Result<Properties, String> {
    fs_get_properties_by_ref_impl(resource_ref)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_get_capabilities(path: String) -> Result<ProviderCapabilities, String> {
    fs_get_capabilities_impl(path).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_get_capabilities_by_ref(
    resource_ref: ResourceRef,
) -> Result<ProviderCapabilities, String> {
    fs_get_capabilities_by_ref_impl(resource_ref)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_dir_stats(path: String, timeout_ms: u64) -> Result<DirStats, String> {
    fs_dir_stats_impl(path, timeout_ms).map_err(|err| format!("code={}; {}", err.code(), err))
}
#[tauri::command]
pub fn fs_text_viewport_info(path: String) -> Result<TextViewportInfo, String> {
    fs_text_viewport_info_impl(path).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_text_viewport_info_by_ref(resource_ref: ResourceRef) -> Result<TextViewportInfo, String> {
    fs_text_viewport_info_by_ref_impl(resource_ref)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_read_text_viewport_lines(
    path: String,
    start_line: usize,
    line_count: usize,
) -> Result<TextViewportChunk, String> {
    fs_read_text_viewport_lines_impl(path, start_line, line_count)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn fs_read_text_viewport_lines_by_ref(
    resource_ref: ResourceRef,
    start_line: usize,
    line_count: usize,
) -> Result<TextViewportChunk, String> {
    fs_read_text_viewport_lines_by_ref_impl(resource_ref, start_line, line_count)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

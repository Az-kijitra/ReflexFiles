use crate::config::load_config;

#[tauri::command]
pub fn winmerge_compare_files(path1: String, path2: String) -> Result<(), String> {
    let configured_path = load_config().external_winmerge_path.clone();
    crate::winmerge_ops::winmerge_compare_files_impl(&path1, &path2, &configured_path)
}

#[tauri::command]
pub fn winmerge_compare_git_head(path: String) -> Result<(), String> {
    let configured_path = load_config().external_winmerge_path.clone();
    crate::winmerge_ops::winmerge_compare_git_head_impl(&path, &configured_path)
}

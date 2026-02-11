use crate::external_apps::{
    external_open_cmd_impl, external_open_custom_impl, external_open_explorer_impl,
    external_open_git_client_impl, external_open_vscode_impl, external_open_with_app_impl,
};

#[tauri::command]
pub fn external_open_with_app(path: String, app: String) -> Result<(), String> {
    external_open_with_app_impl(path, app).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn external_open_explorer(path: String) -> Result<(), String> {
    external_open_explorer_impl(path).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn external_open_cmd(path: String) -> Result<(), String> {
    external_open_cmd_impl(path).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn external_open_vscode(path: String) -> Result<(), String> {
    external_open_vscode_impl(path).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn external_open_git_client(path: String) -> Result<(), String> {
    external_open_git_client_impl(path).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn external_open_custom(command: String, args: Vec<String>) -> Result<(), String> {
    external_open_custom_impl(command, args).map_err(|err| format!("code={}; {}", err.code(), err))
}

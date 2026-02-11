#[tauri::command]
pub fn app_exit(app: tauri::AppHandle) {
    app.exit(0);
}

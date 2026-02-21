#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    configure_windows_webview_logging();
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());
    builder
        .setup(|app| {
            use tauri::{Manager, PhysicalPosition, PhysicalSize};
            let config = crate::config::load_config();
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
                if config.ui_window_maximized {
                    let _ = window.maximize();
                } else if config.ui_window_width > 0 && config.ui_window_height > 0 {
                    let _ = window.set_size(PhysicalSize::new(
                        config.ui_window_width,
                        config.ui_window_height,
                    ));
                    let _ = window.set_position(PhysicalPosition::new(
                        config.ui_window_x,
                        config.ui_window_y,
                    ));
                }
                let _ = window.show();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            crate::fs_query_cmds::fs_list_dir,
            crate::fs_query_cmds::fs_list_dir_by_ref,
            crate::fs_ops_transfer_copy::fs_copy,
            crate::fs_ops_transfer_copy::fs_copy_pairs,
            crate::fs_ops_transfer_move::fs_move,
            crate::fs_ops_transfer_helpers::op_cancel,
            crate::fs_ops_create::fs_create,
            crate::fs_ops_rename::fs_rename,
            crate::fs_query_cmds::fs_read_text,
            crate::fs_query_cmds::fs_text_viewport_info,
            crate::fs_query_cmds::fs_read_text_viewport_lines,
            crate::fs_query_cmds::fs_is_probably_text,
            crate::fs_query_cmds::fs_read_image_data_url,
            crate::fs_query_cmds::fs_read_image_normalized_temp_path,
            crate::fs_ops_archive::zip_create,
            crate::fs_ops_archive::zip_extract,
            crate::fs_query_cmds::fs_get_properties,
            crate::fs_query_cmds::fs_get_properties_by_ref,
            crate::fs_query_cmds::fs_get_capabilities,
            crate::fs_query_cmds::fs_get_capabilities_by_ref,
            crate::fs_query_cmds::fs_dir_stats,
            crate::fs_ops_delete::fs_delete_trash,
            crate::fs_ops_delete::fs_delete_with_undo,
            crate::config_cmds::config_get,
            crate::config_cmds::config_get_startup,
            crate::config_cmds::undo_redo_load_session,
            crate::config_cmds::undo_redo_save_session,
            crate::config_cmds::config_get_path,
            crate::config_cmds::config_open_in_editor,
            crate::config_cmds::config_create_backup,
            crate::config_cmds::config_restore_latest_backup,
            crate::config_cmds::config_generate_diagnostic_report,
            crate::config_cmds::config_set_dir_stats_timeout,
            crate::config_cmds::config_save_preferences,
            crate::config_cmds::config_save_ui_state,
            crate::config_cmds::set_window_theme,
            crate::clipboard_cmds::clipboard_set_files,
            crate::clipboard_cmds::clipboard_get_files,
            crate::external_apps_cmds::external_open_with_app,
            crate::external_apps_cmds::external_open_explorer,
            crate::external_apps_cmds::external_open_cmd,
            crate::external_apps_cmds::external_open_terminal_profile,
            crate::external_apps_cmds::external_open_terminal_kind,
            crate::external_apps_cmds::external_open_vscode,
            crate::external_apps_cmds::external_open_git_client,
            crate::external_apps_cmds::external_open_custom,
            crate::external_apps_cmds::external_list_terminal_profiles,
            crate::system_cmds::app_exit,
            crate::viewer_cmds::open_viewer,
            crate::viewer_cmds::close_viewer,
            crate::viewer_cmds::viewer_take_pending_path,
            crate::viewer_cmds::viewer_take_pending_open,
            crate::watch::fs_watch_start,
            crate::watch::fs_watch_stop
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(target_os = "windows")]
fn configure_windows_webview_logging() {
    let key = "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS";
    let mut args = std::env::var(key).unwrap_or_default();

    // Reduce Chromium/WebView2 shutdown noise on Windows consoles.
    if !args.contains("--disable-logging") {
        if !args.is_empty() {
            args.push(' ');
        }
        args.push_str("--disable-logging");
    }
    if !args.contains("--log-level=") {
        if !args.is_empty() {
            args.push(' ');
        }
        args.push_str("--log-level=3");
    }

    if !args.is_empty() {
        unsafe { std::env::set_var(key, args) };
    }
}

#[cfg(not(target_os = "windows"))]
fn configure_windows_webview_logging() {}

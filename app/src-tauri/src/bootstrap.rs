#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    configure_windows_webview_logging();
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_page_load(|webview, _payload| {
            #[cfg(target_os = "windows")]
            if webview.label() == "main" {
                eprintln!("[bootstrap] on_page_load main -> disable browser accelerator keys");
                disable_windows_browser_accelerator_keys(webview);
            }
        });
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
            crate::fs_query_cmds::fs_read_text_by_ref,
            crate::fs_query_cmds::fs_text_viewport_info,
            crate::fs_query_cmds::fs_text_viewport_info_by_ref,
            crate::fs_query_cmds::fs_read_text_viewport_lines,
            crate::fs_query_cmds::fs_read_text_viewport_lines_by_ref,
            crate::fs_query_cmds::fs_is_probably_text,
            crate::fs_query_cmds::fs_is_probably_text_by_ref,
            crate::fs_query_cmds::fs_read_image_data_url,
            crate::fs_query_cmds::fs_read_image_data_url_by_ref,
            crate::fs_query_cmds::fs_read_image_normalized_temp_path,
            crate::fs_query_cmds::fs_read_image_normalized_temp_path_by_ref,
            crate::fs_ops_archive::zip_create,
            crate::fs_ops_archive::zip_extract,
            crate::fs_ops_archive::zip_extract_list_conflicts,
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
            crate::gdrive_auth_cmds::gdrive_auth_get_status,
            crate::gdrive_auth_cmds::gdrive_auth_start_session,
            crate::gdrive_auth_cmds::gdrive_auth_validate_callback,
            crate::gdrive_auth_cmds::gdrive_auth_wait_for_callback,
            crate::gdrive_auth_cmds::gdrive_auth_complete_exchange,
            crate::gdrive_auth_cmds::gdrive_auth_sign_out,
            crate::gdrive_auth_cmds::gdrive_auth_store_client_secret,
            crate::gdrive_auth_cmds::gdrive_auth_load_client_secret,
            crate::gdrive_auth_cmds::gdrive_auth_clear_client_secret,
            crate::gdrive_edit_cmds::gdrive_prepare_edit_workcopy,
            crate::gdrive_edit_cmds::gdrive_check_edit_conflict,
            crate::gdrive_edit_cmds::gdrive_apply_edit_workcopy,
            crate::gdrive_edit_cmds::gdrive_get_edit_workcopy_state,
            crate::gdrive_edit_cmds::gdrive_get_edit_workcopy_states,
            crate::gdrive_edit_cmds::gdrive_list_edit_workcopies,
            crate::gdrive_edit_cmds::gdrive_delete_edit_workcopy,
            crate::gdrive_edit_cmds::gdrive_cleanup_edit_workcopies,
            crate::watch::fs_watch_start,
            crate::watch::fs_watch_stop
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(target_os = "windows")]
fn disable_windows_browser_accelerator_keys(webview: &tauri::Webview) {
    use std::sync::OnceLock;

    use webview2_com::AcceleratorKeyPressedEventHandler;
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        COREWEBVIEW2_KEY_EVENT_KIND, ICoreWebView2AcceleratorKeyPressedEventArgs,
        ICoreWebView2Settings3,
    };
    use windows::core::Interface;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetKeyState, VK_CONTROL};

    static MAIN_ACCEL_HOOK_INSTALLED: OnceLock<()> = OnceLock::new();

    let webview_for_hook = webview.clone();
    let result = webview.with_webview(move |platform_webview| unsafe {
        let Ok(core) = platform_webview.controller().CoreWebView2() else {
            eprintln!("[bootstrap] CoreWebView2() not ready");
            return;
        };
        let Ok(settings) = core.Settings() else {
            eprintln!("[bootstrap] CoreWebView2.Settings() failed");
            return;
        };
        let Ok(settings3) = settings.cast::<ICoreWebView2Settings3>() else {
            eprintln!("[bootstrap] cast ICoreWebView2Settings3 failed");
            return;
        };
        match settings3.SetAreBrowserAcceleratorKeysEnabled(false) {
            Ok(_) => eprintln!("[bootstrap] SetAreBrowserAcceleratorKeysEnabled(false): OK"),
            Err(err) => eprintln!(
                "[bootstrap] SetAreBrowserAcceleratorKeysEnabled(false): ERR {err}"
            ),
        }

        if MAIN_ACCEL_HOOK_INSTALLED.get().is_none() {
            let webview_clone = webview_for_hook.clone();
            let mut token = 0i64;
            match platform_webview.controller().add_AcceleratorKeyPressed(
                &AcceleratorKeyPressedEventHandler::create(Box::new(move |_ctrl, args: Option<ICoreWebView2AcceleratorKeyPressedEventArgs>| {
                    let Some(args) = args else {
                        return Ok(());
                    };
                    let mut kind = COREWEBVIEW2_KEY_EVENT_KIND(0);
                    args.KeyEventKind(&mut kind)?;
                    let mut virtual_key = 0u32;
                    args.VirtualKey(&mut virtual_key)?;
                    let ctrl_down = (GetKeyState(VK_CONTROL.0 as i32) as i16) < 0;
                    // Ctrl+F (VK_F = 0x46). Handle on key down and inject a synthetic key event to JS.
                    if ctrl_down
                        && virtual_key == 0x46
                        && (kind.0 == 0 || kind.0 == 2)
                    {
                        eprintln!("[bootstrap] Ctrl+F intercepted (kind={})", kind.0);
                        let _ = args.SetHandled(true);
                        match webview_clone.eval(
                            r#"window.dispatchEvent(new KeyboardEvent("keydown",{key:"f",code:"KeyF",ctrlKey:true,bubbles:true,cancelable:true}));"#,
                        ) {
                            Ok(_) => eprintln!("[bootstrap] Ctrl+F bridge eval: OK"),
                            Err(err) => eprintln!("[bootstrap] Ctrl+F bridge eval: ERR {err}"),
                        }
                    }
                    Ok(())
                })),
                &mut token,
            ) {
                Ok(_) => {
                    let _ = MAIN_ACCEL_HOOK_INSTALLED.set(());
                    eprintln!("[bootstrap] add_AcceleratorKeyPressed(Ctrl+F bridge): OK");
                }
                Err(err) => eprintln!(
                    "[bootstrap] add_AcceleratorKeyPressed(Ctrl+F bridge): ERR {err}"
                ),
            }
        }
    });
    if let Err(err) = result {
        eprintln!("[bootstrap] with_webview failed: {err}");
    }
}

#[cfg(not(target_os = "windows"))]
fn disable_windows_browser_accelerator_keys(_webview: &tauri::Webview) {}

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

use once_cell::sync::Lazy;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;
use tauri::{PhysicalPosition, PhysicalSize, WebviewWindow, WindowEvent};

const VIEWER_LABEL: &str = "viewer";
const VIEWER_EVENT_OPEN_PATH: &str = "viewer:open-path";
const VIEWER_DEFAULT_WIDTH: u32 = 1024;
const VIEWER_DEFAULT_HEIGHT: u32 = 768;
const VIEWER_MIN_WIDTH: u32 = 640;
const VIEWER_MIN_HEIGHT: u32 = 480;
const VIEWER_INIT_SCRIPT: &str = r###"
(() => {
  try {
    sessionStorage.setItem("__rf_viewer_window", "1");
    if (location.pathname !== "/viewer") {
      history.replaceState({}, "", "/viewer");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  } catch (_) {}
})();
window.addEventListener("error", (event) => {
  try {
    const msg = String((event && event.error && event.error.stack) || (event && event.message) || "unknown error");
    const root = document.body || document.documentElement;
    if (root) {
      root.innerHTML = `<pre style="margin:0;padding:12px;font:12px Consolas,monospace;white-space:pre-wrap;background:#111827;color:#fecaca;">${msg.replace(/[&<>]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}</pre>`;
    }
  } catch (_) {}
});
window.addEventListener("unhandledrejection", (event) => {
  try {
    const msg = String((event && event.reason && event.reason.stack) || (event && event.reason) || "unhandled rejection");
    const root = document.body || document.documentElement;
    if (root) {
      root.innerHTML = `<pre style="margin:0;padding:12px;font:12px Consolas,monospace;white-space:pre-wrap;background:#111827;color:#fecaca;">${msg.replace(/[&<>]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}</pre>`;
    }
  } catch (_) {}
});
"###;

static VIEWER_PENDING_OPEN: Lazy<Mutex<Option<ViewerOpenPayload>>> = Lazy::new(|| Mutex::new(None));

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewerOpenPayload {
    path: String,
    jump_hint: Option<String>,
}

fn normalize_windows_verbatim_path(path: &str) -> String {
    if let Some(rest) = path.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{rest}");
    }
    if let Some(rest) = path.strip_prefix(r"\\?\") {
        return rest.to_string();
    }
    path.to_string()
}

fn normalize_file_path(path: &str) -> Result<String, String> {
    let raw = PathBuf::from(path);
    if !raw.exists() {
        return Err(format!("file not found: {}", raw.display()));
    }
    if !raw.is_file() {
        return Err(format!("not a file: {}", raw.display()));
    }
    raw.canonicalize()
        .map_err(|e| format!("canonicalize failed: {e}"))
        .map(|p| normalize_windows_verbatim_path(&p.to_string_lossy()))
}

fn set_pending_open(payload: Option<ViewerOpenPayload>) -> Result<(), String> {
    let mut guard = VIEWER_PENDING_OPEN
        .lock()
        .map_err(|_| "viewer pending path lock poisoned".to_string())?;
    *guard = payload;
    Ok(())
}

fn apply_viewer_window_state(window: &WebviewWindow) {
    let config = crate::config::load_config();
    let has_saved_size = config.viewer_window_width > 0 && config.viewer_window_height > 0;

    let mut width = if has_saved_size {
        config.viewer_window_width
    } else {
        VIEWER_DEFAULT_WIDTH
    }
    .max(VIEWER_MIN_WIDTH);

    let mut height = if has_saved_size {
        config.viewer_window_height
    } else {
        VIEWER_DEFAULT_HEIGHT
    }
    .max(VIEWER_MIN_HEIGHT);

    let mut x = config.viewer_window_x;
    let mut y = config.viewer_window_y;

    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten());

    if let Some(monitor) = monitor {
        // Use work area so taskbar / dock reserved region is excluded.
        let work_area = monitor.work_area();
        let work_pos = work_area.position;
        let work_size = work_area.size;

        let max_width = work_size.width.max(VIEWER_MIN_WIDTH);
        let max_height = work_size.height.max(VIEWER_MIN_HEIGHT);
        width = width.clamp(VIEWER_MIN_WIDTH, max_width);
        height = height.clamp(VIEWER_MIN_HEIGHT, max_height);

        if has_saved_size {
            let min_x = work_pos.x;
            let min_y = work_pos.y;
            let max_x = work_pos.x + (work_size.width as i32 - width as i32).max(0);
            let max_y = work_pos.y + (work_size.height as i32 - height as i32).max(0);
            x = x.clamp(min_x, max_x);
            y = y.clamp(min_y, max_y);
        } else {
            x = work_pos.x + ((work_size.width as i32 - width as i32) / 2).max(0);
            y = work_pos.y + ((work_size.height as i32 - height as i32) / 2).max(0);
        }
    }

    let _ = window.set_size(PhysicalSize::new(width, height));
    let _ = window.set_position(PhysicalPosition::new(x, y));

    if config.viewer_window_maximized {
        let _ = window.maximize();
    }
}

fn persist_viewer_window_state(window: &WebviewWindow) -> Result<(), String> {
    let mut config = crate::config::load_config();
    let maximized = window
        .is_maximized()
        .map_err(|e| format!("failed to query viewer maximized state: {e}"))?;
    config.viewer_window_maximized = maximized;

    if !maximized {
        if let Ok(pos) = window.outer_position() {
            config.viewer_window_x = pos.x;
            config.viewer_window_y = pos.y;
        }
        if let Ok(size) = window.inner_size() {
            config.viewer_window_width = size.width;
            config.viewer_window_height = size.height;
        }
    }

    crate::config::save_config(&config)
        .map_err(|e| format!("failed to save viewer window state: {e}"))
}

fn install_viewer_window_state_handlers(window: &WebviewWindow) {
    let window_for_events = window.clone();
    window.on_window_event(move |event| {
        if matches!(
            event,
            WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed
        ) {
            let _ = persist_viewer_window_state(&window_for_events);
        }
    });
}

#[tauri::command]
pub async fn open_viewer(
    app: tauri::AppHandle,
    path: String,
    jump_hint: Option<String>,
) -> Result<(), String> {
    let resolved = normalize_file_path(&path)?;
    let payload = ViewerOpenPayload {
        path: resolved.clone(),
        jump_hint,
    };
    set_pending_open(Some(payload.clone()))?;

    if let Some(window) = app.get_webview_window(VIEWER_LABEL) {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit_to(VIEWER_LABEL, VIEWER_EVENT_OPEN_PATH, payload);
        return Ok(());
    }

    let window = tauri::WebviewWindowBuilder::new(
        &app,
        VIEWER_LABEL,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("ReflexViewer")
    .inner_size(VIEWER_DEFAULT_WIDTH as f64, VIEWER_DEFAULT_HEIGHT as f64)
    .visible(false)
    .initialization_script(VIEWER_INIT_SCRIPT)
    .build()
    .map_err(|e| format!("failed to open viewer window: {e}"))?;

    apply_viewer_window_state(&window);
    install_viewer_window_state_handlers(&window);
    let _ = window.show();
    let _ = window.set_focus();

    Ok(())
}

#[tauri::command]
pub async fn close_viewer(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(VIEWER_LABEL) {
        let _ = persist_viewer_window_state(&window);
        window
            .close()
            .map_err(|e| format!("failed to close viewer window: {e}"))?;
    }
    set_pending_open(None)?;
    Ok(())
}

#[tauri::command]
pub async fn viewer_take_pending_path() -> Result<Option<String>, String> {
    let mut guard = VIEWER_PENDING_OPEN
        .lock()
        .map_err(|_| "viewer pending path lock poisoned".to_string())?;
    Ok(guard.take().map(|payload| payload.path))
}

#[tauri::command]
pub async fn viewer_take_pending_open() -> Result<Option<ViewerOpenPayload>, String> {
    let mut guard = VIEWER_PENDING_OPEN
        .lock()
        .map_err(|_| "viewer pending path lock poisoned".to_string())?;
    Ok(guard.take())
}


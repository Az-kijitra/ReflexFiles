use once_cell::sync::Lazy;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;

const VIEWER_LABEL: &str = "viewer";
const VIEWER_EVENT_OPEN_PATH: &str = "viewer:open-path";
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

static VIEWER_PENDING_PATH: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

#[derive(Clone, Serialize)]
struct ViewerOpenPayload {
    path: String,
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

fn set_pending_path(path: Option<String>) -> Result<(), String> {
    let mut guard = VIEWER_PENDING_PATH
        .lock()
        .map_err(|_| "viewer pending path lock poisoned".to_string())?;
    *guard = path;
    Ok(())
}

#[tauri::command]
pub async fn open_viewer(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let resolved = normalize_file_path(&path)?;
    set_pending_path(Some(resolved.clone()))?;

    if let Some(window) = app.get_webview_window(VIEWER_LABEL) {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit_to(
            VIEWER_LABEL,
            VIEWER_EVENT_OPEN_PATH,
            ViewerOpenPayload {
                path: resolved.clone(),
            },
        );
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        VIEWER_LABEL,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("ReflexViewer")
    .inner_size(1024.0, 768.0)
    .initialization_script(VIEWER_INIT_SCRIPT)
    .build()
    .map_err(|e| format!("failed to open viewer window: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn close_viewer(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(VIEWER_LABEL) {
        window
            .close()
            .map_err(|e| format!("failed to close viewer window: {e}"))?;
    }
    set_pending_path(None)?;
    Ok(())
}

#[tauri::command]
pub async fn viewer_take_pending_path() -> Result<Option<String>, String> {
    let mut guard = VIEWER_PENDING_PATH
        .lock()
        .map_err(|_| "viewer pending path lock poisoned".to_string())?;
    Ok(guard.take())
}

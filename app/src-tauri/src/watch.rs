use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use once_cell::sync::Lazy;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Emitter;

use crate::error::{format_error, AppErrorKind};
use crate::types::EVENT_FS_CHANGED;

struct WatchState {
    watcher: Option<RecommendedWatcher>,
    path: Option<PathBuf>,
}

static WATCH_STATE: Lazy<Mutex<WatchState>> = Lazy::new(|| WatchState {
    watcher: None,
    path: None,
}.into());

#[tauri::command]
pub fn fs_watch_start(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format_error(AppErrorKind::NotFound, "path not found"));
    }
    let mut state = WATCH_STATE
        .lock()
        .map_err(|_| format_error(AppErrorKind::Unknown, "watcher lock failed"))?;
    if let Some(existing) = state.watcher.take() {
        drop(existing);
    }
    let app_handle = app.clone();
    let mut watcher =
        notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                if event.paths.is_empty() {
                    return;
                }
                for changed in event.paths {
                    if let Some(parent) = changed.parent() {
                        let _ = app_handle.emit(
                            EVENT_FS_CHANGED,
                            parent.to_string_lossy().to_string(),
                        );
                    } else {
                        let _ = app_handle.emit(EVENT_FS_CHANGED, path.clone());
                    }
                }
            }
        })
        .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
    watcher
        .watch(&path_buf, RecursiveMode::NonRecursive)
        .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
    state.watcher = Some(watcher);
    state.path = Some(path_buf);
    Ok(())
}

#[tauri::command]
pub fn fs_watch_stop() -> Result<(), String> {
    let mut state = WATCH_STATE
        .lock()
        .map_err(|_| format_error(AppErrorKind::Unknown, "watcher lock failed"))?;
    state.watcher = None;
    state.path = None;
    Ok(())
}

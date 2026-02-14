use serde::Serialize;
use std::sync::{Mutex, OnceLock};

#[derive(Clone, Serialize)]
pub struct ClipboardFiles {
    pub paths: Vec<String>,
    pub cut: bool,
}

fn internal_clipboard() -> &'static Mutex<ClipboardFiles> {
    static INTERNAL: OnceLock<Mutex<ClipboardFiles>> = OnceLock::new();
    INTERNAL.get_or_init(|| {
        Mutex::new(ClipboardFiles {
            paths: Vec::new(),
            cut: false,
        })
    })
}

fn set_internal_clipboard(paths: Vec<String>, cut: bool) {
    if let Ok(mut guard) = internal_clipboard().lock() {
        *guard = ClipboardFiles { paths, cut };
    }
}

fn get_internal_clipboard() -> ClipboardFiles {
    internal_clipboard()
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_else(|_| ClipboardFiles {
            paths: Vec::new(),
            cut: false,
        })
}

#[cfg(target_os = "windows")]
use windows::core::{BOOL, PCWSTR};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{HANDLE, HGLOBAL};
#[cfg(target_os = "windows")]
use windows::Win32::System::DataExchange::{
    CloseClipboard, EmptyClipboard, GetClipboardData, OpenClipboard, RegisterClipboardFormatW,
    SetClipboardData,
};
#[cfg(target_os = "windows")]
use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};
#[cfg(target_os = "windows")]
use windows::Win32::UI::Shell::{DragQueryFileW, DROPFILES, HDROP};

#[cfg(target_os = "windows")]
fn wide_null_terminated(paths: &[String]) -> Vec<u16> {
    let mut data: Vec<u16> = Vec::new();
    for path in paths {
        data.extend(path.encode_utf16());
        data.push(0);
    }
    data.push(0);
    data
}

#[cfg(target_os = "windows")]
fn set_drop_effect(cut: bool, effect: Option<String>) -> Result<(), String> {
    let name: Vec<u16> = "Preferred DropEffect\0".encode_utf16().collect();
    let format = unsafe { RegisterClipboardFormatW(PCWSTR::from_raw(name.as_ptr())) };
    if format == 0 {
        return Err("failed to register Preferred DropEffect".to_string());
    }
    let effect: u32 = match effect.as_deref() {
        Some("copy") => 1,
        Some("move") => 2,
        Some("link") => 4,
        _ => {
            if cut {
                2
            } else {
                1
            }
        }
    }; // COPY=1, MOVE=2, LINK=4
    unsafe {
        let hglobal =
            GlobalAlloc(GMEM_MOVEABLE, std::mem::size_of::<u32>()).map_err(|e| format!("{e:?}"))?;
        if hglobal.0.is_null() {
            return Err("failed to allocate global memory".to_string());
        }
        let ptr = GlobalLock(hglobal) as *mut u32;
        if ptr.is_null() {
            return Err("failed to lock global memory".to_string());
        }
        *ptr = effect;
        let _ = GlobalUnlock(hglobal);
        SetClipboardData(format, Some(HANDLE(hglobal.0))).map_err(|e| format!("{e:?}"))?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn clipboard_set_files_windows(
    paths: Vec<String>,
    cut: bool,
    effect: Option<String>,
) -> Result<(), String> {
    unsafe {
        if OpenClipboard(None).is_err() {
            return Err("failed to open clipboard".to_string());
        }
        if EmptyClipboard().is_err() {
            let _ = CloseClipboard();
            return Err("failed to clear clipboard".to_string());
        }
        let wide = wide_null_terminated(&paths);
        let dropfiles_size = std::mem::size_of::<DROPFILES>();
        let bytes_len = wide.len() * 2;
        let total = dropfiles_size + bytes_len;
        let hglobal = GlobalAlloc(GMEM_MOVEABLE, total).map_err(|e| format!("{e:?}"))?;
        if hglobal.0.is_null() {
            let _ = CloseClipboard();
            return Err("failed to allocate global memory".to_string());
        }
        let ptr = GlobalLock(hglobal) as *mut u8;
        if ptr.is_null() {
            let _ = CloseClipboard();
            return Err("failed to lock global memory".to_string());
        }
        let dropfiles = ptr as *mut DROPFILES;
        (*dropfiles).pFiles = dropfiles_size as u32;
        (*dropfiles).fWide = BOOL(1);
        let data_ptr = ptr.add(dropfiles_size) as *mut u16;
        std::ptr::copy_nonoverlapping(wide.as_ptr(), data_ptr, wide.len());
        let _ = GlobalUnlock(hglobal);
        if SetClipboardData(15, Some(HANDLE(hglobal.0))).is_err() {
            let _ = CloseClipboard();
            return Err("failed to set clipboard data".to_string());
        } // CF_HDROP = 15
        if let Err(err) = set_drop_effect(cut, effect) {
            let _ = CloseClipboard();
            return Err(err);
        }
        let _ = CloseClipboard();
    }
    set_internal_clipboard(paths, cut);
    Ok(())
}

#[cfg(target_os = "windows")]
fn clipboard_get_files_windows() -> Result<ClipboardFiles, String> {
    unsafe {
        if OpenClipboard(None).is_err() {
            return Ok(get_internal_clipboard());
        }
        let handle: HANDLE = match GetClipboardData(15) {
            Ok(handle) => handle,
            Err(_) => {
                let _ = CloseClipboard();
                return Ok(get_internal_clipboard());
            }
        };
        if handle.0.is_null() {
            let _ = CloseClipboard();
            return Ok(get_internal_clipboard());
        }
        let count = DragQueryFileW(HDROP(handle.0), 0xFFFFFFFF, None);
        let mut paths = Vec::new();
        for i in 0..count {
            let len = DragQueryFileW(HDROP(handle.0), i, None);
            let mut buffer = vec![0u16; (len + 1) as usize];
            DragQueryFileW(HDROP(handle.0), i, Some(buffer.as_mut_slice()));
            if let Some(null_index) = buffer.iter().position(|v| *v == 0) {
                buffer.truncate(null_index);
            }
            let path = String::from_utf16_lossy(&buffer);
            if !path.is_empty() {
                paths.push(path);
            }
        }
        let mut cut = false;
        let name: Vec<u16> = "Preferred DropEffect\0".encode_utf16().collect();
        let format = RegisterClipboardFormatW(PCWSTR::from_raw(name.as_ptr()));
        if format != 0 {
            if let Ok(effect_handle) = GetClipboardData(format) {
                if !effect_handle.0.is_null() {
                    let ptr = GlobalLock(HGLOBAL(effect_handle.0)) as *const u32;
                    if !ptr.is_null() {
                        let val = *ptr;
                        let _ = GlobalUnlock(HGLOBAL(effect_handle.0));
                        cut = val == 2;
                    } else {
                        let _ = GlobalUnlock(HGLOBAL(effect_handle.0));
                    }
                }
            }
        }
        let _ = CloseClipboard();
        if paths.is_empty() {
            let fallback = get_internal_clipboard();
            if !fallback.paths.is_empty() {
                return Ok(fallback);
            }
        }
        Ok(ClipboardFiles { paths, cut })
    }
}

pub(crate) fn clipboard_set_files_impl(
    paths: Vec<String>,
    cut: bool,
    effect: Option<String>,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return clipboard_set_files_windows(paths, cut, effect);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = effect;
        set_internal_clipboard(paths, cut);
        Err("clipboard not supported on this platform".to_string())
    }
}

pub(crate) fn clipboard_get_files_impl() -> Result<ClipboardFiles, String> {
    #[cfg(target_os = "windows")]
    {
        return clipboard_get_files_windows();
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(get_internal_clipboard())
    }
}

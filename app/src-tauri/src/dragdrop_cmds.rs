use crate::error::{format_error, AppErrorKind};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
struct LocalDragSelection {
    parent: PathBuf,
    items: Vec<PathBuf>,
}

fn invalid_drag_path(msg: impl Into<String>) -> String {
    format_error(AppErrorKind::InvalidPath, msg)
}

fn validate_local_drag_selection(paths: &[String]) -> Result<LocalDragSelection, String> {
    if paths.is_empty() {
        return Err(invalid_drag_path("no paths provided"));
    }
    let mut accepted = Vec::with_capacity(paths.len());
    for raw in paths {
        let path = PathBuf::from(raw);
        if !path.is_absolute() {
            return Err(invalid_drag_path(format!("path is not absolute: {raw}")));
        }
        if !path.exists() {
            return Err(invalid_drag_path(format!("path does not exist: {raw}")));
        }
        accepted.push(path);
    }
    let parent = accepted[0]
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| invalid_drag_path("path has no parent"))?;
    for path in accepted.iter().skip(1) {
        let p = path
            .parent()
            .ok_or_else(|| invalid_drag_path(format!("path has no parent: {}", path.display())))?;
        if p != parent {
            return Err(invalid_drag_path(
                "all drag-out items must be in the same folder",
            ));
        }
    }
    Ok(LocalDragSelection {
        parent,
        items: accepted,
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DragOutEffectPolicy {
    CopyOnly,
    CopyOrMove,
}

fn parse_drag_out_effect_policy(effect_mode: Option<&str>) -> Result<DragOutEffectPolicy, String> {
    match effect_mode.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        None => Ok(DragOutEffectPolicy::CopyOnly),
        Some("copy") => Ok(DragOutEffectPolicy::CopyOnly),
        Some("copy_or_move") => Ok(DragOutEffectPolicy::CopyOrMove),
        Some(other) => Err(format_error(
            AppErrorKind::InvalidPath,
            format!("unsupported drag-out effect mode: {other}"),
        )),
    }
}

#[tauri::command]
pub fn shell_start_file_drag(paths: Vec<String>) -> Result<String, String> {
    let effect_policy = DragOutEffectPolicy::CopyOnly;
    #[cfg(target_os = "windows")]
    {
        shell_start_file_drag_windows(paths, false, effect_policy)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = paths;
        Err(format_error(
            AppErrorKind::Unknown,
            "native file drag-out is only supported on Windows",
        ))
    }
}

#[tauri::command]
pub fn shell_start_file_drag_debug(paths: Vec<String>) -> Result<String, String> {
    let effect_policy = DragOutEffectPolicy::CopyOnly;
    #[cfg(target_os = "windows")]
    {
        shell_start_file_drag_windows(paths, true, effect_policy)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = paths;
        Err(format_error(
            AppErrorKind::Unknown,
            "native file drag-out is only supported on Windows",
        ))
    }
}

#[tauri::command]
pub fn shell_start_file_drag_with_effects(
    paths: Vec<String>,
    effect_mode: Option<String>,
) -> Result<String, String> {
    let effect_policy = parse_drag_out_effect_policy(effect_mode.as_deref())?;
    #[cfg(target_os = "windows")]
    {
        shell_start_file_drag_windows(paths, false, effect_policy)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (paths, effect_policy);
        Err(format_error(
            AppErrorKind::Unknown,
            "native file drag-out is only supported on Windows",
        ))
    }
}

#[tauri::command]
pub fn shell_start_file_drag_debug_with_effects(
    paths: Vec<String>,
    effect_mode: Option<String>,
) -> Result<String, String> {
    let effect_policy = parse_drag_out_effect_policy(effect_mode.as_deref())?;
    #[cfg(target_os = "windows")]
    {
        shell_start_file_drag_windows(paths, true, effect_policy)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (paths, effect_policy);
        Err(format_error(
            AppErrorKind::Unknown,
            "native file drag-out is only supported on Windows",
        ))
    }
}

#[cfg(target_os = "windows")]
fn shell_start_file_drag_windows(
    paths: Vec<String>,
    debug_console_mode: bool,
    effect_policy: DragOutEffectPolicy,
) -> Result<String, String> {
    use std::sync::atomic::{AtomicBool, Ordering};

    use windows::core::{implement, PCWSTR};
    use windows::Win32::Foundation::{
        DRAGDROP_S_CANCEL, DRAGDROP_S_DROP, DRAGDROP_S_USEDEFAULTCURSORS, S_OK,
    };
    use windows::Win32::System::Com::IDataObject;
    use windows::Win32::System::Ole::{
        OleInitialize, OleUninitialize, DROPEFFECT, DROPEFFECT_COPY, DROPEFFECT_MOVE, IDropSource,
        IDropSource_Impl,
    };
    use windows::Win32::System::SystemServices::{MODIFIERKEYS_FLAGS, MK_LBUTTON};
    use windows::Win32::UI::Shell::{
        CIDLData_CreateFromIDArray, ILClone, ILCreateFromPathW, ILFindLastID, ILFree,
        SHDoDragDrop,
    };

    fn to_wide_null(path: &Path) -> Vec<u16> {
        use std::os::windows::ffi::OsStrExt;
        let mut wide: Vec<u16> = path.as_os_str().encode_wide().collect();
        wide.push(0);
        wide
    }

    #[implement(IDropSource)]
    struct SimpleDropSource;

    impl IDropSource_Impl for SimpleDropSource_Impl {
        fn QueryContinueDrag(
            &self,
            fescapepressed: windows_core::BOOL,
            grfkeystate: MODIFIERKEYS_FLAGS,
        ) -> windows::core::HRESULT {
            if fescapepressed.as_bool() {
                return DRAGDROP_S_CANCEL;
            }
            if (grfkeystate & MK_LBUTTON).0 == 0 {
                return DRAGDROP_S_DROP;
            }
            S_OK
        }

        fn GiveFeedback(&self, _dweffect: DROPEFFECT) -> windows::core::HRESULT {
            DRAGDROP_S_USEDEFAULTCURSORS
        }
    }

    static DEBUG_SEEN_LBUTTON: AtomicBool = AtomicBool::new(false);

    #[implement(IDropSource)]
    struct DebugConsoleDropSource;

    impl IDropSource_Impl for DebugConsoleDropSource_Impl {
        fn QueryContinueDrag(
            &self,
            fescapepressed: windows_core::BOOL,
            grfkeystate: MODIFIERKEYS_FLAGS,
        ) -> windows::core::HRESULT {
            if fescapepressed.as_bool() {
                DEBUG_SEEN_LBUTTON.store(false, Ordering::SeqCst);
                return DRAGDROP_S_CANCEL;
            }
            let lbutton_down = (grfkeystate & MK_LBUTTON).0 != 0;
            if lbutton_down {
                DEBUG_SEEN_LBUTTON.store(true, Ordering::SeqCst);
                return S_OK;
            }
            if DEBUG_SEEN_LBUTTON.load(Ordering::SeqCst) {
                DEBUG_SEEN_LBUTTON.store(false, Ordering::SeqCst);
                return DRAGDROP_S_DROP;
            }
            // Console-launched debug mode: keep drag loop alive until the user actually presses LBUTTON.
            S_OK
        }

        fn GiveFeedback(&self, _dweffect: DROPEFFECT) -> windows::core::HRESULT {
            DRAGDROP_S_USEDEFAULTCURSORS
        }
    }

    struct PidlList {
        parent: *mut windows::Win32::UI::Shell::Common::ITEMIDLIST,
        children: Vec<*mut windows::Win32::UI::Shell::Common::ITEMIDLIST>,
    }

    impl Drop for PidlList {
        fn drop(&mut self) {
            unsafe {
                for pidl in self.children.drain(..) {
                    if !pidl.is_null() {
                        ILFree(Some(pidl as _));
                    }
                }
                if !self.parent.is_null() {
                    ILFree(Some(self.parent as _));
                }
            }
        }
    }

    fn build_pidl_list(parent: &Path, items: &[PathBuf]) -> Result<PidlList, String> {
        unsafe {
            let parent_w = to_wide_null(parent);
            let parent_abs = ILCreateFromPathW(PCWSTR::from_raw(parent_w.as_ptr()));
            if parent_abs.is_null() {
                return Err(format_error(
                    AppErrorKind::Io,
                    format!("failed to create parent PIDL: {}", parent.display()),
                ));
            }
            let parent_clone = ILClone(parent_abs as _);
            if parent_clone.is_null() {
                ILFree(Some(parent_abs as _));
                return Err(format_error(
                    AppErrorKind::Io,
                    "failed to clone parent PIDL for drag-out",
                ));
            }
            ILFree(Some(parent_abs as _));

            let mut children: Vec<*mut windows::Win32::UI::Shell::Common::ITEMIDLIST> =
                Vec::with_capacity(items.len());
            for item in items {
                let item_w = to_wide_null(item);
                let abs = ILCreateFromPathW(PCWSTR::from_raw(item_w.as_ptr()));
                if abs.is_null() {
                    for pidl in children.drain(..) {
                        if !pidl.is_null() {
                            ILFree(Some(pidl as _));
                        }
                    }
                    ILFree(Some(parent_clone as _));
                    return Err(format_error(
                        AppErrorKind::Io,
                        format!("failed to create item PIDL: {}", item.display()),
                    ));
                }
                let last = ILFindLastID(abs as _);
                if last.is_null() {
                    ILFree(Some(abs as _));
                    for pidl in children.drain(..) {
                        if !pidl.is_null() {
                            ILFree(Some(pidl as _));
                        }
                    }
                    ILFree(Some(parent_clone as _));
                    return Err(format_error(
                        AppErrorKind::Io,
                        format!("failed to find child PIDL: {}", item.display()),
                    ));
                }
                let child = ILClone(last as _);
                ILFree(Some(abs as _));
                if child.is_null() {
                    for pidl in children.drain(..) {
                        if !pidl.is_null() {
                            ILFree(Some(pidl as _));
                        }
                    }
                    ILFree(Some(parent_clone as _));
                    return Err(format_error(
                        AppErrorKind::Io,
                        format!("failed to clone child PIDL: {}", item.display()),
                    ));
                }
                children.push(child);
            }

            Ok(PidlList {
                parent: parent_clone,
                children,
            })
        }
    }

    let selection = validate_local_drag_selection(&paths)?;
    let pidls = build_pidl_list(&selection.parent, &selection.items)?;

    unsafe {
        OleInitialize(None).map_err(|e| format_error(AppErrorKind::Io, format!("{e}")))?;
        struct OleGuard;
        impl Drop for OleGuard {
            fn drop(&mut self) {
                unsafe { OleUninitialize() };
            }
        }
        let _ole_guard = OleGuard;

        let child_refs: Vec<*const windows::Win32::UI::Shell::Common::ITEMIDLIST> =
            pidls.children.iter().map(|p| *p as _).collect();
        let data_object: IDataObject = CIDLData_CreateFromIDArray(pidls.parent as _, Some(&child_refs))
            .map_err(|e| format_error(AppErrorKind::Io, format!("CIDLData_CreateFromIDArray failed: {e}")))?;

        let drop_source: IDropSource = if debug_console_mode {
            DEBUG_SEEN_LBUTTON.store(false, Ordering::SeqCst);
            DebugConsoleDropSource.into()
        } else {
            SimpleDropSource.into()
        };
        let allowed = match effect_policy {
            // Current production default: copy-only for safety.
            DragOutEffectPolicy::CopyOnly => DROPEFFECT_COPY,
            // Next-phase groundwork: allow both copy and move, Explorer decides based on drop target/modifiers.
            DragOutEffectPolicy::CopyOrMove => DROPEFFECT_COPY | DROPEFFECT_MOVE,
        };
        let effect = SHDoDragDrop(None, &data_object, &drop_source, allowed)
            .map_err(|e| format_error(AppErrorKind::Io, format!("SHDoDragDrop failed: {e}")))?;
        if effect == DROPEFFECT_COPY {
            Ok("copy".to_string())
        } else if effect == DROPEFFECT_MOVE {
            // Unexpected under copy-only policy; report for debugging.
            Ok("move_unexpected".to_string())
        } else if effect.0 == 0 {
            Ok("none".to_string())
        } else {
            Ok(format!("0x{:x}", effect.0))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::validate_local_drag_selection;
    use super::{parse_drag_out_effect_policy, DragOutEffectPolicy};
    use std::fs;

    fn make_temp_case(name: &str) -> std::path::PathBuf {
        let base = std::env::temp_dir().join(format!(
            "rf_dragdrop_cmds_test_{}_{}_{}",
            name,
            std::process::id(),
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        fs::create_dir_all(&base).expect("create temp dir");
        base
    }

    #[test]
    fn validate_local_drag_selection_rejects_empty() {
        let err = validate_local_drag_selection(&[]).expect_err("must reject empty");
        assert!(err.contains("code=invalid_path"));
    }

    #[test]
    fn parse_drag_out_effect_policy_defaults_to_copy_only() {
        assert_eq!(
            parse_drag_out_effect_policy(None).expect("default"),
            DragOutEffectPolicy::CopyOnly
        );
        assert_eq!(
            parse_drag_out_effect_policy(Some("")).expect("empty"),
            DragOutEffectPolicy::CopyOnly
        );
        assert_eq!(
            parse_drag_out_effect_policy(Some("copy")).expect("copy"),
            DragOutEffectPolicy::CopyOnly
        );
    }

    #[test]
    fn parse_drag_out_effect_policy_accepts_copy_or_move() {
        assert_eq!(
            parse_drag_out_effect_policy(Some("copy_or_move")).expect("copy_or_move"),
            DragOutEffectPolicy::CopyOrMove
        );
    }

    #[test]
    fn parse_drag_out_effect_policy_rejects_unknown() {
        let err = parse_drag_out_effect_policy(Some("invalid_mode")).expect_err("reject unknown");
        assert!(err.contains("code=invalid_path"));
    }

    #[test]
    fn validate_local_drag_selection_accepts_same_parent() {
        let dir = make_temp_case("same_parent");
        let a = dir.join("a.txt");
        let b = dir.join("b.txt");
        fs::write(&a, b"a").expect("write a");
        fs::write(&b, b"b").expect("write b");
        let input = vec![
            a.to_string_lossy().to_string(),
            b.to_string_lossy().to_string(),
        ];
        let selection = validate_local_drag_selection(&input).expect("must accept");
        assert_eq!(selection.parent, dir);
        assert_eq!(selection.items.len(), 2);
        let _ = fs::remove_file(&a);
        let _ = fs::remove_file(&b);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn validate_local_drag_selection_rejects_mixed_parent() {
        let dir1 = make_temp_case("p1");
        let dir2 = make_temp_case("p2");
        let a = dir1.join("a.txt");
        let b = dir2.join("b.txt");
        fs::write(&a, b"a").expect("write a");
        fs::write(&b, b"b").expect("write b");
        let input = vec![
            a.to_string_lossy().to_string(),
            b.to_string_lossy().to_string(),
        ];
        let err = validate_local_drag_selection(&input).expect_err("must reject mixed parent");
        assert!(err.contains("same folder"));
        let _ = fs::remove_file(&a);
        let _ = fs::remove_file(&b);
        let _ = fs::remove_dir_all(&dir1);
        let _ = fs::remove_dir_all(&dir2);
    }

    #[test]
    fn validate_local_drag_selection_rejects_missing_path() {
        let dir = make_temp_case("missing");
        let missing = dir.join("missing.txt");
        let input = vec![missing.to_string_lossy().to_string()];
        let err = validate_local_drag_selection(&input).expect_err("must reject missing");
        assert!(err.contains("does not exist"));
        let _ = fs::remove_dir_all(&dir);
    }
}

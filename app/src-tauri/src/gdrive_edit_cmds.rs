use crate::gdrive_edit::{
    gdrive_apply_edit_workcopy_impl, gdrive_check_edit_conflict_impl,
    gdrive_prepare_edit_workcopy_impl, GdriveApplyEditResult, GdriveEditWorkcopy,
    GdriveRevisionSnapshot,
};
use crate::types::ResourceRef;

#[tauri::command]
pub fn gdrive_prepare_edit_workcopy(resource_ref: ResourceRef) -> Result<GdriveEditWorkcopy, String> {
    gdrive_prepare_edit_workcopy_impl(resource_ref).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_check_edit_conflict(
    resource_ref: ResourceRef,
    base_revision: GdriveRevisionSnapshot,
) -> Result<bool, String> {
    gdrive_check_edit_conflict_impl(resource_ref, base_revision)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_apply_edit_workcopy(
    resource_ref: ResourceRef,
    local_path: String,
    base_revision: GdriveRevisionSnapshot,
) -> Result<GdriveApplyEditResult, String> {
    gdrive_apply_edit_workcopy_impl(resource_ref, local_path, base_revision)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

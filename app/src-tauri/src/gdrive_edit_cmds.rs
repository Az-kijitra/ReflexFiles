use crate::gdrive_edit::{
    gdrive_apply_edit_workcopy_impl, gdrive_check_edit_conflict_impl,
    gdrive_cleanup_edit_workcopies_impl, gdrive_delete_edit_workcopy_impl,
    gdrive_get_edit_workcopy_state_impl, gdrive_get_edit_workcopy_states_impl,
    gdrive_list_edit_workcopies_impl, gdrive_prepare_edit_workcopy_impl, GdriveApplyEditResult,
    GdriveEditWorkcopy, GdriveEditWorkcopyCleanupResult, GdriveEditWorkcopyState,
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

#[tauri::command]
pub fn gdrive_get_edit_workcopy_state(
    resource_ref: ResourceRef,
) -> Result<GdriveEditWorkcopyState, String> {
    gdrive_get_edit_workcopy_state_impl(resource_ref).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_get_edit_workcopy_states(
    resource_refs: Vec<ResourceRef>,
) -> Result<Vec<GdriveEditWorkcopyState>, String> {
    gdrive_get_edit_workcopy_states_impl(resource_refs)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_list_edit_workcopies() -> Result<Vec<GdriveEditWorkcopyState>, String> {
    gdrive_list_edit_workcopies_impl().map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_delete_edit_workcopy(resource_ref: ResourceRef) -> Result<bool, String> {
    gdrive_delete_edit_workcopy_impl(resource_ref).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_cleanup_edit_workcopies(
    max_age_days: Option<u32>,
) -> Result<GdriveEditWorkcopyCleanupResult, String> {
    gdrive_cleanup_edit_workcopies_impl(max_age_days)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

import type {
  GdriveApplyEditResult,
  GdriveEditWorkcopyCleanupResult,
  GdriveEditWorkcopyState,
  GdriveEditWorkcopy,
  GdriveRevisionSnapshot,
  ResourceRef,
} from "$lib/types";
import { invoke } from "$lib/tauri_client";

export function gdrivePrepareEditWorkcopy(resourceRef: ResourceRef): Promise<GdriveEditWorkcopy> {
  return invoke("gdrive_prepare_edit_workcopy", { resourceRef });
}

export function gdriveCheckEditConflict(
  resourceRef: ResourceRef,
  baseRevision: GdriveRevisionSnapshot
): Promise<boolean> {
  return invoke("gdrive_check_edit_conflict", { resourceRef, baseRevision });
}

export function gdriveApplyEditWorkcopy(
  resourceRef: ResourceRef,
  localPath: string,
  baseRevision: GdriveRevisionSnapshot
): Promise<GdriveApplyEditResult> {
  return invoke("gdrive_apply_edit_workcopy", { resourceRef, localPath, baseRevision });
}

export function gdriveGetEditWorkcopyState(resourceRef: ResourceRef): Promise<GdriveEditWorkcopyState> {
  return invoke("gdrive_get_edit_workcopy_state", { resourceRef });
}

export function gdriveGetEditWorkcopyStates(
  resourceRefs: ResourceRef[]
): Promise<GdriveEditWorkcopyState[]> {
  return invoke("gdrive_get_edit_workcopy_states", { resourceRefs });
}

export function gdriveListEditWorkcopies(): Promise<GdriveEditWorkcopyState[]> {
  return invoke("gdrive_list_edit_workcopies");
}

export function gdriveDeleteEditWorkcopy(resourceRef: ResourceRef): Promise<boolean> {
  return invoke("gdrive_delete_edit_workcopy", { resourceRef });
}

export function gdriveCleanupEditWorkcopies(
  maxAgeDays: number | null = null
): Promise<GdriveEditWorkcopyCleanupResult> {
  return invoke("gdrive_cleanup_edit_workcopies", { maxAgeDays });
}

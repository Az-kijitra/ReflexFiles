import type {
  GdriveApplyEditResult,
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

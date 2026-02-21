import type {
  DeleteSummary,
  Entry,
  OpSummary,
  Properties,
  ProviderCapabilities,
  ResourceRef,
} from "$lib/types";
import { invoke } from "$lib/tauri_client";

export function clipboardSetFiles(paths: string[], cut: boolean, effect: string | null = null) {
  return invoke("clipboard_set_files", { paths, cut, effect });
}

export function clipboardGetFiles(): Promise<{ paths: string[]; cut: boolean } | null> {
  return invoke("clipboard_get_files");
}

export function fsCopyPairs(pairs: { from: string; to: string }[]): Promise<OpSummary> {
  return invoke("fs_copy_pairs", { pairs });
}

export function fsCopy(items: string[], destination: string): Promise<OpSummary> {
  return invoke("fs_copy", { items, destination });
}

export function fsMove(items: string[], destination: string): Promise<OpSummary> {
  return invoke("fs_move", { items, destination });
}

export function fsRename(path: string, newName: string): Promise<void> {
  return invoke("fs_rename", { path, newName });
}

export function fsDeleteTrash(items: string[]): Promise<void> {
  return invoke("fs_delete_trash", { items });
}

export function fsDeleteWithUndo(items: string[]): Promise<DeleteSummary> {
  return invoke("fs_delete_with_undo", { items });
}

export function fsCreate(parent: string, name: string, kind: "file" | "folder"): Promise<void> {
  return invoke("fs_create", { parent, name, kind });
}

export function fsGetCapabilities(path: string): Promise<ProviderCapabilities> {
  return invoke("fs_get_capabilities", { path });
}

export function fsGetCapabilitiesByRef(resourceRef: ResourceRef): Promise<ProviderCapabilities> {
  return invoke("fs_get_capabilities_by_ref", { resourceRef });
}

export function fsListDirByRef(
  resourceRef: ResourceRef,
  showHidden: boolean,
  sortKey: string,
  sortOrder: string
): Promise<Entry[]> {
  return invoke("fs_list_dir_by_ref", { resourceRef, showHidden, sortKey, sortOrder });
}

export function fsGetPropertiesByRef(resourceRef: ResourceRef): Promise<Properties> {
  return invoke("fs_get_properties_by_ref", { resourceRef });
}

export function zipCreate(
  items: string[],
  destination: string,
  password: string | null
): Promise<void> {
  return invoke("zip_create", { items, destination, password });
}

export function zipExtract(
  path: string,
  destination: string,
  password: string | null
): Promise<void> {
  return invoke("zip_extract", { path, destination, password });
}

export function opCancel(): Promise<void> {
  return invoke("op_cancel");
}

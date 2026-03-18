import { invoke } from "$lib/tauri_client";

export async function winmergeCompareFiles(path1: string, path2: string): Promise<void> {
  await invoke("winmerge_compare_files", { path1, path2 });
}

export async function winmergeCompareGitHead(path: string): Promise<void> {
  await invoke("winmerge_compare_git_head", { path });
}

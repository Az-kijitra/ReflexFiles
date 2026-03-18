#[tauri::command]
pub fn git_get_status(path: String) -> Result<crate::git_ops::GitRepoStatus, String> {
    crate::git_ops::git_get_status(&path)
}

#[tauri::command]
pub fn git_list_branches(path: String) -> Result<Vec<crate::git_ops::GitBranch>, String> {
    crate::git_ops::git_list_branches(&path)
}

#[tauri::command]
pub fn git_checkout(path: String, branch: String) -> Result<(), String> {
    crate::git_ops::git_checkout(&path, &branch)
}

#[tauri::command]
pub fn git_create_branch(path: String, name: String, from: Option<String>) -> Result<(), String> {
    crate::git_ops::git_create_branch(&path, &name, from.as_deref())
}

#[tauri::command]
pub fn git_stage(path: String, file_paths: Vec<String>) -> Result<(), String> {
    crate::git_ops::git_stage(&path, &file_paths)
}

#[tauri::command]
pub fn git_unstage(path: String, file_paths: Vec<String>) -> Result<(), String> {
    crate::git_ops::git_unstage(&path, &file_paths)
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<(), String> {
    crate::git_ops::git_commit(&path, &message)
}

#[tauri::command]
pub fn git_clone(url: String, dest: String) -> Result<(), String> {
    crate::git_ops::git_clone(&url, &dest)
}

#[tauri::command]
pub fn git_list_worktrees(path: String) -> Result<Vec<crate::git_ops::GitWorktree>, String> {
    crate::git_ops::git_list_worktrees(&path)
}

#[tauri::command]
pub fn git_add_worktree(path: String, worktree_path: String, branch: String, new_branch: bool) -> Result<(), String> {
    crate::git_ops::git_add_worktree(&path, &worktree_path, &branch, new_branch)
}

#[tauri::command]
pub fn git_remove_worktree(path: String, worktree_path: String) -> Result<(), String> {
    crate::git_ops::git_remove_worktree(&path, &worktree_path)
}

use std::process::Command;

/// Standard WinMerge installation locations on Windows
const WINMERGE_CANDIDATES: &[&str] = &[
    r"C:\Program Files\WinMerge\WinMergeU.exe",
    r"C:\Program Files (x86)\WinMerge\WinMergeU.exe",
];

fn find_winmerge(configured_path: &str) -> Option<String> {
    // 1. User-configured path
    let trimmed = configured_path.trim().trim_matches('"');
    if !trimmed.is_empty() && std::path::Path::new(trimmed).exists() {
        return Some(trimmed.to_string());
    }
    // 2. Standard locations
    for candidate in WINMERGE_CANDIDATES {
        if std::path::Path::new(candidate).exists() {
            return Some(candidate.to_string());
        }
    }
    // 3. PATH lookup
    if Command::new("WinMergeU").arg("/?").output().is_ok() {
        return Some("WinMergeU".to_string());
    }
    None
}

/// Launch WinMerge to compare two files
pub fn winmerge_compare_files_impl(path1: &str, path2: &str, configured_path: &str) -> Result<(), String> {
    let exe = find_winmerge(configured_path)
        .ok_or_else(|| "WinMerge not found. Please install WinMerge or configure its path in Settings > External.".to_string())?;

    Command::new(&exe)
        .args(["/e", "/u", path1, path2])
        .spawn()
        .map_err(|e| format!("Failed to launch WinMerge: {e}"))?;
    Ok(())
}

/// Compare a file with its git HEAD version using WinMerge.
/// Extracts the HEAD version to a temp file, then launches WinMerge.
pub fn winmerge_compare_git_head_impl(file_path: &str, configured_path: &str) -> Result<(), String> {
    // Find repo root
    let output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(std::path::Path::new(file_path).parent().unwrap_or(std::path::Path::new(".")))
        .output()
        .map_err(|e| format!("git not found: {e}"))?;
    if !output.status.success() {
        return Err("Not inside a git repository".to_string());
    }
    let repo_root = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Get relative path from repo root
    let abs = std::path::Path::new(file_path);
    let root = std::path::Path::new(&repo_root);
    let rel = abs.strip_prefix(root)
        .map_err(|_| "File is not inside the git repository".to_string())?;
    // Git uses forward slashes
    let rel_str = rel.to_string_lossy().replace('\\', "/");

    // Get HEAD content
    let head_output = Command::new("git")
        .args(["show", &format!("HEAD:{rel_str}")])
        .current_dir(&repo_root)
        .output()
        .map_err(|e| format!("git show failed: {e}"))?;
    if !head_output.status.success() {
        let err = String::from_utf8_lossy(&head_output.stderr);
        return Err(format!("No HEAD version found: {err}"));
    }

    // Write HEAD content to a temp file alongside the original
    let stem = abs.file_stem().unwrap_or_default().to_string_lossy();
    let ext = abs.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
    let temp_name = format!("{stem}_HEAD{ext}");
    let temp_path = std::env::temp_dir().join(&temp_name);

    std::fs::write(&temp_path, &head_output.stdout)
        .map_err(|e| format!("Failed to write temp file: {e}"))?;

    let temp_str = temp_path.to_string_lossy().to_string();
    winmerge_compare_files_impl(&temp_str, file_path, configured_path)
}

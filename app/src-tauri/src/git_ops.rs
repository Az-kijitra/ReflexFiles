use serde::Serialize;
use std::path::Path;
use std::process::Command;

// ── Return types ─────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct GitFileStatus {
    /// Path relative to repo root, forward-slash separators
    pub path: String,
    /// Two-char porcelain v1 status code (e.g. "M ", " M", "??")
    pub xy: String,
}

#[derive(Serialize)]
pub struct GitRepoStatus {
    pub is_repo: bool,
    pub repo_root: String,
    pub branch: String,
    pub statuses: Vec<GitFileStatus>,
}

#[derive(Serialize)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
}

// ── Internal helpers ─────────────────────────────────────────────────────────

fn run_git_bytes(repo_path: &str, args: &[&str]) -> Result<Vec<u8>, String> {
    let output = Command::new("git")
        .current_dir(repo_path)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to start git: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if stderr.is_empty() {
            "git command failed".to_string()
        } else {
            stderr
        });
    }
    Ok(output.stdout)
}

fn run_git(repo_path: &str, args: &[&str]) -> Result<String, String> {
    run_git_bytes(repo_path, args)
        .map(|b| String::from_utf8_lossy(&b).into_owned())
}

fn find_repo_root(path: &str) -> Option<String> {
    let output = Command::new("git")
        .current_dir(path)
        .args(["rev-parse", "--show-toplevel"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let root = String::from_utf8_lossy(&output.stdout)
        .trim()
        .replace('\\', "/");
    if root.is_empty() {
        None
    } else {
        Some(root)
    }
}

/// Parse `git status --porcelain=v1 -z --no-renames` output.
/// Entries are NUL-separated; each entry is "XY path".
fn parse_porcelain_z(data: &[u8]) -> Vec<GitFileStatus> {
    let text = String::from_utf8_lossy(data);
    text.split('\0')
        .filter(|e| e.len() > 3)
        .map(|e| {
            let xy = e[..2].to_string();
            let path = e[3..].trim().replace('\\', "/");
            GitFileStatus { path, xy }
        })
        .filter(|s| !s.path.is_empty())
        .collect()
}

// ── Public operations ────────────────────────────────────────────────────────

pub fn git_get_status(path: &str) -> Result<GitRepoStatus, String> {
    if !Path::new(path).exists() {
        return Err(format!("Path does not exist: {path}"));
    }
    let repo_root = match find_repo_root(path) {
        Some(r) => r,
        None => {
            return Ok(GitRepoStatus {
                is_repo: false,
                repo_root: String::new(),
                branch: String::new(),
                statuses: vec![],
            })
        }
    };

    let branch = run_git(&repo_root, &["rev-parse", "--abbrev-ref", "HEAD"])
        .map(|b| b.trim().to_string())
        .unwrap_or_default();

    // Use bytes to handle unusual filenames; null-separated, no renames
    let bytes = run_git_bytes(&repo_root, &["status", "--porcelain=v1", "-z", "--no-renames"])
        .unwrap_or_default();
    let statuses = parse_porcelain_z(&bytes);

    Ok(GitRepoStatus {
        is_repo: true,
        repo_root,
        branch,
        statuses,
    })
}

pub fn git_list_branches(path: &str) -> Result<Vec<GitBranch>, String> {
    if !Path::new(path).exists() {
        return Err(format!("Path does not exist: {path}"));
    }
    let repo_root = find_repo_root(path).ok_or_else(|| "Not a git repository".to_string())?;

    // %(HEAD) outputs "*" for current branch, " " otherwise
    let output = run_git(
        &repo_root,
        &["branch", "--all", "--format=%(refname:short)|||%(HEAD)"],
    )?;

    let mut branches: Vec<GitBranch> = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(2, "|||").collect();
        let name = parts[0].trim().to_string();
        if name.is_empty() {
            continue;
        }
        // Skip "HEAD -> ..." remote pointer
        if name.contains(" -> ") || name.ends_with("/HEAD") {
            continue;
        }
        let is_current = parts.get(1).map(|s| s.trim() == "*").unwrap_or(false);
        let is_remote = name.starts_with("origin/") || name.contains("remotes/");
        branches.push(GitBranch {
            name,
            is_current,
            is_remote,
        });
    }
    Ok(branches)
}

pub fn git_checkout(path: &str, branch: &str) -> Result<(), String> {
    let repo_root = find_repo_root(path).ok_or_else(|| "Not a git repository".to_string())?;
    run_git(&repo_root, &["checkout", branch]).map(|_| ())
}

pub fn git_create_branch(path: &str, name: &str, from: Option<&str>) -> Result<(), String> {
    let repo_root = find_repo_root(path).ok_or_else(|| "Not a git repository".to_string())?;
    let args: Vec<&str> = match from {
        Some(base) => vec!["checkout", "-b", name, base],
        None => vec!["checkout", "-b", name],
    };
    run_git(&repo_root, &args).map(|_| ())
}

pub fn git_stage(path: &str, file_paths: &[String]) -> Result<(), String> {
    if file_paths.is_empty() {
        return Ok(());
    }
    let repo_root = find_repo_root(path).ok_or_else(|| "Not a git repository".to_string())?;
    let mut args = vec!["add", "--"];
    for p in file_paths {
        args.push(p.as_str());
    }
    run_git(&repo_root, &args).map(|_| ())
}

pub fn git_unstage(path: &str, file_paths: &[String]) -> Result<(), String> {
    if file_paths.is_empty() {
        return Ok(());
    }
    let repo_root = find_repo_root(path).ok_or_else(|| "Not a git repository".to_string())?;
    let mut args = vec!["restore", "--staged", "--"];
    for p in file_paths {
        args.push(p.as_str());
    }
    run_git(&repo_root, &args).map(|_| ())
}

pub fn git_commit(path: &str, message: &str) -> Result<(), String> {
    let repo_root = find_repo_root(path).ok_or_else(|| "Not a git repository".to_string())?;
    run_git(&repo_root, &["commit", "-m", message]).map(|_| ())
}

pub fn git_clone(url: &str, dest: &str) -> Result<(), String> {
    let output = Command::new("git")
        .args(["clone", url, dest])
        .output()
        .map_err(|e| format!("Failed to start git clone: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if stderr.is_empty() {
            "git clone failed".to_string()
        } else {
            stderr
        });
    }
    Ok(())
}

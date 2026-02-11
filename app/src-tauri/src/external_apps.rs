use std::path::{Path, PathBuf};
use std::process::Command;

use crate::config::load_config;
use crate::error::{AppError, AppErrorKind, AppResult};

fn spawn_with_args(command: impl AsRef<Path>, args: &[String]) -> AppResult<()> {
    let mut cmd = Command::new(command.as_ref());
    if !args.is_empty() {
        cmd.args(args);
    }
    cmd.spawn()
        .map(|_| ())
        .map_err(|e| {
            AppError::with_kind(
                AppErrorKind::from_io(e.kind()),
                format!("launch failed: {e}"),
            )
        })
}

fn append_if_env_path(candidates: &mut Vec<PathBuf>, env_key: &str, suffix: &str) {
    if let Ok(value) = std::env::var(env_key) {
        candidates.push(PathBuf::from(value).join(suffix));
    }
}

fn require_non_empty(label: &str, value: &str) -> AppResult<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("{label} is empty"),
        ));
    }
    Ok(trimmed.to_string())
}

fn vscode_candidates(config_path: &str) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if !config_path.trim().is_empty() {
        candidates.push(PathBuf::from(config_path.trim()));
    }
    append_if_env_path(
        &mut candidates,
        "LOCALAPPDATA",
        "Programs\\Microsoft VS Code\\Code.exe",
    );
    append_if_env_path(
        &mut candidates,
        "ProgramFiles",
        "Microsoft VS Code\\Code.exe",
    );
    append_if_env_path(
        &mut candidates,
        "ProgramFiles(x86)",
        "Microsoft VS Code\\Code.exe",
    );
    candidates
}

pub(crate) fn external_open_with_app_impl(path: String, app: String) -> AppResult<()> {
    let app = require_non_empty("app", &app)?;
    spawn_with_args(app, &[path])
}

pub(crate) fn external_open_explorer_impl(path: String) -> AppResult<()> {
    spawn_with_args("explorer.exe", &[path])
}

pub(crate) fn external_open_cmd_impl(path: String) -> AppResult<()> {
    let cmd = format!("cd /d \"{}\"", path);
    spawn_with_args("cmd.exe", &[String::from("/K"), cmd])
}

pub(crate) fn external_open_vscode_impl(path: String) -> AppResult<()> {
    let config = load_config();
    let candidates = vscode_candidates(&config.external_vscode_path);
    for exe in &candidates {
        if exe.exists() {
            return spawn_with_args(exe, &[path.clone()]);
        }
    }
    spawn_with_args("code", &[path])
        .map_err(|e| {
            AppError::with_kind(
                AppErrorKind::NotFound,
                format!("program not found (set external_vscode_path): {e}"),
            )
        })
}

pub(crate) fn external_open_git_client_impl(path: String) -> AppResult<()> {
    let config = load_config();
    let app = require_non_empty("external_git_client_path", &config.external_git_client_path)?;
    spawn_with_args(app, &[path])
}

pub(crate) fn external_open_custom_impl(command: String, args: Vec<String>) -> AppResult<()> {
    let command = require_non_empty("command", &command)?;
    spawn_with_args(command, &args)
}

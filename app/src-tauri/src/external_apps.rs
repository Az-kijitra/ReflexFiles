use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;

use crate::config::load_config;
use crate::error::{AppError, AppErrorKind, AppResult};

#[derive(Serialize, Clone)]
pub struct TerminalProfileInfo {
    pub name: String,
    pub guid: String,
    pub source: String,
    pub is_default: bool,
}

fn spawn_with_args(command: impl AsRef<Path>, args: &[String]) -> AppResult<()> {
    let mut cmd = Command::new(command.as_ref());
    if !args.is_empty() {
        cmd.args(args);
    }
    cmd.spawn().map(|_| ()).map_err(|e| {
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

fn git_client_candidates(config_path: &str) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    let trimmed = config_path.trim();
    if !trimmed.is_empty() {
        let configured = PathBuf::from(trimmed);
        candidates.push(configured.clone());
        if configured.extension().is_none() {
            candidates.push(configured.with_extension("exe"));
        }
        if configured.is_dir() {
            candidates.push(configured.join("GitHubDesktop.exe"));
            candidates.push(configured.join("github.exe"));
        }
    }

    append_if_env_path(
        &mut candidates,
        "LOCALAPPDATA",
        "GitHubDesktop\\GitHubDesktop.exe",
    );
    append_if_env_path(
        &mut candidates,
        "ProgramFiles",
        "GitHub Desktop\\GitHubDesktop.exe",
    );
    append_if_env_path(
        &mut candidates,
        "ProgramFiles(x86)",
        "GitHub Desktop\\GitHubDesktop.exe",
    );
    candidates
}

fn terminal_settings_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    append_if_env_path(
        &mut candidates,
        "LOCALAPPDATA",
        "Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json",
    );
    append_if_env_path(
        &mut candidates,
        "LOCALAPPDATA",
        "Packages\\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\\LocalState\\settings.json",
    );
    append_if_env_path(
        &mut candidates,
        "LOCALAPPDATA",
        "Microsoft\\Windows Terminal\\settings.json",
    );
    candidates
}

fn parse_terminal_profiles(settings_text: &str) -> AppResult<Vec<TerminalProfileInfo>> {
    let root: serde_json::Value = json5::from_str(settings_text).map_err(|e| {
        AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("failed to parse terminal settings: {e}"),
        )
    })?;

    let default_profile = root
        .get("defaultProfile")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let mut profiles = Vec::new();
    if let Some(list) = root
        .get("profiles")
        .and_then(|profiles| profiles.get("list"))
        .and_then(|list| list.as_array())
    {
        for item in list {
            let name = item
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            if name.is_empty() {
                continue;
            }
            let guid = item
                .get("guid")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let source = item
                .get("source")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let is_default = !default_profile.is_empty()
                && !guid.is_empty()
                && guid.eq_ignore_ascii_case(&default_profile);

            profiles.push(TerminalProfileInfo {
                name: name.to_string(),
                guid,
                source,
                is_default,
            });
        }
    }

    Ok(profiles)
}

fn read_terminal_profiles(path: &Path) -> AppResult<Vec<TerminalProfileInfo>> {
    let text = std::fs::read_to_string(path).map_err(|e| {
        AppError::with_kind(
            AppErrorKind::from_io(e.kind()),
            format!("failed to read terminal settings: {e}"),
        )
    })?;
    parse_terminal_profiles(&text)
}

fn open_windows_terminal(path: &str, profile: &str) -> AppResult<()> {
    let trimmed = profile.trim();
    if !trimmed.is_empty() {
        let args = vec![
            String::from("-d"),
            path.to_string(),
            String::from("-p"),
            trimmed.to_string(),
        ];
        if spawn_with_args("wt.exe", &args).is_ok() {
            return Ok(());
        }
    }
    spawn_with_args("wt.exe", &[String::from("-d"), path.to_string()])
}
fn resolve_terminal_profile_for_kind(
    config: &crate::config_types::AppConfig,
    kind: &str,
) -> AppResult<String> {
    let specific = match kind {
        "cmd" => config.external_terminal_profile_cmd.trim(),
        "powershell" => config.external_terminal_profile_powershell.trim(),
        "wsl" => config.external_terminal_profile_wsl.trim(),
        _ => {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                format!("unknown terminal kind: {kind}"),
            ))
        }
    };

    if specific.is_empty() {
        Ok(config.external_terminal_profile.trim().to_string())
    } else {
        Ok(specific.to_string())
    }
}

pub(crate) fn external_list_terminal_profiles_impl() -> AppResult<Vec<TerminalProfileInfo>> {
    let mut parse_error: Option<AppError> = None;
    for candidate in terminal_settings_candidates() {
        if !candidate.exists() {
            continue;
        }
        match read_terminal_profiles(&candidate) {
            Ok(profiles) => return Ok(profiles),
            Err(err) => parse_error = Some(err),
        }
    }

    if let Some(err) = parse_error {
        return Err(err);
    }
    Ok(Vec::new())
}

pub(crate) fn external_open_with_app_impl(path: String, app: String) -> AppResult<()> {
    let app = require_non_empty("app", &app)?;
    spawn_with_args(app, &[path])
}

pub(crate) fn external_open_explorer_impl(path: String) -> AppResult<()> {
    spawn_with_args("explorer.exe", &[path])
}

pub(crate) fn external_open_cmd_impl(path: String) -> AppResult<()> {
    // Prefer Windows Terminal when available; fallback to classic cmd.exe if not installed
    // or when Windows Terminal launch fails.
    let config = load_config();
    if open_windows_terminal(&path, &config.external_terminal_profile).is_ok() {
        return Ok(());
    }

    let cmd = format!("cd /d \"{}\"", path);
    spawn_with_args("cmd.exe", &[String::from("/K"), cmd])
}

pub(crate) fn external_open_terminal_profile_impl(path: String, profile: String) -> AppResult<()> {
    let profile = require_non_empty("profile", &profile)?;
    if open_windows_terminal(&path, &profile).is_ok() {
        return Ok(());
    }

    // Keep compatibility when Windows Terminal is unavailable.
    let cmd = format!("cd /d \"{}\"", path);
    spawn_with_args("cmd.exe", &[String::from("/K"), cmd])
}
pub(crate) fn external_open_terminal_kind_impl(path: String, kind: String) -> AppResult<()> {
    let config = load_config();
    let profile = resolve_terminal_profile_for_kind(&config, kind.trim())?;
    if open_windows_terminal(&path, &profile).is_ok() {
        return Ok(());
    }

    // Keep compatibility when Windows Terminal is unavailable.
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
    spawn_with_args("code", &[path]).map_err(|e| {
        AppError::with_kind(
            AppErrorKind::NotFound,
            format!("program not found (set external_vscode_path): {e}"),
        )
    })
}

pub(crate) fn external_open_git_client_impl(path: String) -> AppResult<()> {
    let config = load_config();
    let configured = config.external_git_client_path.trim().to_string();
    let mut last_err: Option<AppError> = None;

    for exe in git_client_candidates(&configured) {
        if exe.exists() {
            match spawn_with_args(&exe, &[path.clone()]) {
                Ok(()) => return Ok(()),
                Err(err) => last_err = Some(err),
            }
        }
    }

    for command in ["github", "github-desktop"] {
        match spawn_with_args(command, &[path.clone()]) {
            Ok(()) => return Ok(()),
            Err(err) => last_err = Some(err),
        }
    }

    if let Some(err) = last_err {
        return Err(err);
    }

    if configured.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::NotFound,
            "git client not found (set external_git_client_path)".to_string(),
        ));
    }

    Err(AppError::with_kind(
        AppErrorKind::NotFound,
        format!("git client not found: {configured}"),
    ))
}

pub(crate) fn external_open_custom_impl(command: String, args: Vec<String>) -> AppResult<()> {
    let command = require_non_empty("command", &command)?;
    spawn_with_args(command, &args)
}

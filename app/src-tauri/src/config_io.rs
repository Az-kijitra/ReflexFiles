use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;

use serde::Serialize;
use toml::Value;

use crate::config_types::{AppConfig, HistoryFile, JumpItem, JumpListFile, Language};

fn appdata_base() -> PathBuf {
    std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}

pub fn config_path() -> PathBuf {
    appdata_base().join("ReflexFIles").join("config.toml")
}

pub fn legacy_config_path() -> PathBuf {
    appdata_base().join("ReflexFIles").join("config.json")
}

fn history_path() -> PathBuf {
    appdata_base().join("ReflexFIles").join("history.toml")
}

fn jump_list_path() -> PathBuf {
    appdata_base().join("ReflexFIles").join("jump_list.toml")
}

pub fn read_toml_file<T>(path: &PathBuf) -> Option<T>
where
    T: for<'de> serde::Deserialize<'de>,
{
    let mut file = fs::File::open(path).ok()?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).ok()?;
    toml::from_str::<T>(&contents).ok()
}

fn write_toml_with_header<T>(
    path: &PathBuf,
    header: &[&str],
    key: &str,
    value: &T,
) -> Result<(), String>
where
    T: Serialize,
{
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut out = String::new();
    for line in header {
        out.push_str(line);
        out.push('\n');
    }
    let value = Value::try_from(value).map_err(|e| e.to_string())?;
    out.push_str(&format!("{key} = {value}\n"));
    fs::write(path, out).map_err(|e| e.to_string())?;
    Ok(())
}

fn toml_string(value: &str) -> Value {
    Value::String(value.to_string())
}

fn append_if_env_path(candidates: &mut Vec<PathBuf>, env_key: &str, suffix: &str) {
    if let Ok(value) = std::env::var(env_key) {
        candidates.push(PathBuf::from(value).join(suffix));
    }
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

fn detect_terminal_profile_names() -> Vec<String> {
    for path in terminal_settings_candidates() {
        let text = match fs::read_to_string(&path) {
            Ok(value) => value,
            Err(_) => continue,
        };

        let root: serde_json::Value = match json5::from_str(&text) {
            Ok(value) => value,
            Err(_) => continue,
        };

        let list = match root
            .get("profiles")
            .and_then(|profiles| profiles.get("list"))
            .and_then(|list| list.as_array())
        {
            Some(value) => value,
            None => continue,
        };

        let mut names = Vec::new();
        for item in list {
            if let Some(name) = item.get("name").and_then(|value| value.as_str()) {
                let trimmed = name.trim();
                if !trimmed.is_empty() {
                    names.push(trimmed.to_string());
                }
            }
        }

        if !names.is_empty() {
            return names;
        }
    }

    Vec::new()
}
fn localize_config_comments_to_en(mut text: String) -> String {
    let replacements = [
        (
            "# ReflexFIles 設定ファイル\n",
            "# ReflexFIles configuration file\n",
        ),
        (
            "# 各項目の上に説明コメントがあります。\n\n",
            "# Each setting includes a description comment above the key.\n\n",
        ),
        ("# --- 一般 ---\n", "# --- General ---\n"),
        (
            "# 設定ファイルのバージョン。\n",
            "# Configuration file version.\n",
        ),
        ("# --- 表示/動作 ---\n", "# --- View/Behavior ---\n"),
        (
            "# フォルダ集計のタイムアウト(ms)。最小 500。\n",
            "# Directory statistics timeout in ms. Minimum is 500.\n",
        ),
        (
            "# 隠しファイルを表示するか (true/false)。\n",
            "# Show hidden files (true/false).\n",
        ),
        (
            "# サイズ列を表示するか (true/false)。\n",
            "# Show size column (true/false).\n",
        ),
        (
            "# タイムスタンプ列を表示するか (true/false)。\n",
            "# Show timestamp column (true/false).\n",
        ),
        (
            "# ツリービューを表示するか (true/false)。\n",
            "# Show tree view (true/false).\n",
        ),
        (
            "# 既定の並び替えキー: name | size | type | modified。\n",
            "# Default sort key: name | size | type | modified.\n",
        ),
        (
            "# 既定の並び順: asc | desc。\n",
            "# Default sort order: asc | desc.\n",
        ),
        (
            "# 起動時に開くパス (空で前回終了時のパス)。\n",
            "# Path to open on startup (empty means last path on exit).\n",
        ),
        ("# --- UI ---\n", "# --- UI ---\n"),
        ("# 主题: light | dark。\n", "# Theme: light | dark.\n"),
        ("# 言語: ja | en。\n", "# Language: ja | en.\n"),
        (
            "# ファイルアイコン表示: by_type | simple | none。\n",
            "# File icon display mode: by_type | simple | none.\n",
        ),
        (
            "# メインウィンドウ位置とサイズ。\n",
            "# Main window position and size.\n",
        ),
        (
            "# ビューアーウィンドウ位置とサイズ。\n",
            "# Viewer window position and size.\n",
        ),
        ("# --- 履歴 ---\n", "# --- History ---\n"),
        ("# 検索履歴 (最大 100)。\n", "# Search history (max 100).\n"),
        ("# --- 外部ツール ---\n", "# --- External Tools ---\n"),
        ("# Git クライアントのパス。\n", "# Git client path.\n"),
        ("# VSCode のパス。\n", "# VS Code path.\n"),
        (
            "# Google Drive OAuth クライアントID（client_secretは保存しません）。\n",
            "# Google Drive OAuth client_id (client_secret is not stored).\n",
        ),
        (
            "# Google Drive OAuth リダイレクトURI。\n",
            "# Google Drive OAuth redirect_uri.\n",
        ),
        (
            "# Google Drive 認証に使うアカウントID（メール）。\n",
            "# Account ID (email) used for Google Drive auth.\n",
        ),
        (
            "# ターミナルプロファイル名。空で既定。\n",
            "# Terminal profile name (empty uses default profile).\n",
        ),
        (
            "# 既定の関連付け (拡張子 -> アプリ ID)。\n",
            "# Default associations (extension -> app id).\n",
        ),
        ("# 外部アプリ定義。\n", "# External app definitions.\n"),
        ("# --- ログ ---\n", "# --- Logging ---\n"),
        ("# ログファイルパス。\n", "# Log file path.\n"),
        ("# ログ出力を有効化するか。\n", "# Enable log output.\n"),
        ("# --- キーマップ ---\n", "# --- Keymap ---\n"),
        (
            "# プロファイル: windows | mac | linux | custom。\n",
            "# Profile: windows | mac | linux | custom.\n",
        ),
        (
            "# カスタムキーマップ (profile=custom のとき有効)。\n",
            "# Custom keymap entries (used when profile=custom).\n",
        ),
    ];

    for (from, to) in replacements {
        text = text.replace(from, to);
    }

    text
}

pub fn load_history() -> Vec<String> {
    let path = history_path();
    read_toml_file::<HistoryFile>(&path)
        .map(|file| file.history)
        .unwrap_or_default()
}

pub fn save_history(history: &[String]) -> Result<(), String> {
    let path = history_path();
    let header = [
        "# ReflexFIles 履歴",
        "# PATH 移動履歴（重複排除済み）",
        "# 例: history = [\"C:/\", \"D:/work\"]",
    ];
    write_toml_with_header(&path, &header, "history", &history.to_vec())
}

pub fn load_jump_list() -> Vec<JumpItem> {
    let path = jump_list_path();
    read_toml_file::<JumpListFile>(&path)
        .map(|file| file.jump_list)
        .unwrap_or_default()
}

pub fn save_jump_list(jump_list: &[JumpItem]) -> Result<(), String> {
    let path = jump_list_path();
    let header = [
        "# ReflexFIles ジャンプリスト",
        "# type: \"path\" | \"url\"",
        "# value: パスまたはURL",
        "# jump_list = [",
        "#   { type = \"path\", value = \"C:/Users\" },",
        "#   { type = \"url\", value = \"https://example.com\" }",
        "# ]",
    ];
    write_toml_with_header(&path, &header, "jump_list", &jump_list.to_vec())
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut out = String::new();
    out.push_str("# ReflexFIles 設定ファイル\n");
    out.push_str("# 各項目の上に説明コメントがあります。\n\n");

    out.push_str("# --- 一般 ---\n");
    out.push_str("# 設定ファイルのバージョン。\n");
    out.push_str(&format!("config_version = {}\n\n", config.config_version));

    out.push_str("# --- 表示/動作 ---\n");
    out.push_str("# フォルダ集計のタイムアウト(ms)。最小 500。\n");
    out.push_str(&format!(
        "perf_dir_stats_timeout_ms = {}\n\n",
        config.perf_dir_stats_timeout_ms
    ));

    out.push_str("# 隠しファイルを表示するか (true/false)。\n");
    out.push_str(&format!("ui_show_hidden = {}\n\n", config.ui_show_hidden));

    out.push_str("# サイズ列を表示するか (true/false)。\n");
    out.push_str(&format!("ui_show_size = {}\n\n", config.ui_show_size));

    out.push_str("# タイムスタンプ列を表示するか (true/false)。\n");
    out.push_str(&format!("ui_show_time = {}\n\n", config.ui_show_time));

    out.push_str("# ツリービューを表示するか (true/false)。\n");
    out.push_str(&format!("ui_show_tree = {}\n\n", config.ui_show_tree));

    out.push_str("# 既定の並び替えキー: name | size | type | modified。\n");
    out.push_str(&format!(
        "view_sort_key = {}\n\n",
        Value::String(config.view_sort_key.as_str().to_string())
    ));

    out.push_str("# 既定の並び順: asc | desc。\n");
    out.push_str(&format!(
        "view_sort_order = {}\n\n",
        Value::String(config.view_sort_order.as_str().to_string())
    ));

    out.push_str("# 起動時に開くパス (空で前回終了時のパス)。\n");
    out.push_str(&format!(
        "session_last_path = {}\n\n",
        toml_string(&config.session_last_path)
    ));

    out.push_str("# --- UI ---\n");
    out.push_str("# 主题: light | dark。\n");
    out.push_str(&format!(
        "ui_theme = {}\n\n",
        Value::String(config.ui_theme.as_str().to_string())
    ));
    out.push_str("# 言語: ja | en。\n");
    out.push_str(&format!(
        "ui_language = {}\n\n",
        Value::String(config.ui_language.as_str().to_string())
    ));
    out.push_str("# ファイルアイコン表示: by_type | simple | none。\n");
    out.push_str(&format!(
        "ui_file_icon_mode = {}\n\n",
        Value::String(config.ui_file_icon_mode.as_str().to_string())
    ));
    out.push_str("# メインウィンドウ位置とサイズ。\n");
    out.push_str(&format!("ui_window_x = {}\n", config.ui_window_x));
    out.push_str(&format!("ui_window_y = {}\n", config.ui_window_y));
    out.push_str(&format!("ui_window_width = {}\n", config.ui_window_width));
    out.push_str(&format!("ui_window_height = {}\n", config.ui_window_height));
    out.push_str(&format!(
        "ui_window_maximized = {}\n\n",
        config.ui_window_maximized
    ));

    out.push_str("# ビューアーウィンドウ位置とサイズ。\n");
    out.push_str(&format!("viewer_window_x = {}\n", config.viewer_window_x));
    out.push_str(&format!("viewer_window_y = {}\n", config.viewer_window_y));
    out.push_str(&format!(
        "viewer_window_width = {}\n",
        config.viewer_window_width
    ));
    out.push_str(&format!(
        "viewer_window_height = {}\n",
        config.viewer_window_height
    ));
    out.push_str(&format!(
        "viewer_window_maximized = {}\n\n",
        config.viewer_window_maximized
    ));

    out.push_str("# --- 履歴 ---\n");
    out.push_str("# 検索履歴 (最大 100)。\n");
    out.push_str(&format!(
        "history_search = {}\n\n",
        Value::Array(
            config
                .history_search
                .iter()
                .map(|s| Value::String(s.to_string()))
                .collect::<Vec<_>>()
        )
    ));

    out.push_str("# --- 外部ツール ---\n");
    out.push_str("# Git クライアントのパス。\n");
    out.push_str(&format!(
        "external_git_client_path = {}\n\n",
        toml_string(&config.external_git_client_path)
    ));
    out.push_str("# VSCode のパス。\n");
    out.push_str(&format!(
        "external_vscode_path = {}\n\n",
        toml_string(&config.external_vscode_path)
    ));
    out.push_str("# Google Drive OAuth クライアントID（client_secretは保存しません）。\n");
    out.push_str(&format!(
        "gdrive_oauth_client_id = {}\n\n",
        toml_string(&config.gdrive_oauth_client_id)
    ));
    out.push_str("# Google Drive OAuth リダイレクトURI。\n");
    out.push_str(&format!(
        "gdrive_oauth_redirect_uri = {}\n\n",
        toml_string(&config.gdrive_oauth_redirect_uri)
    ));
    out.push_str("# Google Drive 認証に使うアカウントID（メール）。\n");
    out.push_str(&format!(
        "gdrive_account_id = {}\n\n",
        toml_string(&config.gdrive_account_id)
    ));
    let terminal_profile_names = detect_terminal_profile_names();

    if matches!(config.ui_language, Language::Ja) {
        out.push_str("# ターミナルプロファイル名（共通）。空なら Windows Terminal の既定。\n");
        out.push_str(&format!(
            "external_terminal_profile = {}\n\n",
            toml_string(&config.external_terminal_profile)
        ));
        out.push_str("# Ctrl+Alt+1 (CMD) 用の固定プロファイル名。空なら external_terminal_profile を使用。\n");
        out.push_str(&format!(
            "external_terminal_profile_cmd = {}\n\n",
            toml_string(&config.external_terminal_profile_cmd)
        ));
        out.push_str("# Ctrl+Alt+2 (PowerShell) 用の固定プロファイル名。空なら external_terminal_profile を使用。\n");
        out.push_str(&format!(
            "external_terminal_profile_powershell = {}\n\n",
            toml_string(&config.external_terminal_profile_powershell)
        ));
        out.push_str("# Ctrl+Alt+3 (WSL) 用の固定プロファイル名。空なら external_terminal_profile を使用。\n");
        out.push_str(&format!(
            "external_terminal_profile_wsl = {}\n\n",
            toml_string(&config.external_terminal_profile_wsl)
        ));
        out.push_str("# 現在検出できた Windows Terminal プロファイル一覧（保存時点）:\n");
        if terminal_profile_names.is_empty() {
            out.push_str("#   (取得できませんでした)\n\n");
        } else {
            for name in &terminal_profile_names {
                out.push_str(&format!("#   - {name}\n"));
            }
            out.push('\n');
        }
    } else {
        out.push_str(
            "# Terminal profile name (global fallback). Empty uses Windows Terminal default.\n",
        );
        out.push_str(&format!(
            "external_terminal_profile = {}\n\n",
            toml_string(&config.external_terminal_profile)
        ));
        out.push_str("# Fixed profile name for Ctrl+Alt+1 (CMD). Empty falls back to external_terminal_profile.\n");
        out.push_str(&format!(
            "external_terminal_profile_cmd = {}\n\n",
            toml_string(&config.external_terminal_profile_cmd)
        ));
        out.push_str("# Fixed profile name for Ctrl+Alt+2 (PowerShell). Empty falls back to external_terminal_profile.\n");
        out.push_str(&format!(
            "external_terminal_profile_powershell = {}\n\n",
            toml_string(&config.external_terminal_profile_powershell)
        ));
        out.push_str("# Fixed profile name for Ctrl+Alt+3 (WSL). Empty falls back to external_terminal_profile.\n");
        out.push_str(&format!(
            "external_terminal_profile_wsl = {}\n\n",
            toml_string(&config.external_terminal_profile_wsl)
        ));
        out.push_str("# Detected Windows Terminal profiles at save time:\n");
        if terminal_profile_names.is_empty() {
            out.push_str("#   (not available)\n\n");
        } else {
            for name in &terminal_profile_names {
                out.push_str(&format!("#   - {name}\n"));
            }
            out.push('\n');
        }
    }
    out.push_str("# 既定の関連付け (拡張子 -> アプリ ID)。\n");
    out.push_str(&format!(
        "external_associations = {}\n\n",
        Value::try_from(&config.external_associations).map_err(|e| e.to_string())?
    ));
    out.push_str("# 外部アプリ定義。\n");
    out.push_str(&format!(
        "external_apps = {}\n\n",
        Value::try_from(&config.external_apps).map_err(|e| e.to_string())?
    ));

    out.push_str("# --- ログ ---\n");
    out.push_str("# ログファイルパス。\n");
    out.push_str(&format!("log_path = {}\n\n", toml_string(&config.log_path)));
    out.push_str("# ログ出力を有効化するか。\n");
    out.push_str(&format!("log_enabled = {}\n\n", config.log_enabled));

    out.push_str("# --- キーマップ ---\n");
    out.push_str("# プロファイル: windows | mac | linux | custom。\n");
    out.push_str(&format!(
        "input_keymap_profile = {}\n\n",
        Value::String(config.input_keymap_profile.as_str().to_string())
    ));
    out.push_str("# カスタムキーマップ (profile=custom のとき有効)。\n");
    out.push_str("[input_keymap_custom]\n");
    let mut custom_keys: Vec<_> = config.input_keymap_custom.iter().collect();
    custom_keys.sort_by(|(a, _), (b, _)| a.cmp(b));
    for (key, value) in custom_keys {
        out.push_str(&format!("{key} = {}\n", toml_string(value)));
    }
    out.push('\n');

    if !matches!(config.ui_language, Language::Ja) {
        out = localize_config_comments_to_en(out);
    }

    let mut file = fs::File::create(path).map_err(|e| e.to_string())?;
    file.write_all(out.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

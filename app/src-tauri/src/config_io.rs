use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;

use serde::Serialize;
use toml::Value;

use crate::config_types::{AppConfig, HistoryFile, JumpItem, JumpListFile};

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

fn write_toml_with_header<T>(path: &PathBuf, header: &[&str], key: &str, value: &T) -> Result<(), String>
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
    out.push_str("# ウィンドウ位置とサイズ。\n");
    out.push_str(&format!("ui_window_x = {}\n", config.ui_window_x));
    out.push_str(&format!("ui_window_y = {}\n", config.ui_window_y));
    out.push_str(&format!("ui_window_width = {}\n", config.ui_window_width));
    out.push_str(&format!("ui_window_height = {}\n", config.ui_window_height));
    out.push_str(&format!("ui_window_maximized = {}\n\n", config.ui_window_maximized));

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

    let mut file = fs::File::create(path).map_err(|e| e.to_string())?;
    file.write_all(out.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

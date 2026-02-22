use crate::config_defaults::{default_app_config, normalize_config};
use crate::config_io::legacy_config_path;
use crate::config_types::{AppConfig, Language};
use std::path::PathBuf;

pub use crate::config_io::{config_path, save_config, save_history, save_jump_list};

struct InstallerLanguageHint {
    language: Language,
    marker_path: PathBuf,
}

fn parse_language_hint(value: &str) -> Option<Language> {
    match value.trim().to_ascii_lowercase().as_str() {
        "ja" | "ja-jp" => Some(Language::Ja),
        "en" | "en-us" | "en-gb" => Some(Language::En),
        _ => None,
    }
}

fn read_installer_language_hint() -> Option<InstallerLanguageHint> {
    let exe = std::env::current_exe().ok()?;
    let exe_dir = exe.parent()?;
    let candidates = [
        exe_dir.join("resources").join("installer_language.txt"),
        exe_dir.join("installer_language.txt"),
    ];

    for marker_path in candidates {
        if let Ok(raw) = std::fs::read_to_string(&marker_path) {
            if let Some(language) = parse_language_hint(&raw) {
                return Some(InstallerLanguageHint {
                    language,
                    marker_path,
                });
            }
        }
    }

    None
}

fn apply_installer_language_once(config: &mut AppConfig, hint: Option<&InstallerLanguageHint>) {
    let Some(hint) = hint else {
        return;
    };

    if !matches!(hint.language, Language::Unknown) {
        config.ui_language = hint.language;
    }

    let _ = std::fs::remove_file(&hint.marker_path);
}

pub fn load_config() -> AppConfig {
    let installer_hint = read_installer_language_hint();
    let path = config_path();

    if let Ok(mut file) = std::fs::File::open(&path) {
        let mut contents = String::new();
        if std::io::Read::read_to_string(&mut file, &mut contents).is_ok() {
            if let Ok(config) = toml::from_str::<AppConfig>(&contents) {
                let mut config = normalize_config(config);
                apply_installer_language_once(&mut config, installer_hint.as_ref());
                let _ = save_config(&config);
                return config;
            }
        }
    }

    let legacy = legacy_config_path();
    if let Ok(mut file) = std::fs::File::open(&legacy) {
        let mut contents = String::new();
        if std::io::Read::read_to_string(&mut file, &mut contents).is_ok() {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&contents) {
                let mut config = normalize_config(config);
                apply_installer_language_once(&mut config, installer_hint.as_ref());
                let _ = save_config(&config);
                return config;
            }
        }
    }

    let mut config = normalize_config(default_app_config());
    apply_installer_language_once(&mut config, installer_hint.as_ref());
    let _ = save_config(&config);
    config
}

pub fn load_config_fast() -> AppConfig {
    let installer_hint = read_installer_language_hint();
    let path = config_path();

    if let Ok(mut file) = std::fs::File::open(&path) {
        let mut contents = String::new();
        if std::io::Read::read_to_string(&mut file, &mut contents).is_ok() {
            if let Ok(config) = toml::from_str::<AppConfig>(&contents) {
                let mut config = normalize_config(config);
                apply_installer_language_once(&mut config, installer_hint.as_ref());
                return config;
            }
        }
    }

    let legacy = legacy_config_path();
    if let Ok(mut file) = std::fs::File::open(&legacy) {
        let mut contents = String::new();
        if std::io::Read::read_to_string(&mut file, &mut contents).is_ok() {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&contents) {
                let mut config = normalize_config(config);
                apply_installer_language_once(&mut config, installer_hint.as_ref());
                return config;
            }
        }
    }

    let mut config = normalize_config(default_app_config());
    apply_installer_language_once(&mut config, installer_hint.as_ref());
    config
}

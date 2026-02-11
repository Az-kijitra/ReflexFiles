use crate::config_defaults::{default_app_config, normalize_config};
use crate::config_io::legacy_config_path;
use crate::config_types::AppConfig;

pub use crate::config_io::{config_path, save_config, save_history, save_jump_list};

pub fn load_config() -> AppConfig {
    let path = config_path();
    if let Ok(mut file) = std::fs::File::open(&path) {
        let mut contents = String::new();
        if std::io::Read::read_to_string(&mut file, &mut contents).is_ok() {
            if let Ok(config) = toml::from_str::<AppConfig>(&contents) {
                let config = normalize_config(config);
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
                let config = normalize_config(config);
                let _ = save_config(&config);
                return config;
            }
        }
    }
    normalize_config(default_app_config())
}

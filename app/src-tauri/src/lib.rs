// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod bootstrap;
mod clipboard;
mod clipboard_cmds;
mod config_cmds;
mod config_defaults;
mod config_io;
mod config_types;
mod error;
mod external_apps;
mod external_apps_cmds;
mod fs_ops_archive;
mod fs_ops_create;
mod fs_ops_delete;
mod fs_ops_mutate;
mod fs_ops_mutate_helpers;
mod fs_ops_preflight;
mod fs_ops_rename;
mod fs_ops_transfer;
mod fs_ops_transfer_copy;
mod fs_ops_transfer_helpers;
mod fs_ops_transfer_move;
mod fs_query;
mod fs_query_cmds;
mod gdrive_auth;
mod gdrive_auth_cmds;
#[cfg(not(feature = "gdrive-readonly-stub"))]
mod gdrive_real;
#[cfg(feature = "gdrive-readonly-stub")]
mod gdrive_stub;
mod gdrive_token_store;
mod log;
mod storage_provider;
mod system_cmds;
mod utils;
mod viewer_cmds;
mod watch;

mod config;
mod types;
pub(crate) use log::{log_error, log_event};

pub fn run() {
    bootstrap::run();
}

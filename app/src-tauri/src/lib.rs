// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod log;
mod config_defaults;
mod config_io;
mod config_types;
mod fs_ops_archive;
mod fs_ops_transfer_helpers;
mod fs_ops_transfer_copy;
mod fs_ops_transfer_move;
mod fs_ops_mutate;
mod fs_ops_transfer;
mod fs_ops_mutate_helpers;
mod fs_ops_preflight;
mod fs_ops_delete;
mod fs_ops_create;
mod fs_ops_rename;
mod clipboard;
mod clipboard_cmds;
mod external_apps;
mod external_apps_cmds;
mod watch;
mod config_cmds;
mod fs_query;
mod fs_query_cmds;
mod utils;
mod bootstrap;
mod viewer_cmds;
mod system_cmds;
mod error;

mod types;
mod config;
pub(crate) use log::{log_error, log_event};

pub fn run() {
    bootstrap::run();
}

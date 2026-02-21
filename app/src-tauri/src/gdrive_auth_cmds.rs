use crate::gdrive_auth::{
    gdrive_auth_clear_client_secret_impl,
    gdrive_auth_complete_exchange_impl, gdrive_auth_get_status_impl, gdrive_auth_sign_out_impl,
    gdrive_auth_load_client_secret_impl,
    gdrive_auth_store_client_secret_impl,
    gdrive_auth_start_session_impl, gdrive_auth_validate_callback_impl,
    gdrive_auth_wait_for_callback_impl, GdriveAuthCallbackCaptured, GdriveAuthCallbackValidated,
    GdriveAuthStartPayload, GdriveAuthStatus,
};

#[tauri::command]
pub fn gdrive_auth_get_status() -> Result<GdriveAuthStatus, String> {
    gdrive_auth_get_status_impl().map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_auth_start_session(
    client_id: String,
    redirect_uri: String,
    scopes: Option<Vec<String>>,
) -> Result<GdriveAuthStartPayload, String> {
    gdrive_auth_start_session_impl(client_id, redirect_uri, scopes.unwrap_or_default())
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_auth_validate_callback(
    state: String,
    code: String,
) -> Result<GdriveAuthCallbackValidated, String> {
    gdrive_auth_validate_callback_impl(state, code)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_auth_wait_for_callback(
    timeout_ms: Option<u64>,
) -> Result<GdriveAuthCallbackCaptured, String> {
    gdrive_auth_wait_for_callback_impl(timeout_ms)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_auth_complete_exchange(
    account_id: String,
    scopes: Option<Vec<String>>,
    refresh_token: Option<String>,
    access_token: Option<String>,
    access_token_expires_in_sec: Option<u64>,
) -> Result<GdriveAuthStatus, String> {
    gdrive_auth_complete_exchange_impl(
        account_id,
        scopes.unwrap_or_default(),
        refresh_token,
        access_token,
        access_token_expires_in_sec,
    )
    .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_auth_sign_out(account_id: Option<String>) -> Result<GdriveAuthStatus, String> {
    gdrive_auth_sign_out_impl(account_id).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_auth_store_client_secret(
    client_id: String,
    client_secret: String,
) -> Result<(), String> {
    gdrive_auth_store_client_secret_impl(client_id, client_secret)
        .map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_auth_load_client_secret(client_id: String) -> Result<Option<String>, String> {
    gdrive_auth_load_client_secret_impl(client_id).map_err(|err| format!("code={}; {}", err.code(), err))
}

#[tauri::command]
pub fn gdrive_auth_clear_client_secret(client_id: String) -> Result<(), String> {
    gdrive_auth_clear_client_secret_impl(client_id).map_err(|err| format!("code={}; {}", err.code(), err))
}

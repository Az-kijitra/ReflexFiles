use crate::error::{AppError, AppErrorKind, AppResult};
use once_cell::sync::Lazy;
#[cfg(target_os = "windows")]
use sha2::{Digest, Sha256};
#[cfg(test)]
use std::collections::HashMap;
#[cfg(test)]
use std::sync::Mutex;
#[cfg(target_os = "windows")]
use windows::core::{HRESULT, PCWSTR, PWSTR};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{ERROR_NOT_FOUND, ERROR_NO_SUCH_LOGON_SESSION};
#[cfg(target_os = "windows")]
use windows::Win32::Security::Credentials::{
    CredDeleteW, CredFree, CredReadW, CredWriteW, CREDENTIALW, CRED_MAX_CREDENTIAL_BLOB_SIZE,
    CRED_PERSIST_LOCAL_MACHINE, CRED_TYPE_GENERIC,
};

pub trait GdriveTokenStore: Send + Sync {
    fn backend_name(&self) -> &'static str;
    fn is_available(&self) -> bool;
    fn save_refresh_token(&self, account_id: &str, refresh_token: &str) -> AppResult<()>;
    fn load_refresh_token(&self, account_id: &str) -> AppResult<Option<String>>;
    fn clear_refresh_token(&self, account_id: &str) -> AppResult<()>;
    fn save_client_secret(&self, client_id: &str, client_secret: &str) -> AppResult<()>;
    fn load_client_secret(&self, client_id: &str) -> AppResult<Option<String>>;
    fn clear_client_secret(&self, client_id: &str) -> AppResult<()>;
}

#[cfg_attr(target_os = "windows", allow(dead_code))]
#[derive(Default)]
pub struct UnsupportedTokenStore;

#[cfg_attr(target_os = "windows", allow(dead_code))]
impl UnsupportedTokenStore {
    fn unavailable_error(op: &str) -> AppError {
        AppError::with_kind(
            AppErrorKind::Permission,
            format!("secure token store unavailable: {op}"),
        )
    }
}

impl GdriveTokenStore for UnsupportedTokenStore {
    fn backend_name(&self) -> &'static str {
        "unsupported"
    }

    fn is_available(&self) -> bool {
        false
    }

    fn save_refresh_token(&self, _account_id: &str, _refresh_token: &str) -> AppResult<()> {
        Err(Self::unavailable_error("save"))
    }

    fn load_refresh_token(&self, _account_id: &str) -> AppResult<Option<String>> {
        Err(Self::unavailable_error("load"))
    }

    fn clear_refresh_token(&self, _account_id: &str) -> AppResult<()> {
        Err(Self::unavailable_error("clear"))
    }

    fn save_client_secret(&self, _client_id: &str, _client_secret: &str) -> AppResult<()> {
        Err(Self::unavailable_error("save client secret"))
    }

    fn load_client_secret(&self, _client_id: &str) -> AppResult<Option<String>> {
        Err(Self::unavailable_error("load client secret"))
    }

    fn clear_client_secret(&self, _client_id: &str) -> AppResult<()> {
        Err(Self::unavailable_error("clear client secret"))
    }
}

#[cfg(target_os = "windows")]
#[derive(Default)]
pub struct WindowsCredentialManagerTokenStore;

#[cfg(target_os = "windows")]
impl WindowsCredentialManagerTokenStore {
    const TARGET_PREFIX: &'static str = "ReflexFiles.GDrive.RefreshToken.v1";
    const TARGET_PREFIX_CLIENT_SECRET: &'static str = "ReflexFiles.GDrive.ClientSecret.v1";

    fn normalize_account_id(account_id: &str) -> AppResult<&str> {
        let normalized = account_id.trim();
        if normalized.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "account id is empty",
            ));
        }
        Ok(normalized)
    }

    fn normalize_refresh_token(refresh_token: &str) -> AppResult<&str> {
        let normalized = refresh_token.trim();
        if normalized.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "refresh token is empty",
            ));
        }
        Ok(normalized)
    }

    fn normalize_client_id(client_id: &str) -> AppResult<&str> {
        let normalized = client_id.trim();
        if normalized.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "client id is empty",
            ));
        }
        Ok(normalized)
    }

    fn normalize_client_secret(client_secret: &str) -> AppResult<&str> {
        let normalized = client_secret.trim();
        if normalized.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "client secret is empty",
            ));
        }
        Ok(normalized)
    }

    fn credential_target_name(account_id: &str) -> AppResult<String> {
        let normalized = Self::normalize_account_id(account_id)?;
        let digest = Sha256::digest(normalized.as_bytes());
        let digest_hex = digest
            .iter()
            .map(|value| format!("{value:02x}"))
            .collect::<String>();
        Ok(format!("{}:{}", Self::TARGET_PREFIX, digest_hex))
    }

    fn client_secret_target_name(client_id: &str) -> AppResult<String> {
        let normalized = Self::normalize_client_id(client_id)?;
        let digest = Sha256::digest(normalized.as_bytes());
        let digest_hex = digest
            .iter()
            .map(|value| format!("{value:02x}"))
            .collect::<String>();
        Ok(format!("{}:{}", Self::TARGET_PREFIX_CLIENT_SECRET, digest_hex))
    }

    fn to_wide_null_terminated(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn map_windows_error(op: &str, err: windows::core::Error) -> AppError {
        AppError::with_kind(
            AppErrorKind::Io,
            format!("{op} failed: {} ({})", err.message(), err.code()),
        )
    }

    fn is_not_found_error(err: &windows::core::Error) -> bool {
        let code = err.code();
        code == HRESULT::from_win32(ERROR_NOT_FOUND.0)
            || code == HRESULT::from_win32(ERROR_NO_SUCH_LOGON_SESSION.0)
    }
}

#[cfg(target_os = "windows")]
impl GdriveTokenStore for WindowsCredentialManagerTokenStore {
    fn backend_name(&self) -> &'static str {
        "windows-credential-manager"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn save_refresh_token(&self, account_id: &str, refresh_token: &str) -> AppResult<()> {
        let account_id = Self::normalize_account_id(account_id)?;
        let refresh_token = Self::normalize_refresh_token(refresh_token)?;
        let token_blob = refresh_token.as_bytes();
        if token_blob.len() > CRED_MAX_CREDENTIAL_BLOB_SIZE as usize {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                format!(
                    "refresh token exceeds credential blob size limit: {}",
                    CRED_MAX_CREDENTIAL_BLOB_SIZE
                ),
            ));
        }

        let target_name = Self::credential_target_name(account_id)?;
        let mut target_name_wide = Self::to_wide_null_terminated(&target_name);
        let mut user_name_wide = Self::to_wide_null_terminated(account_id);
        let mut token_bytes = token_blob.to_vec();
        let credential_blob_ptr = if token_bytes.is_empty() {
            std::ptr::null_mut()
        } else {
            token_bytes.as_mut_ptr()
        };

        let credential = CREDENTIALW {
            Type: CRED_TYPE_GENERIC,
            TargetName: PWSTR(target_name_wide.as_mut_ptr()),
            CredentialBlobSize: token_bytes.len() as u32,
            CredentialBlob: credential_blob_ptr,
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            UserName: PWSTR(user_name_wide.as_mut_ptr()),
            ..Default::default()
        };

        unsafe { CredWriteW(&credential, 0) }
            .map_err(|err| Self::map_windows_error("CredWriteW", err))
    }

    fn load_refresh_token(&self, account_id: &str) -> AppResult<Option<String>> {
        let account_id = Self::normalize_account_id(account_id)?;
        let target_name = Self::credential_target_name(account_id)?;
        let target_name_wide = Self::to_wide_null_terminated(&target_name);
        let mut credential_ptr: *mut CREDENTIALW = std::ptr::null_mut();

        let read_result = unsafe {
            CredReadW(
                PCWSTR::from_raw(target_name_wide.as_ptr()),
                CRED_TYPE_GENERIC,
                None,
                &mut credential_ptr,
            )
        };
        match read_result {
            Ok(()) => {}
            Err(err) if Self::is_not_found_error(&err) => return Ok(None),
            Err(err) => return Err(Self::map_windows_error("CredReadW", err)),
        }

        struct CredentialReadGuard(*mut CREDENTIALW);
        impl Drop for CredentialReadGuard {
            fn drop(&mut self) {
                if !self.0.is_null() {
                    unsafe { CredFree(self.0.cast()) };
                }
            }
        }

        let _guard = CredentialReadGuard(credential_ptr);
        if credential_ptr.is_null() {
            return Ok(None);
        }

        let blob_len = unsafe { (*credential_ptr).CredentialBlobSize as usize };
        if blob_len == 0 {
            return Ok(None);
        }
        let blob_ptr = unsafe { (*credential_ptr).CredentialBlob };
        if blob_ptr.is_null() {
            return Ok(None);
        }

        let blob = unsafe { std::slice::from_raw_parts(blob_ptr as *const u8, blob_len) };
        let token = std::str::from_utf8(blob).map_err(|_| {
            AppError::with_kind(
                AppErrorKind::Io,
                "credential blob is not valid utf-8 refresh token",
            )
        })?;
        Ok(Some(token.to_string()))
    }

    fn clear_refresh_token(&self, account_id: &str) -> AppResult<()> {
        let account_id = Self::normalize_account_id(account_id)?;
        let target_name = Self::credential_target_name(account_id)?;
        let target_name_wide = Self::to_wide_null_terminated(&target_name);
        let delete_result = unsafe {
            CredDeleteW(
                PCWSTR::from_raw(target_name_wide.as_ptr()),
                CRED_TYPE_GENERIC,
                None,
            )
        };
        match delete_result {
            Ok(()) => Ok(()),
            Err(err) if Self::is_not_found_error(&err) => Ok(()),
            Err(err) => Err(Self::map_windows_error("CredDeleteW", err)),
        }
    }

    fn save_client_secret(&self, client_id: &str, client_secret: &str) -> AppResult<()> {
        let client_id = Self::normalize_client_id(client_id)?;
        let client_secret = Self::normalize_client_secret(client_secret)?;
        let secret_blob = client_secret.as_bytes();
        if secret_blob.len() > CRED_MAX_CREDENTIAL_BLOB_SIZE as usize {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                format!(
                    "client secret exceeds credential blob size limit: {}",
                    CRED_MAX_CREDENTIAL_BLOB_SIZE
                ),
            ));
        }

        let target_name = Self::client_secret_target_name(client_id)?;
        let mut target_name_wide = Self::to_wide_null_terminated(&target_name);
        let mut user_name_wide = Self::to_wide_null_terminated(client_id);
        let mut secret_bytes = secret_blob.to_vec();
        let secret_blob_ptr = if secret_bytes.is_empty() {
            std::ptr::null_mut()
        } else {
            secret_bytes.as_mut_ptr()
        };

        let credential = CREDENTIALW {
            Type: CRED_TYPE_GENERIC,
            TargetName: PWSTR(target_name_wide.as_mut_ptr()),
            CredentialBlobSize: secret_bytes.len() as u32,
            CredentialBlob: secret_blob_ptr,
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            UserName: PWSTR(user_name_wide.as_mut_ptr()),
            ..Default::default()
        };

        unsafe { CredWriteW(&credential, 0) }
            .map_err(|err| Self::map_windows_error("CredWriteW(client_secret)", err))
    }

    fn load_client_secret(&self, client_id: &str) -> AppResult<Option<String>> {
        let client_id = Self::normalize_client_id(client_id)?;
        let target_name = Self::client_secret_target_name(client_id)?;
        let target_name_wide = Self::to_wide_null_terminated(&target_name);
        let mut credential_ptr: *mut CREDENTIALW = std::ptr::null_mut();

        let read_result = unsafe {
            CredReadW(
                PCWSTR::from_raw(target_name_wide.as_ptr()),
                CRED_TYPE_GENERIC,
                None,
                &mut credential_ptr,
            )
        };
        match read_result {
            Ok(()) => {}
            Err(err) if Self::is_not_found_error(&err) => return Ok(None),
            Err(err) => return Err(Self::map_windows_error("CredReadW(client_secret)", err)),
        }

        struct CredentialReadGuard(*mut CREDENTIALW);
        impl Drop for CredentialReadGuard {
            fn drop(&mut self) {
                if !self.0.is_null() {
                    unsafe { CredFree(self.0.cast()) };
                }
            }
        }

        let _guard = CredentialReadGuard(credential_ptr);
        if credential_ptr.is_null() {
            return Ok(None);
        }

        let blob_len = unsafe { (*credential_ptr).CredentialBlobSize as usize };
        if blob_len == 0 {
            return Ok(None);
        }
        let blob_ptr = unsafe { (*credential_ptr).CredentialBlob };
        if blob_ptr.is_null() {
            return Ok(None);
        }

        let blob = unsafe { std::slice::from_raw_parts(blob_ptr as *const u8, blob_len) };
        let secret = std::str::from_utf8(blob).map_err(|_| {
            AppError::with_kind(
                AppErrorKind::Io,
                "credential blob is not valid utf-8 client secret",
            )
        })?;
        Ok(Some(secret.to_string()))
    }

    fn clear_client_secret(&self, client_id: &str) -> AppResult<()> {
        let client_id = Self::normalize_client_id(client_id)?;
        let target_name = Self::client_secret_target_name(client_id)?;
        let target_name_wide = Self::to_wide_null_terminated(&target_name);
        let delete_result = unsafe {
            CredDeleteW(
                PCWSTR::from_raw(target_name_wide.as_ptr()),
                CRED_TYPE_GENERIC,
                None,
            )
        };
        match delete_result {
            Ok(()) => Ok(()),
            Err(err) if Self::is_not_found_error(&err) => Ok(()),
            Err(err) => Err(Self::map_windows_error("CredDeleteW(client_secret)", err)),
        }
    }
}

#[cfg(test)]
pub struct InMemoryTokenStore {
    data: Mutex<HashMap<String, String>>,
}

#[cfg(test)]
impl Default for InMemoryTokenStore {
    fn default() -> Self {
        Self {
            data: Mutex::new(HashMap::new()),
        }
    }
}

#[cfg(test)]
impl GdriveTokenStore for InMemoryTokenStore {
    fn backend_name(&self) -> &'static str {
        "memory-test"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn save_refresh_token(&self, account_id: &str, refresh_token: &str) -> AppResult<()> {
        let normalized_account = account_id.trim();
        if normalized_account.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "account id is empty",
            ));
        }
        if refresh_token.trim().is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "refresh token is empty",
            ));
        }
        let mut guard = self
            .data
            .lock()
            .map_err(|_| AppError::msg("memory token store lock poisoned"))?;
        guard.insert(normalized_account.to_string(), refresh_token.to_string());
        Ok(())
    }

    fn load_refresh_token(&self, account_id: &str) -> AppResult<Option<String>> {
        let normalized_account = account_id.trim();
        if normalized_account.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "account id is empty",
            ));
        }
        let guard = self
            .data
            .lock()
            .map_err(|_| AppError::msg("memory token store lock poisoned"))?;
        Ok(guard.get(normalized_account).cloned())
    }

    fn clear_refresh_token(&self, account_id: &str) -> AppResult<()> {
        let normalized_account = account_id.trim();
        if normalized_account.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "account id is empty",
            ));
        }
        let mut guard = self
            .data
            .lock()
            .map_err(|_| AppError::msg("memory token store lock poisoned"))?;
        guard.remove(normalized_account);
        Ok(())
    }

    fn save_client_secret(&self, client_id: &str, client_secret: &str) -> AppResult<()> {
        let normalized_client = client_id.trim();
        if normalized_client.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "client id is empty",
            ));
        }
        if client_secret.trim().is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "client secret is empty",
            ));
        }
        let mut guard = self
            .data
            .lock()
            .map_err(|_| AppError::msg("memory token store lock poisoned"))?;
        guard.insert(
            format!("client_secret:{normalized_client}"),
            client_secret.to_string(),
        );
        Ok(())
    }

    fn load_client_secret(&self, client_id: &str) -> AppResult<Option<String>> {
        let normalized_client = client_id.trim();
        if normalized_client.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "client id is empty",
            ));
        }
        let guard = self
            .data
            .lock()
            .map_err(|_| AppError::msg("memory token store lock poisoned"))?;
        Ok(guard
            .get(&format!("client_secret:{normalized_client}"))
            .cloned())
    }

    fn clear_client_secret(&self, client_id: &str) -> AppResult<()> {
        let normalized_client = client_id.trim();
        if normalized_client.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "client id is empty",
            ));
        }
        let mut guard = self
            .data
            .lock()
            .map_err(|_| AppError::msg("memory token store lock poisoned"))?;
        guard.remove(&format!("client_secret:{normalized_client}"));
        Ok(())
    }
}

#[cfg(target_os = "windows")]
static DEFAULT_TOKEN_STORE: Lazy<WindowsCredentialManagerTokenStore> =
    Lazy::new(WindowsCredentialManagerTokenStore::default);
#[cfg(not(target_os = "windows"))]
static DEFAULT_TOKEN_STORE: Lazy<UnsupportedTokenStore> = Lazy::new(UnsupportedTokenStore::default);

pub fn default_gdrive_token_store() -> &'static dyn GdriveTokenStore {
    &*DEFAULT_TOKEN_STORE
}

#[cfg(test)]
mod tests {
    use super::{GdriveTokenStore, InMemoryTokenStore, UnsupportedTokenStore};

    #[test]
    fn unsupported_store_is_not_available() {
        let store = UnsupportedTokenStore;
        assert!(!store.is_available());
        assert!(store.save_refresh_token("acc", "tok").is_err());
    }

    #[test]
    fn in_memory_store_round_trip() {
        let store = InMemoryTokenStore::default();
        store
            .save_refresh_token("acc1", "tok1")
            .expect("save token");
        let loaded = store.load_refresh_token("acc1").expect("load token");
        assert_eq!(loaded.as_deref(), Some("tok1"));
        store.clear_refresh_token("acc1").expect("clear token");
        let loaded = store
            .load_refresh_token("acc1")
            .expect("load token after clear");
        assert!(loaded.is_none());
    }
}

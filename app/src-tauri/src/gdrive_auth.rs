use base64::Engine as _;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
#[cfg(target_os = "windows")]
use std::process::Command;
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use url::{form_urlencoded, Host, Url};

use crate::error::{AppError, AppErrorKind, AppResult};
use crate::gdrive_token_store::{default_gdrive_token_store, GdriveTokenStore};

const GOOGLE_AUTH_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_DRIVE_READONLY_SCOPE: &str = "https://www.googleapis.com/auth/drive.readonly";
const DEFAULT_SCOPE: &str = GOOGLE_DRIVE_READONLY_SCOPE;
const ACCESS_TOKEN_EXPIRY_SAFETY_MS: u64 = 30_000;
const DEFAULT_CALLBACK_WAIT_TIMEOUT_MS: u64 = 180_000;
const CALLBACK_WAIT_TIMEOUT_MIN_MS: u64 = 1_000;
const CALLBACK_WAIT_TIMEOUT_MAX_MS: u64 = 600_000;
const GOOGLE_TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";

#[derive(Copy, Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GdriveAuthPhase {
    SignedOut,
    Pending,
    Authorized,
}

#[derive(Copy, Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GdriveBackendMode {
    #[cfg(feature = "gdrive-readonly-stub")]
    Stub,
    #[cfg(not(feature = "gdrive-readonly-stub"))]
    Real,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GdriveAuthStatus {
    pub phase: GdriveAuthPhase,
    pub backend_mode: GdriveBackendMode,
    pub account_id: Option<String>,
    pub granted_scopes: Vec<String>,
    pub refresh_token_persisted: bool,
    pub pending_started_at_ms: Option<u64>,
    pub last_error: String,
    pub token_store_backend: String,
    pub token_store_available: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GdriveAuthStartPayload {
    pub authorization_url: String,
    pub issued_at_ms: u64,
    pub pending_expires_in_sec: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GdriveAuthCallbackValidated {
    pub code: String,
    pub code_verifier: String,
    pub redirect_uri: String,
    pub client_id: String,
    pub scopes: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GdriveAuthCallbackCaptured {
    pub callback_url: String,
    pub state: String,
    pub code: String,
}

#[derive(Deserialize)]
struct GoogleTokenRefreshDto {
    #[serde(default)]
    access_token: String,
    expires_in: Option<u64>,
    scope: Option<String>,
}

#[derive(Clone)]
struct PendingAuthSession {
    state: String,
    code_verifier: String,
    client_id: String,
    redirect_uri: String,
    scopes: Vec<String>,
    issued_at_ms: u64,
}

#[derive(Clone, Default)]
struct GdriveAuthState {
    pending: Option<PendingAuthSession>,
    account_id: Option<String>,
    granted_scopes: Vec<String>,
    refresh_token_persisted: bool,
    access_token: Option<String>,
    access_token_expires_at_ms: Option<u64>,
    last_error: String,
}

impl GdriveAuthState {
    fn phase(&self) -> GdriveAuthPhase {
        if self.account_id.is_some() {
            return GdriveAuthPhase::Authorized;
        }
        if self.pending.is_some() {
            return GdriveAuthPhase::Pending;
        }
        GdriveAuthPhase::SignedOut
    }

    fn clear_authorized(&mut self) {
        self.account_id = None;
        self.granted_scopes.clear();
        self.refresh_token_persisted = false;
        self.access_token = None;
        self.access_token_expires_at_ms = None;
    }
}

static GDRIVE_AUTH_STATE: Lazy<Mutex<GdriveAuthState>> =
    Lazy::new(|| Mutex::new(GdriveAuthState::default()));

#[cfg(feature = "gdrive-readonly-stub")]
fn current_backend_mode() -> GdriveBackendMode {
    GdriveBackendMode::Stub
}

#[cfg(not(feature = "gdrive-readonly-stub"))]
fn current_backend_mode() -> GdriveBackendMode {
    GdriveBackendMode::Real
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn url_encode_component(value: &str) -> String {
    let mut out = String::new();
    for ch in value.chars() {
        if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.' | '~') {
            out.push(ch);
            continue;
        }
        let mut buf = [0u8; 4];
        let encoded = ch.encode_utf8(&mut buf);
        for b in encoded.as_bytes() {
            out.push('%');
            out.push_str(&format!("{:02X}", b));
        }
    }
    out
}

fn random_urlsafe_token(bytes_len: usize) -> AppResult<String> {
    if bytes_len == 0 {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "token length is zero",
        ));
    }
    let mut bytes = vec![0u8; bytes_len];
    getrandom::getrandom(&mut bytes)
        .map_err(|e| AppError::msg(format!("secure random generation failed: {e}")))?;
    Ok(base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes))
}

fn compute_pkce_s256_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest)
}

fn normalize_scopes(scopes: Vec<String>) -> AppResult<Vec<String>> {
    let mut normalized = scopes
        .into_iter()
        .map(|scope| scope.trim().to_string())
        .filter(|scope| !scope.is_empty())
        .collect::<Vec<_>>();
    if normalized.is_empty() {
        normalized.push(DEFAULT_SCOPE.to_string());
    }
    normalized.sort();
    normalized.dedup();

    for scope in &normalized {
        if scope != GOOGLE_DRIVE_READONLY_SCOPE {
            return Err(AppError::with_kind(
                AppErrorKind::Permission,
                format!("scope is not allowed for gate 1: {scope}"),
            ));
        }
    }
    Ok(normalized)
}

fn build_google_auth_url(
    client_id: &str,
    redirect_uri: &str,
    scopes: &[String],
    state: &str,
    nonce: &str,
    code_challenge: &str,
) -> String {
    let scope_text = scopes.join(" ");
    let query = [
        ("client_id", client_id),
        ("redirect_uri", redirect_uri),
        ("response_type", "code"),
        ("scope", &scope_text),
        ("state", state),
        ("nonce", nonce),
        ("code_challenge", code_challenge),
        ("code_challenge_method", "S256"),
        ("access_type", "offline"),
        ("include_granted_scopes", "true"),
        ("prompt", "consent"),
    ];

    let params = query
        .iter()
        .map(|(k, v)| format!("{}={}", url_encode_component(k), url_encode_component(v)))
        .collect::<Vec<_>>()
        .join("&");

    format!("{GOOGLE_AUTH_ENDPOINT}?{params}")
}

fn start_auth_session(
    state: &mut GdriveAuthState,
    client_id: String,
    redirect_uri: String,
    scopes: Vec<String>,
) -> AppResult<GdriveAuthStartPayload> {
    let client_id = client_id.trim().to_string();
    let redirect_uri = redirect_uri.trim().to_string();
    if client_id.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "client_id is empty",
        ));
    }
    if redirect_uri.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "redirect_uri is empty",
        ));
    }

    let scopes = normalize_scopes(scopes)?;
    let issued_at_ms = now_ms();
    let state_token = random_urlsafe_token(32)?;
    let nonce = random_urlsafe_token(32)?;
    let code_verifier = random_urlsafe_token(32)?;
    let code_challenge = compute_pkce_s256_challenge(&code_verifier);
    let auth_url = build_google_auth_url(
        &client_id,
        &redirect_uri,
        &scopes,
        &state_token,
        &nonce,
        &code_challenge,
    );

    state.pending = Some(PendingAuthSession {
        state: state_token,
        code_verifier,
        client_id,
        redirect_uri,
        scopes,
        issued_at_ms,
    });
    state.clear_authorized();
    state.last_error.clear();

    Ok(GdriveAuthStartPayload {
        authorization_url: auth_url,
        issued_at_ms,
        pending_expires_in_sec: 600,
    })
}

fn validate_callback(
    state: &mut GdriveAuthState,
    callback_state: String,
    code: String,
) -> AppResult<GdriveAuthCallbackValidated> {
    let callback_state = callback_state.trim();
    let code = code.trim();
    if callback_state.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "callback state is empty",
        ));
    }
    if code.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "authorization code is empty",
        ));
    }
    let pending = state.pending.clone().ok_or_else(|| {
        AppError::with_kind(
            AppErrorKind::InvalidPath,
            "no pending oauth session for callback",
        )
    })?;

    if pending.state != callback_state {
        state.last_error = "oauth callback state mismatch".to_string();
        return Err(AppError::with_kind(
            AppErrorKind::Permission,
            "oauth callback state mismatch",
        ));
    }

    state.pending = None;
    state.last_error.clear();
    Ok(GdriveAuthCallbackValidated {
        code: code.to_string(),
        code_verifier: pending.code_verifier,
        redirect_uri: pending.redirect_uri,
        client_id: pending.client_id,
        scopes: pending.scopes,
    })
}

fn write_http_response(stream: &mut TcpStream, status: &str, body: &str) {
    let payload = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.as_bytes().len(),
        body
    );
    let _ = stream.write_all(payload.as_bytes());
    let _ = stream.flush();
}

fn parse_loopback_target(redirect_uri: &str) -> AppResult<(String, u16, String)> {
    let url = Url::parse(redirect_uri).map_err(|_| {
        AppError::with_kind(
            AppErrorKind::InvalidPath,
            "redirect_uri must be a valid absolute URL",
        )
    })?;

    if url.scheme() != "http" {
        return Err(AppError::with_kind(
            AppErrorKind::Permission,
            "redirect_uri scheme must be http for loopback callback",
        ));
    }

    let port = url.port().ok_or_else(|| {
        AppError::with_kind(
            AppErrorKind::InvalidPath,
            "redirect_uri must include an explicit port",
        )
    })?;

    let bind_host = match url.host() {
        Some(Host::Ipv4(v4)) if v4.octets() == [127, 0, 0, 1] => "127.0.0.1".to_string(),
        Some(Host::Ipv6(v6)) if v6.is_loopback() => "::1".to_string(),
        Some(Host::Domain(domain)) if domain.eq_ignore_ascii_case("localhost") => {
            "127.0.0.1".to_string()
        }
        _ => {
            return Err(AppError::with_kind(
                AppErrorKind::Permission,
                "redirect_uri host must be localhost / 127.0.0.1 / ::1",
            ))
        }
    };

    let path = if url.path().is_empty() {
        "/".to_string()
    } else {
        url.path().to_string()
    };
    Ok((bind_host, port, path))
}

fn callback_wait_timeout_ms(timeout_ms: Option<u64>) -> u64 {
    timeout_ms
        .unwrap_or(DEFAULT_CALLBACK_WAIT_TIMEOUT_MS)
        .clamp(CALLBACK_WAIT_TIMEOUT_MIN_MS, CALLBACK_WAIT_TIMEOUT_MAX_MS)
}

fn pending_callback_snapshot() -> AppResult<(String, String)> {
    let guard = GDRIVE_AUTH_STATE
        .lock()
        .map_err(|_| AppError::msg("gdrive auth state lock poisoned"))?;
    let pending = guard.pending.as_ref().ok_or_else(|| {
        AppError::with_kind(
            AppErrorKind::InvalidPath,
            "no pending oauth session for callback capture",
        )
    })?;
    Ok((pending.redirect_uri.clone(), pending.state.clone()))
}

fn wait_for_callback_capture(
    redirect_uri: &str,
    expected_state: &str,
    timeout_ms: u64,
) -> AppResult<GdriveAuthCallbackCaptured> {
    let (bind_host, port, expected_path) = parse_loopback_target(redirect_uri)?;
    let bind_addr = if bind_host == "::1" {
        format!("[::1]:{port}")
    } else {
        format!("{bind_host}:{port}")
    };

    let listener = TcpListener::bind(&bind_addr).map_err(|e| {
        AppError::with_kind(
            AppErrorKind::Io,
            format!("failed to bind callback listener on {bind_addr}: {e}"),
        )
    })?;
    listener
        .set_nonblocking(true)
        .map_err(|e| AppError::with_kind(AppErrorKind::Io, format!("set_nonblocking failed: {e}")))?;

    let deadline = Instant::now() + Duration::from_millis(timeout_ms);
    while Instant::now() < deadline {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut reader = BufReader::new(&mut stream);
                let mut request_line = String::new();
                if reader.read_line(&mut request_line).is_err() {
                    continue;
                }
                let mut parts = request_line.split_whitespace();
                let method = parts.next().unwrap_or_default();
                let target = parts.next().unwrap_or_default();

                if method != "GET" {
                    write_http_response(
                        &mut stream,
                        "405 Method Not Allowed",
                        "<html><body><h1>Method Not Allowed</h1></body></html>",
                    );
                    continue;
                }

                let (path, query) = match target.split_once('?') {
                    Some((p, q)) => (p, q),
                    None => (target, ""),
                };

                if path != expected_path {
                    write_http_response(
                        &mut stream,
                        "404 Not Found",
                        "<html><body><h1>Not Found</h1></body></html>",
                    );
                    continue;
                }

                let mut state = String::new();
                let mut code = String::new();
                let mut oauth_error = String::new();
                for (key, value) in form_urlencoded::parse(query.as_bytes()) {
                    if key == "state" {
                        state = value.into_owned();
                    } else if key == "code" {
                        code = value.into_owned();
                    } else if key == "error" {
                        oauth_error = value.into_owned();
                    }
                }

                if !oauth_error.trim().is_empty() {
                    write_http_response(
                        &mut stream,
                        "200 OK",
                        "<html><body><h1>Sign-in canceled or denied</h1><p>Return to ReflexFiles.</p></body></html>",
                    );
                    return Err(AppError::with_kind(
                        AppErrorKind::Permission,
                        format!("oauth callback returned error: {oauth_error}"),
                    ));
                }

                if state.trim().is_empty() || code.trim().is_empty() {
                    write_http_response(
                        &mut stream,
                        "400 Bad Request",
                        "<html><body><h1>Missing callback parameters</h1></body></html>",
                    );
                    continue;
                }

                if state != expected_state {
                    write_http_response(
                        &mut stream,
                        "400 Bad Request",
                        "<html><body><h1>State mismatch</h1></body></html>",
                    );
                    continue;
                }

                let mut callback_url = Url::parse(redirect_uri).map_err(|_| {
                    AppError::with_kind(
                        AppErrorKind::InvalidPath,
                        "failed to reconstruct callback url",
                    )
                })?;
                callback_url.set_query(Some(query));

                write_http_response(
                    &mut stream,
                    "200 OK",
                    "<html><body><h1>Sign-in received</h1><p>You can close this tab and return to ReflexFiles.</p></body></html>",
                );
                return Ok(GdriveAuthCallbackCaptured {
                    callback_url: callback_url.to_string(),
                    state,
                    code,
                });
            }
            Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(50));
            }
            Err(err) => {
                return Err(AppError::with_kind(
                    AppErrorKind::Io,
                    format!("callback listener accept failed: {err}"),
                ));
            }
        }
    }

    Err(AppError::with_kind(
        AppErrorKind::Io,
        format!("oauth callback wait timed out after {timeout_ms}ms"),
    ))
}

fn complete_exchange(
    state: &mut GdriveAuthState,
    token_store: &dyn GdriveTokenStore,
    account_id: String,
    scopes: Vec<String>,
    refresh_token: Option<String>,
    access_token: Option<String>,
    access_token_expires_in_sec: Option<u64>,
) -> AppResult<GdriveAuthStatus> {
    let account_id = account_id.trim().to_string();
    if account_id.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "account_id is empty",
        ));
    }
    let scopes = normalize_scopes(scopes)?;

    let mut persisted = false;
    if let Some(refresh_token) = refresh_token {
        let normalized = refresh_token.trim().to_string();
        if !normalized.is_empty() {
            token_store.save_refresh_token(&account_id, &normalized)?;
            persisted = true;
        }
    } else if token_store.is_available() {
        persisted = token_store.load_refresh_token(&account_id)?.is_some();
    }

    state.pending = None;
    state.account_id = Some(account_id);
    state.granted_scopes = scopes;
    state.refresh_token_persisted = persisted;
    state.access_token = access_token
        .map(|token| token.trim().to_string())
        .filter(|token| !token.is_empty());
    state.access_token_expires_at_ms = state.access_token.as_ref().map(|_| {
        now_ms().saturating_add(access_token_expires_in_sec.unwrap_or(3600).max(60) * 1000)
    });
    state.last_error.clear();
    Ok(status_from_state(state, token_store))
}

fn sign_out(
    state: &mut GdriveAuthState,
    token_store: &dyn GdriveTokenStore,
    account_id: Option<String>,
) -> AppResult<GdriveAuthStatus> {
    let target_account = account_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .or_else(|| state.account_id.clone());

    if let Some(account_id) = target_account {
        if token_store.is_available() {
            token_store.clear_refresh_token(&account_id)?;
        }
    }

    state.pending = None;
    state.clear_authorized();
    state.last_error.clear();
    Ok(status_from_state(state, token_store))
}

fn normalize_client_id(client_id: String) -> AppResult<String> {
    let normalized = client_id.trim().to_string();
    if normalized.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "client_id is empty",
        ));
    }
    Ok(normalized)
}

fn ps_escape_single_quote(value: &str) -> String {
    value.replace('\'', "''")
}

#[cfg(target_os = "windows")]
fn run_powershell_json(script: &str) -> AppResult<serde_json::Value> {
    for shell in ["pwsh", "powershell"] {
        let output = Command::new(shell)
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                script,
            ])
            .output();

        match output {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if stdout.is_empty() {
                    continue;
                }
                let decoded = base64::engine::general_purpose::STANDARD
                    .decode(stdout.as_bytes())
                    .map_err(|err| {
                        AppError::with_kind(
                            AppErrorKind::Io,
                            format!("failed to decode powershell base64 output: {err}"),
                        )
                    })?;
                let json = String::from_utf8(decoded).map_err(|err| {
                    AppError::with_kind(
                        AppErrorKind::Io,
                        format!("powershell output is not valid utf-8 JSON: {err}"),
                    )
                })?;
                let parsed = serde_json::from_str::<serde_json::Value>(&json).map_err(|err| {
                    AppError::with_kind(
                        AppErrorKind::Io,
                        format!("failed to parse powershell JSON output: {err}"),
                    )
                })?;
                return Ok(parsed);
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let detail = if stderr.is_empty() {
                    format!("powershell exited with status {}", output.status)
                } else {
                    stderr
                };
                return Err(AppError::with_kind(AppErrorKind::Io, detail));
            }
            Err(_) => continue,
        }
    }
    Err(AppError::with_kind(
        AppErrorKind::Io,
        "failed to execute powershell",
    ))
}

#[cfg(not(target_os = "windows"))]
fn run_powershell_json(_script: &str) -> AppResult<serde_json::Value> {
    Err(AppError::with_kind(
        AppErrorKind::Permission,
        "google oauth refresh bridge is supported on windows only",
    ))
}

fn normalize_scope_text(scope_text: Option<String>) -> Vec<String> {
    let normalized = scope_text
        .unwrap_or_default()
        .split_whitespace()
        .map(|scope| scope.trim().to_string())
        .filter(|scope| scope == GOOGLE_DRIVE_READONLY_SCOPE)
        .collect::<Vec<_>>();
    if normalized.is_empty() {
        vec![GOOGLE_DRIVE_READONLY_SCOPE.to_string()]
    } else {
        normalized
    }
}

fn refresh_access_token_with_refresh_token(
    client_id: &str,
    refresh_token: &str,
    client_secret: Option<&str>,
) -> AppResult<(String, u64, Vec<String>)> {
    let mut script = format!(
        "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$body=@{{client_id='{}';grant_type='refresh_token';refresh_token='{}'}};",
        ps_escape_single_quote(client_id),
        ps_escape_single_quote(refresh_token)
    );
    if let Some(secret) = client_secret {
        if !secret.trim().is_empty() {
            script.push_str(&format!(
                "$body.client_secret='{}';",
                ps_escape_single_quote(secret)
            ));
        }
    }
    script.push_str(&format!(
        "$resp=Invoke-RestMethod -Method Post -Uri '{}' -Body $body -ContentType 'application/x-www-form-urlencoded' -TimeoutSec 30;$json=($resp | ConvertTo-Json -Depth 20 -Compress);[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))",
        GOOGLE_TOKEN_ENDPOINT
    ));

    let value = run_powershell_json(&script)?;
    let parsed = serde_json::from_value::<GoogleTokenRefreshDto>(value).map_err(|err| {
        AppError::with_kind(
            AppErrorKind::Io,
            format!("invalid token refresh response: {err}"),
        )
    })?;
    let access_token = parsed.access_token.trim().to_string();
    if access_token.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::Permission,
            "google token refresh response does not contain access_token",
        ));
    }
    let expires_in_sec = parsed.expires_in.unwrap_or(3600).max(60);
    let scopes = normalize_scope_text(parsed.scope);
    Ok((access_token, expires_in_sec, scopes))
}

fn restore_state_from_saved_credentials(
    state: &mut GdriveAuthState,
    token_store: &dyn GdriveTokenStore,
) {
    if state.account_id.is_some() || !token_store.is_available() {
        return;
    }
    let config = crate::config::load_config_fast();
    let account_id = config.gdrive_account_id.trim();
    if account_id.is_empty() {
        return;
    }
    let has_refresh = token_store
        .load_refresh_token(account_id)
        .ok()
        .flatten()
        .is_some();
    if !has_refresh {
        return;
    }
    state.account_id = Some(account_id.to_string());
    state.granted_scopes = vec![GOOGLE_DRIVE_READONLY_SCOPE.to_string()];
    state.refresh_token_persisted = true;
}

fn status_from_state(
    state: &GdriveAuthState,
    token_store: &dyn GdriveTokenStore,
) -> GdriveAuthStatus {
    GdriveAuthStatus {
        phase: state.phase(),
        backend_mode: current_backend_mode(),
        account_id: state.account_id.clone(),
        granted_scopes: state.granted_scopes.clone(),
        refresh_token_persisted: state.refresh_token_persisted,
        pending_started_at_ms: state.pending.as_ref().map(|pending| pending.issued_at_ms),
        last_error: state.last_error.clone(),
        token_store_backend: token_store.backend_name().to_string(),
        token_store_available: token_store.is_available(),
    }
}

pub(crate) fn gdrive_auth_get_status_impl() -> AppResult<GdriveAuthStatus> {
    let token_store = default_gdrive_token_store();
    let mut guard = GDRIVE_AUTH_STATE
        .lock()
        .map_err(|_| AppError::msg("gdrive auth state lock poisoned"))?;
    restore_state_from_saved_credentials(&mut guard, token_store);
    Ok(status_from_state(&guard, token_store))
}

pub(crate) fn gdrive_auth_start_session_impl(
    client_id: String,
    redirect_uri: String,
    scopes: Vec<String>,
) -> AppResult<GdriveAuthStartPayload> {
    let mut guard = GDRIVE_AUTH_STATE
        .lock()
        .map_err(|_| AppError::msg("gdrive auth state lock poisoned"))?;
    start_auth_session(&mut guard, client_id, redirect_uri, scopes)
}

pub(crate) fn gdrive_auth_validate_callback_impl(
    state: String,
    code: String,
) -> AppResult<GdriveAuthCallbackValidated> {
    let mut guard = GDRIVE_AUTH_STATE
        .lock()
        .map_err(|_| AppError::msg("gdrive auth state lock poisoned"))?;
    validate_callback(&mut guard, state, code)
}

pub(crate) fn gdrive_auth_wait_for_callback_impl(
    timeout_ms: Option<u64>,
) -> AppResult<GdriveAuthCallbackCaptured> {
    let (redirect_uri, expected_state) = pending_callback_snapshot()?;
    let timeout_ms = callback_wait_timeout_ms(timeout_ms);
    wait_for_callback_capture(&redirect_uri, &expected_state, timeout_ms)
}

pub(crate) fn gdrive_auth_complete_exchange_impl(
    account_id: String,
    scopes: Vec<String>,
    refresh_token: Option<String>,
    access_token: Option<String>,
    access_token_expires_in_sec: Option<u64>,
) -> AppResult<GdriveAuthStatus> {
    let token_store = default_gdrive_token_store();
    let mut guard = GDRIVE_AUTH_STATE
        .lock()
        .map_err(|_| AppError::msg("gdrive auth state lock poisoned"))?;
    let result = complete_exchange(
        &mut guard,
        token_store,
        account_id,
        scopes,
        refresh_token,
        access_token,
        access_token_expires_in_sec,
    );
    if let Err(err) = &result {
        guard.last_error = err.to_string();
    }
    result
}

pub(crate) fn gdrive_auth_store_client_secret_impl(
    client_id: String,
    client_secret: String,
) -> AppResult<()> {
    let client_id = normalize_client_id(client_id)?;
    let normalized_secret = client_secret.trim().to_string();
    if normalized_secret.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "client_secret is empty",
        ));
    }
    let token_store = default_gdrive_token_store();
    token_store.save_client_secret(&client_id, &normalized_secret)
}

pub(crate) fn gdrive_auth_load_client_secret_impl(client_id: String) -> AppResult<Option<String>> {
    let client_id = normalize_client_id(client_id)?;
    let token_store = default_gdrive_token_store();
    token_store.load_client_secret(&client_id)
}

pub(crate) fn gdrive_auth_clear_client_secret_impl(client_id: String) -> AppResult<()> {
    let client_id = normalize_client_id(client_id)?;
    let token_store = default_gdrive_token_store();
    token_store.clear_client_secret(&client_id)
}

pub(crate) fn gdrive_auth_access_token_impl() -> AppResult<String> {
    let token_store = default_gdrive_token_store();
    let (cached_access_token, cached_expiry_ms, mut account_id) = {
        let guard = GDRIVE_AUTH_STATE
            .lock()
            .map_err(|_| AppError::msg("gdrive auth state lock poisoned"))?;
        (
            guard.access_token.clone(),
            guard.access_token_expires_at_ms,
            guard.account_id.clone(),
        )
    };

    let now = now_ms();
    if let Some(token) = cached_access_token {
        let not_expired = cached_expiry_ms
            .map(|expires_at| now.saturating_add(ACCESS_TOKEN_EXPIRY_SAFETY_MS) < expires_at)
            .unwrap_or(true);
        if not_expired && !token.trim().is_empty() {
            return Ok(token);
        }
    }

    if account_id.as_deref().map(str::trim).unwrap_or_default().is_empty() {
        let config = crate::config::load_config_fast();
        let from_config = config.gdrive_account_id.trim().to_string();
        if !from_config.is_empty() {
            account_id = Some(from_config);
        }
    }

    let account_id = account_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            AppError::with_kind(
                AppErrorKind::Permission,
                "google drive is not authorized in current session",
            )
        })?
        .to_string();

    let config = crate::config::load_config_fast();
    let client_id = config.gdrive_oauth_client_id.trim().to_string();
    if client_id.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::Permission,
            "google oauth client_id is not configured",
        ));
    }

    let refresh_token = token_store
        .load_refresh_token(&account_id)?
        .ok_or_else(|| {
            AppError::with_kind(
                AppErrorKind::Permission,
                "google refresh token is not available; run sign-in again",
            )
        })?;
    let client_secret = token_store
        .load_client_secret(&client_id)
        .ok()
        .flatten();

    let refreshed =
        refresh_access_token_with_refresh_token(&client_id, &refresh_token, client_secret.as_deref());
    let (access_token, expires_in_sec, scopes) = match refreshed {
        Ok(value) => value,
        Err(err) => {
            if let Ok(mut guard) = GDRIVE_AUTH_STATE.lock() {
                guard.last_error = err.to_string();
            }
            return Err(err);
        }
    };

    let expires_at = now_ms().saturating_add(expires_in_sec * 1000);
    if let Ok(mut guard) = GDRIVE_AUTH_STATE.lock() {
        guard.account_id = Some(account_id);
        guard.granted_scopes = scopes;
        guard.refresh_token_persisted = true;
        guard.access_token = Some(access_token.clone());
        guard.access_token_expires_at_ms = Some(expires_at);
        guard.last_error.clear();
    }
    Ok(access_token)
}

pub(crate) fn gdrive_auth_sign_out_impl(account_id: Option<String>) -> AppResult<GdriveAuthStatus> {
    let token_store = default_gdrive_token_store();
    let mut guard = GDRIVE_AUTH_STATE
        .lock()
        .map_err(|_| AppError::msg("gdrive auth state lock poisoned"))?;
    sign_out(&mut guard, token_store, account_id)
}

#[cfg(test)]
mod tests {
    use super::{
        complete_exchange, compute_pkce_s256_challenge, normalize_scopes, start_auth_session,
        validate_callback, GdriveAuthPhase, GdriveAuthState, GOOGLE_DRIVE_READONLY_SCOPE,
    };
    use crate::gdrive_token_store::{GdriveTokenStore, InMemoryTokenStore};

    #[test]
    fn normalize_scopes_rejects_non_allowlisted_scope() {
        let err = normalize_scopes(vec![
            "https://www.googleapis.com/auth/drive.file".to_string()
        ])
        .expect_err("scope must be rejected");
        assert_eq!(err.code(), "permission_denied");
    }

    #[test]
    fn start_auth_session_creates_pending_state() {
        let mut auth_state = GdriveAuthState::default();
        let started = start_auth_session(
            &mut auth_state,
            "client-id".to_string(),
            "http://localhost/callback".to_string(),
            vec![GOOGLE_DRIVE_READONLY_SCOPE.to_string()],
        )
        .expect("start auth");
        assert!(started
            .authorization_url
            .starts_with("https://accounts.google.com/"));
        assert!(auth_state.pending.is_some());
        assert_eq!(auth_state.phase(), GdriveAuthPhase::Pending);
    }

    #[test]
    fn validate_callback_rejects_state_mismatch() {
        let mut auth_state = GdriveAuthState::default();
        start_auth_session(
            &mut auth_state,
            "client-id".to_string(),
            "http://localhost/callback".to_string(),
            vec![GOOGLE_DRIVE_READONLY_SCOPE.to_string()],
        )
        .expect("start auth");
        let err = validate_callback(
            &mut auth_state,
            "mismatch-state".to_string(),
            "auth-code".to_string(),
        )
        .expect_err("state mismatch must fail");
        assert_eq!(err.code(), "permission_denied");
    }

    #[test]
    fn validate_callback_returns_code_verifier() {
        let mut auth_state = GdriveAuthState::default();
        start_auth_session(
            &mut auth_state,
            "client-id".to_string(),
            "http://localhost/callback".to_string(),
            vec![GOOGLE_DRIVE_READONLY_SCOPE.to_string()],
        )
        .expect("start auth");

        let state = auth_state
            .pending
            .as_ref()
            .map(|pending| pending.state.clone())
            .expect("pending state");
        let payload = validate_callback(&mut auth_state, state, "auth-code".to_string())
            .expect("validate callback");
        assert_eq!(payload.code, "auth-code");
        assert!(!payload.code_verifier.is_empty());
        assert!(auth_state.pending.is_none());
    }

    #[test]
    fn complete_exchange_persists_refresh_token_with_available_store() {
        let mut auth_state = GdriveAuthState::default();
        let token_store = InMemoryTokenStore::default();
        let status = complete_exchange(
            &mut auth_state,
            &token_store,
            "user@example.com".to_string(),
            vec![GOOGLE_DRIVE_READONLY_SCOPE.to_string()],
            Some("refresh-token".to_string()),
            Some("access-token".to_string()),
            Some(3600),
        )
        .expect("complete exchange");
        assert_eq!(status.phase, GdriveAuthPhase::Authorized);
        assert!(status.refresh_token_persisted);
        let loaded = token_store
            .load_refresh_token("user@example.com")
            .expect("load refresh token");
        assert_eq!(loaded.as_deref(), Some("refresh-token"));
    }

    #[test]
    fn compute_pkce_s256_challenge_matches_known_value() {
        let challenge = compute_pkce_s256_challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
        assert_eq!(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    }
}

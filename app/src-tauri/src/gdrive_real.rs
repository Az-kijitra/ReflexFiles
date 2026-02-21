use base64::Engine as _;
use once_cell::sync::Lazy;
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Mutex;
#[cfg(target_os = "windows")]
use std::process::Command;
use std::time::Duration;

use crate::error::{AppError, AppErrorKind, AppResult};
use crate::gdrive_auth::gdrive_auth_report_scope_insufficient_impl;
use crate::gdrive_auth::gdrive_auth_access_token_impl;
use crate::types::{ResourceRef, StorageProvider};

const DRIVE_FILES_ENDPOINT: &str = "https://www.googleapis.com/drive/v3/files";
const MIME_GOOGLE_FOLDER: &str = "application/vnd.google-apps.folder";
const MIME_GOOGLE_DOC: &str = "application/vnd.google-apps.document";
const MIME_GOOGLE_SHEET: &str = "application/vnd.google-apps.spreadsheet";
const MIME_GOOGLE_SLIDE: &str = "application/vnd.google-apps.presentation";
const MIME_GOOGLE_DRAWING: &str = "application/vnd.google-apps.drawing";

#[derive(Clone, Debug)]
pub(crate) struct GdriveEntryInfo {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: String,
    pub ext: String,
}

#[derive(Clone, Debug)]
enum GdriveResourceKind {
    Root,
    RootMyDrive,
    RootSharedWithMe,
    MyDrive { file_id: String },
    SharedWithMe { file_id: String },
}

#[derive(Deserialize, Debug)]
struct DriveFileDto {
    id: String,
    #[serde(default)]
    name: String,
    #[serde(rename = "mimeType", default)]
    mime_type: String,
    #[serde(rename = "modifiedTime")]
    modified_time: Option<String>,
    size: Option<String>,
    #[serde(rename = "md5Checksum")]
    md5_checksum: Option<String>,
    version: Option<String>,
}

#[derive(Deserialize, Debug)]
struct DriveListDto {
    #[serde(default)]
    files: Vec<DriveFileDto>,
    #[serde(rename = "nextPageToken")]
    next_page_token: Option<String>,
}

static GDRIVE_ENTRY_CACHE: Lazy<Mutex<HashMap<String, GdriveEntryInfo>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
const GDRIVE_RETRY_MAX_ATTEMPTS: u32 = 3;

fn parse_resource_kind(resource_ref: &ResourceRef) -> AppResult<GdriveResourceKind> {
    if resource_ref.provider != StorageProvider::Gdrive {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "provider mismatch for gdrive resource ref",
        ));
    }
    let id = resource_ref.resource_id.trim();
    if id.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "gdrive resource id is empty",
        ));
    }

    if id == "root" {
        return Ok(GdriveResourceKind::Root);
    }
    if id == "root/my-drive" {
        return Ok(GdriveResourceKind::RootMyDrive);
    }
    if id == "root/shared-with-me" {
        return Ok(GdriveResourceKind::RootSharedWithMe);
    }
    if id == "my-drive" {
        return Ok(GdriveResourceKind::RootMyDrive);
    }
    if id == "shared-with-me" {
        return Ok(GdriveResourceKind::RootSharedWithMe);
    }
    if let Some(rest) = id.strip_prefix("root/my-drive/") {
        let file_id = rest
            .split('/')
            .filter(|segment| !segment.trim().is_empty())
            .next_back()
            .unwrap_or_default()
            .trim()
            .to_string();
        if file_id.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "gdrive my-drive file id is empty",
            ));
        }
        return Ok(GdriveResourceKind::MyDrive { file_id });
    }
    if let Some(rest) = id.strip_prefix("root/shared-with-me/") {
        let file_id = rest
            .split('/')
            .filter(|segment| !segment.trim().is_empty())
            .next_back()
            .unwrap_or_default()
            .trim()
            .to_string();
        if file_id.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "gdrive shared-with-me file id is empty",
            ));
        }
        return Ok(GdriveResourceKind::SharedWithMe { file_id });
    }
    if let Some(rest) = id.strip_prefix("my-drive/") {
        let file_id = rest
            .split('/')
            .filter(|segment| !segment.trim().is_empty())
            .next_back()
            .unwrap_or_default()
            .trim()
            .to_string();
        if file_id.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "gdrive my-drive file id is empty",
            ));
        }
        return Ok(GdriveResourceKind::MyDrive { file_id });
    }
    if let Some(rest) = id.strip_prefix("shared-with-me/") {
        let file_id = rest
            .split('/')
            .filter(|segment| !segment.trim().is_empty())
            .next_back()
            .unwrap_or_default()
            .trim()
            .to_string();
        if file_id.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "gdrive shared-with-me file id is empty",
            ));
        }
        return Ok(GdriveResourceKind::SharedWithMe { file_id });
    }

    Err(AppError::with_kind(
        AppErrorKind::InvalidPath,
        format!("unsupported gdrive resource id: {id}"),
    ))
}

fn make_resource_ref(resource_id: String) -> ResourceRef {
    ResourceRef {
        provider: StorageProvider::Gdrive,
        resource_id,
    }
}

fn to_entry_info(file: &DriveFileDto) -> GdriveEntryInfo {
    let name = file.name.trim().to_string();
    let is_dir = file.mime_type == MIME_GOOGLE_FOLDER;
    let size = if is_dir {
        0
    } else {
        file.size
            .as_deref()
            .and_then(|raw| raw.trim().parse::<u64>().ok())
            .unwrap_or(0)
    };
    let ext = if is_dir {
        String::new()
    } else {
        name.rsplit_once('.')
            .map(|(_, tail)| tail.trim())
            .filter(|tail| !tail.is_empty())
            .map(|tail| format!(".{tail}"))
            .unwrap_or_default()
    };
    GdriveEntryInfo {
        name,
        is_dir,
        size,
        modified: file.modified_time.clone().unwrap_or_default(),
        ext,
    }
}

fn save_cached_entry(resource_id: String, entry: GdriveEntryInfo) -> AppResult<()> {
    let mut guard = GDRIVE_ENTRY_CACHE
        .lock()
        .map_err(|_| AppError::msg("gdrive cache lock poisoned"))?;
    guard.insert(resource_id, entry);
    Ok(())
}

fn load_cached_entry(resource_id: &str) -> AppResult<Option<GdriveEntryInfo>> {
    let guard = GDRIVE_ENTRY_CACHE
        .lock()
        .map_err(|_| AppError::msg("gdrive cache lock poisoned"))?;
    Ok(guard.get(resource_id).cloned())
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

fn build_query_string(params: &[(&str, String)]) -> String {
    params
        .iter()
        .map(|(key, value)| format!("{}={}", url_encode_component(key), url_encode_component(value)))
        .collect::<Vec<_>>()
        .join("&")
}

fn ps_escape_single_quote(value: &str) -> String {
    value.replace('\'', "''")
}

#[cfg(target_os = "windows")]
fn run_powershell_json(script: &str) -> AppResult<Value> {
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
                let parsed = serde_json::from_str::<Value>(&json).map_err(|err| {
                    AppError::with_kind(
                        AppErrorKind::Io,
                        format!("failed to parse powershell JSON output: {err}; output={json}"),
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
fn run_powershell_json(_script: &str) -> AppResult<Value> {
    Err(AppError::with_kind(
        AppErrorKind::Permission,
        "google drive API bridge is supported on windows only",
    ))
}

#[cfg(target_os = "windows")]
fn run_powershell_bytes(script: &str) -> AppResult<Vec<u8>> {
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
                    return Ok(Vec::new());
                }
                let decoded = base64::engine::general_purpose::STANDARD
                    .decode(stdout.as_bytes())
                    .map_err(|err| {
                        AppError::with_kind(
                            AppErrorKind::Io,
                            format!("failed to decode powershell base64 output: {err}"),
                        )
                    })?;
                return Ok(decoded);
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
fn run_powershell_bytes(_script: &str) -> AppResult<Vec<u8>> {
    Err(AppError::with_kind(
        AppErrorKind::Permission,
        "google drive API bridge is supported on windows only",
    ))
}

fn extract_status_code_from_error_message(detail: &str) -> Option<u16> {
    let lower = detail.to_ascii_lowercase();
    for marker in ["failed: ", "status code ", "status\": ", "\"code\": "] {
        if let Some(pos) = lower.find(marker) {
            let rest = &lower[(pos + marker.len())..];
            let digits: String = rest.chars().take_while(|ch| ch.is_ascii_digit()).collect();
            if digits.len() >= 3 {
                if let Ok(value) = digits.parse::<u16>() {
                    return Some(value);
                }
            }
        }
    }
    None
}

fn is_retryable_error(err: &AppError) -> bool {
    if err.kind() == AppErrorKind::Permission
        || err.kind() == AppErrorKind::NotFound
        || err.kind() == AppErrorKind::InvalidPath
        || err.kind() == AppErrorKind::Conflict
    {
        return false;
    }

    let detail = err.to_string().to_ascii_lowercase();
    if let Some(code) = extract_status_code_from_error_message(&detail) {
        return code == 429 || code >= 500;
    }
    detail.contains("timed out")
        || detail.contains("timeout")
        || detail.contains("temporarily unavailable")
        || detail.contains("connection was closed")
        || detail.contains("no such host is known")
        || detail.contains("name resolution")
        || detail.contains("dns")
}

fn retry_delay(attempt: u32) -> Duration {
    match attempt {
        1 => Duration::from_millis(300),
        2 => Duration::from_millis(800),
        _ => Duration::from_millis(1600),
    }
}

fn run_with_retry<T, F>(mut operation: F) -> AppResult<T>
where
    F: FnMut() -> AppResult<T>,
{
    let mut last_err: Option<AppError> = None;
    for attempt in 1..=GDRIVE_RETRY_MAX_ATTEMPTS {
        match operation() {
            Ok(value) => return Ok(value),
            Err(err) => {
                if attempt >= GDRIVE_RETRY_MAX_ATTEMPTS || !is_retryable_error(&err) {
                    return Err(err);
                }
                last_err = Some(err);
                std::thread::sleep(retry_delay(attempt));
            }
        }
    }
    Err(last_err.unwrap_or_else(|| AppError::with_kind(AppErrorKind::Unknown, "retry failed")))
}

fn drive_files_get(access_token: &str, file_id: &str) -> AppResult<DriveFileDto> {
    if file_id.contains('/') {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "invalid gdrive file id",
        ));
    }
    let endpoint = format!("{DRIVE_FILES_ENDPOINT}/{file_id}");
    let query = build_query_string(&[
        ("supportsAllDrives", "true".to_string()),
        (
            "fields",
            "id,name,mimeType,modifiedTime,size,md5Checksum,version".to_string(),
        ),
    ]);
    let uri = format!("{endpoint}?{query}");
    let script = format!(
        "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$headers=@{{Authorization='Bearer {}';Accept='application/json'}};$resp=Invoke-RestMethod -Method Get -Uri '{}' -Headers $headers -TimeoutSec 30;$json=($resp | ConvertTo-Json -Depth 30 -Compress);[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))",
        ps_escape_single_quote(access_token),
        ps_escape_single_quote(&uri),
    );
    run_with_retry(|| {
        let value = run_powershell_json(&script)?;
        serde_json::from_value::<DriveFileDto>(value).map_err(|err| {
            AppError::with_kind(AppErrorKind::Io, format!("invalid files.get JSON: {err}"))
        })
    })
}

fn drive_files_get_media(access_token: &str, file_id: &str) -> AppResult<Vec<u8>> {
    if file_id.contains('/') {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "invalid gdrive file id",
        ));
    }
    let endpoint = format!("{DRIVE_FILES_ENDPOINT}/{file_id}");
    let query = build_query_string(&[("supportsAllDrives", "true".to_string())]);
    let uri = format!("{endpoint}?{query}&alt=media");
    let script = format!(
        "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$client=[System.Net.Http.HttpClient]::new();try{{$client.DefaultRequestHeaders.Authorization=[System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer','{}');$bytes=$client.GetByteArrayAsync('{}').GetAwaiter().GetResult();[Convert]::ToBase64String($bytes)}}finally{{$client.Dispose()}}",
        ps_escape_single_quote(access_token),
        ps_escape_single_quote(&uri),
    );
    run_with_retry(|| run_powershell_bytes(&script))
}

fn drive_files_export_media(
    access_token: &str,
    file_id: &str,
    export_mime_type: &str,
) -> AppResult<Vec<u8>> {
    if file_id.contains('/') {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "invalid gdrive file id",
        ));
    }
    let endpoint = format!("{DRIVE_FILES_ENDPOINT}/{file_id}/export");
    let query = build_query_string(&[("mimeType", export_mime_type.to_string())]);
    let uri = format!("{endpoint}?{query}");
    let script = format!(
        "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$client=[System.Net.Http.HttpClient]::new();try{{$client.DefaultRequestHeaders.Authorization=[System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer','{}');$bytes=$client.GetByteArrayAsync('{}').GetAwaiter().GetResult();[Convert]::ToBase64String($bytes)}}finally{{$client.Dispose()}}",
        ps_escape_single_quote(access_token),
        ps_escape_single_quote(&uri),
    );
    run_with_retry(|| run_powershell_bytes(&script))
}

fn gdrive_export_target_for_mime(mime: &str) -> Option<(&'static str, &'static str)> {
    match mime {
        MIME_GOOGLE_DOC => Some((
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "docx",
        )),
        MIME_GOOGLE_SHEET => Some((
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xlsx",
        )),
        MIME_GOOGLE_SLIDE => Some((
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "pptx",
        )),
        MIME_GOOGLE_DRAWING => Some(("image/png", "png")),
        _ => None,
    }
}

fn drive_files_patch_media_from_path(
    access_token: &str,
    file_id: &str,
    local_path: &Path,
) -> AppResult<DriveFileDto> {
    if file_id.contains('/') {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "invalid gdrive file id",
        ));
    }
    if !local_path.exists() {
        return Err(AppError::with_kind(
            AppErrorKind::NotFound,
            format!("local file not found: {}", local_path.display()),
        ));
    }
    if !local_path.is_file() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("local path is not a file: {}", local_path.display()),
        ));
    }
    let endpoint = format!("https://www.googleapis.com/upload/drive/v3/files/{file_id}");
    let query = build_query_string(&[
        ("supportsAllDrives", "true".to_string()),
        ("uploadType", "media".to_string()),
        (
            "fields",
            "id,name,mimeType,modifiedTime,size,md5Checksum,version".to_string(),
        ),
    ]);
    let uri = format!("{endpoint}?{query}");
    let script = format!(
        "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$client=[System.Net.Http.HttpClient]::new();$content=$null;$request=$null;try{{$client.DefaultRequestHeaders.Authorization=[System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer','{}');$bytes=[System.IO.File]::ReadAllBytes('{}');$content=[System.Net.Http.ByteArrayContent]::new($bytes);$content.Headers.ContentType=[System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/octet-stream');$request=[System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new('PATCH'),'{}');$request.Content=$content;$resp=$client.SendAsync($request).GetAwaiter().GetResult();if(-not $resp.IsSuccessStatusCode){{$body=$resp.Content.ReadAsStringAsync().GetAwaiter().GetResult();throw ('drive upload failed: ' + [int]$resp.StatusCode + ' ' + $body)}}$json=$resp.Content.ReadAsStringAsync().GetAwaiter().GetResult();[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))}}finally{{if($request -ne $null){{$request.Dispose()}}if($content -ne $null){{$content.Dispose()}}$client.Dispose()}}",
        ps_escape_single_quote(access_token),
        ps_escape_single_quote(&local_path.to_string_lossy()),
        ps_escape_single_quote(&uri),
    );
    run_with_retry(|| {
        let value = run_powershell_json(&script)?;
        serde_json::from_value::<DriveFileDto>(value).map_err(|err| {
            AppError::with_kind(
                AppErrorKind::Io,
                format!("invalid files.patch media JSON: {err}"),
            )
        })
    })
}

fn drive_query_escape_literal(value: &str) -> String {
    value.replace('\\', "\\\\").replace('\'', "\\'")
}

fn drive_files_find_child_by_name(
    access_token: &str,
    parent_id: &str,
    name: &str,
) -> AppResult<Option<DriveFileDto>> {
    let escaped_parent = drive_query_escape_literal(parent_id.trim());
    let escaped_name = drive_query_escape_literal(name.trim());
    let query =
        format!("'{escaped_parent}' in parents and trashed = false and name = '{escaped_name}'");
    let files = drive_files_list(access_token, &query)?;
    Ok(files
        .into_iter()
        .find(|file| file.name.trim() == name.trim()))
}

fn drive_files_create_metadata(
    access_token: &str,
    parent_id: &str,
    file_name: &str,
) -> AppResult<DriveFileDto> {
    if parent_id.trim().is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "gdrive destination parent id is empty",
        ));
    }
    if file_name.trim().is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "gdrive destination file name is empty",
        ));
    }

    let endpoint = DRIVE_FILES_ENDPOINT;
    let query = build_query_string(&[
        ("supportsAllDrives", "true".to_string()),
        (
            "fields",
            "id,name,mimeType,modifiedTime,size,md5Checksum,version".to_string(),
        ),
    ]);
    let uri = format!("{endpoint}?{query}");

    let script = format!(
        "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$headers=@{{Authorization='Bearer {}';Accept='application/json'}};$body=@{{name='{}';parents=@('{}')}};$jsonBody=($body | ConvertTo-Json -Depth 20 -Compress);$resp=Invoke-RestMethod -Method Post -Uri '{}' -Headers $headers -Body $jsonBody -ContentType 'application/json' -TimeoutSec 30;$json=($resp | ConvertTo-Json -Depth 30 -Compress);[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))",
        ps_escape_single_quote(access_token),
        ps_escape_single_quote(file_name),
        ps_escape_single_quote(parent_id),
        ps_escape_single_quote(&uri),
    );
    run_with_retry(|| {
        let value = run_powershell_json(&script)?;
        serde_json::from_value::<DriveFileDto>(value).map_err(|err| {
            AppError::with_kind(
                AppErrorKind::Io,
                format!("invalid files.create metadata JSON: {err}"),
            )
        })
    })
}

fn drive_files_copy_to_parent(
    access_token: &str,
    source_file_id: &str,
    parent_id: &str,
    file_name: Option<&str>,
) -> AppResult<DriveFileDto> {
    if source_file_id.trim().is_empty() || source_file_id.contains('/') {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "invalid gdrive source file id",
        ));
    }
    if parent_id.trim().is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "gdrive destination parent id is empty",
        ));
    }

    let endpoint = format!("{DRIVE_FILES_ENDPOINT}/{}/copy", source_file_id.trim());
    let query = build_query_string(&[
        ("supportsAllDrives", "true".to_string()),
        (
            "fields",
            "id,name,mimeType,modifiedTime,size,md5Checksum,version".to_string(),
        ),
    ]);
    let uri = format!("{endpoint}?{query}");

    let name_expr = file_name
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(|v| format!("$body.name='{}';", ps_escape_single_quote(v)))
        .unwrap_or_default();

    let script = format!(
        "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$headers=@{{Authorization='Bearer {}';Accept='application/json'}};$body=@{{parents=@('{}')}};{}$jsonBody=($body | ConvertTo-Json -Depth 20 -Compress);$resp=Invoke-RestMethod -Method Post -Uri '{}' -Headers $headers -Body $jsonBody -ContentType 'application/json' -TimeoutSec 30;$json=($resp | ConvertTo-Json -Depth 30 -Compress);[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))",
        ps_escape_single_quote(access_token),
        ps_escape_single_quote(parent_id.trim()),
        name_expr,
        ps_escape_single_quote(&uri),
    );
    run_with_retry(|| {
        let value = run_powershell_json(&script)?;
        serde_json::from_value::<DriveFileDto>(value).map_err(|err| {
            AppError::with_kind(
                AppErrorKind::Io,
                format!("invalid files.copy JSON: {err}"),
            )
        })
    })
}

fn drive_files_list(access_token: &str, query: &str) -> AppResult<Vec<DriveFileDto>> {
    let mut page_token: Option<String> = None;
    let mut out: Vec<DriveFileDto> = Vec::new();

    loop {
        let mut params = vec![
            ("supportsAllDrives", "true".to_string()),
            ("includeItemsFromAllDrives", "true".to_string()),
            ("pageSize", "200".to_string()),
            ("q", query.to_string()),
            (
                "fields",
                "nextPageToken,files(id,name,mimeType,modifiedTime,size)".to_string(),
            ),
        ];
        if let Some(token) = page_token.clone() {
            params.push(("pageToken", token));
        }
        let uri = format!("{DRIVE_FILES_ENDPOINT}?{}", build_query_string(&params));
        let script = format!(
            "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$headers=@{{Authorization='Bearer {}';Accept='application/json'}};$resp=Invoke-RestMethod -Method Get -Uri '{}' -Headers $headers -TimeoutSec 30;$json=($resp | ConvertTo-Json -Depth 30 -Compress);[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))",
            ps_escape_single_quote(access_token),
            ps_escape_single_quote(&uri),
        );
        let parsed = run_with_retry(|| {
            let value = run_powershell_json(&script)?;
            serde_json::from_value::<DriveListDto>(value).map_err(|err| {
                AppError::with_kind(AppErrorKind::Io, format!("invalid files.list JSON: {err}"))
            })
        })?;
        out.extend(parsed.files.into_iter());
        page_token = parsed.next_page_token;
        if page_token.is_none() {
            break;
        }
        if out.len() > 10_000 {
            break;
        }
    }

    Ok(out)
}

fn list_children_for_prefix(prefix: &str, parent_id: &str) -> AppResult<Vec<ResourceRef>> {
    let access_token = gdrive_auth_access_token_impl()?;
    let query = format!("'{parent_id}' in parents and trashed = false");
    let files = drive_files_list(&access_token, &query)?;
    let mut refs = Vec::with_capacity(files.len());
    for file in files {
        let resource_id = format!("{prefix}/{}", file.id.trim());
        let entry = to_entry_info(&file);
        save_cached_entry(resource_id.clone(), entry)?;
        refs.push(make_resource_ref(resource_id));
    }
    Ok(refs)
}

fn list_shared_root() -> AppResult<Vec<ResourceRef>> {
    let access_token = gdrive_auth_access_token_impl()?;
    let files = drive_files_list(&access_token, "sharedWithMe = true and trashed = false")?;
    let mut refs = Vec::with_capacity(files.len());
    for file in files {
        let resource_id = format!("shared-with-me/{}", file.id.trim());
        let entry = to_entry_info(&file);
        save_cached_entry(resource_id.clone(), entry)?;
        refs.push(make_resource_ref(resource_id));
    }
    Ok(refs)
}

fn virtual_entry_for(resource_id: &str) -> Option<GdriveEntryInfo> {
    match resource_id {
        "root" => Some(GdriveEntryInfo {
            name: "Google Drive".to_string(),
            is_dir: true,
            size: 0,
            modified: String::new(),
            ext: String::new(),
        }),
        "root/my-drive" => Some(GdriveEntryInfo {
            name: "My Drive".to_string(),
            is_dir: true,
            size: 0,
            modified: String::new(),
            ext: String::new(),
        }),
        "root/shared-with-me" => Some(GdriveEntryInfo {
            name: "Shared with me".to_string(),
            is_dir: true,
            size: 0,
            modified: String::new(),
            ext: String::new(),
        }),
        _ => None,
    }
}

fn gdrive_parent_folder_id_for_destination(dir_ref: &ResourceRef) -> AppResult<String> {
    match parse_resource_kind(dir_ref)? {
        GdriveResourceKind::RootMyDrive => Ok("root".to_string()),
        GdriveResourceKind::MyDrive { file_id } | GdriveResourceKind::SharedWithMe { file_id } => {
            let info = gdrive_entry_info_for_ref_impl(dir_ref)?;
            if !info.is_dir {
                return Err(AppError::with_kind(
                    AppErrorKind::InvalidPath,
                    format!(
                        "gdrive destination is not a directory: {}",
                        dir_ref.resource_id
                    ),
                ));
            }
            Ok(file_id)
        }
        GdriveResourceKind::Root => Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "gdrive root is not a writable destination",
        )),
        GdriveResourceKind::RootSharedWithMe => Err(AppError::with_kind(
            AppErrorKind::Permission,
            "shared-with-me root is not a writable destination",
        )),
    }
}

fn gdrive_child_resource_prefix_for_destination(dir_ref: &ResourceRef) -> AppResult<String> {
    match parse_resource_kind(dir_ref)? {
        GdriveResourceKind::RootMyDrive => Ok("my-drive".to_string()),
        GdriveResourceKind::MyDrive { .. } | GdriveResourceKind::SharedWithMe { .. } => {
            let prefix = dir_ref.resource_id.trim().trim_matches('/').to_string();
            if prefix.is_empty() {
                return Err(AppError::with_kind(
                    AppErrorKind::InvalidPath,
                    "gdrive destination prefix is empty",
                ));
            }
            Ok(prefix)
        }
        GdriveResourceKind::Root => Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "gdrive root is not a writable destination",
        )),
        GdriveResourceKind::RootSharedWithMe => Err(AppError::with_kind(
            AppErrorKind::Permission,
            "shared-with-me root is not a writable destination",
        )),
    }
}

fn gdrive_child_resource_id_for_destination(
    dir_ref: &ResourceRef,
    child_file_id: &str,
) -> AppResult<String> {
    let prefix = gdrive_child_resource_prefix_for_destination(dir_ref)?;
    let file_id = child_file_id.trim();
    if file_id.is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "gdrive child file id is empty",
        ));
    }
    Ok(format!("{prefix}/{file_id}"))
}

fn map_gdrive_write_error(resource_context: &str, err: AppError) -> AppError {
    let detail = err.to_string();
    let lowered = detail.to_ascii_lowercase();
    if lowered.contains("insufficient authentication scopes")
        || lowered.contains("access_token_scope_insufficient")
        || lowered.contains("insufficientpermissions")
    {
        gdrive_auth_report_scope_insufficient_impl();
        return AppError::with_kind(
            AppErrorKind::Permission,
            "google drive write permission is not granted. Sign out and authorize again.",
        );
    }
    AppError::with_kind(
        err.kind(),
        format!("failed to write gdrive file for {resource_context}: {detail}"),
    )
}

pub(crate) fn gdrive_list_dir_refs_impl(dir_ref: &ResourceRef) -> AppResult<Vec<ResourceRef>> {
    match parse_resource_kind(dir_ref)? {
        GdriveResourceKind::Root => Ok(vec![
            make_resource_ref("root/my-drive".to_string()),
            make_resource_ref("root/shared-with-me".to_string()),
        ]),
        GdriveResourceKind::RootMyDrive => list_children_for_prefix("my-drive", "root"),
        GdriveResourceKind::RootSharedWithMe => list_shared_root(),
        GdriveResourceKind::MyDrive { file_id } => {
            let prefix = dir_ref.resource_id.trim();
            let prefix = if prefix.is_empty() { "my-drive" } else { prefix };
            list_children_for_prefix(prefix, &file_id)
        }
        GdriveResourceKind::SharedWithMe { file_id } => {
            let prefix = dir_ref.resource_id.trim();
            let prefix = if prefix.is_empty() {
                "shared-with-me"
            } else {
                prefix
            };
            list_children_for_prefix(prefix, &file_id)
        }
    }
}

pub(crate) fn gdrive_entry_info_for_ref_impl(resource_ref: &ResourceRef) -> AppResult<GdriveEntryInfo> {
    let resource_id = resource_ref.resource_id.trim();
    if let Some(entry) = virtual_entry_for(resource_id) {
        return Ok(entry);
    }
    if let Some(cached) = load_cached_entry(resource_id)? {
        return Ok(cached);
    }

    let file_id = match parse_resource_kind(resource_ref)? {
        GdriveResourceKind::MyDrive { file_id } => file_id,
        GdriveResourceKind::SharedWithMe { file_id } => file_id,
        _ => {
            return Err(AppError::with_kind(
                AppErrorKind::NotFound,
                format!("gdrive resource not found: {resource_id}"),
            ))
        }
    };

    let access_token = gdrive_auth_access_token_impl()?;
    let file = drive_files_get(&access_token, &file_id)?;
    let entry = to_entry_info(&file);
    save_cached_entry(resource_id.to_string(), entry.clone())?;
    Ok(entry)
}

#[derive(Clone, Debug)]
pub(crate) struct GdriveRevisionInfo {
    pub file_id: String,
    pub modified: String,
    pub size: u64,
    pub md5_checksum: Option<String>,
    pub version: Option<String>,
}

fn revision_info_from_file(file: &DriveFileDto, fallback_file_id: &str) -> GdriveRevisionInfo {
    let size = file
        .size
        .as_deref()
        .and_then(|raw| raw.trim().parse::<u64>().ok())
        .unwrap_or(0);
    GdriveRevisionInfo {
        file_id: if file.id.trim().is_empty() {
            fallback_file_id.to_string()
        } else {
            file.id.trim().to_string()
        },
        modified: file.modified_time.clone().unwrap_or_default(),
        size,
        md5_checksum: file
            .md5_checksum
            .as_deref()
            .map(str::trim)
            .map(ToOwned::to_owned)
            .filter(|v| !v.is_empty()),
        version: file
            .version
            .as_deref()
            .map(str::trim)
            .map(ToOwned::to_owned)
            .filter(|v| !v.is_empty()),
    }
}

pub(crate) fn gdrive_revision_for_ref_impl(resource_ref: &ResourceRef) -> AppResult<GdriveRevisionInfo> {
    let resource_id = resource_ref.resource_id.trim();
    let file_id = match parse_resource_kind(resource_ref)? {
        GdriveResourceKind::MyDrive { file_id } => file_id,
        GdriveResourceKind::SharedWithMe { file_id } => file_id,
        _ => {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                format!("gdrive resource is not a file: {resource_id}"),
            ))
        }
    };
    let access_token = gdrive_auth_access_token_impl()?;
    let file = drive_files_get(&access_token, &file_id)?;
    if file.mime_type == MIME_GOOGLE_FOLDER {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("gdrive resource is a directory: {resource_id}"),
        ));
    }
    Ok(revision_info_from_file(&file, &file_id))
}

pub(crate) fn gdrive_download_file_bytes_for_ref_impl(resource_ref: &ResourceRef) -> AppResult<Vec<u8>> {
    let resource_id = resource_ref.resource_id.trim();
    let revision = gdrive_revision_for_ref_impl(resource_ref)?;
    let access_token = gdrive_auth_access_token_impl()?;
    drive_files_get_media(&access_token, &revision.file_id).map_err(|err| {
        AppError::with_kind(
            err.kind(),
            format!("failed to download gdrive file bytes for {resource_id}: {err}"),
        )
    })
}

pub(crate) fn gdrive_upload_file_from_path_for_ref_impl(
    resource_ref: &ResourceRef,
    local_path: &Path,
) -> AppResult<GdriveRevisionInfo> {
    let resource_id = resource_ref.resource_id.trim();
    let revision = gdrive_revision_for_ref_impl(resource_ref)?;
    let access_token = gdrive_auth_access_token_impl()?;
    let file = drive_files_patch_media_from_path(&access_token, &revision.file_id, local_path)
        .map_err(|err| {
            let detail = err.to_string();
            let lowered = detail.to_ascii_lowercase();
            if lowered.contains("insufficient authentication scopes")
                || lowered.contains("access_token_scope_insufficient")
                || lowered.contains("insufficientpermissions")
            {
                gdrive_auth_report_scope_insufficient_impl();
                return AppError::with_kind(
                    AppErrorKind::Permission,
                    "google drive write permission is not granted. Sign out and authorize again.",
                );
            }
            AppError::with_kind(
                err.kind(),
                format!("failed to upload gdrive file for {resource_id}: {detail}"),
            )
        })?;
    let uploaded_entry = to_entry_info(&file);
    let _ = save_cached_entry(resource_ref.resource_id.clone(), uploaded_entry);
    Ok(revision_info_from_file(&file, &revision.file_id))
}

pub(crate) fn gdrive_upload_file_from_path_to_dir_for_ref_impl(
    dir_ref: &ResourceRef,
    local_path: &Path,
    file_name: Option<&str>,
) -> AppResult<GdriveRevisionInfo> {
    if !local_path.exists() {
        return Err(AppError::with_kind(
            AppErrorKind::NotFound,
            format!("local file not found: {}", local_path.display()),
        ));
    }
    if !local_path.is_file() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("local path is not a file: {}", local_path.display()),
        ));
    }

    let inferred_name = local_path
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or_default()
        .trim()
        .to_string();
    let target_name = file_name
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or(inferred_name);
    if target_name.trim().is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "gdrive destination file name is empty",
        ));
    }

    let parent_id = gdrive_parent_folder_id_for_destination(dir_ref)?;
    let access_token = gdrive_auth_access_token_impl()?;
    let existing = drive_files_find_child_by_name(&access_token, &parent_id, &target_name)?;

    let file = if let Some(existing_file) = existing {
        if existing_file.mime_type == MIME_GOOGLE_FOLDER {
            return Err(AppError::with_kind(
                AppErrorKind::Conflict,
                format!(
                    "cannot overwrite directory in gdrive destination: {}",
                    target_name
                ),
            ));
        }
        drive_files_patch_media_from_path(&access_token, existing_file.id.trim(), local_path)
            .map_err(|err| map_gdrive_write_error(&dir_ref.resource_id, err))?
    } else {
        let created = drive_files_create_metadata(&access_token, &parent_id, &target_name)
            .map_err(|err| map_gdrive_write_error(&dir_ref.resource_id, err))?;
        drive_files_patch_media_from_path(&access_token, created.id.trim(), local_path)
            .map_err(|err| map_gdrive_write_error(&dir_ref.resource_id, err))?
    };

    let resource_id = gdrive_child_resource_id_for_destination(dir_ref, file.id.trim())?;
    let uploaded_entry = to_entry_info(&file);
    let _ = save_cached_entry(resource_id, uploaded_entry);
    Ok(revision_info_from_file(&file, file.id.trim()))
}

pub(crate) fn gdrive_copy_file_to_local_for_ref_impl(
    source_ref: &ResourceRef,
    destination_path: &Path,
) -> AppResult<std::path::PathBuf> {
    let source_info = gdrive_entry_info_for_ref_impl(source_ref)?;
    if source_info.is_dir {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!(
                "gdrive directory copy is not supported: {}",
                source_ref.resource_id
            ),
        ));
    }
    let file_id = match parse_resource_kind(source_ref)? {
        GdriveResourceKind::MyDrive { file_id } | GdriveResourceKind::SharedWithMe { file_id } => {
            file_id
        }
        _ => {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                format!(
                    "gdrive resource is not a file: {}",
                    source_ref.resource_id
                ),
            ))
        }
    };
    let access_token = gdrive_auth_access_token_impl()?;
    let file = drive_files_get(&access_token, &file_id)?;
    if file.mime_type == MIME_GOOGLE_FOLDER {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!(
                "gdrive resource is a directory: {}",
                source_ref.resource_id
            ),
        ));
    }

    let (bytes, export_ext) = if let Some((export_mime, export_ext)) =
        gdrive_export_target_for_mime(file.mime_type.trim())
    {
        let payload = drive_files_export_media(&access_token, &file_id, export_mime)?;
        (payload, Some(export_ext))
    } else if file.mime_type.starts_with("application/vnd.google-apps.") {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("unsupported gdrive export type: {}", file.mime_type),
        ));
    } else {
        let payload = drive_files_get_media(&access_token, &file_id)?;
        (payload, None)
    };

    let mut target_path = destination_path.to_path_buf();
    if let Some(ext) = export_ext {
        if target_path.extension().is_none() {
            target_path.set_extension(ext);
        }
    }

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&target_path, bytes)?;
    Ok(target_path)
}

pub(crate) fn gdrive_copy_file_to_gdrive_for_ref_impl(
    source_ref: &ResourceRef,
    destination_dir_ref: &ResourceRef,
) -> AppResult<GdriveRevisionInfo> {
    let source_info = gdrive_entry_info_for_ref_impl(source_ref)?;
    if source_info.is_dir {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!(
                "gdrive directory copy is not supported: {}",
                source_ref.resource_id
            ),
        ));
    }
    let source_revision = gdrive_revision_for_ref_impl(source_ref)?;
    let parent_id = gdrive_parent_folder_id_for_destination(destination_dir_ref)?;
    let access_token = gdrive_auth_access_token_impl()?;
    let copied = drive_files_copy_to_parent(
        &access_token,
        &source_revision.file_id,
        &parent_id,
        Some(source_info.name.as_str()),
    )?;
    let resource_id =
        gdrive_child_resource_id_for_destination(destination_dir_ref, copied.id.trim())?;
    let copied_entry = to_entry_info(&copied);
    let _ = save_cached_entry(resource_id, copied_entry);
    Ok(revision_info_from_file(&copied, copied.id.trim()))
}

#[cfg(test)]
mod tests {
    use super::{parse_resource_kind, GdriveResourceKind};
    use crate::types::{ResourceRef, StorageProvider};

    #[test]
    fn parse_resource_kind_accepts_my_drive_file() {
        let input = ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "my-drive/abc123".to_string(),
        };
        match parse_resource_kind(&input).expect("parse resource kind") {
            GdriveResourceKind::MyDrive { file_id } => assert_eq!(file_id, "abc123"),
            _ => panic!("unexpected resource kind"),
        }
    }

    #[test]
    fn parse_resource_kind_rejects_empty_id() {
        let input = ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: " ".to_string(),
        };
        let err = parse_resource_kind(&input).expect_err("must reject empty id");
        assert_eq!(err.code(), "invalid_path");
    }

    #[test]
    fn parse_resource_kind_accepts_nested_my_drive_path() {
        let input = ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "my-drive/folder1/file789".to_string(),
        };
        match parse_resource_kind(&input).expect("parse resource kind nested") {
            GdriveResourceKind::MyDrive { file_id } => assert_eq!(file_id, "file789"),
            _ => panic!("unexpected resource kind"),
        }
    }

    #[test]
    fn parse_resource_kind_accepts_my_drive_alias_root() {
        let input = ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "my-drive".to_string(),
        };
        match parse_resource_kind(&input).expect("parse root alias") {
            GdriveResourceKind::RootMyDrive => {}
            _ => panic!("unexpected resource kind"),
        }
    }
}

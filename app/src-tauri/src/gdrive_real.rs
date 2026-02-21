use base64::Engine as _;
use once_cell::sync::Lazy;
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
#[cfg(target_os = "windows")]
use std::process::Command;

use crate::error::{AppError, AppErrorKind, AppResult};
use crate::gdrive_auth::gdrive_auth_access_token_impl;
use crate::types::{ResourceRef, StorageProvider};

const DRIVE_FILES_ENDPOINT: &str = "https://www.googleapis.com/drive/v3/files";
const MIME_GOOGLE_FOLDER: &str = "application/vnd.google-apps.folder";

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
    if let Some(rest) = id.strip_prefix("my-drive/") {
        let file_id = rest.trim().to_string();
        if file_id.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "gdrive my-drive file id is empty",
            ));
        }
        return Ok(GdriveResourceKind::MyDrive { file_id });
    }
    if let Some(rest) = id.strip_prefix("shared-with-me/") {
        let file_id = rest.trim().to_string();
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
        ("fields", "id,name,mimeType,modifiedTime,size".to_string()),
    ]);
    let uri = format!("{endpoint}?{query}");
    let script = format!(
        "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';$headers=@{{Authorization='Bearer {}';Accept='application/json'}};$resp=Invoke-RestMethod -Method Get -Uri '{}' -Headers $headers -TimeoutSec 30;$json=($resp | ConvertTo-Json -Depth 30 -Compress);[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))",
        ps_escape_single_quote(access_token),
        ps_escape_single_quote(&uri),
    );
    let value = run_powershell_json(&script)?;
    serde_json::from_value::<DriveFileDto>(value).map_err(|err| {
        AppError::with_kind(AppErrorKind::Io, format!("invalid files.get JSON: {err}"))
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
        let value = run_powershell_json(&script)?;
        let parsed = serde_json::from_value::<DriveListDto>(value).map_err(|err| {
            AppError::with_kind(AppErrorKind::Io, format!("invalid files.list JSON: {err}"))
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

pub(crate) fn gdrive_list_dir_refs_impl(dir_ref: &ResourceRef) -> AppResult<Vec<ResourceRef>> {
    match parse_resource_kind(dir_ref)? {
        GdriveResourceKind::Root => Ok(vec![
            make_resource_ref("root/my-drive".to_string()),
            make_resource_ref("root/shared-with-me".to_string()),
        ]),
        GdriveResourceKind::RootMyDrive => list_children_for_prefix("my-drive", "root"),
        GdriveResourceKind::RootSharedWithMe => list_shared_root(),
        GdriveResourceKind::MyDrive { file_id } => list_children_for_prefix("my-drive", &file_id),
        GdriveResourceKind::SharedWithMe { file_id } => {
            list_children_for_prefix("shared-with-me", &file_id)
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
}

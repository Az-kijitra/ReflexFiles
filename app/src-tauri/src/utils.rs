use std::path::Path;

pub fn system_time_to_rfc3339(value: Option<std::time::SystemTime>) -> String {
    value
        .and_then(|t| {
            let dt: chrono::DateTime<chrono::Local> = t.into();
            Some(dt.to_rfc3339())
        })
        .unwrap_or_default()
}

#[cfg(target_os = "windows")]
pub fn is_hidden(path: &Path) -> bool {
    use std::os::windows::fs::MetadataExt;
    if let Ok(metadata) = std::fs::metadata(path) {
        const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
        metadata.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0
    } else {
        false
    }
}

#[cfg(not(target_os = "windows"))]
pub fn is_hidden(path: &Path) -> bool {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.starts_with('.'))
        .unwrap_or(false)
}

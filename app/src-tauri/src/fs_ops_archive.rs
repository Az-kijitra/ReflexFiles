use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::Instant;

use zip::result::ZipError;
use zip::write::SimpleFileOptions;
use zip::{AesMode, CompressionMethod, ZipArchive, ZipWriter};

use crate::error::{format_error, AppErrorKind};
use crate::fs_ops_preflight::{preflight_zip_create, preflight_zip_extract};

fn zip_safe_path(base: &Path, name: &str) -> Result<PathBuf, String> {
    let mut out = PathBuf::from(base);
    for comp in Path::new(name).components() {
        match comp {
            std::path::Component::Normal(part) => out.push(part),
            std::path::Component::CurDir => {}
            _ => {
                return Err(format_error(
                    AppErrorKind::InvalidPath,
                    "invalid path in zip entry",
                ))
            }
        }
    }
    Ok(out)
}

fn zip_add_path(
    writer: &mut ZipWriter<fs::File>,
    src: &Path,
    base_name: &Path,
    password: &Option<String>,
) -> Result<(), String> {
    if src.is_dir() {
        let name = base_name.to_string_lossy().replace('\\', "/") + "/";
        let options = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
        writer
            .add_directory(name, options)
            .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
        for entry in fs::read_dir(src).map_err(|e| format_error(AppErrorKind::Io, e.to_string()))? {
            let entry = entry.map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
            let path = entry.path();
            let rel = base_name.join(entry.file_name());
            zip_add_path(writer, &path, &rel, password)?;
        }
    } else {
        let name = base_name.to_string_lossy().replace('\\', "/");
        let mut options =
            SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
        if let Some(pass) = password {
            options = options.with_aes_encryption(AesMode::Aes256, pass);
        }
        writer
            .start_file(name, options)
            .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
        let mut file =
            fs::File::open(src).map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
        writer
            .write_all(&buffer)
            .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
pub fn zip_create(
    items: Vec<String>,
    destination: String,
    password: Option<String>,
) -> Result<(), String> {
    let started = Instant::now();
    if let Err(err) = preflight_zip_create(&items, &destination) {
        crate::log_error(
            "zip_create",
            "batch",
            &destination,
            &format!("code={}; {}", err.code, err.message),
        );
        return Err(format!("code={}; {}", err.code, err.message));
    }
    let dest_path = PathBuf::from(&destination);
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
    }
    let file =
        fs::File::create(&dest_path).map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
    let mut writer = ZipWriter::new(file);
    let total = items.len();
    for item in items {
        let src = PathBuf::from(&item);
        let name = src.file_name().ok_or_else(|| "invalid path".to_string())?;
        zip_add_path(&mut writer, &src, Path::new(name), &password)?;
    }
    writer
        .finish()
        .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
    crate::log_event(
        "ZIP_CREATE",
        "batch",
        &destination,
        &format!("count={}; ms={}", total, started.elapsed().as_millis()),
    );
    Ok(())
}

#[tauri::command]
pub fn zip_extract(
    path: String,
    destination: String,
    password: Option<String>,
) -> Result<(), String> {
    let started = Instant::now();
    if let Err(err) = preflight_zip_extract(&path, &destination) {
        crate::log_error(
            "zip_extract",
            &path,
            &destination,
            &format!("code={}; {}", err.code, err.message),
        );
        return Err(format!("code={}; {}", err.code, err.message));
    }
    let file = fs::File::open(&path).map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format_error(AppErrorKind::Unknown, e.to_string()))?;
    let dest_path = PathBuf::from(&destination);
    fs::create_dir_all(&dest_path).map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
    let total = archive.len();
    for i in 0..total {
        let mut file = match password.as_deref() {
            Some(pass) => archive.by_index_decrypt(i, pass.as_bytes()).map_err(|e| {
                if matches!(e, ZipError::InvalidPassword) {
                    format_error(AppErrorKind::Unknown, "ZIP_BAD_PASSWORD")
                } else {
                    format_error(AppErrorKind::Unknown, e.to_string())
                }
            })?,
            None => archive
                .by_index(i)
                .map_err(|e| format_error(AppErrorKind::Unknown, e.to_string()))?,
        };
        let outpath = zip_safe_path(&dest_path, file.name())?;
        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath)
                .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
            continue;
        }
        if let Some(parent) = outpath.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
        }
        let mut outfile = fs::File::create(&outpath)
            .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
        std::io::copy(&mut file, &mut outfile)
            .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
    }
    crate::log_event(
        "ZIP_EXTRACT",
        &path,
        &destination,
        &format!("count={}; ms={}", total, started.elapsed().as_millis()),
    );
    Ok(())
}

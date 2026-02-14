use std::fs;
use std::path::{Path, PathBuf};

use crate::fs_ops_mutate_helpers::{ensure_parent_exists, validate_name};

#[derive(Debug)]
pub struct PreflightError {
    pub code: &'static str,
    pub message: String,
}

impl PreflightError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        PreflightError {
            code,
            message: message.into(),
        }
    }
}

type PreflightResult<T> = Result<T, PreflightError>;

fn canonical_or(path: &Path) -> Option<PathBuf> {
    fs::canonicalize(path).ok()
}

fn is_same_path(a: &Path, b: &Path) -> bool {
    match (canonical_or(a), canonical_or(b)) {
        (Some(left), Some(right)) => left == right,
        _ => a == b,
    }
}

fn is_subpath(parent: &Path, child: &Path) -> bool {
    match (canonical_or(parent), canonical_or(child)) {
        (Some(parent_canon), Some(child_canon)) => child_canon.starts_with(&parent_canon),
        _ => child.starts_with(parent),
    }
}

pub fn preflight_create(parent: &str, name: &str, kind: &str) -> PreflightResult<PathBuf> {
    let trimmed = validate_name(name).map_err(|err| PreflightError::new("invalid_name", err))?;
    if kind != "file" && kind != "folder" {
        return Err(PreflightError::new("invalid_kind", "invalid create kind"));
    }
    let base = PathBuf::from(parent);
    ensure_parent_exists(&base).map_err(|err| PreflightError::new("parent_not_found", err))?;
    let target = base.join(trimmed);
    if target.exists() {
        return Err(PreflightError::new(
            "already_exists",
            "target already exists",
        ));
    }
    Ok(target)
}

pub fn preflight_rename(path: &str, new_name: &str) -> PreflightResult<(PathBuf, PathBuf)> {
    let trimmed =
        validate_name(new_name).map_err(|err| PreflightError::new("invalid_name", err))?;
    let from = PathBuf::from(path);
    if !from.exists() {
        return Err(PreflightError::new("not_found", "source not found"));
    }
    let parent = from
        .parent()
        .ok_or_else(|| PreflightError::new("invalid_path", "invalid path"))?;
    let to = parent.join(trimmed);
    if is_same_path(&from, &to) {
        return Err(PreflightError::new("same_path", "same name"));
    }
    if to.exists() {
        return Err(PreflightError::new(
            "already_exists",
            "target already exists",
        ));
    }
    Ok((from, to))
}

pub fn preflight_delete(items: &[String]) -> PreflightResult<()> {
    if items.is_empty() {
        return Err(PreflightError::new("no_items", "no items"));
    }
    for item in items {
        if item.trim().is_empty() {
            return Err(PreflightError::new("invalid_path", "invalid path"));
        }
        let path = PathBuf::from(item);
        if !path.exists() {
            return Err(PreflightError::new("not_found", "source not found"));
        }
    }
    Ok(())
}

pub fn preflight_transfer(items: &[String], destination: &str) -> PreflightResult<PathBuf> {
    if items.is_empty() {
        return Err(PreflightError::new("no_items", "no items"));
    }
    let dest = PathBuf::from(destination);
    if !dest.exists() {
        return Err(PreflightError::new(
            "destination_not_found",
            "destination not found",
        ));
    }
    if !dest.is_dir() {
        return Err(PreflightError::new(
            "destination_not_dir",
            "destination is not a directory",
        ));
    }
    for item in items {
        if item.trim().is_empty() {
            return Err(PreflightError::new("invalid_path", "invalid path"));
        }
        let from = PathBuf::from(item);
        if !from.exists() {
            return Err(PreflightError::new("not_found", "source not found"));
        }
        let name = from
            .file_name()
            .ok_or_else(|| PreflightError::new("invalid_path", "invalid path"))?;
        let to = dest.join(name);
        if is_same_path(&from, &to) {
            return Err(PreflightError::new(
                "same_path",
                "source and destination are the same",
            ));
        }
        if from.is_dir() && is_subpath(&from, &dest) {
            return Err(PreflightError::new(
                "destination_inside_source",
                "destination inside source",
            ));
        }
    }
    Ok(dest)
}

pub fn preflight_copy_pairs(pairs: &[(String, String)]) -> PreflightResult<()> {
    if pairs.is_empty() {
        return Err(PreflightError::new("no_items", "no items"));
    }
    for (from_path, to_path) in pairs {
        if from_path.trim().is_empty() || to_path.trim().is_empty() {
            return Err(PreflightError::new("invalid_path", "invalid path"));
        }
        let from = PathBuf::from(from_path);
        let to = PathBuf::from(to_path);
        if !from.exists() {
            return Err(PreflightError::new("not_found", "source not found"));
        }
        if is_same_path(&from, &to) {
            return Err(PreflightError::new(
                "same_path",
                "source and destination are the same",
            ));
        }
        if from.is_dir() && is_subpath(&from, &to) {
            return Err(PreflightError::new(
                "destination_inside_source",
                "destination inside source",
            ));
        }
    }
    Ok(())
}

pub fn preflight_zip_create(items: &[String], destination: &str) -> PreflightResult<()> {
    if items.is_empty() {
        return Err(PreflightError::new("no_items", "no items to zip"));
    }
    if destination.trim().is_empty() {
        return Err(PreflightError::new("invalid_path", "invalid path"));
    }
    for item in items {
        if item.trim().is_empty() {
            return Err(PreflightError::new("invalid_path", "invalid path"));
        }
        if !Path::new(item).exists() {
            return Err(PreflightError::new("not_found", "source not found"));
        }
    }
    Ok(())
}

pub fn preflight_zip_extract(path: &str, destination: &str) -> PreflightResult<()> {
    if path.trim().is_empty() || destination.trim().is_empty() {
        return Err(PreflightError::new("invalid_path", "invalid path"));
    }
    let src = PathBuf::from(path);
    if !src.exists() {
        return Err(PreflightError::new("not_found", "source not found"));
    }
    Ok(())
}

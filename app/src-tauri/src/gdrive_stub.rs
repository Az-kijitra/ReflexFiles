use crate::error::{AppError, AppErrorKind, AppResult};
use crate::types::{ResourceRef, StorageProvider};
use image::{DynamicImage, ImageBuffer, ImageFormat, Rgba};
use once_cell::sync::Lazy;
use std::io::Cursor;

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum GdriveStubNodeKind {
    Dir,
    File,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub struct GdriveStubNode {
    pub id: &'static str,
    pub name: &'static str,
    pub kind: GdriveStubNodeKind,
    pub parent_id: Option<&'static str>,
}

pub const GDRIVE_STUB_NODES: &[GdriveStubNode] = &[
    GdriveStubNode {
        id: "root",
        name: "Google Drive",
        kind: GdriveStubNodeKind::Dir,
        parent_id: None,
    },
    GdriveStubNode {
        id: "root/my-drive",
        name: "my-drive",
        kind: GdriveStubNodeKind::Dir,
        parent_id: Some("root"),
    },
    GdriveStubNode {
        id: "root/shared-with-me",
        name: "shared-with-me",
        kind: GdriveStubNodeKind::Dir,
        parent_id: Some("root"),
    },
    GdriveStubNode {
        id: "root/my-drive/projects",
        name: "projects",
        kind: GdriveStubNodeKind::Dir,
        parent_id: Some("root/my-drive"),
    },
    GdriveStubNode {
        id: "root/my-drive/samples",
        name: "samples",
        kind: GdriveStubNodeKind::Dir,
        parent_id: Some("root/my-drive"),
    },
    GdriveStubNode {
        id: "root/my-drive/readme.txt",
        name: "readme.txt",
        kind: GdriveStubNodeKind::File,
        parent_id: Some("root/my-drive"),
    },
    GdriveStubNode {
        id: "root/my-drive/cover.png",
        name: "cover.png",
        kind: GdriveStubNodeKind::File,
        parent_id: Some("root/my-drive"),
    },
    GdriveStubNode {
        id: "root/shared-with-me/read-only",
        name: "read-only",
        kind: GdriveStubNodeKind::Dir,
        parent_id: Some("root/shared-with-me"),
    },
    GdriveStubNode {
        id: "root/shared-with-me/welcome.md",
        name: "welcome.md",
        kind: GdriveStubNodeKind::File,
        parent_id: Some("root/shared-with-me"),
    },
];

fn find_gdrive_stub_node(id: &str) -> Option<&'static GdriveStubNode> {
    GDRIVE_STUB_NODES.iter().find(|node| node.id == id)
}

pub fn gdrive_stub_node_for_resource_ref(
    resource_ref: &ResourceRef,
) -> Option<&'static GdriveStubNode> {
    if resource_ref.provider != StorageProvider::Gdrive {
        return None;
    }
    let id = resource_ref.resource_id.trim();
    if id.is_empty() {
        return None;
    }
    find_gdrive_stub_node(id)
}

pub fn gdrive_stub_children_for_resource_ref(dir_ref: &ResourceRef) -> AppResult<Vec<ResourceRef>> {
    let node = gdrive_stub_node_for_resource_ref(dir_ref).ok_or_else(|| {
        AppError::with_kind(
            AppErrorKind::NotFound,
            format!("gdrive resource not found: {}", dir_ref.resource_id),
        )
    })?;
    if !matches!(node.kind, GdriveStubNodeKind::Dir) {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("gdrive resource is not a directory: {}", node.id),
        ));
    }
    Ok(GDRIVE_STUB_NODES
        .iter()
        .filter(|candidate| candidate.parent_id == Some(node.id))
        .map(|child| ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: child.id.to_string(),
        })
        .collect())
}

pub fn gdrive_stub_resource_name(resource_ref: &ResourceRef) -> Option<String> {
    gdrive_stub_node_for_resource_ref(resource_ref).map(|node| node.name.to_string())
}

pub fn gdrive_stub_resource_kind(resource_ref: &ResourceRef) -> Option<GdriveStubNodeKind> {
    gdrive_stub_node_for_resource_ref(resource_ref).map(|node| node.kind)
}

pub fn gdrive_stub_resource_ext(resource_ref: &ResourceRef) -> Option<String> {
    gdrive_stub_node_for_resource_ref(resource_ref).and_then(|node| {
        if !matches!(node.kind, GdriveStubNodeKind::File) {
            return Some(String::new());
        }
        let ext = node
            .name
            .rsplit_once('.')
            .map(|(_, ext)| ext.trim())
            .filter(|ext| !ext.is_empty())
            .unwrap_or_default();
        Some(if ext.is_empty() {
            String::new()
        } else {
            format!(".{ext}")
        })
    })
}

fn gdrive_stub_text_ext(name: &str) -> bool {
    let ext = name
        .rsplit_once('.')
        .map(|(_, ext)| ext.trim().to_ascii_lowercase())
        .unwrap_or_default();
    if ext.is_empty() {
        return true;
    }
    !matches!(
        ext.as_str(),
        "png" | "jpg" | "jpeg" | "bmp" | "gif" | "webp" | "tiff" | "ico"
    )
}

fn build_stub_png_bytes() -> Result<Vec<u8>, String> {
    let pixels = ImageBuffer::from_fn(16, 16, |x, y| {
        if (x + y) % 2 == 0 {
            Rgba([66, 133, 244, 255])
        } else {
            Rgba([52, 168, 83, 255])
        }
    });
    let image = DynamicImage::ImageRgba8(pixels);
    let mut out = Vec::new();
    let mut cursor = Cursor::new(&mut out);
    image
        .write_to(&mut cursor, ImageFormat::Png)
        .map_err(|err| err.to_string())?;
    Ok(out)
}

static GDRIVE_STUB_COVER_PNG: Lazy<Result<Vec<u8>, String>> = Lazy::new(build_stub_png_bytes);

fn gdrive_stub_default_text_content(node: &GdriveStubNode) -> Option<String> {
    if !matches!(node.kind, GdriveStubNodeKind::File) || !gdrive_stub_text_ext(node.name) {
        return None;
    }
    Some(format!(
        "ReflexFiles Google Drive read-only stub file.\nname: {}\nid: {}\n",
        node.name, node.id
    ))
}

pub fn gdrive_stub_is_probably_text_for_resource_ref(
    resource_ref: &ResourceRef,
) -> AppResult<bool> {
    let node = gdrive_stub_node_for_resource_ref(resource_ref).ok_or_else(|| {
        AppError::with_kind(
            AppErrorKind::NotFound,
            format!("gdrive resource not found: {}", resource_ref.resource_id),
        )
    })?;
    if !matches!(node.kind, GdriveStubNodeKind::File) {
        return Ok(false);
    }
    Ok(gdrive_stub_text_ext(node.name))
}

pub fn gdrive_stub_text_content_for_resource_ref(resource_ref: &ResourceRef) -> AppResult<String> {
    let node = gdrive_stub_node_for_resource_ref(resource_ref).ok_or_else(|| {
        AppError::with_kind(
            AppErrorKind::NotFound,
            format!("gdrive resource not found: {}", resource_ref.resource_id),
        )
    })?;
    if !matches!(node.kind, GdriveStubNodeKind::File) {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("gdrive resource is not a file: {}", node.id),
        ));
    }

    if !gdrive_stub_text_ext(node.name) {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("gdrive resource is not a text file: {}", node.id),
        ));
    }

    let content = match node.id {
        "root/my-drive/readme.txt" => {
            "ReflexFiles Google Drive read-only stub.\nThis file is virtual and used for pre-integration testing.\n"
                .to_string()
        }
        "root/shared-with-me/welcome.md" => "# Welcome\n\nThis markdown file comes from the Google Drive read-only stub.\n".to_string(),
        _ => gdrive_stub_default_text_content(node).ok_or_else(|| {
            AppError::with_kind(
                AppErrorKind::InvalidPath,
                format!("gdrive resource is not a text file: {}", node.id),
            )
        })?,
    };
    Ok(content)
}

pub fn gdrive_stub_image_payload_for_resource_ref(
    resource_ref: &ResourceRef,
) -> AppResult<(&'static str, &'static [u8])> {
    let node = gdrive_stub_node_for_resource_ref(resource_ref).ok_or_else(|| {
        AppError::with_kind(
            AppErrorKind::NotFound,
            format!("gdrive resource not found: {}", resource_ref.resource_id),
        )
    })?;
    if !matches!(node.kind, GdriveStubNodeKind::File) {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("gdrive resource is not a file: {}", node.id),
        ));
    }

    match node.id {
        "root/my-drive/cover.png" => {
            let bytes = GDRIVE_STUB_COVER_PNG.as_ref().map_err(|err| {
                AppError::msg(format!("failed to build gdrive stub image: {err}"))
            })?;
            Ok(("image/png", bytes.as_slice()))
        }
        _ => Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            format!("gdrive resource is not an image file: {}", node.id),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        gdrive_stub_image_payload_for_resource_ref, gdrive_stub_is_probably_text_for_resource_ref,
        gdrive_stub_text_content_for_resource_ref,
    };
    use crate::types::{ResourceRef, StorageProvider};

    #[test]
    fn gdrive_stub_text_content_returns_virtual_text() {
        let content = gdrive_stub_text_content_for_resource_ref(&ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root/my-drive/readme.txt".to_string(),
        })
        .expect("stub text content");
        assert!(content.contains("ReflexFiles Google Drive read-only stub."));
    }

    #[test]
    fn gdrive_stub_is_probably_text_returns_false_for_directory() {
        let is_text = gdrive_stub_is_probably_text_for_resource_ref(&ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root/my-drive".to_string(),
        })
        .expect("stub text check");
        assert!(!is_text);
    }

    #[test]
    fn gdrive_stub_image_payload_returns_png_bytes() {
        let (mime, bytes) = gdrive_stub_image_payload_for_resource_ref(&ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root/my-drive/cover.png".to_string(),
        })
        .expect("stub image payload");
        assert_eq!(mime, "image/png");
        assert!(bytes.starts_with(&[0x89, b'P', b'N', b'G']));
    }
}

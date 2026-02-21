use crate::error::{AppError, AppErrorKind, AppResult};
use crate::types::{ResourceRef, StorageProvider};

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

pub fn gdrive_stub_node_for_resource_ref(resource_ref: &ResourceRef) -> Option<&'static GdriveStubNode> {
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

use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EntryType {
    File,
    Dir,
}

#[derive(Copy, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum StorageProvider {
    Local,
    Gdrive,
    #[serde(other)]
    Unknown,
}

impl Default for StorageProvider {
    fn default() -> Self {
        StorageProvider::Local
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ResourceRef {
    pub provider: StorageProvider,
    pub resource_id: String,
}

#[derive(Copy, Clone, Serialize, Deserialize)]
pub struct ProviderCapabilities {
    pub can_read: bool,
    pub can_create: bool,
    pub can_rename: bool,
    pub can_copy: bool,
    pub can_move: bool,
    pub can_delete: bool,
    pub can_archive_create: bool,
    pub can_archive_extract: bool,
}

#[derive(Copy, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortKey {
    Name,
    Size,
    Type,
    Modified,
    #[serde(other)]
    Unknown,
}

impl SortKey {
    pub fn parse(value: &str) -> Self {
        match value {
            "size" => SortKey::Size,
            "type" => SortKey::Type,
            "modified" => SortKey::Modified,
            _ => SortKey::Name,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            SortKey::Name => "name",
            SortKey::Size => "size",
            SortKey::Type => "type",
            SortKey::Modified => "modified",
            SortKey::Unknown => "name",
        }
    }
}

impl Default for SortKey {
    fn default() -> Self {
        SortKey::Name
    }
}

#[derive(Copy, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortOrder {
    Asc,
    Desc,
    #[serde(other)]
    Unknown,
}

impl SortOrder {
    pub fn parse(value: &str) -> Self {
        match value {
            "desc" => SortOrder::Desc,
            _ => SortOrder::Asc,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            SortOrder::Asc => "asc",
            SortOrder::Desc => "desc",
            SortOrder::Unknown => "asc",
        }
    }
}

impl Default for SortOrder {
    fn default() -> Self {
        SortOrder::Asc
    }
}

#[derive(Serialize)]
pub struct Entry {
    pub name: String,
    pub path: String,
    #[serde(rename = "display_path")]
    pub display_path: String,
    pub provider: StorageProvider,
    #[serde(rename = "ref")]
    pub resource_ref: ResourceRef,
    pub capabilities: ProviderCapabilities,
    #[serde(rename = "type")]
    pub entry_type: EntryType,
    pub size: u64,
    pub modified: String,
    pub hidden: bool,
    pub ext: String,
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PropertyKind {
    File,
    Dir,
}

#[derive(Serialize)]
pub struct Properties {
    pub name: String,
    pub path: String,
    #[serde(rename = "display_path")]
    pub display_path: String,
    pub provider: StorageProvider,
    #[serde(rename = "ref")]
    pub resource_ref: ResourceRef,
    pub capabilities: ProviderCapabilities,
    #[serde(rename = "type")]
    pub kind: PropertyKind,
    pub size: u64,
    pub created: String,
    pub modified: String,
    pub accessed: String,
    pub hidden: bool,
    pub readonly: bool,
    pub system: bool,
    pub ext: String,
    pub files: u64,
    pub dirs: u64,
    pub dir_stats_pending: bool,
    pub dir_stats_timeout: bool,
}

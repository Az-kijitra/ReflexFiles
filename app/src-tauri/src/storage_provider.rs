use once_cell::sync::Lazy;
use std::fs;
use std::path::{Path, PathBuf};

use crate::error::{AppError, AppErrorKind, AppResult};
#[cfg(not(feature = "gdrive-readonly-stub"))]
use crate::gdrive_real::gdrive_list_dir_refs_impl;
#[cfg(feature = "gdrive-readonly-stub")]
use crate::gdrive_stub::gdrive_stub_children_for_resource_ref;
use crate::types::{ProviderCapabilities, ResourceRef, StorageProvider};

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum ProviderCapability {
    Read,
    Create,
    Rename,
    Copy,
    Move,
    Delete,
    ArchiveCreate,
    ArchiveExtract,
}

impl ProviderCapability {
    fn as_str(self) -> &'static str {
        match self {
            ProviderCapability::Read => "read",
            ProviderCapability::Create => "create",
            ProviderCapability::Rename => "rename",
            ProviderCapability::Copy => "copy",
            ProviderCapability::Move => "move",
            ProviderCapability::Delete => "delete",
            ProviderCapability::ArchiveCreate => "archive_create",
            ProviderCapability::ArchiveExtract => "archive_extract",
        }
    }
}

pub trait StorageProviderBackend: Send + Sync {
    fn supports(&self, capability: ProviderCapability) -> bool;
    fn resolve_path(&self, resource_ref: &ResourceRef) -> AppResult<PathBuf>;
    fn display_path(&self, resource_ref: &ResourceRef) -> String;
    fn metadata(&self, resource_ref: &ResourceRef) -> AppResult<fs::Metadata>;
    fn list_dir_refs(&self, dir_ref: &ResourceRef) -> AppResult<Vec<ResourceRef>>;
}

#[derive(Default)]
pub struct LocalStorageProvider;

impl LocalStorageProvider {
    pub fn resource_ref_from_legacy_path(&self, raw_path: &str) -> AppResult<ResourceRef> {
        let trimmed = raw_path.trim();
        if trimmed.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "path is empty",
            ));
        }
        let normalized = normalize_local_resource_id(Path::new(trimmed))?;
        Ok(ResourceRef {
            provider: StorageProvider::Local,
            resource_id: normalized,
        })
    }
}

#[cfg(feature = "gdrive-readonly-stub")]
#[derive(Default)]
pub struct GdriveStorageProvider;

#[cfg(not(feature = "gdrive-readonly-stub"))]
#[derive(Default)]
pub struct GdriveStorageProvider;

#[cfg(feature = "gdrive-readonly-stub")]
impl GdriveStorageProvider {
    fn validate_resource_ref<'a>(&self, resource_ref: &'a ResourceRef) -> AppResult<&'a str> {
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
        Ok(id)
    }

    fn not_implemented(&self, op: &str) -> AppError {
        AppError::with_kind(
            AppErrorKind::Unknown,
            format!("gdrive {} is not implemented yet", op),
        )
    }
}

#[cfg(not(feature = "gdrive-readonly-stub"))]
impl GdriveStorageProvider {
    fn validate_resource_ref<'a>(&self, resource_ref: &'a ResourceRef) -> AppResult<&'a str> {
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
        Ok(id)
    }

    fn not_implemented(&self, op: &str) -> AppError {
        AppError::with_kind(
            AppErrorKind::Unknown,
            format!("gdrive {op} is not implemented yet"),
        )
    }
}

impl StorageProviderBackend for LocalStorageProvider {
    fn supports(&self, _capability: ProviderCapability) -> bool {
        true
    }

    fn resolve_path(&self, resource_ref: &ResourceRef) -> AppResult<PathBuf> {
        if resource_ref.provider != StorageProvider::Local {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "provider mismatch for local resource ref",
            ));
        }
        let id = resource_ref.resource_id.trim();
        if id.is_empty() {
            return Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "resource id is empty",
            ));
        }
        Ok(PathBuf::from(id))
    }

    fn display_path(&self, resource_ref: &ResourceRef) -> String {
        resource_ref.resource_id.clone()
    }

    fn metadata(&self, resource_ref: &ResourceRef) -> AppResult<fs::Metadata> {
        let path = self.resolve_path(resource_ref)?;
        Ok(fs::metadata(path)?)
    }

    fn list_dir_refs(&self, dir_ref: &ResourceRef) -> AppResult<Vec<ResourceRef>> {
        let dir_path = self.resolve_path(dir_ref)?;
        let mut refs = Vec::new();
        for item in fs::read_dir(&dir_path)? {
            let entry = item?;
            let normalized = normalize_local_resource_id(&entry.path())?;
            refs.push(ResourceRef {
                provider: StorageProvider::Local,
                resource_id: normalized,
            });
        }
        Ok(refs)
    }
}

#[cfg(feature = "gdrive-readonly-stub")]
impl StorageProviderBackend for GdriveStorageProvider {
    fn supports(&self, capability: ProviderCapability) -> bool {
        matches!(capability, ProviderCapability::Read)
    }

    fn resolve_path(&self, resource_ref: &ResourceRef) -> AppResult<PathBuf> {
        let _ = self.validate_resource_ref(resource_ref)?;
        Err(self.not_implemented("path resolution"))
    }

    fn display_path(&self, resource_ref: &ResourceRef) -> String {
        match self.validate_resource_ref(resource_ref) {
            Ok(id) => format!("gdrive://{id}"),
            Err(_) => "gdrive://".to_string(),
        }
    }

    fn metadata(&self, resource_ref: &ResourceRef) -> AppResult<fs::Metadata> {
        let _ = self.validate_resource_ref(resource_ref)?;
        Err(self.not_implemented("metadata access"))
    }

    fn list_dir_refs(&self, dir_ref: &ResourceRef) -> AppResult<Vec<ResourceRef>> {
        let _ = self.validate_resource_ref(dir_ref)?;
        gdrive_stub_children_for_resource_ref(dir_ref)
    }
}

#[cfg(not(feature = "gdrive-readonly-stub"))]
impl StorageProviderBackend for GdriveStorageProvider {
    fn supports(&self, capability: ProviderCapability) -> bool {
        matches!(capability, ProviderCapability::Read | ProviderCapability::Copy)
    }

    fn resolve_path(&self, resource_ref: &ResourceRef) -> AppResult<PathBuf> {
        let _ = self.validate_resource_ref(resource_ref)?;
        Err(self.not_implemented("path resolution"))
    }

    fn display_path(&self, resource_ref: &ResourceRef) -> String {
        match self.validate_resource_ref(resource_ref) {
            Ok(id) => format!("gdrive://{id}"),
            Err(_) => "gdrive://".to_string(),
        }
    }

    fn metadata(&self, resource_ref: &ResourceRef) -> AppResult<fs::Metadata> {
        let _ = self.validate_resource_ref(resource_ref)?;
        Err(self.not_implemented("metadata access"))
    }

    fn list_dir_refs(&self, dir_ref: &ResourceRef) -> AppResult<Vec<ResourceRef>> {
        let _ = self.validate_resource_ref(dir_ref)?;
        gdrive_list_dir_refs_impl(dir_ref)
    }
}

pub struct ProviderRegistry {
    local: LocalStorageProvider,
    gdrive: GdriveStorageProvider,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        Self {
            local: LocalStorageProvider,
            gdrive: GdriveStorageProvider,
        }
    }

    pub fn resource_ref_from_legacy_path(&self, raw_path: &str) -> AppResult<ResourceRef> {
        let trimmed = raw_path.trim();
        if let Some(rest) = trimmed.strip_prefix("gdrive://") {
            let id = rest.trim_matches('/');
            if id.is_empty() {
                return Err(AppError::with_kind(
                    AppErrorKind::InvalidPath,
                    "gdrive resource id is empty",
                ));
            }
            return Ok(ResourceRef {
                provider: StorageProvider::Gdrive,
                resource_id: id.to_string(),
            });
        }
        self.local.resource_ref_from_legacy_path(raw_path)
    }

    pub fn provider_for_ref(
        &self,
        resource_ref: &ResourceRef,
    ) -> AppResult<&dyn StorageProviderBackend> {
        match resource_ref.provider {
            StorageProvider::Local => Ok(&self.local),
            StorageProvider::Gdrive => Ok(&self.gdrive),
            StorageProvider::Unknown => Err(AppError::with_kind(
                AppErrorKind::InvalidPath,
                "unsupported storage provider",
            )),
        }
    }

    pub fn provider_for_legacy_path(
        &self,
        raw_path: &str,
    ) -> AppResult<(ResourceRef, &dyn StorageProviderBackend)> {
        let resource_ref = self.resource_ref_from_legacy_path(raw_path)?;
        let provider = self.provider_for_ref(&resource_ref)?;
        Ok((resource_ref, provider))
    }

    pub fn resolve_path_for_ref(
        &self,
        resource_ref: &ResourceRef,
        capability: ProviderCapability,
    ) -> AppResult<PathBuf> {
        let provider = self.provider_for_ref(resource_ref)?;
        ensure_provider_capability(provider, capability)?;
        provider.resolve_path(resource_ref)
    }

    pub fn resolve_legacy_path_for(
        &self,
        raw_path: &str,
        capability: ProviderCapability,
    ) -> AppResult<PathBuf> {
        let resource_ref = self.resource_ref_from_legacy_path(raw_path)?;
        self.resolve_path_for_ref(&resource_ref, capability)
    }
}

impl Default for ProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}

static PROVIDER_REGISTRY: Lazy<ProviderRegistry> = Lazy::new(ProviderRegistry::new);

pub fn provider_registry() -> &'static ProviderRegistry {
    &PROVIDER_REGISTRY
}

pub fn resolve_legacy_path(path: &str) -> AppResult<PathBuf> {
    resolve_legacy_path_for(path, ProviderCapability::Read)
}

pub fn resolve_legacy_path_for(path: &str, capability: ProviderCapability) -> AppResult<PathBuf> {
    let registry = provider_registry();
    registry.resolve_legacy_path_for(path, capability)
}

pub fn resolve_legacy_paths_for(
    paths: &[String],
    capability: ProviderCapability,
) -> AppResult<Vec<PathBuf>> {
    let mut resolved = Vec::with_capacity(paths.len());
    for path in paths {
        resolved.push(resolve_legacy_path_for(path, capability)?);
    }
    Ok(resolved)
}

pub fn provider_capabilities(provider: &dyn StorageProviderBackend) -> ProviderCapabilities {
    ProviderCapabilities {
        can_read: provider.supports(ProviderCapability::Read),
        can_create: provider.supports(ProviderCapability::Create),
        can_rename: provider.supports(ProviderCapability::Rename),
        can_copy: provider.supports(ProviderCapability::Copy),
        can_move: provider.supports(ProviderCapability::Move),
        can_delete: provider.supports(ProviderCapability::Delete),
        can_archive_create: provider.supports(ProviderCapability::ArchiveCreate),
        can_archive_extract: provider.supports(ProviderCapability::ArchiveExtract),
    }
}

fn ensure_provider_capability(
    provider: &dyn StorageProviderBackend,
    capability: ProviderCapability,
) -> AppResult<()> {
    if provider.supports(capability) {
        return Ok(());
    }
    Err(AppError::with_kind(
        AppErrorKind::Permission,
        format!("provider capability denied: {}", capability.as_str()),
    ))
}

fn normalize_local_resource_id(path: &Path) -> AppResult<String> {
    if path.as_os_str().is_empty() {
        return Err(AppError::with_kind(
            AppErrorKind::InvalidPath,
            "path is empty",
        ));
    }
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()?.join(path)
    };
    Ok(absolute.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::provider_capabilities;
    #[cfg(feature = "gdrive-readonly-stub")]
    use super::{GdriveStorageProvider, StorageProviderBackend};
    use super::{
        resolve_legacy_path_for, LocalStorageProvider, ProviderCapability, ProviderRegistry,
    };
    use crate::types::{ResourceRef, StorageProvider};

    #[test]
    fn local_provider_normalizes_relative_path() {
        let local = LocalStorageProvider;
        let resource_ref = local
            .resource_ref_from_legacy_path(".")
            .expect("resource ref");
        assert_eq!(resource_ref.provider, StorageProvider::Local);
        assert!(!resource_ref.resource_id.trim().is_empty());
    }

    #[test]
    fn registry_resolves_gdrive_provider() {
        let registry = ProviderRegistry::new();
        let gdrive_ref = ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "x".to_string(),
        };
        let provider = registry.provider_for_ref(&gdrive_ref).expect("provider");
        let capabilities = provider_capabilities(provider);
        assert!(capabilities.can_read);
        assert!(!capabilities.can_create);
        assert!(!capabilities.can_rename);
        #[cfg(feature = "gdrive-readonly-stub")]
        assert!(!capabilities.can_copy);
        #[cfg(not(feature = "gdrive-readonly-stub"))]
        assert!(capabilities.can_copy);
        assert!(!capabilities.can_move);
        assert!(!capabilities.can_delete);
        assert!(!capabilities.can_archive_create);
        assert!(!capabilities.can_archive_extract);
    }

    #[test]
    fn capability_resolve_rejects_unimplemented_provider() {
        let err = resolve_legacy_path_for("gdrive://folder/file", ProviderCapability::Read)
            .expect_err("must reject gdrive");
        assert_eq!(err.code(), "unknown");
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn gdrive_provider_reports_display_path() {
        let gdrive = GdriveStorageProvider;
        let resource_ref = ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "folder/file".to_string(),
        };
        assert_eq!(gdrive.display_path(&resource_ref), "gdrive://folder/file");
    }

    #[test]
    #[cfg(feature = "gdrive-readonly-stub")]
    fn gdrive_provider_lists_virtual_tree_in_stub_mode() {
        let gdrive = GdriveStorageProvider;
        let root_ref = ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root".to_string(),
        };
        let root_children = gdrive
            .list_dir_refs(&root_ref)
            .expect("gdrive root list dir refs");
        assert_eq!(root_children.len(), 2);
        assert_eq!(root_children[0].resource_id, "root/my-drive");
        assert_eq!(root_children[1].resource_id, "root/shared-with-me");

        let my_drive_ref = ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root/my-drive".to_string(),
        };
        let my_drive_children = gdrive
            .list_dir_refs(&my_drive_ref)
            .expect("gdrive my-drive list dir refs");
        assert_eq!(my_drive_children.len(), 4);
        assert_eq!(my_drive_children[2].resource_id, "root/my-drive/readme.txt");
        assert_eq!(my_drive_children[3].resource_id, "root/my-drive/cover.png");

        let leaf_ref = ResourceRef {
            provider: StorageProvider::Gdrive,
            resource_id: "root/my-drive/projects".to_string(),
        };
        let leaf_children = gdrive
            .list_dir_refs(&leaf_ref)
            .expect("gdrive leaf list dir refs");
        assert!(leaf_children.is_empty());
    }

    #[test]
    fn registry_parses_gdrive_prefix() {
        let registry = ProviderRegistry::new();
        let resource_ref = registry
            .resource_ref_from_legacy_path("gdrive://folder/file")
            .expect("gdrive ref");
        assert_eq!(resource_ref.provider, StorageProvider::Gdrive);
        assert_eq!(resource_ref.resource_id, "folder/file");
    }
}

<script>
  import DropdownList from "$lib/components/DropdownList.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import SortMenu from "$lib/components/SortMenu.svelte";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import AboutModal from "$lib/components/modals/AboutModal.svelte";
  import DeleteConfirmModal from "$lib/components/modals/DeleteConfirmModal.svelte";
  import PasteConfirmModal from "$lib/components/modals/PasteConfirmModal.svelte";
  import CreateModal from "$lib/components/modals/CreateModal.svelte";
  import JumpUrlModal from "$lib/components/modals/JumpUrlModal.svelte";
  import RenameModal from "$lib/components/modals/RenameModal.svelte";
  import PropertiesModal from "$lib/components/modals/PropertiesModal.svelte";
  import ZipModal from "$lib/components/modals/ZipModal.svelte";
  import FailureModal from "$lib/components/modals/FailureModal.svelte";

  export let dropdownOpen = false;
  export let dropdownItems = [];
  export let dropdownMode = "history";
  export let dropdownIndex = 0;
  export let dropdownEl = null;
  export let matchesAction;
  export let setStatusMessage;
  export let jumpList = [];
  export let pathHistory = [];
  export let scrollDropdownToIndex;
  export let selectDropdown;
  export let removeHistory;
  export let removeJump;
  export let trapModalTab;

  export let searchActive = false;
  export let searchQuery = "";
  export let searchRegex = false;
  export let searchInputEl = null;
  export let searchError = "";
  export let onSearchKeydown;
  export let applySearch;
  export let clearSearch;

  export let sortMenuOpen = false;
  export let sortMenuIndex = 0;
  export let sortMenuEl = null;
  export let setSort;
  export let handleSortMenuKey;

  export let aboutOpen = false;
  export let aboutModalEl = null;
  export let openUrl;
  export let ABOUT_URL = "";
  export let ABOUT_LICENSE = "";
  export let closeAbout;

  export let deleteConfirmOpen = false;
  export let deleteModalEl = null;
  export let deleteConfirmIndex = 0;
  export let deleteTargets = [];
  export let deleteError = "";
  export let confirmDelete;
  export let cancelDelete;

  export let pasteConfirmOpen = false;
  export let pasteModalEl = null;
  export let pasteApplyAll = false;
  export let pasteConfirmIndex = 0;
  export let pasteConflicts = [];
  export let allowPasteKeepBoth = true;
  export let confirmPasteOverwrite;
  export let confirmPasteSkip;
  export let confirmPasteKeepBoth;
  export let cancelPasteConfirm;

  export let createOpen = false;
  export let createModalEl = null;
  export let createInputEl = null;
  export let createType = "file";
  export let createName = "";
  export let createError = "";
  export let confirmCreate;
  export let cancelCreate;

  export let jumpUrlOpen = false;
  export let jumpUrlModalEl = null;
  export let jumpUrlInputEl = null;
  export let jumpUrlValue = "";
  export let jumpUrlError = "";
  export let confirmJumpUrl;
  export let cancelJumpUrl;

  export let renameOpen = false;
  export let renameModalEl = null;
  export let renameInputEl = null;
  export let renameValue = "";
  export let renameError = "";
  export let confirmRename;
  export let cancelRename;

  export let propertiesOpen = false;
  export let propertiesModalEl = null;
  export let propertiesCloseButton = null;
  export let dirStatsTimeoutMs = 0;
  export let propertiesData;
  export let dirStatsInFlight = false;
  export let formatSize;
  export let formatModified;
  export let saveDirStatsTimeout;
  export let clearDirStatsCache;
  export let retryDirStats;
  export let cancelDirStats;
  export let closeProperties;
  export let autofocus;

  export let zipModalOpen = false;
  export let zipModalEl = null;
  export let zipDestination = "";
  export let zipPassword = "";
  export let zipConfirmIndex = 0;
  export let zipMode = "create";
  export let zipTargets = [];
  export let zipPasswordAttempts = 0;
  export let ZIP_PASSWORD_MAX_ATTEMPTS = 0;
  export let zipError = "";
  export let zipOverwriteConfirmed = false;
  export let runZipAction;
  export let closeZipModal;

  export let contextMenuOpen = false;
  export let contextMenuEl = null;
  export let contextMenuPos = { x: 0, y: 0 };
  export let getContextMenuItems;
  export let contextMenuIndex = 0;
  export let getSelectableIndex;
  export let handleContextMenuKey;

  export let error = "";

  export let failureModalOpen = false;
  export let failureModalEl = null;
  export let failureModalTitle = "";
  export let failureItems = [];
  export let failureMessage;
  export let closeFailureModal;

  export let t;
</script>

{#if dropdownOpen}
  <DropdownList
    bind:dropdownEl
    bind:dropdownMode
    bind:dropdownOpen
    bind:dropdownIndex
    {dropdownItems}
    {t}
    {matchesAction}
    {setStatusMessage}
    {jumpList}
    {pathHistory}
    {scrollDropdownToIndex}
    {selectDropdown}
    {removeHistory}
    {removeJump}
    {trapModalTab}
  />
{/if}

{#if searchActive}
  <SearchBar
    bind:searchQuery
    bind:searchRegex
    bind:searchInputEl
    {t}
    {searchError}
    {onSearchKeydown}
    {applySearch}
    {clearSearch}
  />
{/if}

{#if sortMenuOpen}
  <SortMenu
    bind:sortMenuEl
    bind:sortMenuIndex
    {t}
    {setSort}
    {handleSortMenuKey}
  />
{/if}

{#if aboutOpen}
  <AboutModal
    bind:aboutModalEl
    {t}
    {openUrl}
    {ABOUT_URL}
    {ABOUT_LICENSE}
    {closeAbout}
    {trapModalTab}
  />
{/if}

{#if deleteConfirmOpen}
  <DeleteConfirmModal
    bind:deleteModalEl
    bind:deleteConfirmIndex
    {t}
    {deleteTargets}
    {deleteError}
    {confirmDelete}
    {cancelDelete}
    {trapModalTab}
  />
{/if}

{#if pasteConfirmOpen}
  <PasteConfirmModal
    bind:pasteModalEl
    bind:pasteApplyAll
    bind:pasteConfirmIndex
    {t}
    {pasteConflicts}
    {allowPasteKeepBoth}
    {confirmPasteOverwrite}
    {confirmPasteSkip}
    {confirmPasteKeepBoth}
    {cancelPasteConfirm}
    {trapModalTab}
  />
{/if}

{#if createOpen}
  <CreateModal
    bind:createModalEl
    bind:createInputEl
    bind:createType
    bind:createName
    {t}
    {createError}
    {confirmCreate}
    {cancelCreate}
    {trapModalTab}
  />
{/if}

{#if jumpUrlOpen}
  <JumpUrlModal
    bind:jumpUrlModalEl
    bind:jumpUrlInputEl
    bind:jumpUrlValue
    bind:jumpUrlError
    {t}
    {confirmJumpUrl}
    {cancelJumpUrl}
    {trapModalTab}
  />
{/if}

{#if renameOpen}
  <RenameModal
    bind:renameModalEl
    bind:renameInputEl
    bind:renameValue
    {t}
    {renameError}
    {confirmRename}
    {cancelRename}
    {trapModalTab}
  />
{/if}

{#if propertiesOpen}
  <PropertiesModal
    bind:propertiesModalEl
    bind:propertiesCloseButton
    bind:dirStatsTimeoutMs
    {propertiesData}
    {dirStatsInFlight}
    {t}
    {formatSize}
    {formatModified}
    {saveDirStatsTimeout}
    {clearDirStatsCache}
    {retryDirStats}
    {cancelDirStats}
    {closeProperties}
    {autofocus}
    {trapModalTab}
  />
{/if}

{#if zipModalOpen}
  <ZipModal
    bind:zipModalEl
    bind:zipDestination
    bind:zipPassword
    bind:zipConfirmIndex
    bind:zipOverwriteConfirmed
    {t}
    {zipMode}
    {zipTargets}
    {zipPasswordAttempts}
    {ZIP_PASSWORD_MAX_ATTEMPTS}
    {zipError}
    {runZipAction}
    {closeZipModal}
    {trapModalTab}
  />
{/if}

{#if contextMenuOpen}
  <ContextMenu
    bind:contextMenuEl
    {contextMenuPos}
    {getContextMenuItems}
    {contextMenuIndex}
    {getSelectableIndex}
    {handleContextMenuKey}
    {trapModalTab}
  />
{/if}

{#if error}
  <div class="error">{error}</div>
{/if}

{#if failureModalOpen}
  <FailureModal
    bind:failureModalEl
    {failureModalTitle}
    {failureItems}
    {failureMessage}
    {closeFailureModal}
    {t}
    {trapModalTab}
  />
{/if}

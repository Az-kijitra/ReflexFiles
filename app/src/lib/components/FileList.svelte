<script>
  import ListRow from "$lib/components/ListRow.svelte";

  /** @type {HTMLElement | null} */
  export let listEl = null;
  /** @type {HTMLElement | null} */
  export let listBodyEl = null;
  export let currentPath = "";
  export let showSize = false;
  export let showTime = false;
  export let uiFileIconMode = "by_type";
  export let loading = false;
  export let filteredEntries = [];
  export let entries = [];
  export let focusedIndex = 0;
  export let anchorIndex = null;
  export let dropdownOpen = false;
  export let overflowLeft = false;
  export let overflowRight = false;
  export let visibleColStart = 0;
  export let visibleColEnd = 0;
  export let listRows = 1;
  export let t;
  export let selectedPaths = [];
  export let resolveGdriveWorkcopyBadge;
  export let openContextMenu;
  export let selectRange;
  export let toggleSelection;
  export let setSelected;
  export let openEntry;
  export let formatName;
  export let formatSize;
  export let formatModified;

  const listRowId = (entry) =>
    `list-row-${String(entry.path).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const isEntryVisible = (entry) =>
    filteredEntries.some((item) => item.path === entry.path);
  const getActiveDescendant = () => {
    const entry = entries[focusedIndex];
    if (!entry) return undefined;
    if (!isEntryVisible(entry)) return undefined;
    return listRowId(entry);
  };

  /** @param {import("$lib/types").Entry} entry */
  function getEntryIndex(entry) {
    return entries.findIndex((item) => item.path === entry.path);
  }

  /** @param {import("$lib/types").Entry} entry */
  function getGdriveWorkcopyBadge(entry) {
    if (typeof resolveGdriveWorkcopyBadge !== "function") return "";
    try {
      const value = String(resolveGdriveWorkcopyBadge(entry) || "");
      return value === "dirty" || value === "local" ? value : "";
    } catch {
      return "";
    }
  }

  $: isGdrivePath = String(currentPath || "").trim().toLowerCase().startsWith("gdrive://");
</script>

<div
  class="list {showSize ? 'show-size' : ''} {showTime ? 'show-time' : ''} {isGdrivePath ? 'gdrive-surface' : ''}"
  tabindex="0"
  role="listbox"
  aria-label={t("label.list")}
  aria-multiselectable="true"
  aria-activedescendant={getActiveDescendant()}
  bind:this={listEl}
  oncontextmenu={openContextMenu}
  onfocus={() => {
    dropdownOpen = false;
  }}
>
  <div class="list-body" bind:this={listBodyEl}>
    {#if loading}
      <div class="row">{t("loading")}</div>
    {:else if filteredEntries.length === 0}
      <div class="row">{t("no_items")}</div>
    {:else}
      {#each filteredEntries as entry, visualIndex}
        <ListRow
          {entry}
          {visualIndex}
          {showSize}
          {showTime}
          {uiFileIconMode}
          {formatName}
          {formatSize}
          {formatModified}
          gdriveWorkcopyBadge={getGdriveWorkcopyBadge(entry)}
          gdriveWorkcopyLocalTitle={t("list.gdrive_workcopy_local")}
          gdriveWorkcopyDirtyTitle={t("list.gdrive_workcopy_dirty")}
          {overflowLeft}
          {overflowRight}
          {visibleColStart}
          {visibleColEnd}
          {listRows}
          rowId={listRowId(entry)}
          selected={selectedPaths.includes(entry.path)}
          focused={focusedIndex === getEntryIndex(entry)}
          onClick={(event) => {
            listEl?.focus({ preventScroll: true });
            const index = getEntryIndex(entry);
            focusedIndex = index;
            if (event.shiftKey && anchorIndex !== null) {
              selectRange(anchorIndex, index);
              return;
            }
            if (event.ctrlKey || event.metaKey) {
              toggleSelection(index);
              anchorIndex = index;
              return;
            }
            setSelected([entry.path]);
            anchorIndex = index;
          }}
          onContextMenu={(event) => openContextMenu(event, entry)}
          onDoubleClick={() => {
            openEntry(entry);
          }}
        />
      {/each}
    {/if}
  </div>
</div>

<style>
  .list {
    border: 1px solid var(--ui-border);
    background: var(--ui-surface);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    color: var(--ui-fg);
  }

  .list.gdrive-surface {
    background: var(--ui-gdrive-surface);
  }

  .list:focus-visible {
    outline: 1px solid var(--ui-focused);
    outline-offset: -1px;
  }

  .list-body {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: var(--list-col-width);
    grid-auto-rows: var(--list-row-height);
    grid-template-rows: repeat(var(--list-rows, 1), var(--list-row-height));
    grid-template-columns: repeat(var(--list-cols, 1), var(--list-col-width));
    gap: 0 var(--list-col-gap);
    align-content: start;
    padding: 2px 0 4px;
    position: relative;
    overflow: hidden;
    max-width: calc(var(--list-cols, 1) * var(--list-col-width) + (var(--list-cols, 1) - 1) * 16px);
    user-select: none;
  }

  .list-body ::selection {
    background: transparent;
    color: inherit;
  }
</style>

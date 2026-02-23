<script>
  import ListRow from "$lib/components/ListRow.svelte";
  import { clipboardSetFiles, shellStartFileDrag } from "$lib/utils/tauri_fs";
  import {
    DND_OUTBOUND_LOCAL_ONLY_POLICY,
    endNativeOutboundDrag,
    evaluateOutboundAppDragCandidate,
    isFormalOutboundDirectDragMouseChord,
    markNativeOutboundDragSuppress,
    NATIVE_OUTBOUND_DND_SUPPRESS_COOLDOWN_MS,
    NATIVE_OUTBOUND_DND_SUPPRESS_START_MS,
    readDragDropExperimentPolicyFromStorage,
    tryBeginNativeOutboundDrag,
  } from "$lib/utils/drag_drop_experiment";

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
  export let pathCompletionPreviewActive = false;
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
  $: dndExperimentPolicy =
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
      ? readDragDropExperimentPolicyFromStorage((key) => window.localStorage.getItem(key))
      : { enabled: false, phase: "phase0_foundation" };
  $: outboundDragProbeEnabled =
    dndExperimentPolicy.enabled && dndExperimentPolicy.phase === "phase2_outbound_local_only";

  function emitDndExperimentStatus(message, durationMs = 2500) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("rf:dnd-experiment-status", { detail: { message, durationMs } })
    );
  }

  /** @param {import("$lib/types").Entry} entry */
  function buildDragSelection(entry) {
    if (selectedPaths.includes(entry.path)) {
      return entries.filter((item) => selectedPaths.includes(item.path));
    }
    return [entry];
  }

  /** @param {DragEvent} event @param {import("$lib/types").Entry} entry */
  function handleRowDragStart(event, entry) {
    if (!outboundDragProbeEnabled) {
      event.preventDefault();
      return;
    }
    const dragEntries = buildDragSelection(entry);
    const decision = evaluateOutboundAppDragCandidate({
      policy: dndExperimentPolicy,
      selectedEntries: dragEntries.map((item) => ({ path: item.path, provider: item.provider })),
    });
    if (!decision.allowed) {
      event.preventDefault();
      emitDndExperimentStatus(`D&D export blocked (${decision.reason})`);
      return;
    }
    try {
      event.dataTransfer?.setData("text/plain", decision.acceptedPaths.join("\r\n"));
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "copyMove";
      }
    } catch {
      // Best-effort only; Explorer transfer depends on native shell integration.
    }
    // True file drag-out to Explorer cannot be completed reliably from the DOM dragstart path.
    // Keep phase2 as a safe probe + clipboard handoff until a dedicated native drag source path exists.
    clipboardSetFiles(decision.acceptedPaths, false, "copy")
      .then(() => {
        emitDndExperimentStatus(
          `D&D export probe ready (clipboard handoff only): ${decision.acceptedPaths.length} item(s)`,
          4000
        );
      })
      .catch((err) => {
        const msg = typeof err === "string" ? err : err?.message || "clipboard_set_files failed";
        emitDndExperimentStatus(`D&D export probe failed (${msg})`, 5000);
      });
  }

  /** @param {MouseEvent} event @param {import("$lib/types").Entry} entry */
  async function handleRowMouseDown(event, entry) {
    // Formal local outbound drag trigger: Ctrl+Alt + left click.
    if (!isFormalOutboundDirectDragMouseChord(event)) return;

    const dragEntries = buildDragSelection(entry);
    const decision = evaluateOutboundAppDragCandidate({
      policy: DND_OUTBOUND_LOCAL_ONLY_POLICY,
      selectedEntries: dragEntries.map((item) => ({ path: item.path, provider: item.provider })),
    });
    if (!decision.allowed) {
      event.preventDefault();
      event.stopPropagation();
      let reasonText = String(decision.reason || "");
      if (typeof t === "function") {
        switch (reasonText) {
          case "source_not_local":
            reasonText = t("dnd.export_local_only");
            break;
          case "mixed_or_invalid_sources":
            reasonText = t("dnd.export_mixed_selection_not_supported");
            break;
          case "no_items":
            reasonText = t("status.no_selection");
            break;
          default:
            reasonText = t("capability.not_available");
            break;
        }
      }
      emitDndExperimentStatus(t?.("status.dnd_export_blocked", { reason: reasonText }) || `D&D export blocked (${reasonText})`, 4000);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (typeof window !== "undefined") {
      if (!tryBeginNativeOutboundDrag(window)) {
        emitDndExperimentStatus(
          t?.("status.dnd_export_native_busy") || "D&D export is already running",
          2500
        );
        return;
      }
      markNativeOutboundDragSuppress(window, NATIVE_OUTBOUND_DND_SUPPRESS_START_MS);
    }
    emitDndExperimentStatus(
      t?.("status.dnd_export_native_starting", { count: decision.acceptedPaths.length }) ||
        `D&D export starting: ${decision.acceptedPaths.length} item(s)`,
      2500
    );
    try {
      const result = await shellStartFileDrag(decision.acceptedPaths);
      const resultText = String(result || "");
      if (resultText === "none") {
        emitDndExperimentStatus(
          t?.("status.dnd_export_native_canceled") || "D&D export canceled",
          3000
        );
      } else {
        emitDndExperimentStatus(
          t?.("status.dnd_export_native_finished", { result: resultText }) ||
            `D&D export finished: ${resultText}`,
          4000
        );
      }
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "shell_start_file_drag failed";
      emitDndExperimentStatus(
        t?.("status.dnd_export_failed", { error: msg }) || `D&D export failed (${msg})`,
        5000
      );
    } finally {
      if (typeof window !== "undefined") {
        endNativeOutboundDrag(window);
        markNativeOutboundDragSuppress(window, NATIVE_OUTBOUND_DND_SUPPRESS_COOLDOWN_MS);
      }
    }
  }
</script>

<div
  class="list {showSize ? 'show-size' : ''} {showTime ? 'show-time' : ''} {isGdrivePath ? 'gdrive-surface' : ''} {pathCompletionPreviewActive ? 'path-completion-surface' : ''}"
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
          onMouseDown={(event) => {
            handleRowMouseDown(event, entry);
          }}
          draggable={outboundDragProbeEnabled}
          onDragStart={(event) => {
            handleRowDragStart(event, entry);
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

  .list.path-completion-surface {
    background: var(--ui-path-completion-surface);
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

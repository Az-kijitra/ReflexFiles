/**
 * Clipboard-preview helpers extracted from +page.svelte.
 *
 * The $effect wiring stays in the component; this module contains the
 * stateful logic so it can be read and tested independently.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface ClipboardPreviewState {
  lastClipboard:          { paths: string[] };
  clipboardItemsMeta:     unknown[];
  clipboardPreviewVisible:boolean;
  layoutMode:             string;
  activePaneId:           string;
  entries:                unknown[];
  rightPane:              { entries: unknown[] };
  // modal open-state flags used by the ESC handler
  deleteConfirmOpen:  boolean;
  pasteConfirmOpen:   boolean;
  createOpen:         boolean;
  renameOpen:         boolean;
  propertiesOpen:     boolean;
  zipModalOpen:       boolean;
  aboutOpen:          boolean;
  jumpUrlOpen:        boolean;
}

// ── captureClipboardMeta ─────────────────────────────────────────────────────

/**
 * Snapshot per-item metadata (name, modified, isDir) from the active pane's
 * entry list at copy/cut time, then show the preview panel.
 * Captured eagerly so the preview can show timestamps even after navigation.
 */
export function captureClipboardMeta(state: ClipboardPreviewState): void {
  const paths = state.lastClipboard.paths;
  const srcEntries =
    state.layoutMode === "dual" && state.activePaneId === "right"
      ? state.rightPane.entries
      : state.entries;
  state.clipboardItemsMeta = paths.map((p) => {
    const name = p.split(/[\\\/]/).pop() || p;
    const entry = (srcEntries as any[]).find((e) => e.path === p);
    return { path: p, name, modified: entry?.modified ?? null, isDir: entry?.is_dir ?? false };
  });
  state.clipboardPreviewVisible = true;
}

// ── patchPasteItemsForPreview ────────────────────────────────────────────────

/**
 * Monkey-patches `pageActionGroups.selection.pasteItems` so that initiating
 * a paste immediately hides the clipboard preview panel.
 */
export function patchPasteItemsForPreview(
  pageActionGroups: { selection: { pasteItems: (...args: unknown[]) => unknown } },
  hidePreview: () => void
): void {
  const origPaste = pageActionGroups.selection.pasteItems;
  pageActionGroups.selection.pasteItems = async (...args: unknown[]) => {
    hidePreview();
    return origPaste(...args);
  };
}

// ── makeClipboardEscHandler ──────────────────────────────────────────────────

/**
 * Returns a keydown handler that dismisses the clipboard preview on Escape,
 * but only when no other modal is open (modals handle Escape themselves).
 */
export function makeClipboardEscHandler(
  state: ClipboardPreviewState,
  getSettingsOpen: () => boolean
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (
      e.key === "Escape" &&
      state.clipboardPreviewVisible &&
      !state.deleteConfirmOpen &&
      !state.pasteConfirmOpen &&
      !state.createOpen &&
      !state.renameOpen &&
      !state.propertiesOpen &&
      !state.zipModalOpen &&
      !state.aboutOpen &&
      !state.jumpUrlOpen &&
      !getSettingsOpen()
    ) {
      state.clipboardPreviewVisible = false;
      e.stopPropagation();
    }
  };
}

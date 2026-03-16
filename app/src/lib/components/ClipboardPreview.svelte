<script>
  import { formatModified } from "$lib/utils/format";

  /** @type {{ paths: string[], cut: boolean }} */
  export let lastClipboard = { paths: [], cut: false };

  /** @type {Array<{ path: string, name: string, modified: string | null, isDir: boolean }>} */
  export let clipboardItemsMeta = [];

  /** @type {any[]} Current directory entries — used to detect paste conflicts */
  export let currentEntries = [];

  export let onClose;

  $: conflictNames = new Set(currentEntries.map((e) => (e.name || "").toLowerCase()));

  function hasConflict(name) {
    return conflictNames.has((name || "").toLowerCase());
  }

  function shortPath(path) {
    // Show only the last 2 path segments for tooltip readability
    return path;
  }
</script>

<div class="clipboard-preview" role="complementary" aria-label="Clipboard contents">
  <div class="header">
    <span class="mode" class:cut={lastClipboard.cut}>
      {lastClipboard.cut ? "Cut" : "Copy"}
    </span>
    <span class="count">{clipboardItemsMeta.length} item{clipboardItemsMeta.length !== 1 ? "s" : ""}</span>
    <button class="close-btn" onclick={onClose} aria-label="Dismiss">✕</button>
  </div>

  <div class="items">
    {#each clipboardItemsMeta as item (item.path)}
      {@const conflict = hasConflict(item.name)}
      <div class="item" class:conflict title={item.path}>
        <span class="item-icon">{item.isDir ? "📁" : "📄"}</span>
        <span class="item-name">{item.name}</span>
        <span class="item-right">
          {#if conflict}
            <span class="conflict-badge" title="Conflicts with existing item">⚠</span>
          {:else}
            <span class="ok-badge" title="No conflict">✓</span>
          {/if}
          {#if item.modified}
            <span class="item-time">{formatModified(item.modified)}</span>
          {/if}
        </span>
      </div>
    {/each}
  </div>

  <div class="footer">
    Ctrl+V to paste · ESC to dismiss
  </div>
</div>

<style>
  .clipboard-preview {
    position: fixed;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 270px;
    max-height: 340px;
    display: flex;
    flex-direction: column;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    z-index: 180;
    font-size: 12px;
    color: var(--ui-fg);
    pointer-events: all;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-bg);
    flex-shrink: 0;
  }

  .mode {
    font-weight: 600;
    font-size: 11px;
    padding: 1px 6px;
    background: var(--ui-accent, #0078d4);
    color: #fff;
    border-radius: 2px;
    letter-spacing: 0.3px;
  }

  .mode.cut {
    background: var(--ui-warning, #ca5010);
  }

  .count {
    flex: 1;
    color: var(--ui-muted);
    font-size: 11px;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--ui-muted);
    font-size: 12px;
    padding: 0 2px;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--ui-fg);
  }

  .items {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-bottom: 1px solid var(--ui-border-muted, var(--ui-border));
  }

  .item:last-child {
    border-bottom: none;
  }

  .item.conflict {
    background: color-mix(in srgb, var(--ui-warning, #ca5010) 8%, transparent);
  }

  .item-icon {
    flex-shrink: 0;
    font-size: 11px;
  }

  .item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }

  .item-right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .conflict-badge {
    font-size: 11px;
    color: var(--ui-warning, #ca5010);
  }

  .ok-badge {
    font-size: 11px;
    color: var(--ui-muted);
  }

  .item-time {
    color: var(--ui-muted);
    font-size: 10px;
    white-space: nowrap;
  }

  .footer {
    padding: 4px 8px;
    border-top: 1px solid var(--ui-border);
    color: var(--ui-muted);
    font-size: 10px;
    text-align: center;
    flex-shrink: 0;
  }
</style>

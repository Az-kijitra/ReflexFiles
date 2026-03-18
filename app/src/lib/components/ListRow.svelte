<script>
  import { getEntryIcon } from "$lib/utils/file_icon";
  export let entry;
  export let selected = false;
  export let focused = false;
  export let showSize = false;
  export let showTime = false;
  export let uiFileIconMode = "by_type";
  export let formatName;
  export let formatSize;
  export let formatModified;
  /** Git status badge: "M" modified, "S" staged, "D" deleted, "?" untracked, "!" conflict, "" clean */
  export let gitBadge = "";
  export let overflowLeft = false;
  export let overflowRight = false;
  export let visualIndex = 0;
  export let visibleColStart = 0;
  export let visibleColEnd = 0;
  export let listRows = 1;
  export let rowId = "";
  export let onClick;
  export let onContextMenu;
  export let onDoubleClick;
  export let draggable = false;
  export let onDragStart;
  export let onMouseDown;

  $: entryIcon = getEntryIcon(entry, uiFileIconMode);
</script>

<div
  id={rowId}
  class="row {selected ? 'selected' : ''} {focused ? 'focused' : ''}"
  role="option"
  tabindex="-1"
  draggable={draggable}
  aria-selected={selected}
  onclick={onClick}
  oncontextmenu={onContextMenu}
  ondblclick={onDoubleClick}
  ondragstart={onDragStart}
  onmousedown={onMouseDown}
  onkeydown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.(event);
    }
  }}
>
  <div class="name">
    <span class="mark" aria-hidden="true">{selected ? '[x]' : '[ ]'}</span>
    {#if gitBadge}
      <span class="git-badge git-badge-{gitBadge === '!' ? 'conflict' : gitBadge === 'S' ? 'staged' : gitBadge === 'M' ? 'modified' : gitBadge === 'D' ? 'deleted' : 'untracked'}" aria-hidden="true">{gitBadge}</span>
    {/if}
    {#if entryIcon}
      <span class="icon">{entryIcon}</span>
    {/if}
    <span class="text">{formatName(entry.name, entry.ext)}</span>
    {#if overflowLeft && visualIndex === visibleColStart * listRows}
      <span class="edge-marker left">◀</span>
    {/if}
    {#if overflowRight && visualIndex === visibleColEnd * listRows}
      <span class="edge-marker right">▶</span>
    {/if}
  </div>
  {#if showSize}
    <div class="size">{entry.type === "dir" ? "" : formatSize(entry.size)}</div>
  {/if}
  {#if showTime}
    <div class="time">{formatModified(entry.modified)}</div>
  {/if}
</div>

<style>
  :global(.list.show-size) .row {
    grid-template-columns: minmax(140px, 1fr) 56px;
  }

  :global(.list.show-time) .row {
    grid-template-columns: minmax(140px, 1fr) 140px;
  }

  :global(.list.show-size.show-time) .row {
    grid-template-columns: minmax(140px, 1fr) 56px 140px;
  }

  .edge-marker {
    font-size: 12px;
    color: var(--ui-muted-2);
    margin-left: 6px;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(140px, 1fr);
    gap: 2px;
    padding: 4px 6px;
    border-top: 1px solid var(--ui-border-muted);
    align-items: center;
    width: var(--list-col-width);
    height: var(--list-row-height);
    overflow: hidden;
    box-sizing: border-box;
    font-family: ui-monospace, "Cascadia Mono", "Consolas", "Menlo", "Monaco", "Courier New",
      monospace;
    font-size: 12px;
  }

  .time {
    font-size: 11px;
    text-align: right;
    color: var(--ui-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 0;
  }

  .row.selected {
    background: var(--ui-selected);
  }

  .row.focused {
    outline: 1px solid var(--ui-focused);
    outline-offset: -1px;
  }

  .size {
    text-align: right;
    font-size: 11px;
    color: var(--ui-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .name {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
  }

  .name .mark {
    flex: 0 0 auto;
    width: 2.4em;
    text-align: center;
    font-size: 11px;
    color: var(--ui-muted);
    letter-spacing: -0.5px;
  }

  .row.selected .name .mark {
    color: var(--ui-fg);
  }

  .name .icon {
    width: 1.2em;
    text-align: center;
    flex: 0 0 auto;
  }

  .name .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .git-badge {
    flex: 0 0 auto;
    font-size: 10px;
    font-weight: 700;
    width: 1.3em;
    text-align: center;
    border-radius: 2px;
    line-height: 1.5;
  }
  .git-badge-modified  { color: #d08800; }
  .git-badge-staged    { color: #1a8a1a; }
  .git-badge-deleted   { color: #c0392b; }
  .git-badge-untracked { color: var(--ui-muted); }
  .git-badge-conflict  { color: #c0392b; background: #fde8e8; border-radius: 2px; }


</style>

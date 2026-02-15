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

  $: entryIcon = getEntryIcon(entry, uiFileIconMode);
</script>

<div
  id={rowId}
  class="row {selected ? 'selected' : ''} {focused ? 'focused' : ''}"
  role="option"
  tabindex="-1"
  aria-selected={selected}
  onclick={onClick}
  oncontextmenu={onContextMenu}
  ondblclick={onDoubleClick}
  onkeydown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.(event);
    }
  }}
>
  <div class="name">
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

</style>

<script>
  import ActionItemList from "$lib/components/ActionItemList.svelte";

  /** @type {HTMLElement | null} */
  export let contextMenuEl = null;
  export let contextMenuPos = { x: 0, y: 0 };
  export let getContextMenuItems;
  export let contextMenuIndex = 0;
  export let getSelectableIndex;
  export let handleContextMenuKey;
  export let trapModalTab;

  $: items = getContextMenuItems ? getContextMenuItems() : [];
</script>

<div
  class="context-menu"
  tabindex="0"
  role="menu"
  style={`top: ${contextMenuPos.y}px; left: ${contextMenuPos.x}px;`}
  bind:this={contextMenuEl}
  onclick={(event) => {
    event.stopPropagation();
  }}
  onkeydown={(event) => {
    if (trapModalTab(event, contextMenuEl)) return;
    handleContextMenuKey(event);
  }}
>
  <ActionItemList
    {items}
    variant="context"
    activeIndex={contextMenuIndex}
    {getSelectableIndex}
  />
</div>

<style>
  .context-menu {
    position: fixed;
    min-width: 160px;
    max-width: 260px;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border-strong);
    box-shadow: 0 8px 20px var(--ui-shadow-2);
    padding: 4px 0;
    z-index: 20;
    white-space: normal;
    max-height: 70vh;
    overflow: auto;
    overflow-x: hidden;
    color: var(--ui-fg);
  }

  .context-menu:focus-visible {
    outline: 1px solid var(--ui-focused);
    outline-offset: -1px;
  }

</style>

<script>
  import ActionButton from "$lib/components/ActionButton.svelte";

  export let item;
  export let active = false;
  export let dropdownMode = "history";
  export let t;
  export let itemId = "";
  export let onSelect;
  export let onRemove;
</script>

<div
  id={itemId}
  class="dropdown-item {active ? 'active' : ''}"
  role="option"
  aria-selected={active}
>
  <ActionButton className="dropdown-select" onSelect={onSelect}>
    <span class="icon">{item?.type === "url" ? "🌐" : "📁"}</span>
    <span class="value">{item?.value}</span>
  </ActionButton>
  {#if dropdownMode === "jump" || dropdownMode === "history"}
    <ActionButton className="dropdown-remove" onSelect={onRemove}>
      {t("history.delete")}
    </ActionButton>
  {/if}
</div>

<style>
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    border-top: 1px solid var(--ui-border-muted);
  }

  .dropdown-item:first-child {
    border-top: none;
  }

  .dropdown-item.active {
    background: var(--ui-hover);
  }

  :global(.dropdown-select) {
    flex: 1;
    text-align: left;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, "Cascadia Mono", "Consolas", "Menlo", "Monaco", "Courier New",
      monospace;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ui-fg);
  }

  :global(.dropdown-select .value) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.dropdown-remove) {
    padding: 2px 6px;
    font-size: 10px;
    line-height: 1.1;
  }
</style>

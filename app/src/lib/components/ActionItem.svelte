<script>
  import ActionButton from "$lib/components/ActionButton.svelte";

  export let item;
  export let variant = "menu"; // "menu" | "context"
  export let active = false;
  export let onSelect;

  const isContext = variant === "context";
</script>

<ActionButton
  className={isContext ? "context-menu-item" : "menu-item"}
  dataMenuId={String(item?.id || "")}
  enabled={item?.enabled}
  active={item?.enabled && active}
  onSelect={() => {
    item?.action?.();
    onSelect?.();
  }}
>
  <span class="menu-text">
    <span class="menu-label">{item?.label}</span>
    {#if item?.reason}
      <span class="menu-reason">{item.reason}</span>
    {/if}
  </span>
  {#if !isContext && item?.shortcut}
    <span class="menu-shortcut">{item.shortcut}</span>
  {/if}
</ActionButton>

<style>
  :global(.menu-item) {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 6px 12px;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--ui-fg);
  }

  :global(.menu-shortcut) {
    color: var(--ui-muted);
    font-size: 0.9em;
    flex: 0 0 auto;
  }

  :global(.menu-text) {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  :global(.menu-reason) {
    color: var(--ui-muted-2);
    font-size: 11px;
    white-space: normal;
  }

  :global(.menu-item.disabled) {
    color: var(--ui-muted-2);
    cursor: default;
  }

  :global(.menu-item:hover:not(.disabled)) {
    background: var(--ui-hover);
  }

  :global(.context-menu-item) {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 4px 10px;
    font-size: 13px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    color: var(--ui-fg);
    display: flex;
    align-items: flex-start;
  }

  :global(.context-menu-item.active) {
    background: var(--ui-hover);
  }

  :global(.context-menu-item:hover:not(.disabled)) {
    background: var(--ui-hover);
  }

  :global(.context-menu-item.disabled) {
    color: var(--ui-muted-2);
    cursor: default;
  }
</style>

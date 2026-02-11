<script>
  /** @type {HTMLElement | null} */
  export let sortMenuEl = null;
  export let sortMenuIndex = 0;
  export let t;
  export let setSort;
  export let handleSortMenuKey;
</script>

<div
  class="sort-menu"
  tabindex="0"
  role="menu"
  bind:this={sortMenuEl}
  onkeydown={handleSortMenuKey}
>
  <button
    class:active={sortMenuIndex === 0}
    onclick={() => setSort("name")}
  >
    {t("sort.name")}
  </button>
  <button
    class:active={sortMenuIndex === 1}
    onclick={() => setSort("size")}
  >
    {t("sort.size")}
  </button>
  <button
    class:active={sortMenuIndex === 2}
    onclick={() => setSort("type")}
  >
    {t("sort.type")}
  </button>
  <button
    class:active={sortMenuIndex === 3}
    onclick={() => setSort("modified")}
  >
    {t("sort.modified")}
  </button>
</div>

<style>
  .sort-menu {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    padding: 6px 8px;
    border: 1px solid var(--ui-border);
    background: var(--ui-surface);
    color: var(--ui-fg);
  }

  .sort-menu button.active {
    background: var(--ui-hover);
    border-color: var(--ui-focused);
  }

  .sort-menu button {
    background: var(--ui-surface);
    color: var(--ui-fg);
    border: 1px solid var(--ui-border);
    padding: 2px 8px;
    font-size: 12px;
  }
</style>

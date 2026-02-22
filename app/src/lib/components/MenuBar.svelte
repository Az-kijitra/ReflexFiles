<script>
  import ActionItemList from "$lib/components/ActionItemList.svelte";

  /** @type {HTMLElement | null} */
  export let menuBarEl = null;
  export let MENU_GROUPS = [];
  export let menuOpen = "";
  export let t;
  export let toggleMenu;
  export let getMenuItems;
  export let closeMenu;

  function handleMenuKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu?.();
    }
  }
</script>

<nav class="menu-bar" bind:this={menuBarEl}>
  {#each MENU_GROUPS as group}
    <div class="menu-group">
      <button
        class="menu-button {menuOpen === group ? 'active' : ''}"
        data-menu-group={group}
        onclick={() => toggleMenu(group)}
      >
        {t(`menu.${group}`)}
      </button>
      {#if menuOpen === group}
        <div class="menu-dropdown" role="menu" tabindex="-1" onkeydown={handleMenuKeydown}>
          <ActionItemList items={getMenuItems(group)} onSelect={closeMenu} />
        </div>
      {/if}
    </div>
  {/each}
</nav>

<style>
  .menu-bar {
    display: flex;
    gap: 4px;
    padding: 3px 6px;
    background: var(--ui-surface-2);
    border: 1px solid var(--ui-border);
    color: var(--ui-fg);
  }

  .menu-bar:focus-within {
    outline: 1px solid var(--ui-focused);
    outline-offset: -1px;
  }

  .menu-group {
    position: relative;
  }

  .menu-button {
    background: none;
    border: none;
    padding: 2px 6px;
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
    color: var(--ui-fg);
  }

  .menu-button.active {
    background: var(--ui-hover);
    border-radius: 4px;
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 260px;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border-strong);
    box-shadow: 0 8px 20px var(--ui-shadow-1);
    padding: 6px 0;
    z-index: 10;
  }

</style>

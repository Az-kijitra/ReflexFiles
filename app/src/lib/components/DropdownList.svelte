<script>
  import DropdownItem from "$lib/components/DropdownItem.svelte";
  import { handleDropdownKeydown } from "$lib/utils/dropdown_keyboard";

  /** @type {HTMLElement | null} */
  export let dropdownEl = null;
  export let dropdownItems = [];
  export let dropdownMode = "history";
  export let dropdownOpen = false;
  export let dropdownIndex = 0;
  export let t;
  export let matchesAction;
  export let setStatusMessage;
  export let jumpList = [];
  export let pathHistory = [];
  export let scrollDropdownToIndex;
  export let selectDropdown;
  export let removeHistory;
  export let removeJump;
  export let trapModalTab;

  const dropdownItemId = (index) => `dropdown-item-${index}`;

  const setDropdownMode = (value) => {
    dropdownMode = value;
  };

  const setDropdownIndex = (value) => {
    dropdownIndex = value;
  };

  const setDropdownOpen = (value) => {
    dropdownOpen = value;
  };
</script>

<div
  class="dropdown"
  tabindex="0"
  role="listbox"
  aria-label={dropdownMode === "jump" ? t("menu.history_jump_list") : t("menu.history")}
  aria-activedescendant={
    dropdownItems[dropdownIndex] ? dropdownItemId(dropdownIndex) : undefined
  }
  bind:this={dropdownEl}
  onkeydown={(event) => {
    if (trapModalTab(event, dropdownEl)) return;
    if (
      handleDropdownKeydown(event, {
        dropdownOpen,
        dropdownItems,
        dropdownIndex,
        dropdownMode,
        jumpList,
        pathHistory,
        matchesAction,
        setStatusMessage,
        t,
        setDropdownMode,
        setDropdownIndex,
        setDropdownOpen,
        scrollDropdownToIndex,
        selectDropdown,
        removeHistory,
      })
    ) {
      return;
    }
  }}
>
  {#if dropdownItems.length === 0}
    <div class="dropdown-item empty">{t("no_items")}</div>
  {:else}
    {#each dropdownItems as item, index}
      <DropdownItem
        {item}
        active={index === dropdownIndex}
        {dropdownMode}
        {t}
        itemId={dropdownItemId(index)}
        onSelect={() => selectDropdown(item)}
        onRemove={() => {
          if (dropdownMode === "jump") {
            removeJump(item.value);
          } else if (dropdownMode === "history") {
            removeHistory(item.value);
          }
        }}
      />
    {/each}
  {/if}
</div>

<style>
  .dropdown {
    margin-top: 4px;
    border: 1px solid var(--ui-border);
    background: var(--ui-surface);
    max-height: 240px;
    overflow: auto;
    color: var(--ui-fg);
  }

  .dropdown:focus-visible {
    outline: 1px solid var(--ui-focused);
    outline-offset: -1px;
  }

  .dropdown-item.empty {
    padding: 4px 12px;
    border-top: 1px solid var(--ui-border-muted);
    color: var(--ui-muted);
  }
</style>

<script>
  /** @type {HTMLInputElement | null} */
  export let searchInputEl = null;
  export let t;
  export let searchQuery = "";
  export let searchRegex = false;
  export let searchError = "";
  export let onSearchKeydown;
  export let applySearch;
  export let clearSearch;
</script>

<form
  class="search-bar"
  onsubmit={(event) => {
    event.preventDefault();
    applySearch();
  }}
>
  <span class="label">{t("search.label")}</span>
  <input
    type="text"
    bind:value={searchQuery}
    placeholder={t("search.placeholder")}
    spellcheck="false"
    bind:this={searchInputEl}
    onkeydown={onSearchKeydown}
  />
  <button
    type="button"
    class:active={searchRegex}
    onclick={() => (searchRegex = !searchRegex)}
  >
    {t("search.regex")}
  </button>
  <button type="submit">{t("search.apply")}</button>
  <button type="button" onclick={clearSearch}>{t("search.clear")}</button>
  {#if searchError}
    <span class="search-error">{searchError}</span>
  {/if}
</form>

<style>
  .search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    padding: 6px 8px;
    border: 1px solid var(--ui-border);
    background: var(--ui-surface);
    color: var(--ui-fg);
  }

  .search-bar .label {
    font-weight: 600;
  }

  .search-bar input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid var(--ui-border-strong);
    border-radius: 4px;
    background: var(--ui-surface-2);
    color: var(--ui-fg);
  }

  .search-bar button {
    padding: 4px 8px;
    font-size: 12px;
    background: var(--ui-surface);
    color: var(--ui-fg);
    border: 1px solid var(--ui-border);
  }

  .search-bar button.active {
    background: var(--ui-hover);
    border: 1px solid var(--ui-focused);
  }

  .search-error {
    font-size: 11px;
    color: var(--ui-error);
    margin-left: 6px;
    white-space: nowrap;
  }
</style>

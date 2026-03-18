<script>
  import PathBar from "$lib/components/PathBar.svelte";
  import FileList from "$lib/components/FileList.svelte";

  /** @type {HTMLElement | null} */
  export let listEl = null;
  /** @type {HTMLElement | null} */
  export let listBodyEl = null;
  /** @type {HTMLInputElement | null} */
  export let pathInputEl = null;
  export let pathInput = "";
  export let focusedIndex = 0;
  export let anchorIndex = null;
  export let dropdownOpen = false;

  export let pathBarProps;
  export let fileListProps;

  export let isActive = false;
  export let onActivate = () => {};
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="pane" class:pane--active={isActive} onclick={onActivate}>
  <PathBar
    bind:pathInput
    bind:pathInputEl
    bind:dropdownOpen
    {...pathBarProps}
  />
  <FileList
    bind:listEl
    bind:listBodyEl
    bind:focusedIndex
    bind:anchorIndex
    bind:dropdownOpen
    {...fileListProps}
  />
</div>

<style>
  .pane {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    border: 1px solid var(--ui-border);
  }

  .pane:focus-within {
    border-color: var(--ui-focused);
  }
</style>

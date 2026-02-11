<script>
  import MenuBar from "$lib/components/MenuBar.svelte";
  import PathBar from "$lib/components/PathBar.svelte";
  import TreePanel from "$lib/components/TreePanel.svelte";
  import FileList from "$lib/components/FileList.svelte";
  import StatusBar from "$lib/components/StatusBar.svelte";
  import PageOverlaysBindings from "$lib/components/PageOverlaysBindings.svelte";

  export let viewProps;
  export let overlayBindings;
  export let statusItems;
  export let showTree;

  export let menuBarEl = null;
  export let pathInput = "";
  export let pathInputEl = null;
  export let dropdownMode = "history";
  export let dropdownOpen = false;
  export let listEl = null;
  export let listBodyEl = null;
  export let focusedIndex = 0;
  export let anchorIndex = null;
  export let treeEl = null;
  export let treeBodyEl = null;
</script>

<main class="container">
  <MenuBar bind:menuBarEl {...viewProps.menuProps} />

  <PathBar
    bind:pathInput
    bind:pathInputEl
    bind:dropdownMode
    bind:dropdownOpen
    {...viewProps.pathBarProps}
  />

  <PageOverlaysBindings
    {overlayBindings}
    overlayProps={viewProps.overlayProps}
  />

  <div class="content">
    {#if showTree}
      <TreePanel bind:treeEl bind:treeBodyEl {...viewProps.treeProps} />
    {/if}

    <FileList
      bind:listEl
      bind:listBodyEl
      bind:focusedIndex
      bind:anchorIndex
      {...viewProps.fileListProps}
    />
  </div>

  <StatusBar {statusItems} />
</main>

<style>
  :root {
    font-family: "Segoe UI", "Meiryo", sans-serif;
    font-size: 13px;
    color: var(--ui-fg);
    background-color: var(--ui-bg);
    --list-col-width: 240px;
    --list-col-gap: 16px;
    --list-row-height: 28px;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    background-color: var(--ui-bg);
    color: var(--ui-fg);
    height: 100%;
    overflow: hidden;
  }

  .container {
    padding: 2px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 3px;
    overflow: hidden;
    box-sizing: border-box;
  }

  .content {
    display: flex;
    gap: 3px;
    flex: 1;
    min-height: 0;
  }

  :global(.error) {
    margin-top: 12px;
    color: var(--ui-error);
  }

  :global(.modal-backdrop) {
    position: fixed;
    inset: 0;
    background: var(--ui-backdrop);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  :global(.modal) {
    width: 420px;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    color: var(--ui-fg);
    padding: 16px;
    max-height: 90vh;
    overflow: hidden;
  }

  :global(.properties-modal) {
    width: 520px;
    max-width: 90vw;
  }

  :global(.about-modal) {
    width: 360px;
    max-width: 90vw;
  }

  :global(.about-body) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  :global(.about-logo) {
    width: 120px;
    height: auto;
  }

  :global(.about-row) {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  :global(.about-label) {
    min-width: 72px;
    color: var(--ui-muted);
  }

  :global(.about-link) {
    background: none;
    border: none;
    padding: 0;
    color: var(--ui-link);
    text-decoration: underline;
    cursor: pointer;
    font-size: 12px;
  }

  :global(.modal-title) {
    font-weight: 600;
    margin-bottom: 8px;
  }

  :global(.modal-body ul) {
    margin: 8px 0 0 16px;
  }

  :global(.modal-body) {
    overflow: auto;
    max-height: calc(90vh - 120px);
  }

  :global(.modal-actions) {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  :global(.modal-field) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
  }

  :global(.modal-inline) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 12px;
    color: var(--ui-muted);
  }

  :global(.modal-field input) {
    padding: 6px 8px;
    border: 1px solid var(--ui-border-strong);
    border-radius: 4px;
    background: var(--ui-surface-2);
    color: var(--ui-fg);
  }

  :global(.modal-field select) {
    padding: 6px 8px;
    border: 1px solid var(--ui-border-strong);
    border-radius: 4px;
    background: var(--ui-surface-2);
    color: var(--ui-fg);
  }

  :global(.timeout-control) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-right: auto;
    font-size: 12px;
    color: var(--ui-muted);
  }

  :global(.timeout-control input) {
    width: 90px;
    padding: 4px 6px;
    border: 1px solid var(--ui-border-strong);
    border-radius: 4px;
    background: var(--ui-surface-2);
    color: var(--ui-fg);
  }

  :global(.properties-grid) {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 6px 12px;
    font-size: 13px;
    word-break: break-word;
  }

  :global(.properties-grid .label) {
    color: var(--ui-muted);
  }

  :global(.properties-grid .value) {
    color: var(--ui-fg);
  }

  :global(.modal-actions button.selected) {
    outline: 2px solid var(--ui-focused);
    outline-offset: 1px;
  }
</style>

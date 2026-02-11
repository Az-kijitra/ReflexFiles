<script>
  import PageShell from "$lib/components/PageShell.svelte";

  const {
    state = $bindable(),
    refs = $bindable(),
    viewProps,
    overlayBindings,
  } = $props();
</script>

<PageShell
  bind:menuBarEl={refs.menuBarEl}
  bind:pathInput={state.pathInput}
  bind:pathInputEl={refs.pathInputEl}
  bind:dropdownMode={state.dropdownMode}
  bind:dropdownOpen={state.dropdownOpen}
  bind:listEl={refs.listEl}
  bind:listBodyEl={refs.listBodyEl}
  bind:focusedIndex={state.focusedIndex}
  bind:anchorIndex={state.anchorIndex}
  bind:treeEl={refs.treeEl}
  bind:treeBodyEl={refs.treeBodyEl}
  showTree={state.showTree}
  statusItems={state.statusItems}
  {viewProps}
  {overlayBindings}
/>

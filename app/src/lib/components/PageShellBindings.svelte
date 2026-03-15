<script>
  import PageShell from "$lib/components/PageShell.svelte";

  const {
    state = $bindable(),
    refs = $bindable(),
    rightRefs = $bindable(),
    viewProps,
    overlayBindings,
    rightPaneViewProps = null,
    onActivateLeft = () => {},
    onActivateRight = () => {},
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
  bind:rightPathInput={state.rightPane.pathInput}
  bind:rightPathInputEl={rightRefs.pathInputEl}
  bind:rightListEl={rightRefs.listEl}
  bind:rightListBodyEl={rightRefs.listBodyEl}
  bind:rightFocusedIndex={state.rightPane.focusedIndex}
  bind:rightAnchorIndex={state.rightPane.anchorIndex}
  bind:rightDropdownOpen={state.dropdownOpen}
  showTree={state.showTree}
  layoutMode={state.layoutMode}
  activePaneId={state.activePaneId}
  statusItems={state.statusItems}
  {viewProps}
  {overlayBindings}
  {rightPaneViewProps}
  {onActivateLeft}
  {onActivateRight}
/>

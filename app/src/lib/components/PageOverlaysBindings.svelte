<script>
  import PageOverlays from "$lib/components/PageOverlays.svelte";

  export let overlayBindings = {};
  export let overlayProps = {};
</script>

<PageOverlays
  bind:dropdownEl={overlayBindings.dropdownEl}
  bind:dropdownMode={overlayBindings.dropdownMode}
  bind:dropdownOpen={overlayBindings.dropdownOpen}
  bind:dropdownIndex={overlayBindings.dropdownIndex}
  bind:searchQuery={overlayBindings.searchQuery}
  bind:searchRegex={overlayBindings.searchRegex}
  bind:searchInputEl={overlayBindings.searchInputEl}
  bind:sortMenuIndex={overlayBindings.sortMenuIndex}
  bind:sortMenuEl={overlayBindings.sortMenuEl}
  bind:aboutModalEl={overlayBindings.aboutModalEl}
  bind:deleteModalEl={overlayBindings.deleteModalEl}
  bind:deleteConfirmIndex={overlayBindings.deleteConfirmIndex}
  bind:pasteModalEl={overlayBindings.pasteModalEl}
  bind:pasteApplyAll={overlayBindings.pasteApplyAll}
  bind:pasteConfirmIndex={overlayBindings.pasteConfirmIndex}
  bind:createModalEl={overlayBindings.createModalEl}
  bind:createInputEl={overlayBindings.createInputEl}
  bind:createType={overlayBindings.createType}
  bind:createName={overlayBindings.createName}
  bind:jumpUrlModalEl={overlayBindings.jumpUrlModalEl}
  bind:jumpUrlInputEl={overlayBindings.jumpUrlInputEl}
  bind:jumpUrlValue={overlayBindings.jumpUrlValue}
  bind:jumpUrlError={overlayBindings.jumpUrlError}
  bind:renameModalEl={overlayBindings.renameModalEl}
  bind:renameInputEl={overlayBindings.renameInputEl}
  bind:renameValue={overlayBindings.renameValue}
  bind:propertiesModalEl={overlayBindings.propertiesModalEl}
  bind:propertiesCloseButton={overlayBindings.propertiesCloseButton}
  bind:dirStatsTimeoutMs={overlayBindings.dirStatsTimeoutMs}
  bind:zipModalEl={overlayBindings.zipModalEl}
  bind:zipDestination={overlayBindings.zipDestination}
  bind:zipPassword={overlayBindings.zipPassword}
  bind:zipConfirmIndex={overlayBindings.zipConfirmIndex}
  bind:zipOverwriteConfirmed={overlayBindings.zipOverwriteConfirmed}
  bind:contextMenuEl={overlayBindings.contextMenuEl}
  bind:failureModalEl={overlayBindings.failureModalEl}
  {...overlayProps}
/>

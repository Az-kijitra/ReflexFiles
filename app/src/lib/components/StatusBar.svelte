<script>
  export let statusItems = [];
</script>

<footer class="status-bar">
  {#each statusItems as item}
    <span class="status-item">{item}</span>
  {/each}
</footer>

<style>
  .status-bar {
    margin-top: 1px;
    padding: 3px 6px;
    border: 1px solid var(--ui-border);
    background: var(--ui-surface-2);
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 11px;
    color: var(--ui-fg);
  }

  .status-item {
    white-space: nowrap;
  }
</style>

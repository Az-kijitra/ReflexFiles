<script>
  export let className = "separator";
</script>

<div class={className}></div>

<style>
  :global(.separator) {
    height: 1px;
    background: var(--ui-border-muted);
    margin: 6px 0;
  }
</style>

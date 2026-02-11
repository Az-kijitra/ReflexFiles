<script>
  export let choices = [];
  export let selectedIndex = -1;
  export let onChange;

  const hasSelection = typeof selectedIndex === "number" && selectedIndex >= 0;
</script>

<div class="modal-actions">
  {#each choices as choice, index}
    <button
      class:selected={hasSelection && index === selectedIndex}
      class:disabled={choice?.disabled}
      disabled={choice?.disabled}
      onclick={() => {
        if (choice?.disabled) return;
        onChange?.(index);
        choice?.onSelect?.();
      }}
    >
      {choice?.label}
    </button>
  {/each}
</div>

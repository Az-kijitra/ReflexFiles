<script>
  export let enabled = true;
  export let active = false;
  export let className = "";
  export let onSelect;
</script>

<button
  class={`action-button ${className}`.trim()}
  class:disabled={!enabled}
  class:active={active}
  disabled={!enabled}
  onclick={() => {
    if (!enabled) return;
    onSelect?.();
  }}
>
  <slot />
</button>

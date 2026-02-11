<script>
  /** @type {HTMLElement | null} */
  export let modalEl = null;
  export let title = "";
  export let trapModalTab;
  export let onKeydown;
  export let modalClass = "";
  export let autofocus;

  const applyAutofocus = autofocus || (() => {});
</script>

<div class="modal-backdrop">
  <div
    class={`modal ${modalClass}`.trim()}
    tabindex="0"
    role="dialog"
    bind:this={modalEl}
    use:applyAutofocus
    onkeydown={(event) => {
      if (trapModalTab && modalEl && trapModalTab(event, modalEl)) return;
      onKeydown?.(event);
    }}
  >
    {#if title}
      <div class="modal-title">{title}</div>
    {/if}
    <div class="modal-body">
      <slot name="body" />
    </div>
    {#if $$slots.actions}
      <div class="modal-actions">
        <slot name="actions" />
      </div>
    {/if}
  </div>
</div>

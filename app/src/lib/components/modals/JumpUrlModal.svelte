<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";
  import ModalChoiceActions from "$lib/components/modals/ModalChoiceActions.svelte";
  import { handleConfirmCancelKeydown } from "$lib/utils/modal_keyboard";

  /** @type {HTMLElement | null} */
  export let jumpUrlModalEl = null;
  /** @type {HTMLInputElement | null} */
  export let jumpUrlInputEl = null;
  export let t;
  export let jumpUrlValue = "";
  export let jumpUrlError = "";
  export let confirmJumpUrl;
  export let cancelJumpUrl;
  export let trapModalTab;
</script>

<ModalShell
  bind:modalEl={jumpUrlModalEl}
  title={t("jump_url.title")}
  {trapModalTab}
  onKeydown={(event) => {
    handleConfirmCancelKeydown(event, {
      onConfirm: confirmJumpUrl,
      onCancel: cancelJumpUrl,
    });
  }}
>
  <div slot="body">
    <div class="modal-field">
      <label for="jump-url-input">{t("jump_url.label")}</label>
      <input
        id="jump-url-input"
        type="text"
        bind:value={jumpUrlValue}
        bind:this={jumpUrlInputEl}
        spellcheck="false"
        placeholder={t("jump_url.placeholder")}
        oninput={() => {
          if (jumpUrlError) jumpUrlError = "";
        }}
        onkeydown={(event) => {
          handleConfirmCancelKeydown(event, {
            onConfirm: confirmJumpUrl,
            onCancel: cancelJumpUrl,
          });
        }}
      />
    </div>
    {#if jumpUrlError}
      <div class="error">{jumpUrlError}</div>
    {/if}
  </div>
  <ModalChoiceActions
    slot="actions"
    choices={[
      { label: t("jump_url.add"), onSelect: confirmJumpUrl },
      { label: t("cancel"), onSelect: cancelJumpUrl },
    ]}
  />
</ModalShell>

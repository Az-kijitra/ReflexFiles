<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";
  import ModalChoiceActions from "$lib/components/modals/ModalChoiceActions.svelte";
  import { handleConfirmCancelKeydown } from "$lib/utils/modal_keyboard";

  /** @type {HTMLElement | null} */
  export let renameModalEl = null;
  /** @type {HTMLInputElement | null} */
  export let renameInputEl = null;
  export let t;
  export let renameValue = "";
  export let renameError = "";
  export let confirmRename;
  export let cancelRename;
  export let trapModalTab;
</script>

<ModalShell
  bind:modalEl={renameModalEl}
  title={t("rename.title")}
  {trapModalTab}
  onKeydown={(event) => {
    handleConfirmCancelKeydown(event, {
      onConfirm: confirmRename,
      onCancel: cancelRename,
    });
  }}
>
  <div slot="body">
    <div class="modal-field">
      <label for="rename-input">{t("rename.name")}</label>
      <input
        id="rename-input"
        type="text"
        bind:value={renameValue}
        bind:this={renameInputEl}
        spellcheck="false"
        onkeydown={(event) => {
          handleConfirmCancelKeydown(event, {
            onConfirm: confirmRename,
            onCancel: cancelRename,
          });
        }}
      />
    </div>
    {#if renameError}
      <div class="error">{renameError}</div>
    {/if}
  </div>
  <ModalChoiceActions
    slot="actions"
    choices={[
      { label: t("rename.button"), onSelect: confirmRename },
      { label: t("cancel"), onSelect: cancelRename },
    ]}
  />
</ModalShell>

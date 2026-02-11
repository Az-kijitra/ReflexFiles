<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";
  import ModalChoiceActions from "$lib/components/modals/ModalChoiceActions.svelte";
  import { handleConfirmCancelKeydown } from "$lib/utils/modal_keyboard";

  /** @type {HTMLElement | null} */
  export let createModalEl = null;
  /** @type {HTMLInputElement | null} */
  export let createInputEl = null;
  export let t;
  export let createType = "file";
  export let createName = "";
  export let createError = "";
  export let confirmCreate;
  export let cancelCreate;
  export let trapModalTab;
</script>

<ModalShell
  bind:modalEl={createModalEl}
  title={t("create.title")}
  {trapModalTab}
  onKeydown={(event) => {
    handleConfirmCancelKeydown(event, {
      onConfirm: confirmCreate,
      onCancel: cancelCreate,
    });
  }}
>
  <div slot="body">
    <div class="modal-field">
      <label for="create-type">{t("create.type")}</label>
      <select id="create-type" bind:value={createType}>
        <option value="file">{t("create.file")}</option>
        <option value="folder">{t("create.folder")}</option>
      </select>
    </div>
    <div class="modal-field">
      <label for="create-name">{t("create.name")}</label>
      <input
        id="create-name"
        type="text"
        bind:value={createName}
        bind:this={createInputEl}
        spellcheck="false"
        onkeydown={(event) => {
          handleConfirmCancelKeydown(event, {
            onConfirm: confirmCreate,
            onCancel: cancelCreate,
          });
        }}
      />
    </div>
    {#if createError}
      <div class="error">{createError}</div>
    {/if}
  </div>
  <ModalChoiceActions
    slot="actions"
    choices={[
      { label: t("create.button"), onSelect: confirmCreate },
      { label: t("cancel"), onSelect: cancelCreate },
    ]}
  />
</ModalShell>

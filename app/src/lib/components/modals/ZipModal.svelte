<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";
  import ModalChoiceActions from "$lib/components/modals/ModalChoiceActions.svelte";
  import { handleChoiceModalKeydown } from "$lib/utils/modal_keyboard";

  /** @type {HTMLElement | null} */
  export let zipModalEl = null;
  export let t;
  export let zipMode = "create";
  export let zipTargets = [];
  export let zipPasswordAttempts = 0;
  export let ZIP_PASSWORD_MAX_ATTEMPTS = 3;
  export let zipDestination = "";
  export let zipPassword = "";
  export let zipError = "";
  export let zipConfirmIndex = 0;
  export let zipOverwriteConfirmed = false;
  export let runZipAction;
  export let closeZipModal;
  export let trapModalTab;

  // Kept for binding compatibility while overwrite confirmation moved to conflict-time dialog.
  $: void zipOverwriteConfirmed;
</script>

<ModalShell
  bind:modalEl={zipModalEl}
  title={zipMode === "create" ? t("zip.title_create") : t("zip.title_extract")}
  {trapModalTab}
  onKeydown={(event) => {
    handleChoiceModalKeydown(event, {
      choiceCount: 2,
      selectedIndex: zipConfirmIndex,
      setSelectedIndex: (index) => {
        zipConfirmIndex = index;
      },
      onSubmitIndex: (index) => {
        if (index === 0) {
          runZipAction();
        } else {
          closeZipModal();
        }
      },
      onCancel: closeZipModal,
    });
  }}
>
  <div slot="body">
    {#if zipMode === "create"}
      <div>{t("zip.items", { count: zipTargets.length })}</div>
    {:else}
      <div>{t("zip.file", { file: zipTargets[0] })}</div>
      <div>
        {t("zip.attempts", { count: zipPasswordAttempts, total: ZIP_PASSWORD_MAX_ATTEMPTS })}
      </div>
    {/if}
    <div class="modal-field">
      <label for="zip-destination">{t("zip.destination")}</label>
      <input id="zip-destination" type="text" bind:value={zipDestination} />
    </div>
    <div class="modal-field">
      <label for="zip-password">{t("zip.password")}</label>
      <input id="zip-password" type="password" bind:value={zipPassword} />
    </div>
    {#if zipError}
      <div class="error">{zipError}</div>
    {/if}
  </div>
  <ModalChoiceActions
    slot="actions"
    selectedIndex={zipConfirmIndex}
    onChange={(index) => {
      zipConfirmIndex = index;
    }}
    choices={[
      {
        label: zipMode === "create" ? t("zip.create") : t("zip.extract"),
        onSelect: runZipAction,
        disabled:
          zipMode === "extract" &&
          zipPasswordAttempts >= ZIP_PASSWORD_MAX_ATTEMPTS,
      },
      { label: t("cancel"), onSelect: closeZipModal },
    ]}
  />
</ModalShell>

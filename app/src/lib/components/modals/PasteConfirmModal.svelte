<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";
  import ModalChoiceActions from "$lib/components/modals/ModalChoiceActions.svelte";
  import { handleChoiceModalKeydown } from "$lib/utils/modal_keyboard";

  /** @type {HTMLElement | null} */
  export let pasteModalEl = null;
  export let t;
  export let pasteConflicts = [];
  export let pasteApplyAll = true;
  export let pasteConfirmIndex = 0;
  export let confirmPasteOverwrite;
  export let confirmPasteSkip;
  export let cancelPasteConfirm;
  export let trapModalTab;
</script>

<ModalShell
  bind:modalEl={pasteModalEl}
  title={t("paste.title")}
  {trapModalTab}
  onKeydown={(event) => {
    handleChoiceModalKeydown(event, {
      choiceCount: 3,
      selectedIndex: pasteConfirmIndex,
      setSelectedIndex: (index) => {
        pasteConfirmIndex = index;
      },
      onSubmitIndex: (index) => {
        if (index === 0) {
          confirmPasteOverwrite();
        } else if (index === 1) {
          confirmPasteSkip();
        } else {
          cancelPasteConfirm();
        }
      },
      onCancel: cancelPasteConfirm,
    });
  }}
>
  <div slot="body">
    <div>
      {t("paste.body", { count: pasteConflicts.length })}
    </div>
    <ul>
      {#each pasteConflicts.slice(0, 5) as name}
        <li>{name}</li>
      {/each}
      {#if pasteConflicts.length > 5}
        <li>...</li>
      {/if}
    </ul>
    <label class="modal-inline">
      <input type="checkbox" bind:checked={pasteApplyAll} />
      {t("paste.apply_all")}
    </label>
  </div>
  <ModalChoiceActions
    slot="actions"
    selectedIndex={pasteConfirmIndex}
    onChange={(index) => {
      pasteConfirmIndex = index;
    }}
    choices={[
      { label: t("paste.overwrite"), onSelect: confirmPasteOverwrite },
      { label: t("paste.skip"), onSelect: confirmPasteSkip },
      { label: t("cancel"), onSelect: cancelPasteConfirm },
    ]}
  />
</ModalShell>

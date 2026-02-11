<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";
  import ModalChoiceActions from "$lib/components/modals/ModalChoiceActions.svelte";
  import { handleChoiceModalKeydown } from "$lib/utils/modal_keyboard";

  /** @type {HTMLElement | null} */
  export let deleteModalEl = null;
  export let t;
  export let deleteTargets = [];
  export let deleteError = "";
  export let deleteConfirmIndex = 1;
  export let confirmDelete;
  export let cancelDelete;
  export let trapModalTab;
</script>

<ModalShell
  bind:modalEl={deleteModalEl}
  title={t("delete.title")}
  {trapModalTab}
  onKeydown={(event) => {
    handleChoiceModalKeydown(event, {
      choiceCount: 2,
      selectedIndex: deleteConfirmIndex,
      setSelectedIndex: (index) => {
        deleteConfirmIndex = index;
      },
      onSubmitIndex: (index) => {
        if (index === 0) {
          confirmDelete();
        } else {
          cancelDelete();
        }
      },
      onCancel: cancelDelete,
      arrowKeys: ["ArrowLeft", "ArrowRight"],
    });
  }}
>
  <div slot="body">
    {#if deleteTargets.length === 1}
      <div>{t("delete.single", { name: deleteTargets[0] })}</div>
    {:else}
      <div>{t("delete.multi", { count: deleteTargets.length })}</div>
      <ul>
        {#each deleteTargets.slice(0, 3) as item}
          <li>{item}</li>
        {/each}
        {#if deleteTargets.length > 3}
          <li>...</li>
        {/if}
      </ul>
    {/if}
    {#if deleteError}
      <div class="error">{deleteError}</div>
    {/if}
  </div>
  <ModalChoiceActions
    slot="actions"
    selectedIndex={deleteConfirmIndex}
    onChange={(index) => {
      deleteConfirmIndex = index;
    }}
    choices={[
      { label: t("delete.button"), onSelect: confirmDelete },
      { label: t("cancel"), onSelect: cancelDelete },
    ]}
  />
</ModalShell>

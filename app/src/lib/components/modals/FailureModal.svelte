<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";
  import ModalCloseActions from "$lib/components/modals/ModalCloseActions.svelte";
  import { handleConfirmCancelKeydown } from "$lib/utils/modal_keyboard";

  /** @type {HTMLElement | null} */
  export let failureModalEl = null;
  export let failureModalTitle = "";
  export let failureItems = [];
  export let failureMessage;
  export let closeFailureModal;
  export let t;
  export let trapModalTab;
</script>

<ModalShell
  bind:modalEl={failureModalEl}
  title={failureModalTitle || t("failure.title")}
  {trapModalTab}
  onKeydown={(event) => {
    handleConfirmCancelKeydown(event, {
      onConfirm: closeFailureModal,
      onCancel: closeFailureModal,
    });
  }}
>
  <div slot="body">
    <div>{t("failure.body", { count: failureItems.length })}</div>
    <ul>
      {#each failureItems.slice(0, 5) as item}
        <li>
          {item.path.split(/[\\\/]/).pop()}: {failureMessage(item)}
        </li>
      {/each}
      {#if failureItems.length > 5}
        <li>...</li>
      {/if}
    </ul>
  </div>
  <ModalCloseActions slot="actions" label={t("close")} onClose={closeFailureModal} />
</ModalShell>

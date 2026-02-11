<script>
  import ModalChoiceActions from "$lib/components/modals/ModalChoiceActions.svelte";

  export let label = "Close";
  export let onClose;
</script>

<ModalChoiceActions choices={[{ label, onSelect: onClose }]} />

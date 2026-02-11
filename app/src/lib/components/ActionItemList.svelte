<script>
  import ActionItem from "$lib/components/ActionItem.svelte";
  import Separator from "$lib/components/Separator.svelte";

  export let items = [];
  export let variant = "menu"; // "menu" | "context"
  export let activeIndex = null;
  export let getSelectableIndex;
  export let onSelect;

  const hasActive =
    typeof activeIndex === "number" && typeof getSelectableIndex === "function";
</script>

{#each items as item, index}
  {#if item.label === "-"}
    <Separator />
  {:else}
    <ActionItem
      {item}
      {onSelect}
      {variant}
      active={hasActive && getSelectableIndex(items, index) === activeIndex}
    />
  {/if}
{/each}

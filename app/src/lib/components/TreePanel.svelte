<script>
  /** @type {HTMLElement | null} */
  export let treeEl = null;
  /** @type {HTMLElement | null} */
  export let treeBodyEl = null;
  export let treeLoading = false;
  export let treeRoot = null;
  export let treeSelectedPath = "";
  export let treeFocusedIndex = 0;
  export let t;
  export let getVisibleTreeNodes;
  export let focusTree;
  export let selectTreeNode;
  export let toggleTreeNode;

  const treeRowId = (index) => `tree-row-${index}`;
</script>

<div
  class="tree-panel"
  tabindex="0"
  role="tree"
  aria-label={t("label.tree")}
  aria-activedescendant={treeFocusedIndex >= 0 ? treeRowId(treeFocusedIndex) : undefined}
  bind:this={treeEl}
>
  <div class="tree-body" role="group" bind:this={treeBodyEl}>
    {#if treeLoading}
      <div class="tree-row" role="presentation">{t("loading")}</div>
    {:else if !treeRoot}
      <div class="tree-row" role="presentation">{t("no_items")}</div>
    {:else}
      {#each getVisibleTreeNodes(treeRoot) as node, index}
        <div
          id={treeRowId(index)}
          class="tree-row {treeSelectedPath === node.path ? 'selected' : ''} {treeFocusedIndex === index ? 'focused' : ''}"
          style={`padding-left: ${node.depth * 14 + 8}px`}
          role="treeitem"
          tabindex="-1"
          aria-level={node.depth + 1}
          aria-expanded={node.children && node.children.length ? node.expanded : undefined}
          aria-selected={treeSelectedPath === node.path}
          onclick={() => {
            focusTree();
            selectTreeNode(node, index);
          }}
          onkeydown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              focusTree();
              selectTreeNode(node, index);
            }
          }}
        >
          <button
            class="tree-caret {node.expanded ? 'expanded' : ''} {node.loaded && node.children.length === 0 ? 'empty' : ''}"
            onclick={(event) => toggleTreeNode(node, index, event)}
            aria-label={node.expanded ? t("collapse") : t("expand")}
            type="button"
          >
            {node.expanded ? "▼" : "▶"}
          </button>
          <span class="tree-label">{node.name}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .tree-panel {
    width: 220px;
    min-width: 200px;
    max-width: 320px;
    border: 1px solid var(--ui-border);
    background: var(--ui-surface);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-size: 12px;
    color: var(--ui-fg);
  }

  .tree-panel:focus-visible {
    outline: 1px solid var(--ui-focused);
    outline-offset: -1px;
  }

  .tree-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 2px 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tree-body::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .tree-row {
    display: flex;
    align-items: center;
    gap: 4px;
    height: var(--list-row-height);
    padding-right: 6px;
    box-sizing: border-box;
    overflow: hidden;
    user-select: none;
    font-family: ui-monospace, "Cascadia Mono", "Consolas", "Menlo", "Monaco", "Courier New",
      monospace;
  }

  .tree-row.selected {
    background: var(--ui-selected);
  }

  .tree-panel:focus .tree-row.focused {
    outline: 1px solid var(--ui-focused);
    outline-offset: -1px;
  }

  .tree-caret {
    width: 16px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--ui-muted);
    flex: 0 0 auto;
  }

  .tree-caret.empty {
    visibility: hidden;
  }

  .tree-label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

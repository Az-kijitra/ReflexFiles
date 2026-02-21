<script>
  import { tick } from "svelte";

  /** @type {HTMLInputElement | null} */
  export let pathInputEl = null;
  export let t;
  export let pathInput = "";
  export let currentPath = "";
  export let pathHistory = [];
  export let dropdownMode = "history";
  export let dropdownOpen = false;
  export let showTree = false;
  /** @type {HTMLElement | null} */
  export let treeEl = null;
  export let loadDir;
  export let focusList;
  export let focusTreeTop;
  export let handlePathTabCompletion;
  export let setStatusMessage;
</script>

<header class="path-bar">
  <span class="label">{t("label.path")}</span>
  <form
    class="path-input"
    onsubmit={async (event) => {
      event.preventDefault();
      await loadDir(pathInput);
      await tick();
      focusList();
    }}
  >
    <input
      type="text"
      bind:value={pathInput}
      spellcheck="false"
      bind:this={pathInputEl}
      aria-label={t("label.path")}
      onkeydown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          pathInput = currentPath;
          focusList();
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (!pathHistory || pathHistory.length === 0) {
            setStatusMessage(t("no_items"));
            return;
          }
          dropdownMode = "history";
          dropdownOpen = true;
        }
        if (event.key === "Tab") {
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) {
            if (showTree && treeEl) {
              focusTreeTop();
            } else {
              focusList();
            }
          } else {
            handlePathTabCompletion(pathInput);
          }
        }
      }}
    />
  </form>
  <!-- buttons removed; use menu/shortcuts -->
</header>

<style>
  .path-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    padding: 4px 6px;
    overflow: hidden;
    color: var(--ui-fg);
  }

  .path-bar .label {
    font-weight: 600;
    font-size: 12px;
  }

  .path-input {
    flex: 1;
    min-width: 0;
  }

  .path-input input {
    width: 100%;
    padding: 4px 6px;
    border: 1px solid var(--ui-border-strong);
    border-radius: 4px;
    box-sizing: border-box;
    font-size: 12px;
    color: var(--ui-fg);
    background: var(--ui-surface-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, "Cascadia Mono", "Consolas", "Menlo", "Monaco", "Courier New",
      monospace;
  }
</style>

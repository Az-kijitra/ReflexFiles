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
  export let loadDir;
  export let focusList;
  export let handlePathTabCompletion;
  export let handlePathCompletionSeparator;
  export let handlePathCompletionInputChange;
  export let clearPathCompletionPreview;
  export let setStatusMessage;
</script>

<header class="path-bar">
  <span class="label">{t("label.path")}</span>
  <form
    class="path-input"
    onsubmit={async (event) => {
      event.preventDefault();
      clearPathCompletionPreview?.();
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
      oninput={() => {
        handlePathCompletionInputChange?.(pathInput);
      }}
      onblur={() => {
        clearPathCompletionPreview?.();
      }}
      onkeydown={async (event) => {
        const ctrlPressed = event.ctrlKey || event.getModifierState?.("Control");
        const altPressed = event.altKey || event.getModifierState?.("Alt");
        const metaPressed = event.metaKey || event.getModifierState?.("Meta");
        const isCtrlSpace =
          ctrlPressed &&
          !altPressed &&
          !metaPressed &&
          (event.code === "Space" || event.key === " " || event.key === "Spacebar");

        if (event.key === "Escape") {
          event.preventDefault();
          const completionCanceled = clearPathCompletionPreview?.();
          if (completionCanceled) {
            return;
          }
          pathInput = currentPath;
          focusList();
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (!pathHistory || pathHistory.length === 0) {
            setStatusMessage(t("no_items"));
            return;
          }
          dropdownMode = "history";
          dropdownOpen = true;
          return;
        }
        if (isCtrlSpace) {
          event.preventDefault();
          event.stopPropagation();
          const direction = event.shiftKey ? -1 : 1;
          await handlePathTabCompletion(pathInput, direction);
          return;
        }
        if (event.key === "\\" || event.key === "¥" || event.code === "Backslash") {
          event.preventDefault();
          event.stopPropagation();
          const keyForSeparator = event.key === "¥" ? "¥" : "\\";
          const consumed = await handlePathCompletionSeparator?.(pathInput, keyForSeparator);
          if (!consumed) {
            const inputEl = pathInputEl;
            const insertAt = inputEl?.selectionStart ?? pathInput.length;
            const replaceTo = inputEl?.selectionEnd ?? insertAt;
            pathInput = `${pathInput.slice(0, insertAt)}\\${pathInput.slice(replaceTo)}`;
            handlePathCompletionInputChange?.(pathInput);
            await tick();
            const cursor = insertAt + 1;
            inputEl?.setSelectionRange(cursor, cursor);
          }
          return;
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

<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";

  export let modalEl = null;
  export let trapModalTab;
  export let autofocus;
  export let t;

  export let initial = {};
  export let profiles = [];
  export let saving = false;
  export let error = "";

  export let onCancel = () => {};
  export let onSave = () => {};
  export let onOpenConfig = () => {};

  let activeSection = "general";
  let draft = {};

  $: draft = {
    ui_theme: initial.ui_theme ?? "light",
    ui_language: initial.ui_language ?? "en",
    perf_dir_stats_timeout_ms: Number(initial.perf_dir_stats_timeout_ms ?? 3000),
    external_vscode_path: initial.external_vscode_path ?? "",
    external_git_client_path: initial.external_git_client_path ?? "",
    external_terminal_profile: initial.external_terminal_profile ?? "",
    external_terminal_profile_cmd: initial.external_terminal_profile_cmd ?? "",
    external_terminal_profile_powershell: initial.external_terminal_profile_powershell ?? "",
    external_terminal_profile_wsl: initial.external_terminal_profile_wsl ?? "",
  };

  function clampTimeoutMs(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 500;
    return Math.max(500, Math.trunc(num));
  }

  function normalizeForSubmit(values) {
    return {
      ui_theme: values?.ui_theme ?? "light",
      ui_language: values?.ui_language ?? "en",
      perf_dir_stats_timeout_ms: clampTimeoutMs(values?.perf_dir_stats_timeout_ms),
      external_vscode_path: String(values?.external_vscode_path || "").trim(),
      external_git_client_path: String(values?.external_git_client_path || "").trim(),
      external_terminal_profile: String(values?.external_terminal_profile || "").trim(),
      external_terminal_profile_cmd: String(values?.external_terminal_profile_cmd || "").trim(),
      external_terminal_profile_powershell: String(
        values?.external_terminal_profile_powershell || ""
      ).trim(),
      external_terminal_profile_wsl: String(values?.external_terminal_profile_wsl || "").trim(),
    };
  }

  $: normalizedInitial = normalizeForSubmit(initial || {});
  $: normalizedDraft = normalizeForSubmit(draft || {});
  $: hasUnsavedChanges = JSON.stringify(normalizedInitial) !== JSON.stringify(normalizedDraft);

  function getUnsavedChangesLabel() {
    return normalizedDraft.ui_language === "ja"
      ? "未保存の変更があります"
      : "Unsaved changes";
  }

  function getDiscardConfirmMessage() {
    return normalizedDraft.ui_language === "ja"
      ? "未保存の変更を破棄して閉じますか？"
      : "Discard unsaved changes?";
  }

  function requestCancel() {
    if (saving) return;
    if (
      hasUnsavedChanges &&
      typeof window !== "undefined" &&
      !window.confirm(getDiscardConfirmMessage())
    ) {
      return;
    }
    onCancel?.();
  }

  function submit() {
    onSave?.(normalizedDraft);
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      requestCancel();
      return;
    }
    if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key === "Enter") {
      event.preventDefault();
      if (!saving) {
        submit();
      }
    }
  }

  const sections = [
    { id: "general", label: "settings.section.general" },
    { id: "external", label: "settings.section.external" },
    { id: "advanced", label: "settings.section.advanced" },
  ];
</script>

<ModalShell
  bind:modalEl
  title={t("settings.title")}
  modalClass="settings-modal"
  {trapModalTab}
  {autofocus}
  onKeydown={handleKeydown}
>
  <div slot="body" class="settings-layout">
    <aside class="settings-sidebar">
      {#each sections as section}
        <button
          type="button"
          class:selected={activeSection === section.id}
          onclick={() => {
            activeSection = section.id;
          }}
        >
          {t(section.label)}
        </button>
      {/each}
    </aside>

    <section class="settings-main">
      {#if activeSection === "general"}
        <h3>{t("settings.section.general")}</h3>
        <p class="settings-help">{t("settings.help.general")}</p>

        <label class="settings-row">
          <span>{t("settings.ui_theme")}</span>
          <select bind:value={draft.ui_theme}>
            <option value="light">{t("state.light")}</option>
            <option value="dark">{t("state.dark")}</option>
          </select>
          <small>{t("settings.desc.theme")}</small>
        </label>

        <label class="settings-row">
          <span>{t("settings.ui_language")}</span>
          <select bind:value={draft.ui_language}>
            <option value="en">{t("settings.language_en")}</option>
            <option value="ja">{t("settings.language_ja")}</option>
          </select>
          <small>{t("settings.desc.language")}</small>
        </label>

        <label class="settings-row">
          <span>{t("settings.dir_stats_timeout")}</span>
          <input
            type="number"
            min="500"
            step="100"
            bind:value={draft.perf_dir_stats_timeout_ms}
          />
          <small>{t("settings.desc.dir_stats_timeout")}</small>
        </label>
      {/if}

      {#if activeSection === "external"}
        <h3>{t("settings.section.external")}</h3>
        <p class="settings-help">{t("settings.help.external")}</p>

        <label class="settings-row">
          <span>{t("settings.external_terminal_profile")}</span>
          <input
            type="text"
            bind:value={draft.external_terminal_profile}
            placeholder={t("settings.placeholder.profile_default")}
          />
          <small>{t("settings.desc.external_terminal_profile")}</small>
        </label>

        <label class="settings-row">
          <span>{t("settings.external_terminal_profile_cmd")}</span>
          <input
            type="text"
            bind:value={draft.external_terminal_profile_cmd}
            placeholder={t("settings.placeholder.profile_cmd")}
          />
          <small>{t("settings.desc.external_terminal_profile_cmd")}</small>
        </label>

        <label class="settings-row">
          <span>{t("settings.external_terminal_profile_powershell")}</span>
          <input
            type="text"
            bind:value={draft.external_terminal_profile_powershell}
            placeholder={t("settings.placeholder.profile_powershell")}
          />
          <small>{t("settings.desc.external_terminal_profile_powershell")}</small>
        </label>

        <label class="settings-row">
          <span>{t("settings.external_terminal_profile_wsl")}</span>
          <input
            type="text"
            bind:value={draft.external_terminal_profile_wsl}
            placeholder={t("settings.placeholder.profile_wsl")}
          />
          <small>{t("settings.desc.external_terminal_profile_wsl")}</small>
        </label>

        <label class="settings-row">
          <span>{t("settings.external_vscode_path")}</span>
          <input type="text" bind:value={draft.external_vscode_path} />
          <small>{t("settings.desc.external_vscode_path")}</small>
        </label>

        <label class="settings-row">
          <span>{t("settings.external_git_client_path")}</span>
          <input type="text" bind:value={draft.external_git_client_path} />
          <small>{t("settings.desc.external_git_client_path")}</small>
        </label>
      {/if}

      {#if activeSection === "advanced"}
        <h3>{t("settings.section.advanced")}</h3>
        <p class="settings-help">{t("settings.help.advanced")}</p>
        <div class="settings-advanced-actions">
          <button type="button" onclick={() => onOpenConfig?.()}>
            {t("settings.open_config_file")}
          </button>
        </div>

        <div class="settings-profile-list">
          <div class="settings-profile-title">{t("settings.detected_profiles")}</div>
          {#if Array.isArray(profiles) && profiles.length > 0}
            <ul>
              {#each profiles as profile}
                <li>
                  <code>{profile.name}</code>
                  {#if profile.is_default}
                    <span class="default-badge">{t("settings.default_profile_badge")}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {:else}
            <p>{t("settings.no_profiles")}</p>
          {/if}
        </div>
      {/if}

      {#if error}
        <p class="settings-error">{error}</p>
      {/if}
    </section>
  </div>

  <div slot="actions" class="settings-actions">
    {#if hasUnsavedChanges}
      <span class="settings-unsaved">{getUnsavedChangesLabel()}</span>
    {/if}
    <button type="button" onclick={() => requestCancel()}>{t("cancel")}</button>
    <button type="button" class="primary" disabled={saving} onclick={submit}>
      {saving ? t("loading") : t("settings.save")}
    </button>
  </div>
</ModalShell>

<style>
  :global(.settings-modal) {
    width: 900px;
    max-width: 92vw;
    max-height: 86vh;
    padding: 0;
    border: 1px solid var(--ui-border-strong);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.32),
      0 14px 34px rgba(0, 0, 0, 0.38);
    overflow: hidden;
  }

  :global(.settings-modal .modal-title) {
    margin: 0;
    padding: 14px 20px;
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-surface);
  }

  :global(.settings-modal .modal-body) {
    max-height: calc(86vh - 120px);
  }

  :global(.settings-modal .modal-actions) {
    margin-top: 0;
    border-top: 1px solid var(--ui-border);
    background: var(--ui-surface);
  }

  .settings-layout {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    min-height: 520px;
  }

  .settings-sidebar {
    border-right: 1px solid var(--ui-border);
    background: var(--ui-surface-2);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .settings-sidebar button {
    text-align: left;
    padding: 8px 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ui-fg);
    cursor: pointer;
    border-radius: 3px;
  }

  .settings-sidebar button.selected {
    background: var(--ui-selected-bg);
    border-color: var(--ui-border-strong);
  }

  .settings-main {
    padding: 16px 18px;
    overflow: auto;
  }

  .settings-main h3 {
    margin: 0;
    font-size: 14px;
  }

  .settings-help {
    margin: 6px 0 14px;
    color: var(--ui-muted);
    font-size: 12px;
  }

  .settings-row {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 6px 12px;
    align-items: center;
    margin-bottom: 14px;
  }

  .settings-row > span {
    font-size: 12px;
    color: var(--ui-fg);
  }

  .settings-row > input,
  .settings-row > select {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px solid var(--ui-border-strong);
    background: var(--ui-surface);
    color: var(--ui-fg);
    border-radius: 3px;
  }

  .settings-row > small {
    grid-column: 2;
    color: var(--ui-muted);
    font-size: 11px;
    line-height: 1.3;
  }

  .settings-actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 16px 14px;
    box-sizing: border-box;
  }

  .settings-unsaved {
    margin-right: auto;
    color: var(--ui-muted);
    font-size: 12px;
  }

  .settings-actions button.primary {
    min-width: 90px;
  }

  .settings-error {
    margin: 8px 0 0;
    color: var(--ui-error);
    font-size: 12px;
  }

  .settings-advanced-actions {
    margin-bottom: 16px;
  }

  .settings-profile-list {
    border-top: 1px solid var(--ui-border);
    padding-top: 12px;
  }

  .settings-profile-title {
    font-size: 12px;
    color: var(--ui-muted);
    margin-bottom: 6px;
  }

  .settings-profile-list ul {
    margin: 0;
    padding-left: 18px;
  }

  .settings-profile-list li {
    margin-bottom: 4px;
    font-size: 12px;
  }

  .default-badge {
    display: inline-block;
    margin-left: 8px;
    padding: 1px 6px;
    font-size: 10px;
    border: 1px solid var(--ui-border-strong);
    color: var(--ui-muted);
    border-radius: 10px;
  }
</style>




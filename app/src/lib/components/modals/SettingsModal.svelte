<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";

  export let modalEl = null;
  export let trapModalTab;
  export let autofocus;
  export let t;

  export let initial = {};
  export let profiles = [];
  export let saving = false;
  export let testing = false;
  export let testMessage = "";
  export let testIsError = false;
  export let reporting = false;
  export let reportMessage = "";
  export let reportIsError = false;
  export let shortcutConflicts = [];
  export let gdriveAuthStatus = null;
  export let gdriveAuthLoading = false;
  export let gdriveAuthBusy = false;
  export let gdriveAuthError = "";
  export let gdriveAuthMessage = "";
  export let gdriveWorkcopyItems = [];
  export let gdriveWorkcopyLoading = false;
  export let gdriveWorkcopyBusy = false;
  export let gdriveWorkcopyError = "";
  export let gdriveWorkcopyMessage = "";
  export let error = "";

  export let onCancel = () => {};
  export let onSave = () => {};
  export let onOpenConfig = () => {};
  export let onBackupConfig = () => {};
  export let onRestoreConfig = () => {};
  export let onExportReport = () => {};
  export let onRunDiagnostic = () => {};
  export let onGdriveAuthRefresh = () => {};
  export let onGdriveAuthStart = () => {};
  export let onGdriveAuthComplete = () => {};
  export let onGdriveAuthSignOut = () => {};
  export let onGdriveWorkcopyRefresh = () => {};
  export let onGdriveWorkcopyDelete = () => {};
  export let onGdriveWorkcopyCleanup = () => {};

  let activeSection = "general";
  let draft = {};
  let reportOptions = {
    mask_sensitive_paths: true,
    as_zip: false,
    copy_path_to_clipboard: true,
    open_after_write: true,
  };
  let gdriveCleanupDays = 3;
  let gdriveDraft = {
    client_id: "",
    client_secret: "",
    redirect_uri: "http://127.0.0.1:45123/oauth2/callback",
    callback_url: "",
    account_id: "",
    refresh_token: "",
  };

  $: draft = {
    ui_theme: initial.ui_theme ?? "light",
    ui_language: initial.ui_language ?? "en",
    ui_file_icon_mode:
      initial.ui_file_icon_mode === "simple" || initial.ui_file_icon_mode === "none"
        ? initial.ui_file_icon_mode
        : "by_type",
    perf_dir_stats_timeout_ms: Number(initial.perf_dir_stats_timeout_ms ?? 3000),
    external_vscode_path: initial.external_vscode_path ?? "",
    external_git_client_path: initial.external_git_client_path ?? "",
    external_terminal_profile: initial.external_terminal_profile ?? "",
    external_terminal_profile_cmd: initial.external_terminal_profile_cmd ?? "",
    external_terminal_profile_powershell: initial.external_terminal_profile_powershell ?? "",
    external_terminal_profile_wsl: initial.external_terminal_profile_wsl ?? "",
  };

  $: gdriveDraft = {
    client_id: String(initial?.gdrive_oauth_client_id || ""),
    client_secret: "",
    redirect_uri:
      String(initial?.gdrive_oauth_redirect_uri || "").trim() ||
      "http://127.0.0.1:45123/oauth2/callback",
    callback_url: "",
    account_id: String(initial?.gdrive_account_id || ""),
    refresh_token: "",
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
      ui_file_icon_mode:
        values?.ui_file_icon_mode === "simple" || values?.ui_file_icon_mode === "none"
          ? values.ui_file_icon_mode
          : "by_type",
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

  function normalizeGdriveForSubmit(values) {
    const redirectUriRaw = String(
      values?.gdrive_oauth_redirect_uri ?? values?.redirect_uri ?? ""
    ).trim();
    return {
      gdrive_oauth_client_id: String(
        values?.gdrive_oauth_client_id ?? values?.client_id ?? ""
      ).trim(),
      gdrive_oauth_redirect_uri:
        redirectUriRaw || "http://127.0.0.1:45123/oauth2/callback",
      gdrive_account_id: String(values?.gdrive_account_id ?? values?.account_id ?? "").trim(),
    };
  }

  $: normalizedInitial = normalizeForSubmit(initial || {});
  $: normalizedDraft = normalizeForSubmit(draft || {});
  $: normalizedGdriveInitial = normalizeGdriveForSubmit(initial || {});
  $: normalizedGdriveDraft = normalizeGdriveForSubmit(gdriveDraft || {});
  $: hasUnsavedChanges =
    JSON.stringify(normalizedInitial) !== JSON.stringify(normalizedDraft) ||
    JSON.stringify(normalizedGdriveInitial) !== JSON.stringify(normalizedGdriveDraft);

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
    onSave?.({
      ...normalizedDraft,
      ...normalizedGdriveDraft,
    });
  }

  function runExportReport() {
    onExportReport?.({ ...reportOptions });
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

  function gdrivePhaseLabel(phase) {
    if (phase === "pending") return t("settings.gdrive.phase_pending");
    if (phase === "authorized") return t("settings.gdrive.phase_authorized");
    return t("settings.gdrive.phase_signed_out");
  }

  function gdriveScopesText(scopes) {
    if (!Array.isArray(scopes) || !scopes.length) return "-";
    return scopes.join(", ");
  }

  function gdriveBooleanLabel(value) {
    return value ? t("state.on") : t("state.off");
  }

  function gdriveBackendModeLabel(mode) {
    if (mode === "real") return t("settings.gdrive.backend_mode_real");
    return t("settings.gdrive.backend_mode_stub");
  }

  function gdriveTimeText(value) {
    const ms = Number(value ?? Number.NaN);
    if (!Number.isFinite(ms) || ms <= 0) return "-";
    try {
      return new Date(ms).toLocaleString();
    } catch {
      return String(ms);
    }
  }

  function gdriveWorkcopyStatusLabel(item) {
    if (!item?.exists) return t("settings.gdrive.workcopy.status_missing");
    if (item?.dirty) return t("settings.gdrive.workcopy.status_dirty");
    return t("settings.gdrive.workcopy.status_local");
  }

  function gdriveWorkcopyUpdatedText(item) {
    return gdriveTimeText(item?.updatedAtMs);
  }

  function gdriveWorkcopyNameText(item) {
    const name = String(item?.fileName || "").trim();
    if (name) return name;
    return String(item?.resourceId || "").trim() || "-";
  }

  function gdriveWorkcopySizeText(item) {
    const value = Number(item?.sizeBytes ?? Number.NaN);
    if (!Number.isFinite(value) || value < 0) return "-";
    return `${Math.trunc(value)} B`;
  }

  function runGdriveWorkcopyCleanup() {
    const raw = Number(gdriveCleanupDays);
    const days = Number.isFinite(raw) ? Math.max(1, Math.min(365, Math.trunc(raw))) : 3;
    gdriveCleanupDays = days;
    onGdriveWorkcopyCleanup?.(days);
  }

  $: {
    if (
      gdriveAuthStatus?.accountId &&
      !String(gdriveDraft.account_id || "").trim() &&
      typeof gdriveAuthStatus.accountId === "string"
    ) {
      gdriveDraft.account_id = gdriveAuthStatus.accountId;
    }
  }
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
          <span>{t("settings.file_icon_mode")}</span>
          <select bind:value={draft.ui_file_icon_mode}>
            <option value="by_type">{t("settings.file_icon_mode_by_type")}</option>
            <option value="simple">{t("settings.file_icon_mode_simple")}</option>
            <option value="none">{t("settings.file_icon_mode_none")}</option>
          </select>
          <small>{t("settings.desc.file_icon_mode")}</small>
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

        <div class="settings-diagnostics">
          <div class="settings-profile-title">{t("settings.external_diagnostics")}</div>
          <div class="settings-diagnostics-actions">
            <button
              type="button"
              disabled={testing}
              onclick={() => onRunDiagnostic?.("terminal", normalizedDraft)}
            >
              {t("settings.test_terminal")}
            </button>
            <button
              type="button"
              disabled={testing}
              onclick={() => onRunDiagnostic?.("vscode", normalizedDraft)}
            >
              {t("settings.test_vscode")}
            </button>
            <button
              type="button"
              disabled={testing}
              onclick={() => onRunDiagnostic?.("git", normalizedDraft)}
            >
              {t("settings.test_git_client")}
            </button>
          </div>
          {#if testing}
            <p class="settings-help">{t("settings.test_running")}</p>
          {:else if testMessage}
            <p class:test-error={testIsError} class="settings-test-message">{testMessage}</p>
          {/if}
        </div>
      {/if}

      {#if activeSection === "advanced"}
        <h3>{t("settings.section.advanced")}</h3>
        <p class="settings-help">{t("settings.help.advanced")}</p>
        <div class="settings-advanced-actions">
          <button type="button" disabled={reporting} onclick={() => onOpenConfig?.()}>
            {t("settings.open_config_file")}
          </button>
          <button type="button" disabled={reporting} onclick={() => onBackupConfig?.()}>
            {t("settings.create_backup")}
          </button>
          <button type="button" disabled={reporting} onclick={() => onRestoreConfig?.()}>
            {t("settings.restore_latest_backup")}
          </button>
          <button type="button" disabled={reporting} onclick={runExportReport}>
            {t("settings.export_diagnostic_report")}
          </button>
        </div>

        <div class="settings-report-options">
          <label>
            <input type="checkbox" bind:checked={reportOptions.mask_sensitive_paths} />
            <span>{t("settings.report_option_mask_paths")}</span>
          </label>
          <label>
            <input type="checkbox" bind:checked={reportOptions.as_zip} />
            <span>{t("settings.report_option_zip")}</span>
          </label>
          <label>
            <input type="checkbox" bind:checked={reportOptions.copy_path_to_clipboard} />
            <span>{t("settings.report_option_copy_path")}</span>
          </label>
          <label>
            <input type="checkbox" bind:checked={reportOptions.open_after_write} />
            <span>{t("settings.report_option_open_after")}</span>
          </label>
        </div>
        <p class="settings-help settings-help-compact">{t("settings.desc.export_diagnostic_report")}</p>
        {#if reporting}
          <p class="settings-help settings-help-compact">{t("settings.report_running")}</p>
        {:else if reportMessage}
          <p class:test-error={reportIsError} class="settings-test-message">{reportMessage}</p>
        {/if}

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

        <div class="settings-shortcut-conflicts">
          <div class="settings-profile-title">{t("settings.shortcut_conflicts")}</div>
          {#if Array.isArray(shortcutConflicts) && shortcutConflicts.length > 0}
            <ul>
              {#each shortcutConflicts as item}
                <li>{item}</li>
              {/each}
            </ul>
          {:else}
            <p>{t("settings.no_shortcut_conflicts")}</p>
          {/if}
        </div>

        <div class="settings-gdrive-auth">
          <div class="settings-profile-title">{t("settings.gdrive.title")}</div>
          <p class="settings-help settings-help-compact">{t("settings.gdrive.help")}</p>
          <p class="settings-help settings-help-compact">{t("settings.gdrive.persist_notice")}</p>

          <div class="settings-gdrive-grid">
            <div class="settings-gdrive-key">{t("settings.gdrive.phase")}</div>
            <div>{gdrivePhaseLabel(gdriveAuthStatus?.phase)}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.backend_mode")}</div>
            <div>{gdriveBackendModeLabel(gdriveAuthStatus?.backendMode)}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.account_id_current")}</div>
            <div>{gdriveAuthStatus?.accountId || "-"}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.granted_scopes")}</div>
            <div>{gdriveScopesText(gdriveAuthStatus?.grantedScopes)}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.write_scope")}</div>
            <div>{gdriveBooleanLabel(Boolean(gdriveAuthStatus?.hasWriteScope))}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.refresh_persisted")}</div>
            <div>{gdriveBooleanLabel(Boolean(gdriveAuthStatus?.refreshTokenPersisted))}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.access_token_expires")}</div>
            <div>{gdriveTimeText(gdriveAuthStatus?.accessTokenExpiresAtMs)}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.last_scope_insufficient")}</div>
            <div>{gdriveTimeText(gdriveAuthStatus?.lastScopeInsufficientAtMs)}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.last_write_conflict")}</div>
            <div>{gdriveTimeText(gdriveAuthStatus?.lastWriteConflictAtMs)}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.last_refresh_error")}</div>
            <div>{gdriveAuthStatus?.lastTokenRefreshError || "-"}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.last_refresh_error_at")}</div>
            <div>{gdriveTimeText(gdriveAuthStatus?.lastTokenRefreshErrorAtMs)}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.token_store")}</div>
            <div>{gdriveAuthStatus?.tokenStoreBackend || "-"}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.token_store_available")}</div>
            <div>{gdriveBooleanLabel(Boolean(gdriveAuthStatus?.tokenStoreAvailable))}</div>
            <div class="settings-gdrive-key">{t("settings.gdrive.last_error")}</div>
            <div>{gdriveAuthStatus?.lastError || "-"}</div>
          </div>

          <div class="settings-gdrive-actions">
            <button type="button" disabled={gdriveAuthLoading || gdriveAuthBusy} onclick={() => onGdriveAuthRefresh?.()}>
              {t("settings.gdrive.refresh_status")}
            </button>
            <button type="button" disabled={gdriveAuthLoading || gdriveAuthBusy} onclick={() => onGdriveAuthSignOut?.(gdriveDraft)}>
              {t("settings.gdrive.sign_out")}
            </button>
          </div>

          <label class="settings-row">
            <span>{t("settings.gdrive.client_id")}</span>
            <input
              type="text"
              bind:value={gdriveDraft.client_id}
              placeholder={t("settings.gdrive.placeholder_client_id")}
            />
            <small>{t("settings.gdrive.client_id_help")}</small>
          </label>

          <label class="settings-row">
            <span>{t("settings.gdrive.client_secret_optional")}</span>
            <input type="password" bind:value={gdriveDraft.client_secret} />
            <small>{t("settings.gdrive.client_secret_help")}</small>
          </label>

          <label class="settings-row">
            <span>{t("settings.gdrive.redirect_uri")}</span>
            <input
              type="text"
              bind:value={gdriveDraft.redirect_uri}
              placeholder={t("settings.gdrive.placeholder_redirect_uri")}
            />
            <small>{t("settings.gdrive.redirect_uri_help")}</small>
          </label>

          <div class="settings-gdrive-actions">
            <button type="button" disabled={gdriveAuthLoading || gdriveAuthBusy} onclick={() => onGdriveAuthStart?.(gdriveDraft)}>
              {t("settings.gdrive.start_sign_in")}
            </button>
          </div>

          <label class="settings-row">
            <span>{t("settings.gdrive.callback_url")}</span>
            <input
              type="text"
              bind:value={gdriveDraft.callback_url}
              placeholder={t("settings.gdrive.placeholder_callback_url")}
            />
            <small>{t("settings.gdrive.callback_url_help")}</small>
          </label>

          <label class="settings-row">
            <span>{t("settings.gdrive.account_id")}</span>
            <input
              type="text"
              bind:value={gdriveDraft.account_id}
              placeholder={t("settings.gdrive.placeholder_account_id")}
            />
            <small>{t("settings.gdrive.account_id_help")}</small>
          </label>

          <label class="settings-row">
            <span>{t("settings.gdrive.refresh_token_optional")}</span>
            <input type="password" bind:value={gdriveDraft.refresh_token} />
            <small>{t("settings.gdrive.refresh_token_help")}</small>
          </label>

          <div class="settings-gdrive-actions">
            <button type="button" disabled={gdriveAuthLoading || gdriveAuthBusy} onclick={() => onGdriveAuthComplete?.(gdriveDraft)}>
              {t("settings.gdrive.complete_sign_in")}
            </button>
          </div>

          {#if gdriveAuthLoading || gdriveAuthBusy}
            <p class="settings-help settings-help-compact">{t("settings.gdrive.busy")}</p>
          {/if}
          {#if gdriveAuthMessage}
            <p class="settings-test-message">{gdriveAuthMessage}</p>
          {/if}
          {#if gdriveAuthStatus?.backendMode === "stub"}
            <p class="settings-help settings-help-compact">{t("settings.gdrive.stub_notice")}</p>
          {/if}
          {#if gdriveAuthError}
            <p class:test-error={true} class="settings-test-message">{gdriveAuthError}</p>
          {/if}

          <div class="settings-gdrive-workcopy">
            <div class="settings-profile-title">{t("settings.gdrive.workcopy.title")}</div>
            <p class="settings-help settings-help-compact">{t("settings.gdrive.workcopy.help")}</p>

            <div class="settings-gdrive-actions">
              <button
                type="button"
                disabled={gdriveWorkcopyLoading || gdriveWorkcopyBusy}
                onclick={() => onGdriveWorkcopyRefresh?.()}
              >
                {t("settings.gdrive.workcopy.refresh")}
              </button>
              <input
                type="number"
                min="1"
                max="365"
                bind:value={gdriveCleanupDays}
                class="settings-gdrive-days-input"
              />
              <button
                type="button"
                disabled={gdriveWorkcopyLoading || gdriveWorkcopyBusy}
                onclick={runGdriveWorkcopyCleanup}
              >
                {t("settings.gdrive.workcopy.cleanup")}
              </button>
            </div>

            {#if gdriveWorkcopyLoading || gdriveWorkcopyBusy}
              <p class="settings-help settings-help-compact">{t("settings.gdrive.workcopy.busy")}</p>
            {/if}
            {#if gdriveWorkcopyMessage}
              <p class="settings-test-message">{gdriveWorkcopyMessage}</p>
            {/if}
            {#if gdriveWorkcopyError}
              <p class:test-error={true} class="settings-test-message">{gdriveWorkcopyError}</p>
            {/if}

            {#if Array.isArray(gdriveWorkcopyItems) && gdriveWorkcopyItems.length > 0}
              <div class="settings-gdrive-workcopy-list">
                {#each gdriveWorkcopyItems as item (item.resourceId)}
                  <div class="settings-gdrive-workcopy-item">
                    <div class="settings-gdrive-workcopy-main">
                      <div class="settings-gdrive-workcopy-name">{gdriveWorkcopyNameText(item)}</div>
                      <div class="settings-gdrive-workcopy-meta">
                        <span>{gdriveWorkcopyStatusLabel(item)}</span>
                        <span>{gdriveWorkcopySizeText(item)}</span>
                        <span>{gdriveWorkcopyUpdatedText(item)}</span>
                      </div>
                      <div class="settings-gdrive-workcopy-path">{item.localPath || "-"}</div>
                    </div>
                    <button
                      type="button"
                      disabled={gdriveWorkcopyLoading || gdriveWorkcopyBusy}
                      onclick={() => onGdriveWorkcopyDelete?.(item)}
                    >
                      {t("settings.gdrive.workcopy.delete")}
                    </button>
                  </div>
                {/each}
              </div>
            {:else if !gdriveWorkcopyLoading}
              <p class="settings-help settings-help-compact">{t("settings.gdrive.workcopy.empty")}</p>
            {/if}
          </div>
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
    margin-bottom: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .settings-report-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 12px;
    margin-bottom: 6px;
  }

  .settings-report-options label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--ui-fg);
  }

  .settings-report-options input[type="checkbox"] {
    margin: 0;
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

  .settings-diagnostics {
    border-top: 1px solid var(--ui-border);
    margin-top: 8px;
    padding-top: 12px;
  }

  .settings-diagnostics-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }

  .settings-test-message {
    margin: 8px 0 0;
    color: var(--ui-muted);
    font-size: 12px;
  }

  .settings-test-message.test-error {
    color: var(--ui-error);
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
  .settings-help-compact {
    margin: 4px 0 10px;
  }

  .settings-shortcut-conflicts {
    border-top: 1px solid var(--ui-border);
    margin-top: 12px;
    padding-top: 12px;
  }

  .settings-shortcut-conflicts ul {
    margin: 0;
    padding-left: 18px;
  }

  .settings-shortcut-conflicts li {
    margin-bottom: 4px;
    font-size: 12px;
  }

  .settings-gdrive-auth {
    border-top: 1px solid var(--ui-border);
    margin-top: 12px;
    padding-top: 12px;
  }

  .settings-gdrive-grid {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    gap: 4px 10px;
    font-size: 12px;
    margin-bottom: 10px;
  }

  .settings-gdrive-key {
    color: var(--ui-muted);
  }

  .settings-gdrive-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 8px 0 10px;
  }

  .settings-gdrive-workcopy {
    border-top: 1px solid var(--ui-border);
    margin-top: 12px;
    padding-top: 12px;
  }

  .settings-gdrive-days-input {
    width: 80px;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px solid var(--ui-border-strong);
    background: var(--ui-surface);
    color: var(--ui-fg);
    border-radius: 3px;
  }

  .settings-gdrive-workcopy-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 6px;
  }

  .settings-gdrive-workcopy-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    border: 1px solid var(--ui-border);
    padding: 8px;
    border-radius: 4px;
    background: var(--ui-surface-2);
  }

  .settings-gdrive-workcopy-main {
    min-width: 0;
  }

  .settings-gdrive-workcopy-name {
    font-size: 12px;
    color: var(--ui-fg);
    overflow-wrap: anywhere;
  }

  .settings-gdrive-workcopy-meta {
    display: flex;
    gap: 10px;
    margin-top: 4px;
    font-size: 11px;
    color: var(--ui-muted);
    flex-wrap: wrap;
  }

  .settings-gdrive-workcopy-path {
    margin-top: 4px;
    font-size: 11px;
    color: var(--ui-muted);
    overflow-wrap: anywhere;
  }
</style>





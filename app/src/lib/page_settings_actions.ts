/**
 * Factory for settings modal actions that have side effects
 * (invoke, state writes, focus management, etc.).
 *
 * Usage:
 *   const settingsActions = createSettingsActions({ ... });
 *   await settingsActions.openSettingsModal();
 */

import { formatError } from "$lib/utils/error_format";
import {
  buildSettingsSavePatch,
  collectSettingsShortcutConflicts,
  hasSettingsPatchChanges,
  normalizeExecutablePath,
  normalizeSettingsConfig,
  normalizeSettingsSection,
  validateSettingsDraft,
  type SettingsConfig,
} from "$lib/page_settings_logic";

// ── Deps interface ─────────────────────────────────────────────────────────────

export interface SettingsActionDeps {
  /** Read current values of the settings-local $state vars */
  getSettingsState(): {
    settingsSaving: boolean;
    settingsInitial: SettingsConfig;
  };
  /** Setters for settings-local $state vars */
  setters: {
    setSettingsOpen(v: boolean): void;
    setSettingsInitialSection(v: string): void;
    setSettingsSaving(v: boolean): void;
    setSettingsError(v: string): void;
    setSettingsTesting(v: boolean): void;
    setSettingsTestMessage(v: string): void;
    setSettingsTestIsError(v: boolean): void;
    setSettingsReporting(v: boolean): void;
    setSettingsReportMessage(v: string): void;
    setSettingsReportIsError(v: boolean): void;
    setSettingsShortcutConflicts(v: string[]): void;
    setSettingsProfiles(v: Array<{ name: string; guid: string; source: string; is_default: boolean }>): void;
    setSettingsInitial(v: SettingsConfig): void;
  };
  /** App state fields needed as fallback when config_get fails */
  getAppStateForSettingsFallback(): {
    ui_theme: string;
    ui_language: string;
    ui_file_icon_mode: string;
    dirStatsTimeoutMs: number;
  };
  /** Write through to app state fields that settings can change */
  applyStateChanges(patch: {
    ui_theme: string;
    ui_language: string;
    ui_file_icon_mode: string;
    dirStatsTimeoutMs: number;
  }): void;
  /** Current path for diagnostic tests */
  getCurrentPath(): string;
  /** Focus the file list after modal closes */
  focusList(): void;
  /** Tauri invoke */
  invoke(command: string, payload?: Record<string, unknown>): Promise<unknown>;
  /** App-level actions */
  actions: { setStatusMessage(msg: string, durationMs?: number): void };
  /** Translator */
  t(key: string, params?: Record<string, string>): string;
  /** Keymap bindings — for conflict detection */
  getActionBindings(actionId: string): string[];
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createSettingsActions(deps: SettingsActionDeps) {
  const {
    getSettingsState,
    setters,
    getAppStateForSettingsFallback,
    applyStateChanges,
    getCurrentPath,
    focusList,
    invoke,
    actions,
    t,
    getActionBindings,
  } = deps;

  async function openSettingsModal(options?: { initialSection?: string }) {
    setters.setSettingsInitialSection(normalizeSettingsSection(options?.initialSection));
    setters.setSettingsSaving(false);
    setters.setSettingsError("");
    setters.setSettingsTesting(false);
    setters.setSettingsTestMessage("");
    setters.setSettingsTestIsError(false);
    setters.setSettingsReporting(false);
    setters.setSettingsReportMessage("");
    setters.setSettingsReportIsError(false);

    try {
      const config = await invoke("config_get");
      setters.setSettingsInitial(normalizeSettingsConfig(config || {}));
    } catch (err) {
      setters.setSettingsError(formatError(err, "failed to load config", t));
      const appState = getAppStateForSettingsFallback();
      setters.setSettingsInitial(
        normalizeSettingsConfig({
          ui_theme: appState.ui_theme,
          ui_language: appState.ui_language,
          ui_file_icon_mode: appState.ui_file_icon_mode,
          perf_dir_stats_timeout_ms: appState.dirStatsTimeoutMs,
        })
      );
    }

    try {
      const profiles = await invoke("external_list_terminal_profiles");
      setters.setSettingsProfiles(Array.isArray(profiles) ? (profiles as never[]) : []);
    } catch {
      setters.setSettingsProfiles([]);
    }

    setters.setSettingsShortcutConflicts(collectSettingsShortcutConflicts(getActionBindings, t));
    setters.setSettingsOpen(true);
  }

  function closeSettingsModal() {
    if (getSettingsState().settingsSaving) return;
    setters.setSettingsOpen(false);
    setters.setSettingsError("");
    queueMicrotask(() => focusList());
  }

  async function saveSettings(values: unknown) {
    setters.setSettingsSaving(true);
    setters.setSettingsError("");

    const normalizedValues = normalizeSettingsConfig(values || {});
    const validationError = validateSettingsDraft(normalizedValues, t);
    if (validationError) {
      setters.setSettingsSaving(false);
      setters.setSettingsError(validationError);
      return;
    }

    const patch = buildSettingsSavePatch(getSettingsState().settingsInitial, normalizedValues);
    if (!hasSettingsPatchChanges(patch as Record<string, unknown>)) {
      setters.setSettingsSaving(false);
      actions.setStatusMessage(t("settings.no_changes"), 1200);
      setters.setSettingsOpen(false);
      queueMicrotask(() => focusList());
      return;
    }

    try {
      const saved = await invoke("config_save_preferences", patch as Record<string, unknown>);
      const savedConfig = normalizeSettingsConfig(saved || normalizedValues);
      setters.setSettingsInitial(savedConfig);
      applyStateChanges({
        ui_theme: savedConfig.ui_theme,
        ui_language: savedConfig.ui_language,
        ui_file_icon_mode: savedConfig.ui_file_icon_mode,
        dirStatsTimeoutMs: savedConfig.perf_dir_stats_timeout_ms,
      });
      actions.setStatusMessage(t("settings.saved"), 1500);
      setters.setSettingsOpen(false);
      setters.setSettingsError("");
      queueMicrotask(() => focusList());
    } catch (err) {
      setters.setSettingsError(formatError(err, "save failed", t));
    } finally {
      setters.setSettingsSaving(false);
    }
  }

  async function openConfigFromSettings() {
    try {
      await invoke("config_open_in_editor");
      actions.setStatusMessage(t("status.opened_config"), 1500);
    } catch (err) {
      setters.setSettingsError(
        `${t("status.open_failed")}: ${formatError(err, "unknown error", t)}`
      );
    }
  }

  async function createSettingsBackup() {
    setters.setSettingsReporting(true);
    setters.setSettingsReportMessage("");
    setters.setSettingsReportIsError(false);
    try {
      const backupPath = await invoke("config_create_backup");
      setters.setSettingsReportMessage(t("settings.backup_ok", { path: String(backupPath || "") }));
      actions.setStatusMessage(t("settings.backup_ready"), 1800);
    } catch (err) {
      setters.setSettingsReportIsError(true);
      setters.setSettingsReportMessage(
        t("settings.backup_failed", { error: formatError(err, "unknown error", t) })
      );
    } finally {
      setters.setSettingsReporting(false);
    }
  }

  async function restoreSettingsBackup() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(t("settings.restore_confirm"));
      if (!ok) return;
    }

    setters.setSettingsReporting(true);
    setters.setSettingsReportMessage("");
    setters.setSettingsReportIsError(false);
    try {
      const restored = await invoke("config_restore_latest_backup");
      const restoredConfig = normalizeSettingsConfig(restored || {});
      setters.setSettingsInitial(restoredConfig);
      applyStateChanges({
        ui_theme: restoredConfig.ui_theme,
        ui_language: restoredConfig.ui_language,
        ui_file_icon_mode: restoredConfig.ui_file_icon_mode,
        dirStatsTimeoutMs: restoredConfig.perf_dir_stats_timeout_ms,
      });
      setters.setSettingsReportMessage(t("settings.restore_ok"));
      actions.setStatusMessage(t("settings.restore_ready"), 1800);
    } catch (err) {
      setters.setSettingsReportIsError(true);
      setters.setSettingsReportMessage(
        t("settings.restore_failed", { error: formatError(err, "unknown error", t) })
      );
    } finally {
      setters.setSettingsReporting(false);
    }
  }

  async function exportDiagnosticReport(options: {
    open_after_write?: boolean;
    mask_sensitive_paths?: boolean;
    as_zip?: boolean;
    copy_path_to_clipboard?: boolean;
  }) {
    setters.setSettingsReporting(true);
    setters.setSettingsReportMessage("");
    setters.setSettingsReportIsError(false);
    try {
      const result = (await invoke("config_generate_diagnostic_report", {
        openAfterWrite: Boolean(options?.open_after_write ?? true),
        maskSensitivePaths: Boolean(options?.mask_sensitive_paths ?? true),
        asZip: Boolean(options?.as_zip ?? false),
        copyPathToClipboard: Boolean(options?.copy_path_to_clipboard ?? false),
      })) as Record<string, unknown>;
      const reportPath = String(result?.report_path || result?.reportPath || "");
      const copied = Boolean(result?.copied_to_clipboard ?? result?.copiedToClipboard ?? false);
      setters.setSettingsReportMessage(
        copied
          ? t("settings.report_ok_copied", { path: reportPath })
          : t("settings.report_ok", { path: reportPath })
      );
      actions.setStatusMessage(t("settings.report_ready"), 1800);
    } catch (err) {
      setters.setSettingsReportIsError(true);
      setters.setSettingsReportMessage(
        t("settings.report_failed", { error: formatError(err, "unknown error", t) })
      );
    } finally {
      setters.setSettingsReporting(false);
    }
  }

  async function runSettingsDiagnostic(kind: string, values: unknown) {
    setters.setSettingsTesting(true);
    setters.setSettingsTestMessage("");
    setters.setSettingsTestIsError(false);
    setters.setSettingsReporting(false);
    setters.setSettingsReportMessage("");
    setters.setSettingsReportIsError(false);

    const targetPath = String(getCurrentPath() || "").trim();
    if (!targetPath) {
      setters.setSettingsTestIsError(true);
      setters.setSettingsTestMessage(t("settings.test_path_missing"));
      setters.setSettingsTesting(false);
      return;
    }

    const v = values as Record<string, unknown> | null | undefined;
    try {
      if (kind === "terminal") {
        const profile = String(v?.external_terminal_profile || "").trim();
        if (profile) {
          await invoke("external_open_terminal_profile", { path: targetPath, profile });
        } else {
          await invoke("external_open_terminal_kind", { path: targetPath, kind: "cmd" });
        }
        setters.setSettingsTestMessage(
          t("settings.test_ok", { target: t("settings.test_terminal") })
        );
      } else if (kind === "vscode") {
        const command = normalizeExecutablePath(v?.external_vscode_path);
        if (command) {
          try {
            await invoke("external_open_custom", { command, args: [targetPath] });
          } catch {
            await invoke("external_open_vscode", { path: targetPath });
          }
        } else {
          await invoke("external_open_vscode", { path: targetPath });
        }
        setters.setSettingsTestMessage(
          t("settings.test_ok", { target: t("settings.test_vscode") })
        );
      } else if (kind === "git") {
        const command = normalizeExecutablePath(v?.external_git_client_path);
        if (command) {
          try {
            await invoke("external_open_custom", { command, args: [targetPath] });
          } catch {
            await invoke("external_open_git_client", { path: targetPath });
          }
        } else {
          await invoke("external_open_git_client", { path: targetPath });
        }
        setters.setSettingsTestMessage(
          t("settings.test_ok", { target: t("settings.test_git_client") })
        );
      } else {
        throw new Error("unknown diagnostics target");
      }
      actions.setStatusMessage(
        t("settings.test_ok", {
          target:
            kind === "terminal"
              ? t("settings.test_terminal")
              : kind === "vscode"
                ? t("settings.test_vscode")
                : t("settings.test_git_client"),
        }),
        1800
      );
    } catch (err) {
      setters.setSettingsTestIsError(true);
      setters.setSettingsTestMessage(
        t("settings.test_failed", {
          target:
            kind === "terminal"
              ? t("settings.test_terminal")
              : kind === "vscode"
                ? t("settings.test_vscode")
                : t("settings.test_git_client"),
          error: formatError(err, "unknown error", t),
        })
      );
    } finally {
      setters.setSettingsTesting(false);
    }
  }

  return {
    openSettingsModal,
    closeSettingsModal,
    saveSettings,
    openConfigFromSettings,
    createSettingsBackup,
    restoreSettingsBackup,
    exportDiagnosticReport,
    runSettingsDiagnostic,
  };
}

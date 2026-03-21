/**
 * Pure helper functions and constants for the settings modal.
 * No Svelte reactivity, no side effects — safe to import anywhere.
 */

import { normalizeKeyString } from "$lib/utils/keymap";
import { KEYMAP_ACTIONS } from "$lib/ui_constants";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SETTINGS_PATH_MAX_LEN = 1024;
export const SETTINGS_PROFILE_MAX_LEN = 256;

export const KNOWN_SHORTCUT_CONFLICTS: Record<string, string> = {
  [normalizeKeyString("Ctrl+Shift+Esc")]: "settings.shortcut_conflict_task_manager",
  [normalizeKeyString("Alt+Shift")]: "settings.shortcut_conflict_input_switch",
  [normalizeKeyString("Ctrl+Alt+ArrowUp")]: "settings.shortcut_conflict_display_driver",
  [normalizeKeyString("Ctrl+Alt+ArrowDown")]: "settings.shortcut_conflict_display_driver",
  [normalizeKeyString("Ctrl+Alt+ArrowLeft")]: "settings.shortcut_conflict_display_driver",
  [normalizeKeyString("Ctrl+Alt+ArrowRight")]: "settings.shortcut_conflict_display_driver",
};

// ── Config normalization ───────────────────────────────────────────────────────

export function normalizeSettingsConfig(config: unknown) {
  const c = config as Record<string, unknown> | null | undefined;
  return {
    ui_theme: c?.ui_theme === "dark" ? "dark" : "light",
    ui_language: c?.ui_language === "ja" ? "ja" : "en",
    ui_file_icon_mode:
      c?.ui_file_icon_mode === "simple" || c?.ui_file_icon_mode === "none"
        ? (c.ui_file_icon_mode as string)
        : "by_type",
    perf_dir_stats_timeout_ms: Math.max(500, Number(c?.perf_dir_stats_timeout_ms || 3000)),
    external_vscode_path: String(c?.external_vscode_path || ""),
    external_git_client_path: String(c?.external_git_client_path || ""),
    external_winmerge_path: String(c?.external_winmerge_path || ""),
    external_terminal_profile: String(c?.external_terminal_profile || ""),
    external_terminal_profile_cmd: String(c?.external_terminal_profile_cmd || ""),
    external_terminal_profile_powershell: String(c?.external_terminal_profile_powershell || ""),
    external_terminal_profile_wsl: String(c?.external_terminal_profile_wsl || ""),
  };
}

export type SettingsConfig = ReturnType<typeof normalizeSettingsConfig>;

// ── Diff / patch ──────────────────────────────────────────────────────────────

export function buildSettingsSavePatch(baseValues: unknown, nextValues: unknown) {
  const base = normalizeSettingsConfig(baseValues || {});
  const next = normalizeSettingsConfig(nextValues || {});
  return {
    uiTheme: base.ui_theme !== next.ui_theme ? next.ui_theme : null,
    uiLanguage: base.ui_language !== next.ui_language ? next.ui_language : null,
    uiFileIconMode: base.ui_file_icon_mode !== next.ui_file_icon_mode ? next.ui_file_icon_mode : null,
    perfDirStatsTimeoutMs:
      Number(base.perf_dir_stats_timeout_ms) !== Number(next.perf_dir_stats_timeout_ms)
        ? Number(next.perf_dir_stats_timeout_ms)
        : null,
    externalVscodePath:
      base.external_vscode_path !== next.external_vscode_path ? next.external_vscode_path : null,
    externalGitClientPath:
      base.external_git_client_path !== next.external_git_client_path
        ? next.external_git_client_path
        : null,
    externalWinmergePath:
      base.external_winmerge_path !== next.external_winmerge_path
        ? next.external_winmerge_path
        : null,
    externalTerminalProfile:
      base.external_terminal_profile !== next.external_terminal_profile
        ? next.external_terminal_profile
        : null,
    externalTerminalProfileCmd:
      base.external_terminal_profile_cmd !== next.external_terminal_profile_cmd
        ? next.external_terminal_profile_cmd
        : null,
    externalTerminalProfilePowershell:
      base.external_terminal_profile_powershell !== next.external_terminal_profile_powershell
        ? next.external_terminal_profile_powershell
        : null,
    externalTerminalProfileWsl:
      base.external_terminal_profile_wsl !== next.external_terminal_profile_wsl
        ? next.external_terminal_profile_wsl
        : null,
  };
}

export function hasSettingsPatchChanges(patch: Record<string, unknown>) {
  return Object.values(patch || {}).some((value) => value !== null && value !== undefined);
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateSettingsDraft(values: unknown, t: (key: string) => string): string {
  const v = values as Record<string, unknown> | null | undefined;

  const theme = String(v?.ui_theme || "");
  if (theme !== "light" && theme !== "dark") {
    return t("settings.validation_invalid_theme");
  }

  const language = String(v?.ui_language || "");
  if (language !== "en" && language !== "ja") {
    return t("settings.validation_invalid_language");
  }

  const iconMode = String(v?.ui_file_icon_mode || "");
  if (iconMode !== "by_type" && iconMode !== "simple" && iconMode !== "none") {
    return t("settings.validation_invalid_icon_mode");
  }

  const timeoutMs = Number(v?.perf_dir_stats_timeout_ms ?? 0);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 500 || timeoutMs > 3_600_000) {
    return t("settings.validation_timeout_range");
  }

  const pathValues = [v?.external_vscode_path, v?.external_git_client_path, v?.external_winmerge_path];
  for (const raw of pathValues) {
    const value = String(raw || "");
    if (value.length > SETTINGS_PATH_MAX_LEN) {
      return t("settings.validation_path_too_long");
    }
    if (/\r|\n/.test(value)) {
      return t("settings.validation_single_line");
    }
  }

  const profileValues = [
    v?.external_terminal_profile,
    v?.external_terminal_profile_cmd,
    v?.external_terminal_profile_powershell,
    v?.external_terminal_profile_wsl,
  ];
  for (const raw of profileValues) {
    const value = String(raw || "");
    if (value.length > SETTINGS_PROFILE_MAX_LEN) {
      return t("settings.validation_profile_too_long");
    }
    if (/\r|\n/.test(value)) {
      return t("settings.validation_single_line");
    }
  }

  return "";
}

// ── Shortcut conflict detection ───────────────────────────────────────────────

export function collectSettingsShortcutConflicts(
  getActionBindings: (actionId: string) => string[],
  t: (key: string, params?: Record<string, string>) => string
): string[] {
  const knownItems: string[] = [];
  const knownSeen = new Set<string>();
  const bindingActions = new Map<string, string[]>();

  for (const action of KEYMAP_ACTIONS) {
    const bindings = getActionBindings(action.id);
    for (const binding of bindings) {
      const normalized = normalizeKeyString(binding);
      if (!normalized) continue;

      const reasonKey = KNOWN_SHORTCUT_CONFLICTS[normalized];
      if (reasonKey) {
        const dedupeKey = `${action.id}:${normalized}:${reasonKey}`;
        if (!knownSeen.has(dedupeKey)) {
          knownSeen.add(dedupeKey);
          knownItems.push(
            t("settings.shortcut_conflict_item", {
              binding: normalized,
              action: t(action.labelKey),
              reason: t(reasonKey),
            })
          );
        }
      }

      const current = bindingActions.get(normalized) || [];
      if (!current.includes(action.id)) {
        current.push(action.id);
      }
      bindingActions.set(normalized, current);
    }
  }

  const internalItems: string[] = [];
  for (const [binding, actionIds] of bindingActions.entries()) {
    if (!Array.isArray(actionIds) || actionIds.length <= 1) continue;
    const actionLabels = actionIds
      .map((id) => {
        const meta = KEYMAP_ACTIONS.find((entry) => entry.id === id);
        return meta ? t(meta.labelKey) : id;
      })
      .join(", ");
    internalItems.push(
      t("settings.shortcut_conflict_internal_item", {
        binding,
        actions: actionLabels,
      })
    );
  }

  return [...knownItems, ...internalItems];
}

// ── Misc helpers ──────────────────────────────────────────────────────────────

export function normalizeSettingsSection(value: unknown): "general" | "external" | "advanced" {
  const section = String(value || "").trim().toLowerCase();
  if (section === "external" || section === "advanced") {
    return section;
  }
  return "general";
}

export function normalizeExecutablePath(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}

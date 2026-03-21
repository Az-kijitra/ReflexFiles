/**
 * DEV-only test hooks exposed on window.__rf_test_hooks.
 *
 * Provides a key-event dispatcher and capability/state helpers for automated
 * testing without touching the production code paths.
 *
 * Usage: $effect(createDevTestHooksEffect({ ... }))
 */

// ── Key-event helpers (pure) ──────────────────────────────────────────────────

function parseBindingToKeyboardEvent(binding: string): KeyboardEventInit | null {
  const tokens = String(binding || "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!tokens.length) return null;

  const mods = { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false };
  const keyTokens: string[] = [];
  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (normalized === "ctrl" || normalized === "control") {
      mods.ctrlKey = true;
    } else if (normalized === "shift") {
      mods.shiftKey = true;
    } else if (normalized === "alt") {
      mods.altKey = true;
    } else if (["meta", "cmd", "command", "win", "super"].includes(normalized)) {
      mods.metaKey = true;
    } else {
      keyTokens.push(token);
    }
  }
  if (!keyTokens.length) return null;

  const rawKey = keyTokens[keyTokens.length - 1];
  const lower = rawKey.toLowerCase();
  const named: Record<string, { key: string; code: string }> = {
    enter:     { key: "Enter",     code: "Enter"     },
    tab:       { key: "Tab",       code: "Tab"       },
    escape:    { key: "Escape",    code: "Escape"    },
    esc:       { key: "Escape",    code: "Escape"    },
    space:     { key: " ",         code: "Space"     },
    delete:    { key: "Delete",    code: "Delete"    },
    backspace: { key: "Backspace", code: "Backspace" },
    up:        { key: "ArrowUp",   code: "ArrowUp"   },
    down:      { key: "ArrowDown", code: "ArrowDown" },
    left:      { key: "ArrowLeft", code: "ArrowLeft" },
    right:     { key: "ArrowRight",code: "ArrowRight"},
  };
  const namedHit = named[lower];
  if (namedHit) return { ...mods, key: namedHit.key, code: namedHit.code };
  if (/^f\d{1,2}$/i.test(rawKey)) {
    const upper = rawKey.toUpperCase();
    return { ...mods, key: upper, code: upper };
  }
  if (/^[a-z]$/i.test(rawKey)) {
    const upper = rawKey.toUpperCase();
    return { ...mods, key: rawKey.toLowerCase(), code: `Key${upper}` };
  }
  if (/^[0-9]$/.test(rawKey)) {
    return { ...mods, key: rawKey, code: `Digit${rawKey}` };
  }
  return { ...mods, key: rawKey, code: rawKey };
}

function triggerBinding(binding: string): boolean {
  const init = parseBindingToKeyboardEvent(binding);
  if (!init) return false;
  const opts = { ...init, bubbles: true, cancelable: true };
  const target = document.activeElement || document.body || window;
  target.dispatchEvent(new KeyboardEvent("keydown", opts));
  window.dispatchEvent(new KeyboardEvent("keydown", opts));
  target.dispatchEvent(new KeyboardEvent("keyup",   opts));
  window.dispatchEvent(new KeyboardEvent("keyup",   opts));
  return true;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export interface DevTestHooksParams {
  getTestCapabilityOverride:  () => unknown;
  setTestCapabilityOverride:  (v: unknown) => void;
  normalizeProviderCapabilities: (v: unknown) => unknown;
  getCurrentPathCapabilities: () => unknown;
  setCurrentPathCapabilities: (v: unknown) => void;
  setCurrentPath:             (v: string) => void;
  setPathInput:               (v: string) => void;
  getStatusMessage:           () => string;
  setStatusMessage:           (v: string) => void;
  canCreateCurrentPath:       () => boolean;
  canPasteCurrentPath:        () => boolean;
  getActionBindings:          (actionId: string) => string[];
}

type RfTestHooks = ReturnType<typeof buildHooks>;
declare global { interface Window { __rf_test_hooks?: RfTestHooks; } }

function buildHooks(params: DevTestHooksParams) {
  const hooks = {
    setCurrentPathCapabilities: (value: unknown) => {
      params.setTestCapabilityOverride(value ? params.normalizeProviderCapabilities(value) : null);
      params.setCurrentPathCapabilities(params.normalizeProviderCapabilities(params.getTestCapabilityOverride()));
    },
    setCurrentPathForTest: (value: unknown) => {
      const nextPath = String(value ?? "");
      params.setCurrentPath(nextPath);
      params.setPathInput(nextPath);
    },
    getCurrentPathCapabilities: () => ({ ...params.getCurrentPathCapabilities() as object }),
    getStatusMessage:   () => String(params.getStatusMessage()),
    clearStatusMessage: () => { params.setStatusMessage(""); },
    canCreateCurrentPath: () => params.canCreateCurrentPath(),
    canPasteCurrentPath:  () => params.canPasteCurrentPath(),
    getActionBinding: (actionId: string) => {
      const bindings = params.getActionBindings(String(actionId ?? ""));
      return Array.isArray(bindings) && bindings.length > 0 ? String(bindings[0] ?? "") : "";
    },
    triggerActionShortcut: (actionId: string) => {
      const binding = hooks.getActionBinding(actionId);
      if (!binding) return false;
      return triggerBinding(binding);
    },
  };
  return hooks;
}

/**
 * Returns an $effect body that installs window.__rf_test_hooks in DEV and
 * removes it on cleanup.
 */
export function createDevTestHooksEffect(params: DevTestHooksParams): () => (() => void) | void {
  return () => {
    if (typeof window === "undefined" || !import.meta.env.DEV) return;
    const hooks = buildHooks(params);
    window.__rf_test_hooks = hooks;
    return () => {
      if (window.__rf_test_hooks === hooks) delete window.__rf_test_hooks;
    };
  };
}

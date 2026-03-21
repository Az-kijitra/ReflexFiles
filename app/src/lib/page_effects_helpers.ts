/**
 * Reusable $effect body factories for common async patterns in +page.svelte.
 * Each factory returns a function suitable for direct use as a Svelte $effect body.
 */

import { normalizeProviderCapabilities } from "./page_helpers";

// ── Provider capability fetcher ───────────────────────────────────────────────

export interface CapabilityFetcherParams {
  /** Reads the pane's current path from reactive state (triggers $effect re-run). */
  getPath: () => string;
  /** Async function that fetches raw provider capabilities for the given path. */
  fetch: (path: string) => Promise<unknown>;
  /** Called with the normalized result once the fetch completes or on error/empty. */
  setCapabilities: (value: ReturnType<typeof normalizeProviderCapabilities>) => void;
}

/**
 * Returns a Svelte `$effect` body that fetches provider capabilities (copy/move/delete
 * support) asynchronously whenever the current path changes.
 * Stale responses are discarded via a cancellation flag.
 */
export function createCapabilityFetcher(
  params: CapabilityFetcherParams
): () => (() => void) | void {
  return () => {
    const path = String(params.getPath() || "").trim();
    if (!path) {
      params.setCapabilities(normalizeProviderCapabilities(null));
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const caps = await params.fetch(path);
        if (!cancelled && String(params.getPath() || "").trim() === path) {
          params.setCapabilities(normalizeProviderCapabilities(caps));
        }
      } catch {
        if (!cancelled && String(params.getPath() || "").trim() === path) {
          params.setCapabilities(normalizeProviderCapabilities(null));
        }
      }
    })();

    return () => { cancelled = true; };
  };
}

// ── Git status refresher ──────────────────────────────────────────────────────

export interface GitStatusEffectParams {
  /** Reads the pane's current path from reactive state (triggers $effect re-run). */
  getPath: () => string;
  /** Called immediately when the path becomes empty to clear stale status. */
  clearStatus: () => void;
  /** Triggers an async git status refresh for the given path. */
  refresh: (path: string) => void;
}

/**
 * Returns a Svelte `$effect` body that refreshes git status whenever
 * the current path changes. Clears status immediately when the path is empty.
 */
export function createGitStatusEffect(
  params: GitStatusEffectParams
): () => void {
  return () => {
    const path = params.getPath();
    if (!path) { params.clearStatus(); return; }
    params.refresh(path);
  };
}

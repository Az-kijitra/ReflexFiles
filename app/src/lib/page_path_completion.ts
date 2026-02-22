/**
 * @param {object} params
 * @param {() => string} params.getCurrentPath
 * @param {(command: string, payload?: Record<string, unknown>) => Promise<unknown>} params.invoke
 * @param {() => boolean} params.getShowHidden
 * @param {() => unknown[]} params.getEntries
 * @param {(value: string) => void} params.setPathInput
 * @param {(value: unknown[]) => void} params.setFilteredEntries
 * @param {(value: boolean) => void} params.setPathCompletionPreviewActive
 * @param {() => string} [params.getStatusMessage]
 * @param {() => (() => void) | null | undefined} params.getRecomputeSearch
 * @param {() => (message: string, timeoutMs?: number) => void} params.getSetStatusMessage
 * @param {() => (err: unknown) => void} params.getShowError
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(path: string) => string} params.treeNodeName
 */
export function createPathCompletionHelpers(params) {
  const {
    getCurrentPath,
    invoke,
    getShowHidden,
    getEntries,
    setPathInput,
    setFilteredEntries,
    setPathCompletionPreviewActive,
    getStatusMessage,
    getRecomputeSearch,
    getSetStatusMessage,
    getShowError,
    t,
    treeNodeName,
  } = params;
  const PATH_COMPLETION_STATUS_STICKY_MS = 0;
  /** @type {{ baseInput: string; parent: string; prefix: string; matches: any[]; index: number } | null} */
  let completionSession = null;
  let ignoreNextInputChange = false;
  let completionStatusMessage = "";
  /** @type {ReturnType<typeof setInterval> | null} */
  let completionStatusRefreshTimer = null;

  /**
   * @param {string} parent
   * @param {string} name
   */
  function joinPath(parent, name) {
    if (!parent) return name;
    if (parent.endsWith("\\") || parent.endsWith("/")) return `${parent}${name}`;
    return `${parent}\\${name}`;
  }

  /** @param {string} value */
  function isAbsolutePath(value) {
    return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\");
  }

  /** @param {string} value */
  function normalizePathValue(value) {
    return String(value || "").replace(/\//g, "\\").toLowerCase();
  }

  /** @param {string} value */
  function isGdrivePath(value) {
    return String(value || "").trim().toLowerCase().startsWith("gdrive://");
  }

  function restoreDefaultListView() {
    const recompute = getRecomputeSearch?.();
    if (typeof recompute === "function") {
      recompute();
      return;
    }
    setFilteredEntries(getEntries() || []);
  }

  function clearCompletionSession() {
    completionSession = null;
    restoreDefaultListView();
    setPathCompletionPreviewActive(false);
    stopCompletionStatusRefresh();
    clearCompletionStatusIfOwned();
  }

  /** @param {any[]} matches */
  function setPreviewEntries(matches) {
    setFilteredEntries(matches || []);
  }

  /**
   * @param {string} path
   */
  function applyPathInput(path) {
    ignoreNextInputChange = true;
    setPathInput(path);
  }

  /**
   * @param {number} count
   * @param {number} indexOneBased
   * @param {number} total
   */
  function setCandidateCycleStatus(count, indexOneBased, total) {
    setCompletionStatus(t("status.path_completion_candidates_cycle", {
      count,
      index: indexOneBased,
      total,
    }));
  }

  /** @param {number} count */
  function setCandidateCountStatus(count) {
    setCompletionStatus(t("status.path_completion_candidates", { count }));
  }

  /** @param {string} message */
  function setCompletionStatus(message) {
    completionStatusMessage = String(message || "");
    getSetStatusMessage()(completionStatusMessage, PATH_COMPLETION_STATUS_STICKY_MS);
    startCompletionStatusRefresh();
  }

  function clearCompletionStatusIfOwned() {
    if (!completionStatusMessage) return;
    const latest = typeof getStatusMessage === "function" ? String(getStatusMessage() || "") : completionStatusMessage;
    if (latest === completionStatusMessage) {
      getSetStatusMessage()("", PATH_COMPLETION_STATUS_STICKY_MS);
    }
    completionStatusMessage = "";
  }

  function stopCompletionStatusRefresh() {
    if (!completionStatusRefreshTimer) return;
    clearInterval(completionStatusRefreshTimer);
    completionStatusRefreshTimer = null;
  }

  function startCompletionStatusRefresh() {
    if (completionStatusRefreshTimer) return;
    completionStatusRefreshTimer = setInterval(() => {
      if (!completionSession || !completionStatusMessage) {
        stopCompletionStatusRefresh();
        return;
      }
      const latest = typeof getStatusMessage === "function" ? String(getStatusMessage() || "") : "";
      if (latest === completionStatusMessage) return;
      getSetStatusMessage()(completionStatusMessage, PATH_COMPLETION_STATUS_STICKY_MS);
    }, 300);
  }

  /**
   * @param {any} entry
   */
  function entryName(entry) {
    const rawName = String(entry?.name || "").trim();
    if (rawName) return rawName;
    return String(treeNodeName(entry?.path || "") || "").trim();
  }

  /**
   * @param {any} a
   * @param {any} b
   */
  function compareEntryByNameAsc(a, b) {
    const nameA = entryName(a).toLowerCase();
    const nameB = entryName(b).toLowerCase();
    const byName = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    if (byName !== 0) return byName;
    return String(a?.path || "").toLowerCase().localeCompare(String(b?.path || "").toLowerCase());
  }

  /**
   * @param {string} raw
   * @returns {{ parent: string, prefix: string } | null}
   */
  function getPathCompletionContext(raw) {
    const trimmed = (raw || "").trim();
    if (!trimmed) return null;
    const currentPath = getCurrentPath();
    const absolute = isAbsolutePath(trimmed) ? trimmed : currentPath ? joinPath(currentPath, trimmed) : "";
    if (!absolute) return null;
    if (isGdrivePath(absolute)) return null;
    const endsWithSep = /[\\\/]+$/.test(absolute);
    if (endsWithSep) {
      let parent = absolute.replace(/[\\\/]+$/, "");
      if (/^[A-Za-z]:$/.test(parent)) parent = `${parent}\\`;
      return { parent, prefix: "" };
    }
    const lastSlash = Math.max(absolute.lastIndexOf("\\"), absolute.lastIndexOf("/"));
    if (lastSlash === -1) {
      let parent = absolute;
      if (/^[A-Za-z]:$/.test(parent)) parent = `${parent}\\`;
      return { parent, prefix: "" };
    }
    let parent = absolute.slice(0, lastSlash);
    const prefix = absolute.slice(lastSlash + 1);
    if (/^[A-Za-z]:$/.test(parent)) parent = `${parent}\\`;
    return { parent, prefix };
  }

  /**
   * @param {string[]} values
   */
  function commonPrefixCaseInsensitive(values) {
    if (!values.length) return "";
    let prefix = values[0];
    for (const value of values.slice(1)) {
      while (prefix && !value.toLowerCase().startsWith(prefix.toLowerCase())) {
        prefix = prefix.slice(0, -1);
      }
      if (!prefix) break;
    }
    return prefix;
  }

  function getSelectedCompletionEntry() {
    if (!completionSession) return null;
    const idx = completionSession.index;
    if (idx < 0 || idx >= completionSession.matches.length) return null;
    return completionSession.matches[idx];
  }

  function advanceCompletionSession() {
    if (!completionSession || !completionSession.matches.length) return false;
    const total = completionSession.matches.length;
    const next = completionSession.index < 0 ? 0 : (completionSession.index + 1) % total;
    completionSession.index = next;
    const nextEntry = completionSession.matches[next];
    applyPathInput(nextEntry.path);
    setPreviewEntries(completionSession.matches);
    setCandidateCycleStatus(total, next + 1, total);
    return true;
  }

  /**
   * @param {{ parent: string; prefix: string }} context
   */
  async function resolveMatches(context) {
    if (!context?.parent) return [];
    const items = await invoke("fs_list_dir", {
      path: context.parent,
      showHidden: getShowHidden(),
      sortKey: "name",
      sortOrder: "asc",
    });
    const lowerPrefix = String(context.prefix || "").toLowerCase();
    return (items || []).filter((entry) => {
      if (!entry) return false;
      if (entry.type !== "dir") return false;
      if (!getShowHidden() && entry.hidden) return false;
      const name = entryName(entry);
      if (!name) return false;
      return name.toLowerCase().startsWith(lowerPrefix);
    }).sort(compareEntryByNameAsc);
  }

  /**
   * @param {string} rawInput
   * @param {{ parent: string; prefix: string }} context
   * @param {any[]} matches
   * @param {{ selectFirst: boolean }} options
   */
  function startCompletionSession(rawInput, context, matches, options) {
    const selectFirst = Boolean(options?.selectFirst);
    completionSession = {
      baseInput: rawInput,
      parent: context.parent,
      prefix: context.prefix,
      matches,
      index: selectFirst ? 0 : -1,
    };
    setPreviewEntries(matches);
    setPathCompletionPreviewActive(true);
    if (selectFirst) {
      applyPathInput(matches[0].path);
      setCandidateCycleStatus(matches.length, 1, matches.length);
    } else {
      setCandidateCountStatus(matches.length);
    }
  }

  async function handlePathTabCompletion(pathInput) {
    if (advanceCompletionSession()) return;
    const rawInput = String(pathInput || "");
    const trimmed = rawInput.trim();
    if (isGdrivePath(trimmed) || (!isAbsolutePath(trimmed) && isGdrivePath(getCurrentPath()))) {
      clearCompletionSession();
      getSetStatusMessage()(t("status.path_completion_local_only"));
      return;
    }
    const context = getPathCompletionContext(rawInput);
    if (!context || !context.parent) {
      clearCompletionSession();
      return;
    }
    if (isGdrivePath(context.parent)) {
      clearCompletionSession();
      getSetStatusMessage()(t("status.path_completion_local_only"));
      return;
    }
    try {
      const matches = await resolveMatches(context);
      if (!matches.length) {
        clearCompletionSession();
        getSetStatusMessage()(t("no_items"));
        return;
      }
      if (matches.length === 1) {
        clearCompletionSession();
        applyPathInput(matches[0].path);
        return;
      }
      startCompletionSession(rawInput, context, matches, { selectFirst: true });
    } catch (err) {
      clearCompletionSession();
      getShowError()(err);
    }
  }

  /**
   * @param {string} pathInput
   * @param {string} key
   */
  async function handlePathCompletionSeparator(pathInput, key) {
    if (key !== "\\" && key !== "¥") return false;
    const selected = getSelectedCompletionEntry();
    if (!selected || selected.type !== "dir") return false;

    const nextBase = /[\\\/]+$/.test(selected.path) ? selected.path : `${selected.path}\\`;
    applyPathInput(nextBase);
    completionSession = null;
    try {
      const context = getPathCompletionContext(nextBase);
      if (!context || !context.parent) {
        clearCompletionSession();
        return true;
      }
      const matches = await resolveMatches(context);
      if (!matches.length) {
        clearCompletionSession();
        getSetStatusMessage()(t("no_items"));
        return true;
      }
      startCompletionSession(nextBase, context, matches, { selectFirst: false });
      return true;
    } catch (err) {
      clearCompletionSession();
      getShowError()(err);
      return true;
    }
  }

  /**
   * @param {string} pathInput
   */
  function handlePathCompletionInputChange(pathInput) {
    if (ignoreNextInputChange) {
      ignoreNextInputChange = false;
      return;
    }
    if (!completionSession) return;
    const currentCandidate = getSelectedCompletionEntry();
    const normalizedInput = normalizePathValue(pathInput);
    if (currentCandidate && normalizedInput === normalizePathValue(currentCandidate.path)) {
      return;
    }
    clearCompletionSession();
  }

  function clearPathCompletionPreview() {
    if (!completionSession) return;
    clearCompletionSession();
  }

  return {
    handlePathTabCompletion,
    handlePathCompletionSeparator,
    handlePathCompletionInputChange,
    clearPathCompletionPreview,
  };
}

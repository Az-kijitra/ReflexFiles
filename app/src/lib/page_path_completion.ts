/**
 * @param {object} params
 * @param {() => string} params.getCurrentPath
 * @param {(command: string, payload?: Record<string, unknown>) => Promise<unknown>} params.invoke
 * @param {() => boolean} params.getShowHidden
 * @param {(value: string) => void} params.setPathInput
 * @param {() => (message: string) => void} params.getSetStatusMessage
 * @param {() => (err: unknown) => void} params.getShowError
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(path: string) => string} params.treeNodeName
 */
export function createPathCompletionHelpers(params) {
  const {
    getCurrentPath,
    invoke,
    getShowHidden,
    setPathInput,
    getSetStatusMessage,
    getShowError,
    t,
    treeNodeName,
  } = params;

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

  /**
   * @param {string} raw
   * @returns {{ parent: string, prefix: string } | null}
   */
  function getPathCompletionContext(raw) {
    const trimmed = (raw || "").trim();
    if (!trimmed) return null;
    const absolute = isAbsolutePath(trimmed)
      ? trimmed
      : getCurrentPath()
        ? joinPath(getCurrentPath(), trimmed)
        : "";
    if (!absolute) return null;
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

  async function handlePathTabCompletion(pathInput) {
    const context = getPathCompletionContext(pathInput);
    if (!context) return;
    const { parent, prefix } = context;
    if (!parent) return;
    try {
      const items = await invoke("fs_list_dir", {
        path: parent,
        showHidden: getShowHidden(),
        sortKey: "name",
        sortOrder: "asc",
      });
      const candidates = items
        .filter((entry) => entry.type === "dir" && (getShowHidden() || !entry.hidden))
        .map((entry) => entry.name || treeNodeName(entry.path));
      const lowerPrefix = prefix.toLowerCase();
      const matches = candidates.filter((name) => name.toLowerCase().startsWith(lowerPrefix));
      if (matches.length === 0) {
        getSetStatusMessage()(t("no_items"));
        return;
      }
      if (matches.length === 1) {
        setPathInput(joinPath(parent, matches[0]));
        return;
      }
      const common = commonPrefixCaseInsensitive(matches);
      if (common.length > prefix.length) {
        setPathInput(joinPath(parent, common));
      }
    } catch (err) {
      getShowError()(err);
    }
  }

  return {
    handlePathTabCompletion,
  };
}

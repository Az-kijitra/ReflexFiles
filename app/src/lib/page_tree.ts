// ── Module-level helpers (no closure deps) ──────────────────────────────────

/** Extract the filesystem root from a path.
 *  "C:\Users\..." → "C:\"   "/home/user" → "/"   "\\srv\share\x" → "\\srv\share\" */
function getRootPath(path: string): string {
  if (!path) return "";
  const winDrive = path.match(/^([A-Za-z]:[\\\/])/);
  if (winDrive) return winDrive[1].replace(/\//g, "\\");
  const unc = path.match(/^(\\\\[^\\\/]+[\\\/][^\\\/]+)/);
  if (unc) return unc[1] + "\\";
  if (path.startsWith("/")) return "/";
  return path;
}

/** True when parentPath is an ancestor of (or equal to) childPath. */
function isAncestorOrEqual(parentPath: string, childPath: string): boolean {
  if (!parentPath || !childPath) return false;
  const norm = (p: string) => p.replace(/[\\\/]+$/, "").toLowerCase();
  const p = norm(parentPath);
  const c = norm(childPath);
  return c === p || c.startsWith(p + "\\") || c.startsWith(p + "/");
}

// ── createTreeHelpers ────────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {(command: string, payload?: Record<string, unknown>) => Promise<unknown>} params.invoke
 * @param {() => boolean} params.getShowHidden
 * @param {(err: unknown) => void} params.showError
 * @param {(entry: { path: string }, depth: number, hidden: boolean) => import("$lib/utils/tree").TreeNode} params.createTreeNode
 * @param {(err: unknown) => boolean} params.isTreeListIgnorableError
 * @param {number} params.autoExpandDepth
 * @param {number} [params.autoExpandEntryLimit]
 * @param {() => unknown} [params.getTreeRoot]
 * @param {(value: unknown) => void} params.setTreeRoot
 * @param {(value: string) => void} params.setTreeSelectedPath
 * @param {(value: number) => void} params.setTreeFocusedIndex
 * @param {() => HTMLElement | null} params.getTreeBodyEl
 * @param {(el: HTMLElement | null, index: number) => void} params.scrollTreeToFocus
 * @param {() => string} params.getCurrentPath
 * @param {() => (path: string) => Promise<void>} params.getLoadDir
 * @param {(value: boolean) => void} params.setTreeLoading
 * @param {(event: KeyboardEvent, args: object) => unknown} params.handleTreeKeyUtil
 * @param {(event: KeyboardEvent, actionId: import("$lib/ui_types").ActionId) => boolean} params.matchesAction
 * @param {() => number} params.getTreeFocusedIndex
 * @param {() => HTMLElement | null} params.getTreeEl
 * @param {() => unknown} params.getTreeRootSafe
 * @param {(node: any) => void} [params.onToggleExpanded]
 * @param {() => number} params.getTreePageStep
 * @param {(nodes: any[], targetPath: string) => number} params.findTreeParentIndex
 * @param {(root: any) => any[]} params.getVisibleTreeNodes
 */
export function createTreeHelpers(params) {
  const {
    invoke,
    getShowHidden,
    showError,
    createTreeNode,
    isTreeListIgnorableError,
    autoExpandDepth,
    autoExpandEntryLimit = 1000,
    getTreeRoot,
    setTreeRoot,
    setTreeSelectedPath,
    setTreeFocusedIndex,
    getTreeBodyEl,
    scrollTreeToFocus,
    getCurrentPath,
    getLoadDir,
    setTreeLoading,
    handleTreeKeyUtil,
    matchesAction,
    getTreeFocusedIndex,
    getTreeEl,
    getTreeRootSafe,
    getTreePageStep,
    findTreeParentIndex,
    getVisibleTreeNodes,
  } = params;

  const resolveTreeRoot = () =>
    typeof getTreeRoot === "function" ? getTreeRoot() : getTreeRootSafe();

  const refreshTreeRoot = () => {
    const root = resolveTreeRoot();
    if (root) {
      setTreeRoot({ ...root });
    }
  };

  /**
   * @param {any} node
   * @param {number} depth
   * @param {boolean} autoExpand
   */
  async function expandTreeNode(node, depth, autoExpand) {
    if (node.loading) return;
    if (!node.loaded) {
      node.loading = true;
      try {
        const items = await invoke("fs_list_dir", {
          path: node.path,
          showHidden: getShowHidden(),
          sortKey: "name",
          sortOrder: "asc",
        });
        node.children = items
          .filter((entry) => {
            const entryType = entry?.type ?? entry?.entry_type;
            const hidden = !!entry?.hidden;
            return entryType === "dir" && (getShowHidden() || !hidden);
          })
          .map((entry) => createTreeNode(entry.path, depth + 1, !!entry.hidden));
        node.autoExpandBlocked = Array.isArray(items) && items.length > autoExpandEntryLimit;
        node.loaded = true;
      } catch (err) {
        node.loaded = true;
        node.children = [];
        node.expanded = false;
        if (!isTreeListIgnorableError(err)) {
          showError(err);
        }
      } finally {
        node.loading = false;
        refreshTreeRoot();
      }
    }
    node.expanded = true;
    refreshTreeRoot();
    const allowAutoExpand =
      autoExpand && depth + 1 < autoExpandDepth && !node.autoExpandBlocked;
    if (allowAutoExpand) {
      for (const child of node.children) {
        if (child.hidden) continue;
        await expandTreeNode(child, depth + 1, true);
      }
    }
  }

  /**
   * Expand every ancestor of targetPath in the tree so that targetPath becomes
   * visible, then return its index in getVisibleTreeNodes(root).
   * Returns -1 if the path could not be located (e.g. filtered / hidden).
   *
   * @param {any} root
   * @param {string} targetPath
   */
  async function expandToPath(root, targetPath) {
    if (!root || !targetPath) return -1;
    const norm = (p: string) => p.replace(/[\\\/]+$/, "").toLowerCase();
    const normRoot = norm(root.path);
    const normTarget = norm(targetPath);
    if (normRoot === normTarget) {
      // Root IS the target – just make sure it's loaded
      if (!root.loaded) await expandTreeNode(root, root.depth, false);
      return 0;
    }
    if (!isAncestorOrEqual(root.path, targetPath)) return -1;

    const sep = targetPath.includes("\\") ? "\\" : "/";
    const rootBase = root.path.replace(/[\\\/]+$/, "");
    const relative = targetPath.substring(rootBase.length).replace(/^[\\\/]+/, "");
    if (!relative) return 0;

    const parts = relative.split(/[\\\/]/).filter(Boolean);
    let currentNode = root;

    // Ensure root is loaded/expanded
    if (!currentNode.loaded || !currentNode.expanded) {
      await expandTreeNode(currentNode, currentNode.depth, false);
    }

    for (let i = 0; i < parts.length; i++) {
      const expectedPath = norm(currentNode.path.replace(/[\\\/]+$/, "") + sep + parts[i]);
      const child = currentNode.children.find((c) => norm(c.path) === expectedPath);
      if (!child) break; // Hidden / filtered – stop here but don't fail

      currentNode = child;

      // Expand all but the final segment so its children are visible
      if (i < parts.length - 1) {
        if (!currentNode.loaded || !currentNode.expanded) {
          await expandTreeNode(currentNode, currentNode.depth, false);
        }
      }
    }

    refreshTreeRoot();
    const nodes = getVisibleTreeNodes(resolveTreeRoot());
    return nodes.findIndex((n) => norm(n.path) === normTarget);
  }

  /**
   * Navigate the tree to `path`.
   *
   * • If the current tree root already covers `path` (same drive/mount):
   *   expand the path in-place and highlight it — NO full rebuild.
   * • Otherwise (different drive, or no tree yet):
   *   build a fresh tree rooted at the filesystem root of `path`.
   *
   * @param {string} path
   */
  async function buildTreeRoot(path) {
    if (!path) {
      setTreeRoot(null);
      setTreeSelectedPath("");
      setTreeFocusedIndex(0);
      return;
    }

    const currentRoot = resolveTreeRoot();

    // ── Fast path: reuse existing tree ──────────────────────────────────────
    if (currentRoot && isAncestorOrEqual(currentRoot.path, path)) {
      setTreeSelectedPath(path);
      const idx = await expandToPath(currentRoot, path);
      if (idx >= 0) {
        setTreeFocusedIndex(idx);
        scrollTreeToFocus(getTreeBodyEl(), idx);
      }
      refreshTreeRoot();
      return;
    }

    // ── Slow path: build from filesystem root ────────────────────────────────
    const rootPath = getRootPath(path);
    setTreeLoading(true);
    const root = createTreeNode(rootPath, 0, false);
    root.expanded = true;
    setTreeRoot(root);
    setTreeSelectedPath(path);
    setTreeFocusedIndex(0);
    try {
      const idx = await expandToPath(root, path);
      if (idx >= 0) {
        setTreeFocusedIndex(idx);
        scrollTreeToFocus(getTreeBodyEl(), idx);
      }
      refreshTreeRoot();
    } finally {
      setTreeLoading(false);
    }
  }

  /**
   * @param {any} node
   * @param {number} index
   */
  function selectTreeNode(node, index) {
    setTreeFocusedIndex(index);
    setTreeSelectedPath(node.path);
    scrollTreeToFocus(getTreeBodyEl(), index);
    if (node.path !== getCurrentPath()) {
      getLoadDir()(node.path);
    }
  }

  /**
   * @param {any} node
   * @param {number} index
   * @param {MouseEvent} [event]
   */
  function toggleTreeNode(node, index, event) {
    event?.stopPropagation();
    setTreeFocusedIndex(index);
    if (node.expanded) {
      node.expanded = false;
      refreshTreeRoot();
      return;
    }
    expandTreeNode(node, node.depth, false);
  }

  /** @param {KeyboardEvent} event */
  function handleTreeKey(event) {
    return handleTreeKeyUtil(event, {
      treeRoot: getTreeRootSafe(),
      treeFocusedIndex: getTreeFocusedIndex(),
      treeBodyEl: getTreeBodyEl(),
      matchesAction,
      findTreeParentIndex,
      getTreePageStep,
      scrollTreeToFocus,
      expandTreeNode,
      selectTreeNode,
      setTreeFocusedIndex,
    });
  }

  return {
    expandTreeNode,
    buildTreeRoot,
    selectTreeNode,
    toggleTreeNode,
    handleTreeKey,
  };
}

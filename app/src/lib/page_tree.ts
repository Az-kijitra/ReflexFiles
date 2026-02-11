/**
 * @param {object} params
 * @param {(command: string, payload?: Record<string, unknown>) => Promise<unknown>} params.invoke
 * @param {() => boolean} params.getShowHidden
 * @param {(err: unknown) => void} params.showError
 * @param {(entry: { path: string }, depth: number, hidden: boolean) => import("$lib/utils/tree").TreeNode} params.createTreeNode
 * @param {(err: unknown) => boolean} params.isTreeListIgnorableError
 * @param {number} params.autoExpandDepth
 * @param {number} params.autoExpandEntryLimit
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
 * @param {(node: any) => void} params.onToggleExpanded
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
    autoExpandEntryLimit,
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

  /** @param {string} path */
  async function buildTreeRoot(path) {
    if (!path) {
      setTreeRoot(null);
      setTreeSelectedPath("");
      setTreeFocusedIndex(0);
      return;
    }
    setTreeLoading(true);
    const root = createTreeNode(path, 0, false);
    root.expanded = true;
    setTreeRoot(root);
    setTreeSelectedPath(path);
    setTreeFocusedIndex(0);
    try {
      await expandTreeNode(root, 0, true);
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

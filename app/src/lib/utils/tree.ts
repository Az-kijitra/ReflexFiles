/**
 * @param {string} value
 */
export function treeNodeName(value) {
  if (!value) return "";
  const trimmed = value.replace(/[\\\/]+$/, "");
  const parts = trimmed.split(/[\\\/]/);
  const last = parts[parts.length - 1];
  return last || trimmed;
}

/** @param {unknown} err */
export function isTreeListIgnorableError(err) {
  const msg = String(err || "").toLowerCase();
  return (
    msg.includes("access is denied") ||
    msg.includes("access denied") ||
    msg.includes("os error 5") ||
    msg.includes("アクセスが拒否") ||
    msg.includes("not found") ||
    msg.includes("os error 2") ||
    msg.includes("ファイルが見つかりません")
  );
}

/**
 * @param {string} path
 * @param {number} depth
 * @param {boolean} hidden
 * @returns {import("$lib/types").TreeNode}
 */
export function createTreeNode(path, depth, hidden = false) {
  return {
    path,
    name: treeNodeName(path),
    depth,
    hidden,
    expanded: false,
    loaded: false,
    loading: false,
    children: [],
  };
}

/**
 * @param {import("$lib/types").TreeNode | null} root
 * @returns {import("$lib/types").TreeNode[]}
 */
export function getVisibleTreeNodes(root) {
  if (!root) return [];
  /** @type {import("$lib/types").TreeNode[]} */
  const out = [];
  const walk = (node) => {
    out.push(node);
    if (node.expanded && node.children.length) {
      node.children.forEach(walk);
    }
  };
  walk(root);
  return out;
}

/**
 * @param {import("$lib/types").TreeNode[]} nodes
 * @param {number} index
 */
export function findTreeParentIndex(nodes, index) {
  const current = nodes[index];
  if (!current) return -1;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (nodes[i].depth < current.depth) return i;
  }
  return -1;
}

/**
 * @param {HTMLElement | null} treeBodyEl
 * @param {number} focusedIndex
 */
export function scrollTreeToFocus(treeBodyEl: HTMLElement | null, focusedIndex: number) {
  if (!treeBodyEl) return;
  const rows = Array.from(treeBodyEl.querySelectorAll<HTMLElement>(".tree-row"));
  const row = rows[focusedIndex];
  if (row) {
    row.scrollIntoView({ block: "nearest" });
  }
}

/**
 * @param {HTMLElement | null} treeBodyEl
 */
export function getTreePageStep(treeBodyEl) {
  if (!treeBodyEl) return 10;
  const styles = getComputedStyle(document.documentElement);
  const rowHeight = Number.parseInt(styles.getPropertyValue("--list-row-height"), 10) || 28;
  const height = treeBodyEl.clientHeight || 0;
  return Math.max(1, Math.floor(height / rowHeight) - 1);
}

/**
 * @param {KeyboardEvent} event
 * @param {object} ctx
 * @param {import("$lib/types").TreeNode | null} ctx.treeRoot
 * @param {number} ctx.treeFocusedIndex
 * @param {HTMLElement | null} ctx.treeBodyEl
 * @param {(event: KeyboardEvent, actionId: import("$lib/ui_types").ActionId) => boolean} ctx.matchesAction
 * @param {(nodes: import("$lib/types").TreeNode[], index: number) => number} ctx.findTreeParentIndex
 * @param {(treeBodyEl: HTMLElement | null) => number} ctx.getTreePageStep
 * @param {(treeBodyEl: HTMLElement | null, focusedIndex: number) => void} ctx.scrollTreeToFocus
 * @param {(node: import("$lib/types").TreeNode, depth: number, autoExpand: boolean) => void} ctx.expandTreeNode
 * @param {(node: import("$lib/types").TreeNode, index: number) => void} ctx.selectTreeNode
 * @param {(nextIndex: number) => void} ctx.setTreeFocusedIndex
 */
export function handleTreeKey(event, ctx) {
  const nodes = getVisibleTreeNodes(ctx.treeRoot);
  if (!nodes.length) return false;
  const current = nodes[ctx.treeFocusedIndex] || nodes[0];
  const pageStep = ctx.getTreePageStep(ctx.treeBodyEl);
  const setAndScroll = (nextIndex) => {
    ctx.setTreeFocusedIndex(nextIndex);
    ctx.scrollTreeToFocus(ctx.treeBodyEl, nextIndex);
  };
  if (ctx.matchesAction(event, "move_down")) {
    setAndScroll(Math.min(nodes.length - 1, ctx.treeFocusedIndex + 1));
    return true;
  }
  if (ctx.matchesAction(event, "move_up")) {
    setAndScroll(Math.max(0, ctx.treeFocusedIndex - 1));
    return true;
  }
  if (ctx.matchesAction(event, "page_down")) {
    setAndScroll(Math.min(nodes.length - 1, ctx.treeFocusedIndex + pageStep));
    return true;
  }
  if (ctx.matchesAction(event, "page_up")) {
    setAndScroll(Math.max(0, ctx.treeFocusedIndex - pageStep));
    return true;
  }
  if (ctx.matchesAction(event, "move_right")) {
    if (current) {
      if (!current.expanded) {
        ctx.expandTreeNode(current, current.depth, false);
      } else if (current.children.length > 0) {
        setAndScroll(Math.min(nodes.length - 1, ctx.treeFocusedIndex + 1));
      }
    }
    return true;
  }
  if (ctx.matchesAction(event, "move_left")) {
    if (current && current.expanded) {
      current.expanded = false;
      return true;
    }
    const parentIndex = ctx.findTreeParentIndex(nodes, ctx.treeFocusedIndex);
    if (parentIndex >= 0) {
      setAndScroll(parentIndex);
    }
    return true;
  }
  if (ctx.matchesAction(event, "open")) {
    if (current) {
      ctx.selectTreeNode(current, ctx.treeFocusedIndex);
    }
    return true;
  }
  return false;
}

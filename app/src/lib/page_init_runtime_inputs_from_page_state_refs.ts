/**
 * @param {object} params
 * @param {{ listEl: HTMLElement | null; listBodyEl: HTMLElement | null; treeEl: HTMLElement | null; treeBodyEl: HTMLElement | null }} params.shellRefs
 * @param {{ sortMenuEl: HTMLElement | null }} params.overlayRefs
 */
export function buildInitRuntimeRefsFromPageState(params) {
  return () => ({
    listEl: params.shellRefs.listEl,
    listBodyEl: params.shellRefs.listBodyEl,
    treeEl: params.shellRefs.treeEl,
    treeBodyEl: params.shellRefs.treeBodyEl,
    sortMenuEl: params.overlayRefs.sortMenuEl,
  });
}

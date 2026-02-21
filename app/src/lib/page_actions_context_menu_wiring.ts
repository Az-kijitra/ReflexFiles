import { createPageContextMenuActions } from "$lib/page_actions_context_menu";
import { createPageZipActions } from "$lib/page_actions_zip";

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function setupPageContextMenuWiring(ctx, deps) {
  /** @type {() => void} */
  let closeContextMenu = () => {};

  const zipActions = createPageZipActions(ctx, {
    closeContextMenu: () => closeContextMenu(),
  });

  const contextMenuActions = createPageContextMenuActions(ctx, {
    openCreate: deps.openCreate,
    openEntry: deps.openEntry,
    openInExplorer: deps.openInExplorer,
    openInCmd: deps.openInCmd,
    openInVSCode: deps.openInVSCode,
    openInGitClient: deps.openInGitClient,
    openZipCreate: zipActions.openZipCreate,
    openZipExtract: zipActions.openZipExtract,
    openRename: deps.openRename,
    copySelected: deps.copySelected,
    duplicateSelected: deps.duplicateSelected,
    prefixDateSelected: deps.prefixDateSelected,
    cutSelected: deps.cutSelected,
    pasteItems: deps.pasteItems,
    setStatusMessage: deps.setStatusMessage,
    showError: deps.showError,
    runExternalApp: deps.runExternalApp,
    getExternalApps: deps.getExternalApps,
    syncGdriveWorkcopyForEntry: deps.syncGdriveWorkcopyForEntry,
  });

  closeContextMenu = contextMenuActions.closeContextMenu;

  return {
    zipActions,
    contextMenuActions,
  };
}

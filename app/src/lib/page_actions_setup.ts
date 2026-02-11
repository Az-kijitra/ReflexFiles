import {
  invoke,
  join,
  openPath,
  openUrl,
  resolveResource,
  resourceDir,
} from "$lib/tauri_client";

import { basename, buildDuplicatePairs, buildPastePairs, isSamePathTarget } from "./utils/file_ops";
import {
  addJumpPath,
  addJumpUrl as addJumpUrlItem,
  isLikelyUrl,
  removeHistoryValue,
  removeJumpValue,
  updateSearchHistory,
} from "./utils/history";
import {
  applyError,
  closeFailures,
  getFailureMessage,
  openFailures,
  updateStatusMessage,
} from "./utils/feedback";
import { normalizeExternalApps, normalizeUrl } from "./utils/normalize";
import {
  clipboardGetFiles,
  clipboardSetFiles,
  fsCopy,
  fsCopyPairs,
  fsCreate,
  fsDeleteTrash,
  fsDeleteWithUndo,
  fsMove,
  fsRename,
  zipCreate,
  zipExtract,
} from "./utils/tauri_fs";
import {
  clearSelectionState,
  invertSelectionPaths,
  selectAllEntries,
  selectRangeByIndex,
  toggleSelectionAtIndex,
} from "./utils/selection";

import { buildPageActionsParams } from "./page_actions_params";
import { setupPageActions } from "./page_setup";

/**
 * @param {{
 *   t: (key: string, params?: Record<string, string | number>) => string;
 *   tick: typeof import("svelte").tick;
 *   helpers: Parameters<typeof buildPageActionsParams>[0]["helpers"];
 *   properties: Parameters<typeof buildPageActionsParams>[0]["properties"];
 *   page: Parameters<typeof buildPageActionsParams>[0]["page"];
 * }} params
 */
export function setupPageActionsBundle(params) {
  return setupPageActions(
    buildPageActionsParams({
      deps: {
        invoke,
        tick: params.tick,
        t: params.t,
        addJumpPath,
        addJumpUrlItem,
        normalizeUrl,
        isLikelyUrl,
        updateSearchHistory,
        normalizeExternalApps,
        openPath,
        openUrl,
        resourceDir,
        resolveResource,
        joinPath: join,
        updateStatusMessage,
        removeJumpValue,
        removeHistoryValue,
        applyError,
        openFailures,
        closeFailures,
        getFailureMessage,
        clipboardSetFiles,
        buildDuplicatePairs,
        fsCopyPairs,
        basename,
        fsDeleteTrash,
        fsMove,
        fsCopy,
        buildPastePairs,
        isSamePathTarget,
        toggleSelectionAtIndex,
        selectRangeByIndex,
        selectAllEntries,
        clearSelectionState,
        invertSelectionPaths,
        clipboardGetFiles,
        zipCreate,
        zipExtract,
        fsDeleteWithUndo,
        fsRename,
        fsCreate,
      },
      properties: params.properties,
      helpers: params.helpers,
      page: params.page,
    })
  );
}

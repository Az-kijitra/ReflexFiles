import { createDropdownHelpers } from "$lib/page_dropdown";
import { createPathCompletionHelpers } from "$lib/page_path_completion";

/**
 * @param {object} params
 * @param {object} params.dropdown
 * @param {object} params.pathCompletion
 */
export function setupJumpHandlers({ dropdown, pathCompletion }) {
  const { openJumpList, openHistoryList } = createDropdownHelpers(dropdown);
  const {
    handlePathTabCompletion,
    handlePathCompletionSeparator,
    handlePathCompletionInputChange,
    clearPathCompletionPreview,
  } = createPathCompletionHelpers(pathCompletion);
  return {
    openJumpList,
    openHistoryList,
    handlePathTabCompletion,
    handlePathCompletionSeparator,
    handlePathCompletionInputChange,
    clearPathCompletionPreview,
  };
}

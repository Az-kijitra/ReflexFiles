import { createListFocusMovers } from "./page_list_focus";

/**
 * @param {Parameters<typeof createListFocusMovers>[0]} params
 */
export function setupListFocusMovers(params) {
  return createListFocusMovers(params);
}

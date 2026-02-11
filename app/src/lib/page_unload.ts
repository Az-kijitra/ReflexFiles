/**
 * @param {object} params
 * @param {() => Promise<void>} params.saveUiStateNow
 */
export function createBeforeUnloadHandler({ saveUiStateNow }) {
  return function onBeforeUnload() {
    saveUiStateNow();
  };
}

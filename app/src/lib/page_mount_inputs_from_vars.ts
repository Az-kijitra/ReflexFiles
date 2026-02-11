/**
 * @param {{
 *   deps: object | (() => object);
 *   state: object | (() => object);
 *   domHandlers: object | (() => object);
 *   saveUiStateNow: () => Promise<void> | void;
 * }} params
 */
export function buildPageMountInputsFromVars(params) {
  const getDeps = typeof params.deps === "function" ? params.deps : () => params.deps;
  const getState = typeof params.state === "function" ? params.state : () => params.state;
  const getDomHandlers =
    typeof params.domHandlers === "function" ? params.domHandlers : () => params.domHandlers;

  return {
    deps: getDeps(),
    state: getState(),
    domHandlers: getDomHandlers(),
    saveUiStateNow: params.saveUiStateNow,
  };
}

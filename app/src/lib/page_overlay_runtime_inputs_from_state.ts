/**
 * @param {{
 *   state: any;
 *   refs: Record<string, any>;
 * }} params
 */
export function buildOverlayRuntimeInputsFromState(params) {
  return {
    state: params.state,
    getRefs: () => params.refs,
    setRefs: buildOverlayRefsSetters(params.refs),
  };
}

/**
 * @param {Record<string, any>} refs
 */
function buildOverlayRefsSetters(refs) {
  const setters = {};
  for (const key of Object.keys(refs)) {
    setters[key] = (value) => {
      refs[key] = value;
    };
  }
  return setters;
}

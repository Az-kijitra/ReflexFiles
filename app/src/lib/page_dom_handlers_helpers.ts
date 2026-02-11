/**
 * @param {object} params
 */
export function buildDomHandlersHelpers(params) {
  return {
    handleGlobalKey: params.handleGlobalKey,
    t: params.t,
    confirm: params.confirm,
    eventToKeyString: params.eventToKeyString,
    normalizeKeyString: params.normalizeKeyString,
  };
}

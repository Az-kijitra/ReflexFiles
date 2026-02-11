/**
 * @param {{ t: any; tick: any; properties: any; helpers: any; page: any }} params
 */
export function buildPageActionsBundleInputsFromVars(params) {
  return {
    t: params.t,
    tick: params.tick,
    properties: params.properties,
    helpers: params.helpers,
    page: params.page,
  };
}

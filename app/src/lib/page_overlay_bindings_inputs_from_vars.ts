/**
 * @param {{
 *   state: () => Record<string, any>;
 *   set: Record<string, (value: any) => void>;
 * }} params
 */
export function buildOverlayBindingsInputsFromVars(params) {
  const get = {};
  const keys = Object.keys(params.set);
  for (const key of keys) {
    get[key] = () => params.state()[key];
  }
  return { get, set: params.set };
}

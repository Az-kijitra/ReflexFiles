/**
 * @param {{
 *   get: Record<string, () => any>;
 *   set: Record<string, (value: any) => void>;
 * }} params
 */
export function buildOverlayBindingsFromVars(params) {
  const bindings = {};
  const keys = Object.keys(params.get);
  for (const key of keys) {
    Object.defineProperty(bindings, key, {
      get: params.get[key],
      set: params.set[key],
      enumerable: true,
    });
  }
  return bindings;
}

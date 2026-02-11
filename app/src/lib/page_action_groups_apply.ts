/**
 * @param {Record<string, any>} target
 * @param {any} groups
 */
export function applyPageActionGroups(target, groups) {
  if (!groups) return target;
  const properties = groups.properties ?? {};
  const pasteDeleteZip = groups.pasteDeleteZip ?? {};
  const renameCreateZip = groups.renameCreateZip ?? {};
  const search = groups.search ?? {};
  const jump = groups.jump ?? {};
  const openers = groups.openers ?? {};
  const selection = groups.selection ?? {};
  const context = groups.context ?? {};
  const status = groups.status ?? {};

  const { showError, ...searchRest } = search;

  Object.assign(
    target,
    properties,
    pasteDeleteZip,
    renameCreateZip,
    searchRest,
    jump,
    openers,
    selection,
    context,
    status
  );

  if (showError) {
    target.showErrorAction = showError;
  }

  return target;
}

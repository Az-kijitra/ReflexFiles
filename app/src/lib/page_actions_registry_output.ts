/**
 * @param {object} params
 */
export function buildPageActionsOutput(params) {
  const { onContextDelete, onContextProperties, ...rest } = params;
  return {
    ...rest,
    requestDeleteSelected: onContextDelete,
    requestOpenPropertiesSelected: onContextProperties,
  };
}

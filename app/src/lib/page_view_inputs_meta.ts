/**
 * @param {object} params
 */
export function buildViewInputsMeta(params) {
  return {
    formatName: params.meta.formatName,
    formatSize: params.meta.formatSize,
    formatModified: params.meta.formatModified,
    MENU_GROUPS: params.meta.MENU_GROUPS,
    ABOUT_URL: params.meta.ABOUT_URL,
    ABOUT_LICENSE: params.meta.ABOUT_LICENSE,
    ZIP_PASSWORD_MAX_ATTEMPTS: params.meta.ZIP_PASSWORD_MAX_ATTEMPTS,
    t: params.meta.t,
  };
}

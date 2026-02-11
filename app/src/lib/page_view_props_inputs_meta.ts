/**
 * @param {object} params
 */
export function buildViewPropsInputsMeta(params) {
  const { meta } = params;

  return {
    formatName: meta.formatName,
    formatSize: meta.formatSize,
    formatModified: meta.formatModified,
    MENU_GROUPS: meta.MENU_GROUPS,
    ABOUT_URL: meta.ABOUT_URL,
    ABOUT_LICENSE: meta.ABOUT_LICENSE,
    ZIP_PASSWORD_MAX_ATTEMPTS: meta.ZIP_PASSWORD_MAX_ATTEMPTS,
    t: meta.t,
  };
}

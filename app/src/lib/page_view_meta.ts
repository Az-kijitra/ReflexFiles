/**
 * @param {{
 *   formatName: (value: any) => string;
 *   formatSize: (value: any) => string;
 *   formatModified: (value: any) => string;
 *   MENU_GROUPS: any;
 *   ABOUT_URL: string;
 *   ABOUT_LICENSE: string;
 *   ZIP_PASSWORD_MAX_ATTEMPTS: number;
 *   t: (key: string, params?: Record<string, string | number>) => string;
 * }} params
 */
export function buildViewMeta(params) {
  return {
    formatters: {
      formatName: params.formatName,
      formatSize: params.formatSize,
      formatModified: params.formatModified,
    },
    constants: {
      MENU_GROUPS: params.MENU_GROUPS,
      ABOUT_URL: params.ABOUT_URL,
      ABOUT_LICENSE: params.ABOUT_LICENSE,
      ZIP_PASSWORD_MAX_ATTEMPTS: params.ZIP_PASSWORD_MAX_ATTEMPTS,
    },
    helpers: { t: params.t },
  };
}

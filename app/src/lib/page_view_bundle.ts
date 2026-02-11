import { buildPageViewProps } from "./page_view_props_setup";

/**
 * @param {{
 *   state: Parameters<typeof buildPageViewProps>[0]["view"]["state"];
 *   actions: Parameters<typeof buildPageViewProps>[0]["view"]["actions"];
 *   formatters: Parameters<typeof buildPageViewProps>[0]["view"]["formatters"];
 *   constants: Parameters<typeof buildPageViewProps>[0]["view"]["constants"];
 *   helpers: Parameters<typeof buildPageViewProps>[0]["view"]["helpers"];
 *   overlayState: Parameters<typeof buildPageViewProps>[0]["overlayState"];
 * }} params
 */
export function buildViewPropsBundle(params) {
  return buildPageViewProps({
    view: {
      state: params.state,
      actions: params.actions,
      formatters: params.formatters,
      constants: params.constants,
      helpers: params.helpers,
    },
    overlayState: params.overlayState,
  });
}

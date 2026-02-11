import { KeymapSectionParams } from "./types";

/**
 * @param {KeymapSectionParams} params
 */
export function initKeymapSection(params: KeymapSectionParams) {
  const { createKeymapHelpers } = params;
  const {
    getDefaultBinding,
    getCustomBinding,
    getActionBindings,
    matchesAction,
    setCustomBinding,
    resetCustomBinding,
    captureBinding,
    getMenuShortcut,
  } = createKeymapHelpers({
    getKeymapProfile: params.getKeymapProfile,
    getKeymapCustom: params.getKeymapCustom,
    setKeymapCustom: params.setKeymapCustom,
    scheduleUiSave: params.getScheduleUiSave(),
    KEYMAP_DEFAULTS: params.KEYMAP_DEFAULTS,
    splitBindings: params.splitBindings,
    normalizeKeyString: params.normalizeKeyString,
    eventToKeyString: params.eventToKeyString,
  });
  params.setGetDefaultBinding(getDefaultBinding);
  params.setGetCustomBinding(getCustomBinding);
  params.setGetActionBindings(getActionBindings);
  params.setMatchesAction(matchesAction);
  params.setSetCustomBinding(setCustomBinding);
  params.setResetCustomBinding(resetCustomBinding);
  params.setCaptureBinding(captureBinding);
  params.setGetMenuShortcut(getMenuShortcut);
  params.markReady("getDefaultBinding");
  params.markReady("getCustomBinding");
  params.markReady("getActionBindings");
  params.markReady("matchesAction");
  params.markReady("setCustomBinding");
  params.markReady("resetCustomBinding");
  params.markReady("captureBinding");
  params.markReady("getMenuShortcut");
}

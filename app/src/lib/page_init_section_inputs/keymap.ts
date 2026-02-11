import { createKeymapHelpers } from "../page_keymap";
import { KEYMAP_DEFAULTS } from "../ui_constants";
import { eventToKeyString, normalizeKeyString, splitBindings } from "../utils/keymap";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildKeymapSectionInputs(params, markReady) {
  return {
    createKeymapHelpers,
    getKeymapProfile: params.state.getKeymapProfile,
    getKeymapCustom: params.state.getKeymapCustom,
    setKeymapCustom: params.set.setKeymapCustom,
    getScheduleUiSave: params.state.getScheduleUiSave,
    KEYMAP_DEFAULTS,
    splitBindings,
    normalizeKeyString,
    eventToKeyString,
    setGetDefaultBinding: params.set.setGetDefaultBinding,
    setGetCustomBinding: params.set.setGetCustomBinding,
    setGetActionBindings: params.set.setGetActionBindings,
    setMatchesAction: params.set.setMatchesAction,
    setSetCustomBinding: params.set.setSetCustomBinding,
    setResetCustomBinding: params.set.setResetCustomBinding,
    setCaptureBinding: params.set.setCaptureBinding,
    setGetMenuShortcut: params.set.setGetMenuShortcut,
    markReady,
  };
}

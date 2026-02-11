import {
  buildModalFocusConfigs,
  buildModalInputFocusConfigs,
  buildModalTrapConfigs,
} from "./page_effect_configs";

/**
 * @param {{
 *   focus: Parameters<typeof buildModalFocusConfigs>[0];
 *   input: Parameters<typeof buildModalInputFocusConfigs>[0];
 *   trap: Parameters<typeof buildModalTrapConfigs>[0];
 * }} params
 */
export function buildModalConfigs(params) {
  return {
    modalFocusConfig: buildModalFocusConfigs(params.focus),
    modalInputFocusConfig: buildModalInputFocusConfigs(params.input),
    modalTrapConfig: buildModalTrapConfigs(params.trap),
  };
}

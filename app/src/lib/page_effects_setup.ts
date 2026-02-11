import {
  buildDropdownEffectConfig,
  buildListEffectConfig,
  buildThemeEffectConfig,
} from "./page_effect_groups_builder";

/**
 * @param {{
 *   list: Parameters<typeof buildListEffectConfig>[0];
 *   dropdown: Parameters<typeof buildDropdownEffectConfig>[0];
 *   theme: Parameters<typeof buildThemeEffectConfig>[0];
 * }} params
 */
export function buildPageEffectConfigs(params) {
  return {
    listEffectConfig: buildListEffectConfig(params.list),
    dropdownEffectConfig: buildDropdownEffectConfig(params.dropdown),
    themeEffectConfig: buildThemeEffectConfig(params.theme),
  };
}

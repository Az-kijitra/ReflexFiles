import { buildPageMountInputsFromState } from "./page_mount_inputs_from_state";
import { setupPageRuntime } from "./page_runtime";

/**
 * @param {{
 *   onMount: typeof import("svelte").onMount;
 *   inputs: Parameters<typeof buildPageMountInputsFromState>[0];
 * }} params
 */
export function createPageMountRuntime(params) {
  const mountInputs = buildPageMountInputsFromState(params.inputs);
  setupPageRuntime({ onMount: params.onMount, mountInputs });
  return mountInputs;
}

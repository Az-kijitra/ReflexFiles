import { setupPageMount } from "./page_mount_setup";

/**
 * @param {{
 *   onMount: (fn: () => void | Promise<void>) => void;
 *   mountInputs: Parameters<typeof setupPageMount>[0];
 * }} params
 */
export function setupPageRuntime(params) {
  params.onMount(async () => setupPageMount(params.mountInputs));
}

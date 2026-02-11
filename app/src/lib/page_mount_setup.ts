import { createBeforeUnloadHandler } from "./page_unload";
import { setupPageLifecycleFromParts } from "./page_lifecycle_builder";
import { createDomHandlers } from "./page_dom_handlers_setup";

/**
 * @param {{
 *   deps: Parameters<typeof setupPageLifecycleFromParts>[0]["deps"];
 *   state: Parameters<typeof setupPageLifecycleFromParts>[0]["state"];
 *   domHandlers: Parameters<typeof createDomHandlers>[0];
 *   saveUiStateNow: () => Promise<void> | void;
 * }} params
 */
export function setupPageMount(params) {
  const { onKeyDown, onClick } = createDomHandlers(params.domHandlers);
  const onBeforeUnload = createBeforeUnloadHandler({ saveUiStateNow: params.saveUiStateNow });
  return setupPageLifecycleFromParts({
    deps: params.deps,
    state: params.state,
    handlers: {
      onBeforeUnload,
      onKeyDown,
      onClick,
    },
  });
}

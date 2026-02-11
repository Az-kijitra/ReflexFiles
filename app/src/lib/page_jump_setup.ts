import { setupJumpHandlers } from "./page_jump_handlers";
import { buildJumpHandlersParams } from "./page_jump_handlers_params";

/**
 * @param {Parameters<typeof buildJumpHandlersParams>[0]} params
 */
export function setupJumpHandlersBundle(params) {
  return setupJumpHandlers(buildJumpHandlersParams(params));
}

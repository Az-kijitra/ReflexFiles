import { buildPageClickParams, buildPageKeydownParams } from "$lib/page_dom_handlers_params";
import { createPageClickHandler, createPageKeydownHandler } from "$lib/page_dom_handlers";

/**
 * @param {object} params
 * @param {object} params.keydown
 * @param {object} params.click
 */
export function buildDomHandlers({ keydown, click }) {
  const onKeyDown = createPageKeydownHandler(buildPageKeydownParams(keydown));
  const onClick = createPageClickHandler(buildPageClickParams(click));
  return { onKeyDown, onClick };
}

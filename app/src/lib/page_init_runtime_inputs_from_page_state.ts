import { buildInitPageRuntimeInputsFromState } from "./page_init_runtime_inputs_from_state";
import { buildInitRuntimeActionsFromPageState } from "./page_init_runtime_inputs_from_page_state_actions";
import { buildInitRuntimeRefsFromPageState } from "./page_init_runtime_inputs_from_page_state_refs";
import { buildInitRuntimeSettersFromPageState } from "./page_init_runtime_inputs_from_page_state_setters";
import { buildInitRuntimeValuesFromPageState } from "./page_init_runtime_inputs_from_page_state_values";

/**
 * @param {{
 *   state: any;
 *   shellRefs: {
 *     listEl: HTMLElement | null;
 *     listBodyEl: HTMLElement | null;
 *     treeEl: HTMLElement | null;
 *     treeBodyEl: HTMLElement | null;
 *   };
 *   overlayRefs: { sortMenuEl: HTMLElement | null };
 *   timers: {
 *     get: {
 *       uiSaveTimer: () => ReturnType<typeof setTimeout> | null;
 *       watchTimer: () => ReturnType<typeof setTimeout> | null;
 *     };
 *     set: {
 *       uiSaveTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *       watchTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     };
 *   };
 *   actions: Record<string, any>;
 *   keymapSetters: {
 *     getDefaultBinding: (value: () => string) => void;
 *     getCustomBinding: (value: () => string) => void;
 *     getActionBindings: (value: () => any[]) => void;
 *     setCustomBinding: (value: (action: string, binding: string) => void) => void;
 *     resetCustomBinding: (value: (action: string) => void) => void;
 *     captureBinding: (value: (action: string) => void) => void;
 *     getMenuShortcut: (value: (action: string) => string) => void;
 *   };
 *   t: (key: string, params?: Record<string, string | number>) => string;
 *   showError: (err: unknown) => void;
 * }} params
 */
export function buildInitPageRuntimeInputsFromPageState(params) {
  const setters = buildInitRuntimeSettersFromPageState(params);

  return buildInitPageRuntimeInputsFromState({
    refs: buildInitRuntimeRefsFromPageState(params),
    timers: params.timers,
    actions: buildInitRuntimeActionsFromPageState(params),
    uiSave: setters.uiSave,
    keymap: setters.keymap,
    listLayout: setters.listLayout,
    focus: setters.focus,
    watch: setters.watch,
    tree: setters.tree,
    dir: setters.dir,
    flags: setters.flags,
    sort: setters.sort,
    derived: setters.derived,
    values: buildInitRuntimeValuesFromPageState(params),
  });
}

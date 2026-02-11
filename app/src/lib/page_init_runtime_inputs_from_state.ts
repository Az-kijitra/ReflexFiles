import {
  buildInitPageGet,
  buildInitPageSet,
  buildInitPageValues,
} from "./page_init_context_builder";

/**
 * @param {{
 *   refs: () => any;
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
 *   actions: {
 *     loadDir: () => (path: string) => Promise<void>;
 *     focusList: () => () => void;
 *     buildTreeRoot: () => (path: string) => Promise<void>;
 *     updateListRows: () => () => void;
 *     scheduleUiSave: () => () => void;
 *     scheduleWatch: () => (path: string) => void;
 *   };
 *   uiSave: {
 *     saveUiStateNow: (value: () => Promise<void>) => void;
 *     scheduleUiSave: (value: () => void) => void;
 *   };
 *   keymap: {
 *     getDefaultBinding: (value: () => string) => void;
 *     getCustomBinding: (value: () => string) => void;
 *     getActionBindings: (value: () => any[]) => void;
 *     matchesAction: (value: (action: string, key: string) => boolean) => void;
 *     setCustomBinding: (value: (action: string, binding: string) => void) => void;
 *     resetCustomBinding: (value: (action: string) => void) => void;
 *     captureBinding: (value: (action: string) => void) => void;
 *     getMenuShortcut: (value: (action: string) => string) => void;
 *   };
 *   listLayout: Record<string, (value: any) => void>;
 *   focus: Record<string, (value: any) => void>;
 *   watch: Record<string, (value: any) => void>;
 *   tree: Record<string, (value: any) => void>;
 *   dir: Record<string, (value: any) => void>;
 *   flags: Record<string, (value: any) => void>;
 *   sort: Record<string, (value: any) => void>;
 *   derived: Record<string, (value: any) => void>;
 *   values: Parameters<typeof buildInitPageValues>[0];
 * }} params
 */
export function buildInitPageRuntimeInputsFromState(params) {
  return {
    refs: params.refs,
    get: buildInitPageGet({
      timers: params.timers.get,
      actions: params.actions,
    }),
    set: buildInitPageSet({
      timers: params.timers.set,
      uiSave: params.uiSave,
      keymap: params.keymap,
      listLayout: params.listLayout,
      focus: params.focus,
      watch: params.watch,
      tree: params.tree,
      dir: params.dir,
      flags: params.flags,
      sort: params.sort,
      derived: params.derived,
    }),
    values: buildInitPageValues(params.values),
  };
}

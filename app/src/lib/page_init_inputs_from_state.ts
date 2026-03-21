import { buildPageInitSetInputsFromState } from "./page_init_set_inputs_from_state";
import { buildPageInitStateInputsFromState } from "./page_init_state_inputs_from_state";
import { buildPageInitValuesInputs } from "./page_init_values_inputs";
import type { PageInitValuesInputsParams } from "./page_init_values_inputs";

// ── Types ─────────────────────────────────────────────────────────────────────

type Refs = {
  listEl:     HTMLElement | null;
  listBodyEl: HTMLElement | null;
  treeEl:     HTMLElement | null;
  treeBodyEl: HTMLElement | null;
  sortMenuEl: HTMLElement | null;
};

export interface PageInitInputsFromStateParams {
  deps: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoke: (command: string, args?: Record<string, any>) => Promise<any>;
    tick: () => Promise<void>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
  refs: Refs | (() => Refs);
  get: {
    uiSaveTimer:    () => ReturnType<typeof setTimeout> | null;
    watchTimer:     () => ReturnType<typeof setTimeout> | null;
    loadDir:        () => (path: string) => Promise<void>;
    focusList:      () => () => void;
    buildTreeRoot:  () => (path: string) => Promise<void>;
    updateListRows: () => () => void;
    scheduleUiSave: () => () => void;
    scheduleWatch:  () => (path: string) => void;
  };
  set: {
    uiSaveTimer:     (value: ReturnType<typeof setTimeout> | null) => void;
    saveUiStateNow:  (value: () => Promise<void>) => void;
    scheduleUiSave:  (value: () => void) => void;
    getDefaultBinding: (value: () => string) => void;
    getCustomBinding:  (value: () => string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getActionBindings: (value: () => any[]) => void;
    matchesAction:     (value: (action: string, key: string) => boolean) => void;
    setCustomBinding:  (value: (action: string, binding: string) => void) => void;
    resetCustomBinding:(value: (action: string) => void) => void;
    captureBinding:    (value: (event: KeyboardEvent) => string) => void;
    getMenuShortcut:   (value: (action: string) => string) => void;
    updateListRows:    (value: () => void) => void;
    updateOverflowMarkers:  (value: () => void) => void;
    updateVisibleColumns:   (value: () => void) => void;
    setScrollStartColumn:   (value: (startCol: number, rowsOverride?: number | null) => void) => void;
    ensureColumnVisible:    (value: (targetCol: number, rowsOverride?: number | null) => void) => void;
    scrollListHorizontallyByColumns: (value: (deltaColumns: number) => void) => void;
    getActualColumnSpan:    (value: (el: HTMLElement | null) => number) => void;
    focusList:     (value: () => void) => void;
    focusTree:     (value: () => void) => void;
    focusTreeTop:  (value: () => void) => void;
    watchTimer:    (value: ReturnType<typeof setTimeout> | null) => void;
    scheduleWatch: (value: (path: string) => void) => void;
    expandTreeNode:(value: (path: string, depth: number, autoExpand: boolean) => Promise<void>) => void;
    buildTreeRoot: (value: (path: string) => Promise<void>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectTreeNode:(value: (node: any, index: number) => void) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toggleTreeNode:(value: (node: any, index: number, event?: MouseEvent) => void) => void;
    handleTreeKey: (value: (event: KeyboardEvent) => unknown) => void;
    loadDir:       (value: (path: string) => Promise<void>) => void;
    toggleHidden:  (value: () => void) => void;
    toggleTree:    (value: () => void) => void;
    toggleTheme:   (value: () => void) => void;
    setSort:       (value: (nextKey: string) => void) => void;
    openSortMenu:  (value: () => void) => void;
    closeSortMenu: (value: () => void) => void;
    handleSortMenuKey:       (value: (event: KeyboardEvent) => void) => void;
    recomputeSearch:         (value: () => void) => void;
    recomputeDropdownItems:  (value: () => void) => void;
    recomputeStatusItems:    (value: () => void) => void;
    clampDropdownSelection:  (value: () => void) => void;
  };
  values: PageInitValuesInputsParams;
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildPageInitInputsFromState(params: PageInitInputsFromStateParams) {
  return {
    deps:   params.deps,
    state:  buildPageInitStateInputsFromState(params),
    set:    buildPageInitSetInputsFromState(params),
    values: buildPageInitValuesInputs(params.values),
  };
}

import { buildPageInitSetInputs } from "./page_init_set_inputs";
import { buildPageInitStateInputs } from "./page_init_state_inputs";
import { buildPageInitValuesInputs } from "./page_init_values_inputs";

/**
 * @param {{
 *   deps: {
 *     invoke: typeof import("@tauri-apps/api/core").invoke;
 *     tick: typeof import("svelte").tick;
 *   };
 *   state: {
 *     uiConfigLoaded: () => boolean;
 *     currentPath: () => string;
 *     windowBounds: () => any;
 *     windowBoundsReady: () => boolean;
 *     showHidden: () => boolean;
 *     showSize: () => boolean;
 *     showTime: () => boolean;
 *     showTree: () => boolean;
 *     sortKey: () => string;
 *     sortOrder: () => string;
 *     pathHistory: () => string[];
 *     jumpList: () => string[];
 *     searchHistory: () => string[];
 *     theme: () => string;
 *     uiSaveTimer: () => ReturnType<typeof setTimeout> | null;
 *     keymapProfile: () => string;
 *     keymapCustom: () => Record<string, string[]>;
 *     listEl: () => HTMLElement | null;
 *     listBodyEl: () => HTMLElement | null;
 *     listCols: () => number;
 *     listRows: () => number;
 *     visibleColStart: () => number;
 *     visibleColEnd: () => number;
 *     filteredCount: () => number;
 *     treeEl: () => HTMLElement | null;
 *     treeBodyEl: () => HTMLElement | null;
 *     treeFocusedIndex: () => number;
 *     treeRoot: () => any;
 *     watchTimer: () => ReturnType<typeof setTimeout> | null;
 *     treeBodyElSafe: () => HTMLElement | null;
 *     treeFocusedIndexSafe: () => number;
 *     treeElSafe: () => HTMLElement | null;
 *     treeRootSafe: () => any;
 *     loadDir: () => (path: string) => Promise<void>;
 *     entries: () => any[];
 *     searchActive: () => boolean;
 *     searchQuery: () => string;
 *     searchRegex: () => boolean;
 *     dropdownMode: () => string;
 *     dropdownOpen: () => boolean;
 *     dropdownIndex: () => number;
 *     dropdownItems: () => any[];
 *     selectedCount: () => number;
 *     statusMessage: () => string;
 *     showError: () => (err: unknown) => void;
 *     focusList: () => () => void;
 *     buildTreeRoot: () => (path: string) => Promise<void>;
 *     updateListRows: () => () => void;
 *     sortMenuOpen: () => boolean;
 *     sortMenuIndex: () => number;
 *     sortMenuEl: () => HTMLElement | null;
 *     scheduleUiSave: () => () => void;
 *     scheduleWatch: () => (path: string) => void;
 *   };
 *   set: {
 *     uiSaveTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     saveUiStateNow: (value: () => Promise<void>) => void;
 *     scheduleUiSave: (value: () => void) => void;
 *     keymapCustom: (value: Record<string, string[]>) => void;
 *     getDefaultBinding: (value: (action: string) => string) => void;
 *     getCustomBinding: (value: (action: string) => string) => void;
 *     getActionBindings: (value: (action: string) => string[]) => void;
 *     matchesAction: (value: (action: string, key: string) => boolean) => void;
 *     setCustomBinding: (value: (action: string, binding: string) => void) => void;
 *     resetCustomBinding: (value: (action: string) => void) => void;
 *     captureBinding: (value: (action: string) => void) => void;
 *     getMenuShortcut: (value: (action: string) => string) => void;
 *     listRows: (value: number) => void;
 *     listCols: (value: number) => void;
 *     nameMaxChars: (value: number) => void;
 *     visibleColStart: (value: number) => void;
 *     visibleColEnd: (value: number) => void;
 *     overflowLeft: (value: boolean) => void;
 *     overflowRight: (value: boolean) => void;
 *     updateListRows: (value: () => void) => void;
 *     updateOverflowMarkers: (value: () => void) => void;
 *     updateVisibleColumns: (value: () => void) => void;
 *     setScrollStartColumn: (value: (start: number, rows?: number | null) => void) => void;
 *     ensureColumnVisible: (value: (target: number, rows?: number | null) => void) => void;
 *     scrollListHorizontallyByColumns: (value: (delta: number) => void) => void;
 *     getActualColumnSpan: (value: (el: HTMLElement | null) => number) => void;
 *     treeFocusedIndex: (value: number) => void;
 *     focusList: (value: () => void) => void;
 *     focusTree: (value: () => void) => void;
 *     focusTreeTop: (value: () => void) => void;
 *     watchTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     scheduleWatch: (value: (path: string) => void) => void;
 *     treeRoot: (value: any) => void;
 *     treeSelectedPath: (value: string) => void;
 *     treeLoading: (value: boolean) => void;
 *     expandTreeNode: (value: (path: string, depth: number, autoExpand: boolean) => Promise<void>) => void;
 *     buildTreeRoot: (value: (path: string) => Promise<void>) => void;
 *     selectTreeNode: (value: (node: any, index: number) => void) => void;
 *     toggleTreeNode: (value: (node: any, index: number, event?: MouseEvent) => void) => void;
 *     handleTreeKey: (value: (event: KeyboardEvent) => unknown) => void;
 *     entries: (value: any[]) => void;
 *     currentPath: (value: string) => void;
 *     pathInput: (value: string) => void;
 *     selectedPaths: (value: string[]) => void;
 *     focusedIndex: (value: number) => void;
 *     anchorIndex: (value: number | null) => void;
 *     pathHistory: (value: string[]) => void;
 *     loading: (value: boolean) => void;
 *     error: (value: string) => void;
 *     loadDir: (value: (path: string) => Promise<void>) => void;
 *     showHidden: (value: boolean) => void;
 *     showTree: (value: boolean) => void;
 *     theme: (value: string) => void;
 *     toggleHidden: (value: () => void) => void;
 *     toggleTree: (value: () => void) => void;
 *     toggleTheme: (value: () => void) => void;
 *     sortMenuOpen: (value: boolean) => void;
 *     sortMenuIndex: (value: number) => void;
 *     sortKey: (value: string) => void;
 *     sortOrder: (value: string) => void;
 *     setSort: (value: (key: string) => void) => void;
 *     openSortMenu: (value: () => void) => void;
 *     closeSortMenu: (value: () => void) => void;
 *     handleSortMenuKey: (value: (event: KeyboardEvent) => void) => void;
 *     filteredEntries: (value: any[]) => void;
 *     searchError: (value: string) => void;
 *     recomputeSearch: (value: () => void) => void;
 *     dropdownItems: (value: any[]) => void;
 *     statusItems: (value: any[]) => void;
 *     dropdownIndex: (value: number) => void;
 *     recomputeDropdownItems: (value: () => void) => void;
 *     recomputeStatusItems: (value: () => void) => void;
 *     clampDropdownSelection: (value: () => void) => void;
 *   };
 *   values: {
 *     t: (key: string, params?: Record<string, string | number>) => string;
 *     matchesAction: (action: string, key: string) => boolean;
 *     showError: (err: unknown) => void;
 *     clearTree: () => void;
 *     loadCurrentDir: () => Promise<void>;
 *     selectedCount: () => number;
 *     dropdownItemsSafe: () => any[];
 *   };
 * }} params
 */
export function buildPageInitInputs(params) {
  return {
    deps: params.deps,
    state: buildPageInitStateInputs(params.state),
    set: buildPageInitSetInputs(params.set),
    values: buildPageInitValuesInputs(params.values),
  };
}

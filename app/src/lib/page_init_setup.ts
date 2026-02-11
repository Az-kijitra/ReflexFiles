import { createInitGuard } from "./page_init_guard";
import { PAGE_INIT_NAMES } from "./page_init_names";
import {
  initUiSaveSection,
  initKeymapSection,
  initListLayoutSection,
  initFocusSection,
  initWatchSection,
  initTreeSection,
  initDirSection,
  initUiFlagsSection,
  initSortMenuSection,
  initSearchSection,
  initDerivedSection,
} from "./page_init_sections";
import { buildUiSaveSectionInputs } from "./page_init_section_inputs/ui_save";
import { buildKeymapSectionInputs } from "./page_init_section_inputs/keymap";
import { buildListLayoutSectionInputs } from "./page_init_section_inputs/list_layout";
import { buildFocusSectionInputs } from "./page_init_section_inputs/focus";
import { buildWatchSectionInputs } from "./page_init_section_inputs/watch";
import { buildTreeSectionInputs } from "./page_init_section_inputs/tree";
import { buildDirSectionInputs } from "./page_init_section_inputs/dir";
import { buildUiFlagsSectionInputs } from "./page_init_section_inputs/ui_flags";
import { buildSortMenuSectionInputs } from "./page_init_section_inputs/sort_menu";
import { buildSearchSectionInputs } from "./page_init_section_inputs/search";
import { buildDerivedSectionInputs } from "./page_init_section_inputs/derived";

/**
 * @param {{
 *   deps: {
 *     invoke: typeof import("@tauri-apps/api/core").invoke;
 *     tick: typeof import("svelte").tick;
 *   };
 *   state: {
 *     getUiConfigLoaded: () => boolean;
 *     getCurrentPath: () => string;
 *     getWindowBounds: () => any;
 *     getWindowBoundsReady: () => boolean;
 *     getShowHidden: () => boolean;
 *     getShowSize: () => boolean;
 *     getShowTime: () => boolean;
 *     getShowTree: () => boolean;
 *     getSortKey: () => string;
 *     getSortOrder: () => string;
 *     getPathHistory: () => string[];
 *     getJumpList: () => string[];
 *     getSearchHistory: () => string[];
 *     getTheme: () => string;
 *     getUiSaveTimer: () => ReturnType<typeof setTimeout> | null;
 *     getKeymapProfile: () => string;
 *     getKeymapCustom: () => Record<string, string[]>;
 *     getListEl: () => HTMLElement | null;
 *     getListBodyEl: () => HTMLElement | null;
 *     getListCols: () => number;
 *     getListRows: () => number;
 *     getVisibleColStart: () => number;
 *     getVisibleColEnd: () => number;
 *     getFilteredCount: () => number;
 *     getTreeEl: () => HTMLElement | null;
 *     getTreeBodyEl: () => HTMLElement | null;
 *     getTreeFocusedIndex: () => number;
 *     getTreeRoot: () => any;
 *     getWatchTimer: () => ReturnType<typeof setTimeout> | null;
 *     getTreeBodyElSafe: () => HTMLElement | null;
 *     getTreeFocusedIndexSafe: () => number;
 *     getTreeElSafe: () => HTMLElement | null;
 *     getTreeRootSafe: () => any;
 *     getLoadDir: () => (path: string) => Promise<void>;
 *     getEntries: () => any[];
 *     getSearchActive: () => boolean;
 *     getSearchQuery: () => string;
 *     getSearchRegex: () => boolean;
 *     getDropdownMode: () => string;
 *     getDropdownOpen: () => boolean;
 *     getDropdownIndex: () => number;
 *     getDropdownItems: () => any[];
 *     getSelectedCount: () => number;
 *     getStatusMessage: () => string;
 *     getShowError: () => (err: unknown) => void;
 *     getFocusList: () => () => void;
 *     getBuildTreeRoot: () => (path: string) => Promise<void>;
 *     getUpdateListRows: () => () => void;
 *     getSortMenuOpen: () => boolean;
 *     getSortMenuIndex: () => number;
 *     getSortMenuEl: () => HTMLElement | null;
 *     getScheduleUiSave: () => () => void;
 *     getScheduleWatch: () => (path: string) => void;
 *   };
 *   set: {
 *     setUiSaveTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     setSaveUiStateNow: (value: () => Promise<void>) => void;
 *     setScheduleUiSave: (value: () => void) => void;
 *     setKeymapCustom: (value: Record<string, string[]>) => void;
 *     setGetDefaultBinding: (value: (action: string) => string) => void;
 *     setGetCustomBinding: (value: (action: string) => string) => void;
 *     setGetActionBindings: (value: (action: string) => string[]) => void;
 *     setMatchesAction: (value: (action: string, key: string) => boolean) => void;
 *     setSetCustomBinding: (value: (action: string, binding: string) => void) => void;
 *     setResetCustomBinding: (value: (action: string) => void) => void;
 *     setCaptureBinding: (value: (action: string) => void) => void;
 *     setGetMenuShortcut: (value: (action: string) => string) => void;
 *     setListRows: (value: number) => void;
 *     setListCols: (value: number) => void;
 *     setNameMaxChars: (value: number) => void;
 *     setVisibleColStart: (value: number) => void;
 *     setVisibleColEnd: (value: number) => void;
 *     setOverflowLeft: (value: boolean) => void;
 *     setOverflowRight: (value: boolean) => void;
 *     setUpdateListRows: (value: () => void) => void;
 *     setUpdateOverflowMarkers: (value: () => void) => void;
 *     setUpdateVisibleColumns: (value: () => void) => void;
 *     setSetScrollStartColumn: (value: (start: number, rows?: number | null) => void) => void;
 *     setEnsureColumnVisible: (value: (target: number, rows?: number | null) => void) => void;
 *     setScrollListHorizontallyByColumns: (value: (delta: number) => void) => void;
 *     setGetActualColumnSpan: (value: (el: HTMLElement | null) => number) => void;
 *     setTreeFocusedIndex: (value: number) => void;
 *     setFocusList: (value: () => void) => void;
 *     setFocusTree: (value: () => void) => void;
 *     setFocusTreeTop: (value: () => void) => void;
 *     setWatchTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     setScheduleWatch: (value: (path: string) => void) => void;
 *     setTreeRoot: (value: any) => void;
 *     setTreeSelectedPath: (value: string) => void;
 *     setTreeLoading: (value: boolean) => void;
 *     setExpandTreeNode: (value: (path: string, depth: number, autoExpand: boolean) => Promise<void>) => void;
 *     setBuildTreeRoot: (value: (path: string) => Promise<void>) => void;
 *     setSelectTreeNode: (value: (node: any, index: number) => void) => void;
 *     setToggleTreeNode: (value: (node: any, index: number, event?: MouseEvent) => void) => void;
 *     setHandleTreeKey: (value: (event: KeyboardEvent) => unknown) => void;
 *     setEntries: (value: any[]) => void;
 *     setCurrentPath: (value: string) => void;
 *     setPathInput: (value: string) => void;
 *     setSelectedPaths: (value: string[]) => void;
 *     setFocusedIndex: (value: number) => void;
 *     setAnchorIndex: (value: number) => void;
 *     setPathHistory: (value: string[]) => void;
 *     setLoading: (value: boolean) => void;
 *     setError: (value: string) => void;
 *     setLoadDir: (value: (path: string) => Promise<void>) => void;
 *     setShowHidden: (value: boolean) => void;
 *     setShowTree: (value: boolean) => void;
 *     setTheme: (value: string) => void;
 *     setToggleHidden: (value: () => void) => void;
 *     setToggleTree: (value: () => void) => void;
 *     setToggleTheme: (value: () => void) => void;
 *     setSortMenuOpen: (value: boolean) => void;
 *     setSortMenuIndex: (value: number) => void;
 *     setSortKey: (value: string) => void;
 *     setSortOrder: (value: string) => void;
 *     setSetSort: (value: (key: string) => void) => void;
 *     setOpenSortMenu: (value: () => void) => void;
 *     setCloseSortMenu: (value: () => void) => void;
 *     setHandleSortMenuKey: (value: (event: KeyboardEvent) => void) => void;
 *     setFilteredEntries: (value: any[]) => void;
 *     setSearchError: (value: string) => void;
 *     setRecomputeSearch: (value: () => void) => void;
 *     setDropdownItems: (value: any[]) => void;
 *     setStatusItems: (value: any[]) => void;
 *     setDropdownIndex: (value: number) => void;
 *     setRecomputeDropdownItems: (value: () => void) => void;
 *     setRecomputeStatusItems: (value: () => void) => void;
 *     setClampDropdownSelection: (value: () => void) => void;
 *   };
 *   values: {
 *     t: (key: string, params?: Record<string, string | number>) => string;
 *     matchesAction: (action: string, key: string) => boolean;
 *     showError: (err: unknown) => void;
 *     clearTree: () => void;
 *     loadCurrentDir: () => Promise<void>;
 *     getSelectedCount: () => number;
 *     getDropdownItemsSafe: () => any[];
 *   };
 * }} params
 */
export function setupPageInit(params) {
  const initGuard = createInitGuard(PAGE_INIT_NAMES, (message) => {
    console.error(message);
  });
  const markReady = (name) => initGuard.markReady(name);

  initUiSaveSection(buildUiSaveSectionInputs(params, markReady));

  initKeymapSection(buildKeymapSectionInputs(params, markReady));

  initListLayoutSection(buildListLayoutSectionInputs(params, markReady));

  initFocusSection(buildFocusSectionInputs(params, markReady));

  initWatchSection(buildWatchSectionInputs(params, markReady));

  initTreeSection(buildTreeSectionInputs(params, markReady));

  initDirSection(buildDirSectionInputs(params, markReady));

  initUiFlagsSection(buildUiFlagsSectionInputs(params, markReady));

  initSortMenuSection(buildSortMenuSectionInputs(params, markReady));

  initSearchSection(buildSearchSectionInputs(params, markReady));

  initDerivedSection(buildDerivedSectionInputs(params, markReady));

  initGuard.checkReady();
}

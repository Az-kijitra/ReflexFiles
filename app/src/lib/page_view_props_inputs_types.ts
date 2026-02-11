
/**
 * @param {{
 *   state: {
 *     menu: { menuOpen: boolean };
 *     path: { currentPath: string; pathHistory: string[] };
 *     tree: {
 *       showTree: boolean;
 *       treeEl: HTMLElement | null;
 *       treeLoading: boolean;
 *       treeRoot: any;
 *       treeSelectedPath: string;
 *       treeFocusedIndex: number;
 *     };
 *     list: {
 *       showSize: boolean;
 *       showTime: boolean;
 *       loading: boolean;
 *       filteredEntries: any[];
 *       entries: any[];
 *       overflowLeft: boolean;
 *       overflowRight: boolean;
 *       visibleColStart: number;
 *       visibleColEnd: number;
 *       listRows: number;
 *       selectedPaths: string[];
 *     };
 *     dropdown: {
 *       dropdownItems: any[];
 *       searchActive: boolean;
 *       searchError: string;
 *       sortMenuOpen: boolean;
 *     };
 *     modals: {
 *       aboutOpen: boolean;
 *       deleteConfirmOpen: boolean;
 *       deleteTargets: string[];
 *       deleteError: string;
 *       pasteConfirmOpen: boolean;
 *       pasteConflicts: any[];
 *       createOpen: boolean;
 *       createError: string;
 *       jumpUrlOpen: boolean;
 *       renameOpen: boolean;
 *       renameError: string;
 *       propertiesOpen: boolean;
 *       propertiesData: any;
 *       dirStatsInFlight: boolean;
 *       zipModalOpen: boolean;
 *       zipMode: string;
 *       zipTargets: string[];
 *       zipPasswordAttempts: number;
 *       zipOverwriteConfirmed: boolean;
 *       zipError: string;
 *     };
 *     context: {
 *       contextMenuOpen: boolean;
 *       contextMenuPos: { x: number; y: number } | null;
 *       contextMenuIndex: number;
 *       error: string;
 *       failureModalOpen: boolean;
 *       failureModalTitle: string;
 *       failureItems: any[];
 *       jumpList: string[];
 *     };
 *   };
 *   actions: {
 *     core: { pageActions: any };
 *     menu: {
 *       toggleMenu: () => void;
 *       getMenuItems: () => any[];
 *       closeMenu: () => void;
 *     };
 *     navigation: {
 *       loadDir: (path: string) => Promise<void>;
 *       focusList: () => void;
 *       focusTreeTop: () => void;
 *       handlePathTabCompletion: (event: KeyboardEvent) => void;
 *       setStatusMessage: (message: string, timeoutMs?: number) => void;
 *     };
 *     tree: {
 *       getVisibleTreeNodes: () => any[];
 *       focusTree: () => void;
 *       selectTreeNode: (node: any) => void;
 *       toggleTreeNode: (node: any) => void;
 *     };
 *     keymap: {
 *       matchesAction: (action: string, binding: string) => boolean;
 *       trapModalTab: (event: KeyboardEvent) => void;
 *     };
 *     sort: {
 *       setSort: (key: string, order?: string) => void;
 *       handleSortMenuKey: (event: KeyboardEvent) => void;
 *     };
 *     external: { openUrl: (url: string) => Promise<void> };
 *     properties: {
 *       saveDirStatsTimeout: (value: number) => void;
 *       clearDirStatsCache: () => void;
 *       retryDirStats: () => void;
 *       cancelDirStats: () => void;
 *       closeProperties: () => void;
 *     };
 *     misc: {
 *       autofocus: (el: HTMLElement | null) => void;
 *       getContextMenuItems: () => any[];
 *       getSelectableIndex: (index: number) => number | null;
 *       handleContextMenuKey: (event: KeyboardEvent) => void;
 *       failureMessage: string;
 *     };
 *   };
 *   meta: {
 *     formatName: (value: string, maxChars?: number) => string;
 *     formatSize: (value: number) => string;
 *     formatModified: (value: number | Date) => string;
 *     MENU_GROUPS: any;
 *     ABOUT_URL: string;
 *     ABOUT_LICENSE: string;
 *     ZIP_PASSWORD_MAX_ATTEMPTS: number;
 *     t: (value: string) => string;
 *   };
 *   overlay: {
 *     dropdown: {
 *       dropdownEl: HTMLElement | null;
 *       dropdownMode: string;
 *       dropdownOpen: boolean;
 *       dropdownIndex: number;
 *     };
 *     search: {
 *       searchQuery: string;
 *       searchRegex: boolean;
 *       searchInputEl: HTMLInputElement | null;
 *     };
 *     sort: { sortMenuIndex: number; sortMenuEl: HTMLElement | null };
 *     about: { aboutModalEl: HTMLElement | null };
 *     delete: { deleteModalEl: HTMLElement | null; deleteConfirmIndex: number };
 *     paste: {
 *       pasteModalEl: HTMLElement | null;
 *       pasteApplyAll: boolean;
 *       pasteConfirmIndex: number;
 *     };
 *     create: {
 *       createModalEl: HTMLElement | null;
 *       createInputEl: HTMLInputElement | null;
 *       createType: "file" | "folder";
 *       createName: string;
 *     };
 *     jump: {
 *       jumpUrlModalEl: HTMLElement | null;
 *       jumpUrlInputEl: HTMLInputElement | null;
 *       jumpUrlValue: string;
 *       jumpUrlError: string;
 *     };
 *     rename: {
 *       renameModalEl: HTMLElement | null;
 *       renameInputEl: HTMLInputElement | null;
 *       renameValue: string;
 *     };
 *     properties: {
 *       propertiesModalEl: HTMLElement | null;
 *       propertiesCloseButton: HTMLButtonElement | null;
 *     };
 *     dirStats: { dirStatsTimeoutMs: number };
 *     zip: {
 *       zipModalEl: HTMLElement | null;
 *       zipDestination: string;
 *       zipPassword: string;
 *       zipConfirmIndex: number;
 *       zipOverwriteConfirmed: boolean;
 *     };
 *     contextMenu: { contextMenuEl: HTMLElement | null };
 *     failure: { failureModalEl: HTMLElement | null };
 *   };
 * }} params
 */

export type ViewPropsInputsParams = Record<string, unknown>;

/**
 * @param {{
 *   menuOpen: boolean;
 *   currentPath: string;
 *   pathHistory: string[];
 *   showTree: boolean;
 *   treeEl: HTMLElement | null;
 *   treeLoading: boolean;
 *   treeRoot: any;
 *   treeSelectedPath: string;
 *   treeFocusedIndex: number;
 *   showSize: boolean;
 *   showTime: boolean;
 *   uiFileIconMode: "by_type" | "simple" | "none";
 *   loading: boolean;
 *   filteredEntries: any[];
 *   entries: any[];
 *   overflowLeft: boolean;
 *   overflowRight: boolean;
 *   visibleColStart: number;
 *   visibleColEnd: number;
 *   listRows: number;
 *   selectedPaths: string[];
 *   dropdownItems: any[];
 *   searchActive: boolean;
 *   searchError: string;
 *   sortMenuOpen: boolean;
 *   aboutOpen: boolean;
 *   deleteConfirmOpen: boolean;
 *   deleteTargets: string[];
 *   deleteError: string;
 *   pasteConfirmOpen: boolean;
 *   pasteConflicts: any[];
 *   createOpen: boolean;
 *   createError: string;
 *   jumpUrlOpen: boolean;
 *   renameOpen: boolean;
 *   renameError: string;
 *   propertiesOpen: boolean;
 *   propertiesData: any;
 *   dirStatsInFlight: boolean;
 *   zipModalOpen: boolean;
 *   zipMode: string;
 *   zipTargets: string[];
 *   zipPasswordAttempts: number;
 *   zipError: string;
 *   contextMenuOpen: boolean;
 *   contextMenuPos: { x: number; y: number } | null;
 *   contextMenuIndex: number;
 *   error: string;
 *   failureModalOpen: boolean;
 *   failureModalTitle: string;
 *   failureItems: any[];
 *   jumpList: string[];
 * }} params
 */
export function buildViewState(params) {
  return {
    menuOpen: params.menuOpen,
    currentPath: params.currentPath,
    pathHistory: params.pathHistory,
    showTree: params.showTree,
    treeEl: params.treeEl,
    treeLoading: params.treeLoading,
    treeRoot: params.treeRoot,
    treeSelectedPath: params.treeSelectedPath,
    treeFocusedIndex: params.treeFocusedIndex,
    showSize: params.showSize,
    showTime: params.showTime,
    uiFileIconMode: params.uiFileIconMode,
    loading: params.loading,
    filteredEntries: params.filteredEntries,
    entries: params.entries,
    overflowLeft: params.overflowLeft,
    overflowRight: params.overflowRight,
    visibleColStart: params.visibleColStart,
    visibleColEnd: params.visibleColEnd,
    listRows: params.listRows,
    selectedPaths: params.selectedPaths,
    dropdownItems: params.dropdownItems,
    searchActive: params.searchActive,
    searchError: params.searchError,
    sortMenuOpen: params.sortMenuOpen,
    aboutOpen: params.aboutOpen,
    deleteConfirmOpen: params.deleteConfirmOpen,
    deleteTargets: params.deleteTargets,
    deleteError: params.deleteError,
    pasteConfirmOpen: params.pasteConfirmOpen,
    pasteConflicts: params.pasteConflicts,
    createOpen: params.createOpen,
    createError: params.createError,
    jumpUrlOpen: params.jumpUrlOpen,
    renameOpen: params.renameOpen,
    renameError: params.renameError,
    propertiesOpen: params.propertiesOpen,
    propertiesData: params.propertiesData,
    dirStatsInFlight: params.dirStatsInFlight,
    zipModalOpen: params.zipModalOpen,
    zipMode: params.zipMode,
    zipTargets: params.zipTargets,
    zipPasswordAttempts: params.zipPasswordAttempts,
    zipError: params.zipError,
    contextMenuOpen: params.contextMenuOpen,
    contextMenuPos: params.contextMenuPos,
    contextMenuIndex: params.contextMenuIndex,
    error: params.error,
    failureModalOpen: params.failureModalOpen,
    failureModalTitle: params.failureModalTitle,
    failureItems: params.failureItems,
    jumpList: params.jumpList,
  };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyProviderCapabilities = createEmptyProviderCapabilities;
exports.createDefaultPaneListState = createDefaultPaneListState;
exports.createDefaultPaneDropdownState = createDefaultPaneDropdownState;
exports.createDefaultPaneSearchState = createDefaultPaneSearchState;
exports.createDefaultPaneState = createDefaultPaneState;
function createEmptyProviderCapabilities() {
    return {
        can_read: false,
        can_create: false,
        can_rename: false,
        can_copy: false,
        can_move: false,
        can_delete: false,
        can_archive_create: false,
        can_archive_extract: false,
    };
}
function createDefaultPaneListState() {
    return {
        focusedIndex: 0,
        anchorIndex: 0,
        selectedPaths: [],
    };
}
function createDefaultPaneDropdownState() {
    return {
        open: false,
        mode: "history",
        index: 0,
    };
}
function createDefaultPaneSearchState() {
    return {
        query: "",
        active: false,
        regex: false,
        error: "",
    };
}
function createDefaultPaneState(id, options = {}) {
    const currentPath = String(options.currentPath || "");
    return {
        id,
        currentPath,
        currentPathCapabilities: options.capabilities || createEmptyProviderCapabilities(),
        pathInput: currentPath,
        entries: Array.isArray(options.entries) ? [...options.entries] : [],
        loading: false,
        error: "",
        lastFocusedTarget: options.lastFocusedTarget || "list",
        list: createDefaultPaneListState(),
        dropdown: createDefaultPaneDropdownState(),
        search: createDefaultPaneSearchState(),
    };
}

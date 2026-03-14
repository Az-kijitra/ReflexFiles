"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaneController = createPaneController;
const path_1 = require("./path");
function clampIndex(listLength, nextIndex) {
    if (!Number.isFinite(listLength) || listLength <= 0)
        return 0;
    return Math.max(0, Math.min(Number(nextIndex || 0), listLength - 1));
}
function getOtherPaneId(paneId) {
    return paneId === "left" ? "right" : "left";
}
function joinPanePath(parent, name) {
    const base = String(parent || "").trim();
    if (!base)
        return String(name || "");
    if (/^[A-Za-z]:\\?$/.test(base)) {
        return `${base.replace(/\\?$/, "\\")}${name}`;
    }
    return `${base.replace(/[\\/]+$/, "")}\\${name}`;
}
function buildOptimisticEntry(parent, name, kind) {
    const normalizedName = String(name || "").trim();
    const isDir = kind === "folder";
    const extMatch = isDir ? null : normalizedName.match(/\.([^.]+)$/);
    return {
        name: normalizedName,
        path: joinPanePath(parent, normalizedName),
        type: isDir ? "dir" : "file",
        size: 0,
        modified: new Date().toISOString(),
        hidden: normalizedName.startsWith("."),
        ext: isDir ? "" : String(extMatch?.[1] || "").toLowerCase(),
        provider: "local",
    };
}
function hasEntryPath(entries, path) {
    return Array.isArray(entries)
        ? entries.some((entry) => String(entry?.path || "") === String(path || ""))
        : false;
}
function upsertEntry(entries, nextEntry) {
    const list = Array.isArray(entries) ? entries : [];
    const existingIndex = list.findIndex((entry) => String(entry?.path || "") === String(nextEntry.path || ""));
    if (existingIndex >= 0) {
        const cloned = [...list];
        cloned[existingIndex] = nextEntry;
        return cloned;
    }
    return [...list, nextEntry];
}
function buildClipboardPreviewItems(entries, paths, cut) {
    const byPath = new Map(entries.map((entry) => [String(entry?.path || ""), entry]));
    return paths.map((path) => {
        const entry = byPath.get(String(path || ""));
        return {
            sourcePath: String(path || ""),
            name: String(entry?.name || String(path || "").split(/[\\/]/).pop() || ""),
            kind: entry?.type === "dir" ? "dir" : "file",
            provider: entry?.provider || "local",
            mode: cut ? "cut" : "copy",
            sourceModified: String(entry?.modified || ""),
            sourceSize: Number(entry?.size || 0),
            conflict: false,
            destinationPath: "",
            destinationKind: null,
            destinationModified: "",
            destinationSize: null,
            comparison: entry?.provider === "local" ? "ready" : "source_not_local",
        };
    });
}
function createPaneController(state, backend, options) {
    async function reloadPaneInternal(paneId, restoreFocus = true) {
        const pane = state.getPaneState(paneId);
        const currentPath = String(pane.currentPath || "").trim();
        if (!currentPath) {
            return {
                ok: false,
                error: "empty path",
            };
        }
        state.patchPaneState(paneId, {
            loading: true,
            error: "",
        });
        try {
            const entries = await backend.listDir(currentPath, {
                showHidden: options.showHidden,
                sortKey: options.sortKey,
                sortOrder: options.sortOrder,
            });
            state.patchPaneState(paneId, {
                entries: Array.isArray(entries) ? entries : [],
                loading: false,
                error: "",
                list: {
                    ...pane.list,
                    focusedIndex: clampIndex(Array.isArray(entries) ? entries.length : 0, pane.list?.focusedIndex ?? 0),
                    anchorIndex: pane.list?.anchorIndex ?? 0,
                    selectedPaths: Array.isArray(pane.list?.selectedPaths) ? pane.list.selectedPaths : [],
                },
            });
            return {
                ok: true,
                changedPaneIds: [paneId],
                focusPlan: restoreFocus
                    ? {
                        paneId,
                        target: pane.lastFocusedTarget || "list",
                        index: clampIndex(Array.isArray(entries) ? entries.length : 0, pane.list?.focusedIndex ?? 0),
                    }
                    : null,
            };
        }
        catch (err) {
            state.patchPaneState(paneId, {
                loading: false,
                error: String(err?.message || err || ""),
            });
            return {
                ok: false,
                error: String(err?.message || err || ""),
            };
        }
    }
    async function reloadMirroredPaneIfNeeded(sourcePaneId, changedPaneIds, optimisticEntry) {
        const otherPaneId = getOtherPaneId(sourcePaneId);
        const sourcePath = state.getPaneState(sourcePaneId).currentPath;
        const otherPath = state.getPaneState(otherPaneId).currentPath;
        if (!backend.isSamePathTarget(sourcePath, otherPath))
            return;
        const result = await reloadPaneInternal(otherPaneId, false);
        if (!result.ok)
            return;
        if (optimisticEntry) {
            const otherPane = state.getPaneState(otherPaneId);
            if (!hasEntryPath(otherPane.entries, optimisticEntry.path)) {
                state.patchPaneState(otherPaneId, {
                    entries: upsertEntry(otherPane.entries, optimisticEntry),
                });
            }
        }
        changedPaneIds.push(otherPaneId);
    }
    function setFocusSelectionState(paneId, focusedIndex, selectedPaths, anchorIndex) {
        const pane = state.getPaneState(paneId);
        state.patchPaneState(paneId, {
            list: {
                ...pane.list,
                focusedIndex,
                selectedPaths,
                anchorIndex,
            },
            lastFocusedTarget: "list",
        });
        return { paneId, target: "list", index: focusedIndex };
    }
    return {
        async loadDir(paneId, path, optionsArg = {}) {
            state.patchPaneState(paneId, {
                currentPath: path,
                pathInput: path,
                lastFocusedTarget: optionsArg.focusTarget || "list",
            });
            return reloadPaneInternal(paneId, optionsArg.restoreFocus !== false);
        },
        async reloadDir(paneId, optionsArg = {}) {
            return reloadPaneInternal(paneId, optionsArg.restoreFocus !== false);
        },
        activatePane(paneId, focusTarget = "list") {
            state.setActivePaneId(paneId);
            state.patchPaneState(paneId, {
                lastFocusedTarget: focusTarget,
            });
            return { paneId, target: focusTarget };
        },
        switchPane(direction) {
            const activePaneId = state.getActivePaneId();
            const nextPaneId = direction === "next" ? getOtherPaneId(activePaneId) : getOtherPaneId(activePaneId);
            const nextPane = state.getPaneState(nextPaneId);
            state.setActivePaneId(nextPaneId);
            return {
                paneId: nextPaneId,
                target: nextPane.lastFocusedTarget || "list",
                index: nextPane.list?.focusedIndex ?? 0,
            };
        },
        setFocusedIndex(paneId, index) {
            const pane = state.getPaneState(paneId);
            const focusedIndex = clampIndex(pane.entries.length, index);
            return setFocusSelectionState(paneId, focusedIndex, Array.isArray(pane.list?.selectedPaths) ? pane.list.selectedPaths : [], pane.list?.anchorIndex ?? focusedIndex);
        },
        moveFocus(paneId, delta) {
            const pane = state.getPaneState(paneId);
            return this.setFocusedIndex(paneId, (pane.list?.focusedIndex ?? 0) + delta);
        },
        moveFocusPage(paneId, deltaPages) {
            return this.moveFocus(paneId, deltaPages * 10);
        },
        focusHome(paneId) {
            return this.setFocusedIndex(paneId, 0);
        },
        focusEnd(paneId) {
            const pane = state.getPaneState(paneId);
            return this.setFocusedIndex(paneId, pane.entries.length - 1);
        },
        selectSingle(paneId, index) {
            const pane = state.getPaneState(paneId);
            const entry = pane.entries[index];
            if (!entry)
                return null;
            return setFocusSelectionState(paneId, index, [String(entry.path || "")], index);
        },
        toggleSelect(paneId, index) {
            const pane = state.getPaneState(paneId);
            const entry = pane.entries[index];
            if (!entry)
                return null;
            const entryPath = String(entry.path || "");
            const selectedPaths = Array.isArray(pane.list?.selectedPaths) && pane.list.selectedPaths.includes(entryPath)
                ? pane.list.selectedPaths.filter((path) => path !== entryPath)
                : [...(Array.isArray(pane.list?.selectedPaths) ? pane.list.selectedPaths : []), entryPath];
            return setFocusSelectionState(paneId, index, selectedPaths, index);
        },
        rangeSelect(paneId, index) {
            const pane = state.getPaneState(paneId);
            const anchorIndex = pane.list?.anchorIndex ?? index;
            const start = Math.max(0, Math.min(anchorIndex, index));
            const end = Math.min(pane.entries.length - 1, Math.max(anchorIndex, index));
            const selectedPaths = pane.entries.slice(start, end + 1).map((entry) => String(entry.path || ""));
            return setFocusSelectionState(paneId, index, selectedPaths, anchorIndex);
        },
        selectAll(paneId) {
            const pane = state.getPaneState(paneId);
            return setFocusSelectionState(paneId, 0, pane.entries.map((entry) => String(entry.path || "")), 0);
        },
        selectWithSpace(paneId, index, optionsArg = {}) {
            return optionsArg.range ? this.rangeSelect(paneId, index) : this.toggleSelect(paneId, index);
        },
        async openFocused(paneId) {
            const pane = state.getPaneState(paneId);
            const entry = pane.entries[pane.list?.focusedIndex ?? 0];
            if (!entry) {
                return { ok: false, error: "no focused entry" };
            }
            return {
                ok: true,
                openedEntryPath: String(entry.path || ""),
                openedEntryType: entry.type === "dir" ? "dir" : "file",
                viewerPath: entry.type === "dir" ? null : String(entry.path || ""),
            };
        },
        async navigateParent(paneId) {
            const pane = state.getPaneState(paneId);
            const parentPath = (0, path_1.getParentPath)(String(pane.currentPath || ""));
            if (!parentPath)
                return null;
            const result = await this.loadDir(paneId, parentPath, {
                focusTarget: "list",
                restoreFocus: true,
            });
            return result.focusPlan || { paneId, target: "list", index: 0 };
        },
        async createEntry(paneId, kind, name) {
            const pane = state.getPaneState(paneId);
            const currentPath = String(pane.currentPath || "").trim();
            const createName = String(name || "").trim();
            if (!currentPath) {
                return { ok: false, error: "empty path" };
            }
            if (!createName) {
                return { ok: false, error: "empty name" };
            }
            try {
                await backend.create(currentPath, createName, kind);
            }
            catch (err) {
                return {
                    ok: false,
                    error: String(err?.message || err || ""),
                };
            }
            const optimisticEntry = buildOptimisticEntry(currentPath, createName, kind);
            state.patchPaneState(paneId, {
                entries: upsertEntry(pane.entries, optimisticEntry),
            });
            const changedPaneIds = [paneId];
            const result = await reloadPaneInternal(paneId, false);
            if (!result.ok) {
                return {
                    ok: true,
                    createdEntry: optimisticEntry,
                    changedPaneIds,
                    focusPlan: {
                        paneId,
                        target: "list",
                        index: state.getPaneState(paneId).list?.focusedIndex ?? 0,
                    },
                };
            }
            const reloadedPane = state.getPaneState(paneId);
            if (!hasEntryPath(reloadedPane.entries, optimisticEntry.path)) {
                state.patchPaneState(paneId, {
                    entries: upsertEntry(reloadedPane.entries, optimisticEntry),
                });
            }
            const otherPaneId = getOtherPaneId(paneId);
            const otherPane = state.getPaneState(otherPaneId);
            if (backend.isSamePathTarget(currentPath, otherPane.currentPath)) {
                state.patchPaneState(otherPaneId, {
                    entries: upsertEntry(otherPane.entries, optimisticEntry),
                });
            }
            await reloadMirroredPaneIfNeeded(paneId, changedPaneIds, optimisticEntry);
            return {
                ok: true,
                changedPaneIds,
                createdEntry: optimisticEntry,
                focusPlan: {
                    paneId,
                    target: "list",
                    index: state.getPaneState(paneId).list?.focusedIndex ?? 0,
                },
            };
        },
        async deleteTargets(paneId, targets) {
            const normalizedTargets = Array.isArray(targets) ? targets.map((path) => String(path || "")).filter(Boolean) : [];
            if (normalizedTargets.length === 0) {
                return { ok: false, error: "no targets" };
            }
            try {
                await backend.deleteWithUndo(normalizedTargets);
            }
            catch (err) {
                return {
                    ok: false,
                    error: String(err?.message || err || ""),
                };
            }
            const pane = state.getPaneState(paneId);
            state.patchPaneState(paneId, {
                entries: pane.entries.filter((entry) => !normalizedTargets.includes(String(entry.path || ""))),
                list: {
                    ...pane.list,
                    selectedPaths: pane.list.selectedPaths.filter((path) => !normalizedTargets.includes(String(path || ""))),
                },
            });
            const changedPaneIds = [paneId];
            await reloadMirroredPaneIfNeeded(paneId, changedPaneIds);
            return {
                ok: true,
                changedPaneIds,
                focusPlan: {
                    paneId,
                    target: "list",
                    index: clampIndex(state.getPaneState(paneId).entries.length, state.getPaneState(paneId).list?.focusedIndex ?? 0),
                },
            };
        },
        async copySelection(paneId) {
            const pane = state.getPaneState(paneId);
            const paths = Array.isArray(pane.list?.selectedPaths) && pane.list.selectedPaths.length > 0
                ? pane.list.selectedPaths
                : pane.entries[pane.list?.focusedIndex ?? 0]?.path
                    ? [String(pane.entries[pane.list?.focusedIndex ?? 0].path || "")]
                    : [];
            if (paths.length === 0)
                return { ok: false, error: "no selection" };
            state.setClipboardState({ paths, cut: false });
            state.setClipboardPreviewState({
                items: buildClipboardPreviewItems(pane.entries, paths, false),
                dismissed: false,
            });
            return { ok: true, changedPaneIds: [] };
        },
        async cutSelection(paneId) {
            const pane = state.getPaneState(paneId);
            const paths = Array.isArray(pane.list?.selectedPaths) && pane.list.selectedPaths.length > 0
                ? pane.list.selectedPaths
                : pane.entries[pane.list?.focusedIndex ?? 0]?.path
                    ? [String(pane.entries[pane.list?.focusedIndex ?? 0].path || "")]
                    : [];
            if (paths.length === 0)
                return { ok: false, error: "no selection" };
            state.setClipboardState({ paths, cut: true });
            state.setClipboardPreviewState({
                items: buildClipboardPreviewItems(pane.entries, paths, true),
                dismissed: false,
            });
            return { ok: true, changedPaneIds: [] };
        },
        async pasteIntoPane(paneId) {
            const pane = state.getPaneState(paneId);
            const clipboardState = state.getClipboardState();
            const destination = String(pane.currentPath || "").trim();
            const paths = Array.isArray(clipboardState.paths) ? clipboardState.paths.filter(Boolean) : [];
            if (!destination || paths.length === 0) {
                return { ok: false, error: "empty clipboard or destination" };
            }
            const conflicts = backend.getPasteConflicts(paths, pane.entries);
            if (conflicts.length > 0) {
                return { ok: false, error: "conflicts_detected" };
            }
            try {
                if (clipboardState.cut) {
                    await backend.move(paths, destination);
                }
                else {
                    await backend.copy(paths, destination, null);
                }
            }
            catch (err) {
                return {
                    ok: false,
                    error: String(err?.message || err || ""),
                };
            }
            const changedPaneIds = [];
            const result = await reloadPaneInternal(paneId, false);
            if (result.ok)
                changedPaneIds.push(paneId);
            if (clipboardState.cut) {
                await reloadMirroredPaneIfNeeded(paneId, changedPaneIds);
                state.setClipboardState({ paths: [], cut: false });
                state.setClipboardPreviewState({ items: [], dismissed: false });
            }
            return {
                ok: true,
                changedPaneIds,
                focusPlan: {
                    paneId,
                    target: "list",
                    index: state.getPaneState(paneId).list?.focusedIndex ?? 0,
                },
            };
        },
        getDeleteTargetsForFocusedContext(paneId) {
            const pane = state.getPaneState(paneId);
            const focusedEntry = pane.entries[pane.list?.focusedIndex ?? 0];
            const focusedPath = String(focusedEntry?.path || "");
            const selectedPaths = Array.isArray(pane.list?.selectedPaths) ? pane.list.selectedPaths : [];
            if (!focusedPath)
                return selectedPaths;
            if (selectedPaths.includes(focusedPath))
                return selectedPaths;
            return [focusedPath];
        },
        getComparableSelection(paneId) {
            const pane = state.getPaneState(paneId);
            const selectedPaths = Array.isArray(pane.list?.selectedPaths) ? pane.list.selectedPaths : [];
            if (selectedPaths.length === 1)
                return String(selectedPaths[0] || "");
            const focusedEntry = pane.entries[pane.list?.focusedIndex ?? 0];
            return focusedEntry?.path ? String(focusedEntry.path || "") : null;
        },
    };
}

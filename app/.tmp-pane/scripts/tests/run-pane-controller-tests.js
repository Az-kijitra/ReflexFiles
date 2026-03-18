"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pane_controller_1 = require("../../src/lib/utils/pane_controller");
const pane_state_1 = require("../../src/lib/utils/pane_state");
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${String(expected)}, got ${String(actual)}`);
    }
}
function assertDeepEqual(actual, expected, message) {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(message || `Expected ${expectedJson}, got ${actualJson}`);
    }
}
function createStateAdapter() {
    const state = {
        layoutMode: "dual",
        activePaneId: "left",
        panes: {
            left: (0, pane_state_1.createDefaultPaneState)("left", { currentPath: "C:\\Work" }),
            right: (0, pane_state_1.createDefaultPaneState)("right", { currentPath: "D:\\Data" }),
        },
        clipboard: {
            paths: [],
            cut: false,
        },
        clipboardPreview: {
            items: [],
            dismissed: false,
        },
    };
    return {
        state,
        adapter: {
            getLayoutMode: () => state.layoutMode,
            getActivePaneId: () => state.activePaneId,
            setActivePaneId: (paneId) => {
                state.activePaneId = paneId;
            },
            getPaneState: (paneId) => state.panes[paneId],
            patchPaneState: (paneId, patch) => {
                const current = state.panes[paneId];
                state.panes[paneId] = {
                    ...current,
                    ...patch,
                    list: patch.list ? { ...current.list, ...patch.list } : current.list,
                    dropdown: patch.dropdown ? { ...current.dropdown, ...patch.dropdown } : current.dropdown,
                    search: patch.search ? { ...current.search, ...patch.search } : current.search,
                };
            },
            getClipboardState: () => ({ ...state.clipboard, paths: [...state.clipboard.paths] }),
            setClipboardState: (next) => {
                state.clipboard = {
                    paths: Array.isArray(next.paths) ? [...next.paths] : [],
                    cut: Boolean(next.cut),
                };
            },
            getClipboardPreviewState: () => ({
                items: [...state.clipboardPreview.items],
                dismissed: Boolean(state.clipboardPreview.dismissed),
            }),
            setClipboardPreviewState: (next) => {
                state.clipboardPreview = {
                    ...state.clipboardPreview,
                    ...next,
                    items: Array.isArray(next.items) ? [...next.items] : state.clipboardPreview.items,
                };
            },
        },
    };
}
function createBackend(overrides = {}) {
    const lists = new Map();
    return {
        lists,
        backend: {
            listDir: async (path) => [...(lists.get(path) || [])],
            create: async () => { },
            deleteWithUndo: async () => null,
            copy: async () => null,
            move: async () => null,
            clipboardGetFiles: async () => [],
            clipboardSetFiles: async () => null,
            getPasteConflicts: () => [],
            isSamePathTarget: (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase(),
            ...overrides,
        },
    };
}
test("createEntry updates source pane immediately when reload is stale", async () => {
    const { state, adapter } = createStateAdapter();
    const { lists, backend } = createBackend();
    lists.set("C:\\Work", []);
    const controller = (0, pane_controller_1.createPaneController)(adapter, backend, {
        showHidden: false,
        sortKey: "name",
        sortOrder: "asc",
    });
    const result = await controller.createEntry("left", "file", "a.txt");
    assertEqual(result.ok, true);
    assertEqual(result.createdEntry?.path, "C:\\Work\\a.txt");
    assertEqual(state.panes.left.entries.some((entry) => entry.path === "C:\\Work\\a.txt"), true);
});
test("createEntry updates mirrored pane when both panes view same folder", async () => {
    const { state, adapter } = createStateAdapter();
    state.panes.right.currentPath = "C:\\Work";
    const { lists, backend } = createBackend();
    lists.set("C:\\Work", []);
    const controller = (0, pane_controller_1.createPaneController)(adapter, backend, {
        showHidden: false,
        sortKey: "name",
        sortOrder: "asc",
    });
    const result = await controller.createEntry("left", "folder", "docs");
    assertEqual(result.ok, true);
    assertEqual(state.panes.left.entries.some((entry) => entry.path === "C:\\Work\\docs"), true);
    assertEqual(state.panes.right.entries.some((entry) => entry.path === "C:\\Work\\docs"), true);
});
test("deleteTargetsForFocusedContext prefers selection when focus is inside selection", async () => {
    const { state, adapter } = createStateAdapter();
    state.panes.left.entries = [
        { name: "a.txt", path: "C:\\Work\\a.txt", type: "file", size: 0, modified: "", hidden: false, ext: "txt" },
        { name: "b.txt", path: "C:\\Work\\b.txt", type: "file", size: 0, modified: "", hidden: false, ext: "txt" },
    ];
    state.panes.left.list.focusedIndex = 1;
    state.panes.left.list.selectedPaths = ["C:\\Work\\a.txt", "C:\\Work\\b.txt"];
    const { backend } = createBackend();
    const controller = (0, pane_controller_1.createPaneController)(adapter, backend, {
        showHidden: false,
        sortKey: "name",
        sortOrder: "asc",
    });
    assertDeepEqual(controller.getDeleteTargetsForFocusedContext("left"), [
        "C:\\Work\\a.txt",
        "C:\\Work\\b.txt",
    ]);
});
test("deleteTargetsForFocusedContext prefers focused item when focus is outside selection", async () => {
    const { state, adapter } = createStateAdapter();
    state.panes.left.entries = [
        { name: "a.txt", path: "C:\\Work\\a.txt", type: "file", size: 0, modified: "", hidden: false, ext: "txt" },
        { name: "b.txt", path: "C:\\Work\\b.txt", type: "file", size: 0, modified: "", hidden: false, ext: "txt" },
    ];
    state.panes.left.list.focusedIndex = 1;
    state.panes.left.list.selectedPaths = ["C:\\Work\\a.txt"];
    const { backend } = createBackend();
    const controller = (0, pane_controller_1.createPaneController)(adapter, backend, {
        showHidden: false,
        sortKey: "name",
        sortOrder: "asc",
    });
    assertDeepEqual(controller.getDeleteTargetsForFocusedContext("left"), ["C:\\Work\\b.txt"]);
});
async function main() {
    let failed = 0;
    for (const { name, fn } of tests) {
        try {
            await fn();
            console.log(`[test:pane] PASS ${name}`);
        }
        catch (error) {
            failed += 1;
            console.error(`[test:pane] FAIL ${name}`);
            console.error(error instanceof Error ? error.stack : error);
        }
    }
    if (failed > 0) {
        console.error(`[test:pane] ${failed} test(s) failed.`);
        process.exit(1);
    }
    console.log(`[test:pane] all ${tests.length} test(s) passed.`);
}
main();

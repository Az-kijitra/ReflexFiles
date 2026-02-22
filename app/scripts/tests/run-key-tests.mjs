import assert from "node:assert/strict";
import {
  eventToKeyString,
  normalizeKeyPart,
  normalizeKeyString,
  splitBindings,
} from "../../src/lib/utils/keymap.ts";
import { handleOverlayKey } from "../../src/lib/utils/keyboard_overlay.ts";
import { createPathCompletionHelpers } from "../../src/lib/page_path_completion.ts";
import { createPageKeydownHandler } from "../../src/lib/page_dom_handlers_keydown.ts";
import { KEYMAP_DEFAULTS } from "../../src/lib/ui_constants.ts";

const tests = [];
const defineTest = (name, fn) => tests.push({ name, fn });

function createTabEvent(options = {}) {
  let prevented = 0;
  let stopped = 0;
  return {
    event: {
      key: "Tab",
      shiftKey: Boolean(options.shiftKey),
      preventDefault() {
        prevented += 1;
      },
      stopPropagation() {
        stopped += 1;
      },
    },
    get prevented() {
      return prevented;
    },
    get stopped() {
      return stopped;
    },
  };
}

function createOverlayContext() {
  const state = {
    focusTreeTop: 0,
    focusList: 0,
    pathFocus: 0,
    pathSelect: 0,
  };
  const listEl = { contains: () => false };
  const treeEl = { contains: () => false };
  const pathInputEl = {
    contains: () => false,
    focus() {
      state.pathFocus += 1;
    },
    select() {
      state.pathSelect += 1;
    },
  };
  const ctx = {
    activeElement: null,
    listEl,
    pathInputEl,
    treeEl,
    dropdownEl: null,
    contextMenuEl: null,
    pasteConfirmOpen: false,
    deleteConfirmOpen: false,
    jumpUrlOpen: false,
    sortMenuOpen: false,
    zipModalOpen: false,
    failureModalOpen: false,
    dropdownOpen: false,
    renameOpen: false,
    createOpen: false,
    propertiesOpen: false,
    contextMenuOpen: false,
    showTree: true,
    focusTreeTop() {
      state.focusTreeTop += 1;
    },
    focusList() {
      state.focusList += 1;
    },
  };
  return { ctx, state };
}

function createPathCompletionHarness(options = {}) {
  let currentPath = options.currentPath ?? "C:\\Users\\toshi";
  let showHidden = false;
  let entries = [{ path: "C:\\Users\\toshi\\seed.txt", name: "seed.txt", type: "file" }];
  let pathInput = options.pathInput ?? "";
  let filteredEntries = entries;
  let previewActive = false;
  let statusMessage = "";
  const errors = [];
  const invokeCalls = [];
  const invokeImpl = options.invokeImpl ?? (async () => []);

  const helpers = createPathCompletionHelpers({
    getCurrentPath: () => currentPath,
    invoke: async (command, payload) => {
      invokeCalls.push({ command, payload });
      return invokeImpl(command, payload);
    },
    getShowHidden: () => showHidden,
    getEntries: () => entries,
    setPathInput: (value) => {
      pathInput = value;
    },
    setFilteredEntries: (value) => {
      filteredEntries = value;
    },
    setPathCompletionPreviewActive: (value) => {
      previewActive = value;
    },
    getStatusMessage: () => statusMessage,
    getRecomputeSearch: () => null,
    getSetStatusMessage: () => (message) => {
      statusMessage = String(message ?? "");
    },
    getShowError: () => (err) => {
      errors.push(err);
    },
    t: (key, vars = {}) => {
      if (key === "status.path_completion_candidates_cycle") {
        return `PATH補完候補: ${vars.count}件 (${vars.index}/${vars.total})`;
      }
      if (key === "status.path_completion_candidates") {
        return `PATH補完候補: ${vars.count}件`;
      }
      if (key === "status.path_completion_local_only") {
        return "LOCAL_ONLY";
      }
      if (key === "no_items") {
        return "NO_ITEMS";
      }
      return key;
    },
    treeNodeName: (value) => String(value || "").split(/[\\/]/).at(-1) ?? "",
  });

  return {
    helpers,
    state: {
      get pathInput() {
        return pathInput;
      },
      set pathInput(value) {
        pathInput = value;
      },
      get filteredEntries() {
        return filteredEntries;
      },
      get previewActive() {
        return previewActive;
      },
      get statusMessage() {
        return statusMessage;
      },
      get errors() {
        return errors;
      },
      get invokeCalls() {
        return invokeCalls;
      },
      get entries() {
        return entries;
      },
    },
  };
}

function createCtrlEvent(letter, keyCode) {
  return createKeyEvent({ ctrlKey: true, letter, keyCode });
}

function createAltEvent(letter, keyCode) {
  return createKeyEvent({ altKey: true, letter, keyCode });
}

function createKeyEvent({ ctrlKey = false, altKey = false, shiftKey = false, metaKey = false, letter, keyCode }) {
  let prevented = 0;
  return {
    event: {
      ctrlKey,
      altKey,
      shiftKey,
      metaKey,
      code: `Key${letter.toUpperCase()}`,
      key: letter.toLowerCase(),
      keyCode,
      which: keyCode,
      getModifierState: () => false,
      preventDefault() {
        prevented += 1;
      },
    },
    get prevented() {
      return prevented;
    },
  };
}

function createKeydownParams(overrides = {}) {
  const calls = {
    copy: 0,
    cut: 0,
    paste: 0,
    create: 0,
    createKinds: [],
    jumpAdd: 0,
    jumpAddUrl: 0,
    openConfig: 0,
    openKeymap: 0,
    openSort: 0,
    rename: 0,
    zipCreate: 0,
    zipExtract: 0,
    focusSearch: 0,
    searchSet: [],
    dropdownSet: [],
    dropdownModeSet: [],
    pathInputSet: [],
    selectedSet: [],
    anchorSet: [],
    focusPath: 0,
    status: [],
    global: 0,
  };
  const pathInputEl = overrides.pathInputEl ?? { contains: () => false, tagName: "INPUT" };
  const searchInputEl = overrides.searchInputEl ?? {
    focus() {
      calls.focusSearch += 1;
    },
  };
  const entries = overrides.entries ?? [{ path: "C:\\Users\\toshi\\a.txt", name: "a.txt", type: "file" }];
  const selectedPaths = overrides.selectedPaths ?? [];
  const focusedIndex = overrides.focusedIndex ?? 0;
  const pathHistory = overrides.pathHistory ?? [];
  const jumpList = overrides.jumpList ?? [];
  const params = {
    getPathInputEl: () => pathInputEl,
    getSearchInputEl: () => searchInputEl,
    getSelectedPaths: () => selectedPaths,
    getEntries: () => entries,
    getFocusedIndex: () => focusedIndex,
    getPasteConfirmOpen: () => false,
    getDeleteConfirmOpen: () => false,
    getJumpUrlOpen: () => false,
    getSortMenuOpen: () => false,
    getZipModalOpen: () => false,
    getFailureModalOpen: () => false,
    getDropdownOpen: () => false,
    getRenameOpen: () => false,
    getCreateOpen: () => false,
    getPropertiesOpen: () => false,
    getContextMenuOpen: () => false,
    setStatusMessage: (message) => {
      calls.status.push(message);
    },
    t: (key) => {
      if (key === "status.no_selection") return "NO_SELECTION";
      return key;
    },
    openCreate: (kind) => {
      calls.create += 1;
      calls.createKinds.push(kind);
    },
    copySelected: () => {
      calls.copy += 1;
    },
    cutSelected: () => {
      calls.cut += 1;
    },
    pasteItems: () => {
      calls.paste += 1;
    },
    handleGlobalKey: () => {
      calls.global += 1;
      return false;
    },
    getListEl: () => null,
    getTreeEl: () => null,
    getDropdownEl: () => null,
    getContextMenuEl: () => null,
    getShowTree: () => false,
    getShowHidden: () => false,
    getShowSize: () => false,
    getShowTime: () => false,
    getSearchActive: () => false,
    getCurrentPath: () => "C:\\Users\\toshi",
    getDropdownMode: () => "",
    getListRows: () => [],
    getJumpList: () => jumpList,
    getPathHistory: () => pathHistory,
    getMenuOpen: () => false,
    matchesAction: () => false,
    handleSortMenuKey: () => {},
    focusTreeTop: () => {},
    focusList: () => {},
    cancelRename: () => {},
    confirmRename: () => {},
    cancelCreate: () => {},
    confirmCreate: () => {},
    cancelJumpUrl: () => {},
    confirmJumpUrl: () => {},
    closeProperties: () => {},
    handleContextMenuKey: () => {},
    openConfigFile: () => {
      calls.openConfig += 1;
    },
    openKeymapHelp: () => {
      calls.openKeymap += 1;
    },
    handleTreeKey: () => false,
    performUndo: () => {},
    performRedo: () => {},
    clearDirStatsCache: () => {},
    selectAll: () => {},
    setSelected: (value) => {
      calls.selectedSet.push(value);
    },
    setAnchorIndex: (value) => {
      calls.anchorSet.push(value);
    },
    updateListRows: () => {},
    scheduleUiSave: () => {},
    buildTreeRoot: () => {},
    showError: () => {},
    openInExplorer: () => {},
    openInCmd: () => {},
    openInTerminalCmd: () => {},
    openInTerminalPowerShell: () => {},
    openInTerminalWsl: () => {},
    openInVSCode: () => {},
    openInGitClient: () => {},
    openZipCreate: () => {
      calls.zipCreate += 1;
    },
    openZipExtract: () => {
      calls.zipExtract += 1;
    },
    openProperties: () => {},
    loadDir: () => {},
    moveFocusByRow: () => {},
    moveFocusByColumn: () => {},
    toggleSelection: () => {},
    openEntry: () => {},
    openRename: () => {
      calls.rename += 1;
    },
    duplicateSelected: () => {},
    prefixDateSelected: () => {},
    hasOperationTargets: () => true,
    hasSelection: () => true,
    canCreateCurrentPath: () => true,
    canPasteCurrentPath: () => true,
    canCopyTargets: () => true,
    canDuplicateTargets: () => true,
    canPrefixDateTargets: () => true,
    canCutTargets: () => true,
    canRenameFocused: () => true,
    canDeleteSelection: () => true,
    canDeleteTargets: () => true,
    canOpenPropertiesSelection: () => true,
    canZipCreateSelection: () => true,
    canZipExtractSelection: () => true,
    canZipExtractFocused: () => true,
    addJumpCurrent: () => {
      calls.jumpAdd += 1;
    },
    openJumpUrlModal: () => {
      calls.jumpAddUrl += 1;
    },
    openSortMenu: () => {
      calls.openSort += 1;
    },
    closeSortMenu: () => {},
    getExternalApps: () => [],
    runExternalApp: () => {},
    setDropdownMode: (value) => {
      calls.dropdownModeSet.push(value);
    },
    setDropdownOpen: () => {},
    setSearchActive: (value) => {
      calls.searchSet.push(value);
    },
    setPathInput: (value) => {
      calls.pathInputSet.push(value);
    },
    setShowHidden: () => {},
    setShowSize: () => {},
    setShowTime: () => {},
    setShowTree: () => {},
    setDeleteTargets: () => {},
    setDeleteConfirmOpen: () => {},
    setDeleteConfirmIndex: () => {},
    setDeleteError: () => {},
    setPathHistory: () => {},
    closeMenu: () => {},
    confirm: () => {},
    exitApp: () => {},
    focusPathInput: () => {
      calls.focusPath += 1;
    },
    eventToKeyString: () => "",
    normalizeKeyString: () => "",
    getTargetEntry: () => null,
    ...overrides.params,
  };
  return { params, calls };
}

defineTest("keymap normalize and event mapping", () => {
  assert.equal(normalizeKeyPart("up"), "ArrowUp");
  assert.equal(normalizeKeyPart("space"), "Space");
  assert.equal(normalizeKeyString("a+ctrl"), "Ctrl+A");
  assert.equal(normalizeKeyString("shift+control+period"), "Shift+Ctrl+.");
  assert.deepEqual(splitBindings("Ctrl+C, Ctrl+V"), ["Ctrl+C", "Ctrl+V"]);

  const ctrlN = {
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    key: "n",
    code: "KeyN",
    getModifierState: () => false,
  };
  assert.equal(eventToKeyString(ctrlN), "Ctrl+N");
});

defineTest("windows keymap defaults (browser/Windows-oriented) stay intact", () => {
  const w = KEYMAP_DEFAULTS.windows;
  assert.equal(w.focus_path, "Alt+D");
  assert.equal(w.search, "Ctrl+F");
  assert.equal(w.go_parent, "Alt+Up, Backspace");
  assert.equal(w.history_jump_list, "Ctrl+Shift+O");
  assert.equal(w.jump_add, "Ctrl+D");
  assert.equal(w.jump_add_url, "Ctrl+Shift+D");
  assert.equal(w.history, "Ctrl+H");
  assert.equal(w.redo, "Ctrl+Y");
  assert.equal(w.duplicate, "Ctrl+Shift+C");
  assert.equal(w.prefix_date, "Ctrl+Alt+D");
});

defineTest("default keymaps have no duplicate bindings within each profile", () => {
  for (const profile of ["windows", "vim"]) {
    const map = KEYMAP_DEFAULTS[profile];
    const seen = new Map();
    const duplicates = [];
    for (const [actionId, bindingText] of Object.entries(map)) {
      const bindings = splitBindings(String(bindingText || "")).map((v) => normalizeKeyString(v));
      for (const binding of bindings) {
        if (!binding) continue;
        if (seen.has(binding)) {
          duplicates.push(`${binding}: ${seen.get(binding)} / ${actionId}`);
          continue;
        }
        seen.set(binding, actionId);
      }
    }
    assert.deepEqual(
      duplicates,
      [],
      `${profile} keymap duplicate bindings detected: ${duplicates.join(", ")}`
    );
  }
});

defineTest("overlay Tab focus cycle", () => {
  const key = createTabEvent();
  const { ctx, state } = createOverlayContext();
  ctx.activeElement = ctx.listEl;
  assert.equal(handleOverlayKey(key.event, ctx), true);
  assert.equal(state.pathFocus, 1);
  assert.equal(state.pathSelect, 1);
  assert.equal(key.prevented, 1);
  assert.equal(key.stopped, 1);

  const key2 = createTabEvent();
  const { ctx: ctx2, state: state2 } = createOverlayContext();
  ctx2.activeElement = ctx2.pathInputEl;
  ctx2.showTree = false;
  assert.equal(handleOverlayKey(key2.event, ctx2), true);
  assert.equal(state2.focusList, 1);

  const key3 = createTabEvent({ shiftKey: true });
  const { ctx: ctx3, state: state3 } = createOverlayContext();
  ctx3.activeElement = ctx3.listEl;
  ctx3.showTree = true;
  assert.equal(handleOverlayKey(key3.event, ctx3), true);
  assert.equal(state3.focusTreeTop, 1);
  assert.equal(state3.pathFocus, 0);

  const key4 = createTabEvent({ shiftKey: true });
  const { ctx: ctx4, state: state4 } = createOverlayContext();
  ctx4.activeElement = ctx4.treeEl;
  assert.equal(handleOverlayKey(key4.event, ctx4), true);
  assert.equal(state4.pathFocus, 1);
  assert.equal(state4.pathSelect, 1);

  const key5 = createTabEvent({ shiftKey: true });
  const { ctx: ctx5, state: state5 } = createOverlayContext();
  ctx5.activeElement = ctx5.pathInputEl;
  assert.equal(handleOverlayKey(key5.event, ctx5), true);
  assert.equal(state5.focusList, 1);
});

defineTest("path completion cycle and separator behavior", async () => {
  const { helpers, state } = createPathCompletionHarness({
    pathInput: "C:\\Users\\toshi\\a",
    invokeImpl: async (_command, payload) => {
      if (payload.path === "C:\\Users\\toshi") {
        return [
          { path: "C:\\Users\\toshi\\asada", name: "asada", type: "dir" },
          { path: "C:\\Users\\toshi\\adasa", name: "adasa", type: "dir" },
        ];
      }
      if (payload.path === "C:\\Users\\toshi\\adasa") {
        return [{ path: "C:\\Users\\toshi\\adasa\\child", name: "child", type: "dir" }];
      }
      return [];
    },
  });
  await helpers.handlePathTabCompletion(state.pathInput, 1);
  assert.equal(state.pathInput, "C:\\Users\\toshi\\adasa");
  await helpers.handlePathTabCompletion(state.pathInput, 1);
  assert.equal(state.pathInput, "C:\\Users\\toshi\\asada");
  assert.match(state.statusMessage, /2\/2/);
  assert.equal(helpers.clearPathCompletionPreview(), true);
  assert.equal(state.previewActive, false);

  state.pathInput = "C:\\Users\\toshi\\a";
  await helpers.handlePathTabCompletion(state.pathInput, 1);
  const handled = await helpers.handlePathCompletionSeparator(state.pathInput, "\\");
  assert.equal(handled, true);
  assert.equal(state.pathInput, "C:\\Users\\toshi\\adasa\\");
  assert.equal(state.errors.length, 0);
  helpers.clearPathCompletionPreview();
});

defineTest("gdrive path completion is local-only", async () => {
  const { helpers, state } = createPathCompletionHarness({
    currentPath: "gdrive://root/my-drive",
    pathInput: "gdrive://root/my-drive",
  });
  await helpers.handlePathTabCompletion(state.pathInput, 1);
  assert.equal(state.statusMessage, "LOCAL_ONLY");
  assert.equal(state.invokeCalls.length, 0);
});

defineTest("keydown fallback Ctrl+N/Ctrl+Shift+N/C/V", () => {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  try {
    globalThis.document = { activeElement: null };
    globalThis.window = {};
    const { params, calls } = createKeydownParams();
    const onKeyDown = createPageKeydownHandler(params);
    const ctrlN = createCtrlEvent("N", 78);
    onKeyDown(ctrlN.event);
    assert.equal(calls.create, 1);
    assert.equal(calls.createKinds.at(-1), "file");
    assert.equal(calls.global, 0);

    const ctrlShiftN = createKeyEvent({ ctrlKey: true, shiftKey: true, letter: "N", keyCode: 78 });
    onKeyDown(ctrlShiftN.event);
    assert.equal(calls.create, 2);
    assert.equal(calls.createKinds.at(-1), "folder");
    assert.equal(calls.global, 0);

    const ctrlV = createCtrlEvent("V", 86);
    onKeyDown(ctrlV.event);
    assert.equal(calls.paste, 1);
    assert.equal(calls.global, 0);

    const pathInputEl = { contains: () => false };
    globalThis.document = { activeElement: pathInputEl };
    const fallback2 = createKeydownParams({ pathInputEl });
    const onKeyDown2 = createPageKeydownHandler(fallback2.params);
    const ctrlCPath = createCtrlEvent("C", 67);
    onKeyDown2(ctrlCPath.event);
    assert.equal(fallback2.calls.copy, 0);
    assert.equal(fallback2.calls.global, 0);

    globalThis.document = { activeElement: null };
    const fallback3 = createKeydownParams({ entries: [], selectedPaths: [] });
    const onKeyDown3 = createPageKeydownHandler(fallback3.params);
    const ctrlCNoSelection = createCtrlEvent("C", 67);
    onKeyDown3(ctrlCNoSelection.event);
    assert.equal(fallback3.calls.status.at(-1), "NO_SELECTION");
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
});

defineTest("keydown fallback Alt+D and Ctrl+F boundaries", () => {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  try {
    globalThis.window = {};
    globalThis.document = { activeElement: null };
    const base = createKeydownParams();
    base.params.setDropdownOpen = (value) => {
      base.calls.dropdownSet.push(value);
    };
    const onKeyDown = createPageKeydownHandler(base.params);

    const altD = createAltEvent("D", 68);
    onKeyDown(altD.event);
    assert.equal(altD.prevented, 1);
    assert.equal(base.calls.focusPath, 1);
    assert.equal(base.calls.searchSet.at(-1), false);
    assert.equal(base.calls.dropdownSet.at(-1), false);
    assert.equal(base.calls.pathInputSet.at(-1), "C:\\Users\\toshi");
    assert.equal(base.calls.global, 0);

    const ctrlF = createCtrlEvent("F", 70);
    onKeyDown(ctrlF.event);
    assert.equal(ctrlF.prevented, 1);
    assert.equal(base.calls.searchSet.at(-1), true);
    assert.ok(base.calls.focusSearch >= 1);
    assert.equal(base.calls.global, 0);

    const pathInputEl = { contains: () => false };
    globalThis.document = { activeElement: pathInputEl };
    const pathCase = createKeydownParams({ pathInputEl });
    pathCase.params.setDropdownOpen = (value) => {
      pathCase.calls.dropdownSet.push(value);
    };
    const onKeyDownPath = createPageKeydownHandler(pathCase.params);
    const ctrlFInPath = createCtrlEvent("F", 70);
    onKeyDownPath(ctrlFInPath.event);
    assert.equal(ctrlFInPath.prevented, 1);
    assert.equal(pathCase.calls.searchSet.at(-1), true);
    assert.ok(pathCase.calls.focusSearch >= 1);
    assert.equal(pathCase.calls.global, 0);
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
});

defineTest("keydown fallback F2 / Ctrl+Alt+Z / Ctrl+Alt+X", () => {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  try {
    globalThis.window = {};
    globalThis.document = { activeElement: null };
    const zipEntry = { path: "C:\\Users\\toshi\\a.zip", name: "a.zip", ext: ".zip", type: "file" };
    const base = createKeydownParams({ entries: [zipEntry], selectedPaths: [] });
    const onKeyDown = createPageKeydownHandler(base.params);

    const f2 = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      key: "F2",
      code: "F2",
      keyCode: 113,
      which: 113,
      getModifierState: () => false,
      _prevented: 0,
      preventDefault() {
        this._prevented += 1;
      },
    };
    onKeyDown(f2);
    assert.equal(f2._prevented, 1);
    assert.equal(base.calls.rename, 1);

    const ctrlAltZ = createKeyEvent({ ctrlKey: true, altKey: true, letter: "Z", keyCode: 90 });
    onKeyDown(ctrlAltZ.event);
    assert.equal(ctrlAltZ.prevented, 1);
    assert.equal(base.calls.zipCreate, 1);

    const ctrlAltX = createKeyEvent({ ctrlKey: true, altKey: true, letter: "X", keyCode: 88 });
    onKeyDown(ctrlAltX.event);
    assert.equal(ctrlAltX.prevented, 1);
    assert.equal(base.calls.zipExtract, 1);
    assert.deepEqual(base.calls.selectedSet.at(-1), [zipEntry.path]);
    assert.equal(base.calls.anchorSet.at(-1), 0);
    assert.equal(base.calls.global, 0);

    const pathInputEl = { contains: () => false, tagName: "INPUT" };
    globalThis.document = { activeElement: pathInputEl };
    const pathCase = createKeydownParams({ pathInputEl, entries: [zipEntry] });
    const onKeyDownPath = createPageKeydownHandler(pathCase.params);
    const f2Path = {
      ...f2,
      _prevented: 0,
      preventDefault() {
        this._prevented += 1;
      },
    };
    onKeyDownPath(f2Path);
    assert.equal(f2Path._prevented, 0);
    assert.equal(pathCase.calls.rename, 0);
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
});

defineTest("keydown does not block main shortcuts when settings flag is stale outside settings modal", () => {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  try {
    globalThis.window = { __rf_settings_open: true };
    globalThis.document = { activeElement: null };
    const base = createKeydownParams();
    const onKeyDown = createPageKeydownHandler(base.params);

    const ctrlF = createCtrlEvent("F", 70);
    ctrlF.event.target = { closest: () => null };
    onKeyDown(ctrlF.event);
    assert.equal(ctrlF.prevented, 1);
    assert.equal(base.calls.searchSet.at(-1), true);

    const f2 = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      key: "F2",
      code: "F2",
      keyCode: 113,
      which: 113,
      getModifierState: () => false,
      target: { closest: () => null },
      _prevented: 0,
      preventDefault() {
        this._prevented += 1;
      },
    };
    onKeyDown(f2);
    assert.equal(f2._prevented, 1);
    assert.equal(base.calls.rename, 1);

    const blocked = createCtrlEvent("F", 70);
    blocked.event.target = { closest: (sel) => (sel === ".settings-modal" ? {} : null) };
    onKeyDown(blocked.event);
    assert.equal(blocked.prevented, 0);
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
});

defineTest("keydown core shortcuts bypass stale overlay flags when target is main view", () => {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  try {
    globalThis.window = {};
    globalThis.document = { activeElement: null };
    const zipEntry = { path: "C:\\Users\\toshi\\a.zip", name: "a.zip", ext: ".zip", type: "file" };
    const base = createKeydownParams({
      entries: [zipEntry],
      params: {
        getRenameOpen: () => true, // stale state (dialog is not actually on target DOM)
      },
    });
    const onKeyDown = createPageKeydownHandler(base.params);

    const ctrlF = createCtrlEvent("F", 70);
    ctrlF.event.target = { closest: () => null };
    onKeyDown(ctrlF.event);
    assert.equal(ctrlF.prevented, 1);
    assert.equal(base.calls.searchSet.at(-1), true);

    const f2 = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      key: "F2",
      code: "F2",
      keyCode: 113,
      which: 113,
      getModifierState: () => false,
      target: { closest: () => null },
      _prevented: 0,
      preventDefault() {
        this._prevented += 1;
      },
    };
    onKeyDown(f2);
    assert.equal(f2._prevented, 1);
    assert.equal(base.calls.rename, 1);

    const ctrlAltZ = createKeyEvent({ ctrlKey: true, altKey: true, letter: "Z", keyCode: 90 });
    ctrlAltZ.event.target = { closest: () => null };
    onKeyDown(ctrlAltZ.event);
    assert.equal(ctrlAltZ.prevented, 1);
    assert.equal(base.calls.zipCreate, 1);

    const blockedByOverlayTarget = createCtrlEvent("F", 70);
    blockedByOverlayTarget.event.target = {
      closest: (sel) => (sel.includes(".modal") ? {} : null),
    };
    onKeyDown(blockedByOverlayTarget.event);
    // Overlay-originated events should not trigger the main-view fallback.
    assert.equal(blockedByOverlayTarget.prevented, 0);
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
});

defineTest("keydown fallback Ctrl+H / Ctrl+Shift+O (path input allowed, other inputs blocked)", () => {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  try {
    globalThis.window = {};
    globalThis.document = { activeElement: null };
    const base = createKeydownParams({
      pathHistory: [{ path: "C:\\Users\\toshi" }],
      jumpList: [{ path: "C:\\Work" }],
    });
    base.params.setDropdownOpen = (value) => {
      base.calls.dropdownSet.push(value);
    };
    const onKeyDown = createPageKeydownHandler(base.params);

    const ctrlH = createCtrlEvent("H", 72);
    onKeyDown(ctrlH.event);
    assert.equal(ctrlH.prevented, 1);
    assert.equal(base.calls.dropdownModeSet.at(-1), "history");
    assert.equal(base.calls.dropdownSet.at(-1), true);
    assert.equal(base.calls.global, 0);

    const ctrlShiftO = createKeyEvent({ ctrlKey: true, shiftKey: true, letter: "O", keyCode: 79 });
    onKeyDown(ctrlShiftO.event);
    assert.equal(ctrlShiftO.prevented, 1);
    assert.equal(base.calls.dropdownModeSet.at(-1), "jump");
    assert.equal(base.calls.dropdownSet.at(-1), true);
    assert.equal(base.calls.global, 0);

    const pathInputEl = { contains: () => false, tagName: "INPUT" };
    globalThis.document = { activeElement: pathInputEl };
    const pathCase = createKeydownParams({
      pathInputEl,
      pathHistory: [{ path: "C:\\Users\\toshi" }],
      jumpList: [{ path: "C:\\Work" }],
    });
    pathCase.params.setDropdownOpen = (value) => {
      pathCase.calls.dropdownSet.push(value);
    };
    const onKeyDownPath = createPageKeydownHandler(pathCase.params);
    const ctrlHPath = createCtrlEvent("H", 72);
    onKeyDownPath(ctrlHPath.event);
    assert.equal(ctrlHPath.prevented, 1);
    assert.equal(pathCase.calls.dropdownModeSet.at(-1), "history");

    const otherInput = { tagName: "INPUT" };
    globalThis.document = { activeElement: otherInput };
    const otherCase = createKeydownParams({
      pathHistory: [{ path: "C:\\Users\\toshi" }],
      jumpList: [{ path: "C:\\Work" }],
    });
    otherCase.params.setDropdownOpen = (value) => {
      otherCase.calls.dropdownSet.push(value);
    };
    const onKeyDownOther = createPageKeydownHandler(otherCase.params);
    const ctrlHOther = createCtrlEvent("H", 72);
    onKeyDownOther(ctrlHOther.event);
    assert.equal(ctrlHOther.prevented, 0);
    assert.equal(otherCase.calls.dropdownModeSet.length, 0);
    assert.equal(otherCase.calls.global, 0);
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
});

defineTest("keydown fallback Ctrl+D / Ctrl+Shift+D (input boundaries)", () => {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  try {
    globalThis.window = {};
    globalThis.document = { activeElement: null };
    const base = createKeydownParams();
    const onKeyDown = createPageKeydownHandler(base.params);

    const ctrlD = createCtrlEvent("D", 68);
    onKeyDown(ctrlD.event);
    assert.equal(ctrlD.prevented, 1);
    assert.equal(base.calls.jumpAdd, 1);
    assert.equal(base.calls.jumpAddUrl, 0);
    assert.equal(base.calls.global, 0);

    const ctrlShiftD = createKeyEvent({ ctrlKey: true, shiftKey: true, letter: "D", keyCode: 68 });
    onKeyDown(ctrlShiftD.event);
    assert.equal(ctrlShiftD.prevented, 1);
    assert.equal(base.calls.jumpAddUrl, 1);
    assert.equal(base.calls.global, 0);

    const pathInputEl = { contains: () => false, tagName: "INPUT" };
    globalThis.document = { activeElement: pathInputEl };
    const pathCase = createKeydownParams({ pathInputEl });
    const onKeyDownPath = createPageKeydownHandler(pathCase.params);
    const ctrlDPath = createCtrlEvent("D", 68);
    onKeyDownPath(ctrlDPath.event);
    assert.equal(ctrlDPath.prevented, 0);
    assert.equal(pathCase.calls.jumpAdd, 0);
    assert.equal(pathCase.calls.global, 0);

    const ctrlShiftDPath = createKeyEvent({ ctrlKey: true, shiftKey: true, letter: "D", keyCode: 68 });
    onKeyDownPath(ctrlShiftDPath.event);
    assert.equal(ctrlShiftDPath.prevented, 1);
    assert.equal(pathCase.calls.jumpAddUrl, 1);
    assert.equal(pathCase.calls.global, 0);

    const otherInput = { tagName: "INPUT" };
    globalThis.document = { activeElement: otherInput };
    const otherCase = createKeydownParams();
    const onKeyDownOther = createPageKeydownHandler(otherCase.params);
    const ctrlShiftDOther = createKeyEvent({ ctrlKey: true, shiftKey: true, letter: "D", keyCode: 68 });
    onKeyDownOther(ctrlShiftDOther.event);
    assert.equal(ctrlShiftDOther.prevented, 0);
    assert.equal(otherCase.calls.jumpAddUrl, 0);
    assert.equal(otherCase.calls.global, 0);
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
});

defineTest("keydown fallback Ctrl+, / F1 / Alt+S boundaries", () => {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  try {
    globalThis.window = {};
    globalThis.document = { activeElement: null };
    const base = createKeydownParams();
    const onKeyDown = createPageKeydownHandler(base.params);

    const ctrlComma = {
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      code: "Comma",
      key: ",",
      keyCode: 188,
      which: 188,
      getModifierState: () => false,
      preventDefault() {
        this._prevented = (this._prevented ?? 0) + 1;
      },
    };
    onKeyDown(ctrlComma);
    assert.equal(ctrlComma._prevented ?? 0, 1);
    assert.equal(base.calls.openConfig, 1);
    assert.equal(base.calls.global, 0);

    const f1 = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      code: "F1",
      key: "F1",
      keyCode: 112,
      which: 112,
      getModifierState: () => false,
      preventDefault() {
        this._prevented = (this._prevented ?? 0) + 1;
      },
    };
    onKeyDown(f1);
    assert.equal(f1._prevented ?? 0, 1);
    assert.equal(base.calls.openKeymap, 1);
    assert.equal(base.calls.global, 0);

    const altS = createAltEvent("S", 83);
    onKeyDown(altS.event);
    assert.equal(altS.prevented, 1);
    assert.equal(base.calls.openSort, 1);
    assert.equal(base.calls.global, 0);

    const otherInput = { tagName: "INPUT" };
    globalThis.document = { activeElement: otherInput };
    const inputCase = createKeydownParams();
    const onKeyDownInput = createPageKeydownHandler(inputCase.params);
    const altSInput = createAltEvent("S", 83);
    onKeyDownInput(altSInput.event);
    assert.equal(altSInput.prevented, 0);
    assert.equal(inputCase.calls.openSort, 0);
    assert.equal(inputCase.calls.global, 0);

    const pathInputEl = { contains: () => false, tagName: "INPUT" };
    globalThis.document = { activeElement: pathInputEl };
    const pathCase = createKeydownParams({ pathInputEl });
    const onKeyDownPath = createPageKeydownHandler(pathCase.params);
    const ctrlCommaPath = {
      ...ctrlComma,
      _prevented: 0,
      preventDefault() {
        this._prevented += 1;
      },
    };
    onKeyDownPath(ctrlCommaPath);
    assert.equal(ctrlCommaPath._prevented, 1);
    assert.equal(pathCase.calls.openConfig, 1);

    const f1Path = {
      ...f1,
      _prevented: 0,
      preventDefault() {
        this._prevented += 1;
      },
    };
    onKeyDownPath(f1Path);
    assert.equal(f1Path._prevented, 1);
    assert.equal(pathCase.calls.openKeymap, 1);
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`[test:keys] PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`[test:keys] FAIL ${name}`);
    console.error(error instanceof Error ? error.stack : error);
  }
}

if (failed > 0) {
  console.error(`[test:keys] ${failed} test(s) failed.`);
  process.exit(1);
}
console.log(`[test:keys] all ${tests.length} test(s) passed.`);
process.exit(0);

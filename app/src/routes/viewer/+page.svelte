<script>
  import { onMount, tick } from "svelte";
  import MarkdownIt from "markdown-it";
  import { invoke, listen } from "$lib/tauri_client";

  const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });
  const MAX_TEXT_BYTES = 2 * 1024 * 1024;
  const SYNTAX_HIGHLIGHT_MAX_CHARS = 1_000_000;
  const LARGE_TEXT_THRESHOLD_BYTES = 10 * 1024 * 1024;
  const LARGE_TEXT_LINE_THRESHOLD = 120_000;
  const IMAGE_ZOOM_MIN = 0.01;
  const IMAGE_ZOOM_MAX = 8;
  const IMAGE_ZOOM_STEP = 1.2;
  const IMAGE_VIEW_PADDING = 32;
  const VIRTUAL_LINE_HEIGHT_PX = 20;
  const VIRTUAL_SCROLL_MAX_PX = 20_000_000;
  const VIRTUAL_PROFILE_STORAGE_KEY = "__rf_viewer_virtual_profile";
  const VIRTUAL_PROFILE_TABLE = {
    responsive: {
      overscanLines: 180,
      minRequestLines: 1200,
      maxRequestLines: 4000,
      highlightMaxLines: 1600,
      highlightLineMaxChars: 12000,
    },
    balanced: {
      overscanLines: 100,
      minRequestLines: 600,
      maxRequestLines: 3000,
      highlightMaxLines: 1200,
      highlightLineMaxChars: 8192,
    },
    memory: {
      overscanLines: 60,
      minRequestLines: 300,
      maxRequestLines: 1500,
      highlightMaxLines: 800,
      highlightLineMaxChars: 4096,
    },
  };
  const MARKDOWN_HTML_ZOOM_STORAGE_KEY = "__rf_viewer_markdown_html_zoom";
  const MARKDOWN_HTML_ZOOM_MIN = 0.6;
  const MARKDOWN_HTML_ZOOM_MAX = 2.5;
  const MARKDOWN_HTML_ZOOM_STEP = 1.1;

  let currentPath = $state("");
  let currentKind = $state("empty");
  let textContent = $state("");
  let textLines = $state(/** @type {string[]} */ ([]));
  let textLanguage = $state("");
  let highlightedTextHtml = $state("");
  let highlightedTextLines = $state(/** @type {string[]} */ ([]));
  let virtualTextMode = $state(false);
  let virtualTextStartLine = $state(0);
  let virtualTextLines = $state(/** @type {string[]} */ ([]));
  let virtualTextHighlightedLines = $state(/** @type {string[]} */ ([]));
  let virtualTextTotalLines = $state(1);
  let virtualTextFileSize = $state(0);
  let virtualTextScrollTop = $state(0);
  let virtualTextViewportHeight = $state(0);
  let virtualTextRequestToken = 0;
  let virtualTextContainer = $state();
  let virtualChunkRaf = 0;
  let virtualProfile = $state("balanced");
  let markdownHtml = $state("");
  let markdownViewMode = $state("html");
  let markdownHtmlZoom = $state(1);
  let markdownHighlightedLines = $state(/** @type {string[]} */ ([]));
  let markdownArticleEl = $state();
  let pendingMarkdownJumpHeading = $state("");
  let imageSrc = $state("");
  let imageLoadError = $state("");
  let imageZoom = $state(1);
  let imageZoomMode = $state("fit");
  let imageNaturalWidth = $state(0);
  let imageNaturalHeight = $state(0);
  let imagePanning = $state(false);
  let imagePanStartX = $state(0);
  let imagePanStartY = $state(0);
  let imagePanScrollLeft = $state(0);
  let imagePanScrollTop = $state(0);
  let error = $state("");
  let loading = $state(false);
  let rootContainer = $state();
  let imageContainer = $state();
  let hljsCore = /** @type {any} */ (null);
  let highlightRuntimePromise = /** @type {Promise<void> | null} */ (null);
  let siblingFilePaths = $state(/** @type {string[]} */ ([]));
  let siblingFileIndex = $state(-1);
  let siblingDirPath = $state("");
  let siblingRefreshToken = 0;
  function normalizeVirtualProfile(value) {
    const key = String(value || "").trim().toLowerCase();
    if (key === "responsive" || key === "balanced" || key === "memory") {
      return key;
    }
    return "balanced";
  }

  function getVirtualProfileConfig() {
    const key = normalizeVirtualProfile(virtualProfile);
    return VIRTUAL_PROFILE_TABLE[key] || VIRTUAL_PROFILE_TABLE.balanced;
  }

  function saveVirtualProfile() {
    try {
      localStorage.setItem(VIRTUAL_PROFILE_STORAGE_KEY, normalizeVirtualProfile(virtualProfile));
    } catch {
      // ignore persistence errors
    }
  }

  function setVirtualProfile(profile, persist = true) {
    virtualProfile = normalizeVirtualProfile(profile);
    if (persist) {
      saveVirtualProfile();
    }
    if (virtualTextMode) {
      refreshVirtualTextHighlight();
      scheduleVirtualChunkLoad(true);
    }
  }

  function getVirtualProfileLabel(profile) {
    const key = normalizeVirtualProfile(profile);
    if (key === "responsive") {
      return "Fast";
    }
    if (key === "memory") {
      return "Memory";
    }
    return "Balanced";
  }

  async function ensureHighlightRuntimeLoaded() {
    if (hljsCore) {
      return;
    }
    if (!highlightRuntimePromise) {
      highlightRuntimePromise = (async () => {
        const [
          coreModule,
          cModule,
          cppModule,
          rustModule,
          jsModule,
          tsModule,
          pyModule,
          jsonModule,
          markdownModule,
        ] = await Promise.all([
          import("highlight.js/lib/core"),
          import("highlight.js/lib/languages/c"),
          import("highlight.js/lib/languages/cpp"),
          import("highlight.js/lib/languages/rust"),
          import("highlight.js/lib/languages/javascript"),
          import("highlight.js/lib/languages/typescript"),
          import("highlight.js/lib/languages/python"),
          import("highlight.js/lib/languages/json"),
          import("highlight.js/lib/languages/markdown"),
          import("highlight.js/styles/github-dark.css"),
        ]);
        const next = coreModule.default;
        if (!globalThis.__rfViewerHighlightLanguagesRegistered) {
          next.registerLanguage("c", cModule.default);
          next.registerLanguage("cpp", cppModule.default);
          next.registerLanguage("rust", rustModule.default);
          next.registerLanguage("javascript", jsModule.default);
          next.registerLanguage("typescript", tsModule.default);
          next.registerLanguage("python", pyModule.default);
          next.registerLanguage("json", jsonModule.default);
          next.registerLanguage("markdown", markdownModule.default);
          globalThis.__rfViewerHighlightLanguagesRegistered = true;
        }
        hljsCore = next;
      })().catch((error) => {
        highlightRuntimePromise = null;
        throw error;
      });
    }
    await highlightRuntimePromise;
  }

  /**
   * @param {string} path
   */
  function detectTextLanguage(path) {
    const value = String(path || "");
    const dot = value.lastIndexOf(".");
    if (dot < 0 || dot === value.length - 1) {
      return "";
    }
    const ext = value.slice(dot + 1).toLowerCase();
    switch (ext) {
      case "c":
      case "h":
        return "c";
      case "cpp":
      case "cc":
      case "cxx":
      case "hpp":
      case "hh":
      case "hxx":
        return "cpp";
      case "rs":
        return "rust";
      case "js":
      case "mjs":
      case "cjs":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "py":
        return "python";
      case "json":
        return "json";
      case "md":
      case "markdown":
        return "markdown";
      default:
        return "";
    }
  }

  function getVirtualHighlightLanguage() {
    if (currentKind === "markdown") {
      return "markdown";
    }
    return textLanguage;
  }

  function canUseSyntaxHighlight() {
    if (currentKind !== "text") return false;
    if (!textLanguage) return false;
    if (!textContent) return false;
    if (textContent.length > SYNTAX_HIGHLIGHT_MAX_CHARS) return false;
    return true;
  }

  function canUseMarkdownTextHighlight() {
    if (currentKind !== "markdown") return false;
    if (markdownViewMode !== "text") return false;
    if (virtualTextMode) return false;
    if (!textContent) return false;
    if (textContent.length > SYNTAX_HIGHLIGHT_MAX_CHARS) return false;
    return true;
  }

  function canUseVirtualTextHighlight() {
    if (!virtualTextMode) return false;
    if (!virtualTextLines.length) return false;
    if (!getVirtualHighlightLanguage()) return false;
    const cfg = getVirtualProfileConfig();
    if (virtualTextLines.length > cfg.highlightMaxLines) return false;
    return true;
  }

  function refreshSyntaxHighlight() {
    if (!canUseSyntaxHighlight()) {
      highlightedTextHtml = "";
      highlightedTextLines = [];
      return;
    }

    if (!hljsCore) {
      highlightedTextHtml = "";
      highlightedTextLines = [];
      void ensureHighlightRuntimeLoaded()
        .then(() => {
          if (canUseSyntaxHighlight()) {
            refreshSyntaxHighlight();
          }
        })
        .catch(() => {
          highlightedTextHtml = "";
          highlightedTextLines = [];
        });
      return;
    }

    try {
      highlightedTextHtml = hljsCore.highlight(textContent, {
        language: textLanguage,
        ignoreIllegals: true,
      }).value;
      const lines = highlightedTextHtml.split("\n");
      highlightedTextLines = lines.length > 0 ? lines : [""];
    } catch {
      highlightedTextHtml = "";
      highlightedTextLines = [];
    }
  }

  function refreshMarkdownTextHighlight() {
    if (!canUseMarkdownTextHighlight()) {
      markdownHighlightedLines = [];
      return;
    }

    if (!hljsCore) {
      markdownHighlightedLines = [];
      void ensureHighlightRuntimeLoaded()
        .then(() => {
          if (canUseMarkdownTextHighlight()) {
            refreshMarkdownTextHighlight();
          }
        })
        .catch(() => {
          markdownHighlightedLines = [];
        });
      return;
    }

    try {
      const rendered = hljsCore.highlight(textContent, {
        language: "markdown",
        ignoreIllegals: true,
      }).value;
      const lines = rendered.split("\n");
      markdownHighlightedLines = lines.length > 0 ? lines : [""];
    } catch {
      markdownHighlightedLines = [];
    }
  }

  function rebuildTextLines() {
    const lines = String(textContent).split("\n");
    textLines = lines.length > 0 ? lines : [""];
  }

  /**
   * @param {number} value
   */
  function resetVirtualTextView() {
    virtualTextMode = false;
    virtualTextStartLine = 0;
    virtualTextLines = [];
    virtualTextHighlightedLines = [];
    virtualTextTotalLines = 1;
    virtualTextFileSize = 0;
    virtualTextScrollTop = 0;
    virtualTextViewportHeight = 0;
    virtualTextRequestToken += 1;
    if (virtualChunkRaf) {
      cancelAnimationFrame(virtualChunkRaf);
      virtualChunkRaf = 0;
    }
  }

  function isVirtualTextActive() {
    if (!virtualTextMode) {
      return false;
    }
    if (currentKind === "text") {
      return true;
    }
    if (currentKind === "markdown" && markdownViewMode === "text") {
      return true;
    }
    return false;
  }

  function getVirtualScrollScale() {
    const rawHeight = Math.max(1, virtualTextTotalLines) * VIRTUAL_LINE_HEIGHT_PX;
    return Math.max(1, rawHeight / VIRTUAL_SCROLL_MAX_PX);
  }

  function getVirtualViewportRange() {
    const scale = getVirtualScrollScale();
    const scrollTop = Math.max(0, virtualTextScrollTop);
    const viewport = Math.max(1, virtualTextViewportHeight || virtualTextContainer?.clientHeight || 1);
    const firstVisibleLine = Math.floor((scrollTop * scale) / VIRTUAL_LINE_HEIGHT_PX);
    const visibleLines = Math.max(1, Math.ceil((viewport * scale) / VIRTUAL_LINE_HEIGHT_PX));
    const cfg = getVirtualProfileConfig();
    const overscan = Math.max(0, Number(cfg.overscanLines) || 0);
    const startLine = Math.max(0, firstVisibleLine - overscan);
    const endLine = Math.min(
      Math.max(1, virtualTextTotalLines),
      firstVisibleLine + visibleLines + overscan
    );
    return { startLine, endLine };
  }

  function refreshVirtualTextHighlight() {
    if (!canUseVirtualTextHighlight()) {
      virtualTextHighlightedLines = [];
      return;
    }

    if (!hljsCore) {
      virtualTextHighlightedLines = [];
      void ensureHighlightRuntimeLoaded()
        .then(() => {
          if (canUseVirtualTextHighlight()) {
            refreshVirtualTextHighlight();
          }
        })
        .catch(() => {
          virtualTextHighlightedLines = [];
        });
      return;
    }

    const language = getVirtualHighlightLanguage();
    if (!language) {
      virtualTextHighlightedLines = [];
      return;
    }

    try {
      virtualTextHighlightedLines = virtualTextLines.map((line) => {
        const raw = String(line ?? "");
        const cfg = getVirtualProfileConfig();
        if (raw.length > cfg.highlightLineMaxChars) {
          return "";
        }
        return hljsCore.highlight(raw, {
          language,
          ignoreIllegals: true,
        }).value;
      });
    } catch {
      virtualTextHighlightedLines = [];
    }
  }

  async function loadVirtualChunkForViewport(force = false) {
    if (!virtualTextMode || !currentPath) {
      return;
    }

    const totalLines = Math.max(1, Number(virtualTextTotalLines) || 1);
    const { startLine, endLine } = getVirtualViewportRange();
    const cfg = getVirtualProfileConfig();
    const minRequestLines = Math.max(1, Number(cfg.minRequestLines) || 1);
    const maxRequestLines = Math.max(minRequestLines, Number(cfg.maxRequestLines) || minRequestLines);
    const desiredCount = Math.max(minRequestLines, endLine - startLine);
    let requestCount = Math.min(maxRequestLines, desiredCount);
    let requestStart = Math.max(0, startLine);

    if (requestStart + requestCount > totalLines) {
      requestStart = Math.max(0, totalLines - requestCount);
      requestCount = Math.max(1, totalLines - requestStart);
    }

    const loadedStart = virtualTextStartLine;
    const loadedEnd = loadedStart + virtualTextLines.length;
    const requestEnd = requestStart + requestCount;
    if (!force && virtualTextLines.length > 0 && requestStart >= loadedStart && requestEnd <= loadedEnd) {
      return;
    }

    const token = ++virtualTextRequestToken;
    const chunk = await invoke("fs_read_text_viewport_lines", {
      path: currentPath,
      startLine: requestStart,
      lineCount: requestCount,
    });
    if (token !== virtualTextRequestToken) {
      return;
    }

    const nextLines = Array.isArray(chunk?.lines) ? chunk.lines.map((line) => String(line ?? "")) : [];
    virtualTextStartLine = Number(chunk?.startLine ?? requestStart) || requestStart;
    virtualTextTotalLines = Math.max(1, Number(chunk?.totalLines ?? totalLines) || totalLines);
    virtualTextLines = nextLines.length > 0 ? nextLines : [""];
    refreshVirtualTextHighlight();
  }

  function scheduleVirtualChunkLoad(force = false) {
    if (!virtualTextMode) {
      return;
    }
    if (force) {
      if (virtualChunkRaf) {
        cancelAnimationFrame(virtualChunkRaf);
        virtualChunkRaf = 0;
      }
      void loadVirtualChunkForViewport(true).catch((err) => {
        error = String(err);
        currentKind = "error";
      });
      return;
    }
    if (virtualChunkRaf) {
      return;
    }
    virtualChunkRaf = requestAnimationFrame(() => {
      virtualChunkRaf = 0;
      void loadVirtualChunkForViewport(false).catch((err) => {
        error = String(err);
        currentKind = "error";
      });
    });
  }

  /**
   * @param {Event} event
   */
  function handleVirtualTextScroll(event) {
    const target = /** @type {HTMLElement | null} */ (event.currentTarget);
    if (!target) {
      return;
    }
    virtualTextScrollTop = target.scrollTop;
    virtualTextViewportHeight = target.clientHeight;
    scheduleVirtualChunkLoad(false);
  }

  function getVirtualTextSpacerStyle() {
    const scale = getVirtualScrollScale();
    const rawHeight = Math.max(1, virtualTextTotalLines) * VIRTUAL_LINE_HEIGHT_PX;
    const scaledHeight = Math.max(1, rawHeight / scale);
    return `height: ${Math.round(scaledHeight)}px;`;
  }

  function getVirtualTextLinesStyle() {
    const scale = getVirtualScrollScale();
    const top = (Math.max(0, virtualTextStartLine) * VIRTUAL_LINE_HEIGHT_PX) / scale;
    return `transform: translateY(${Math.max(0, Math.round(top))}px);`;
  }
  function clampImageZoom(value) {
    return Math.min(IMAGE_ZOOM_MAX, Math.max(IMAGE_ZOOM_MIN, value));
  }

  function resetImageView() {
    imageSrc = "";
    imageLoadError = "";
    imageZoom = 1;
    imageZoomMode = "fit";
    imageNaturalWidth = 0;
    imageNaturalHeight = 0;
    imagePanning = false;
  }

  /**
   * @param {string} path
   */
  function detectKind(path) {
    const normalized = String(path || "").toLowerCase();
    if (normalized.endsWith(".md") || normalized.endsWith(".markdown")) {
      return "markdown";
    }
    if (
      normalized.endsWith(".png") ||
      normalized.endsWith(".jpg") ||
      normalized.endsWith(".jpeg") ||
      normalized.endsWith(".bmp")
    ) {
      return "image";
    }
    return "text";
  }

  function getInitialPathFromUrl() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("path") || "";
    } catch {
      return "";
    }
  }

  function getLastPathFromSession() {
    try {
      return sessionStorage.getItem("__rf_viewer_last_path") || "";
    } catch {
      return "";
    }
  }

  /**
   * @param {string} path
   */
  function fileTail(path) {
    const normalized = String(path || "").replaceAll("\\", "/");
    const parts = normalized.split("/");
    return parts[parts.length - 1] || normalized;
  }

  /**
   * @param {string} path
   */
  function getParentPath(path) {
    const value = String(path || "");
    const slashIndex = Math.max(value.lastIndexOf("\\"), value.lastIndexOf("/"));
    if (slashIndex <= 0) {
      return "";
    }
    return value.slice(0, slashIndex);
  }

  /**
   * @param {string} path
   */
  function normalizePathForCompare(path) {
    let value = String(path || "");
    if (!value) {
      return "";
    }
    if (value.startsWith("\\\\?\\")) {
      value = value.slice(4);
    }
    if (value.startsWith("//?/")) {
      value = value.slice(4);
    }
    return value.replaceAll("/", "\\").toLowerCase();
  }

  /**
   * @param {string} path
   */
  function syncSiblingIndex(path) {
    const targetPath = String(path || "");
    if (!targetPath || !siblingFilePaths.length) {
      siblingFileIndex = -1;
      return false;
    }

    const targetDir = getParentPath(targetPath);
    if (
      !targetDir ||
      normalizePathForCompare(targetDir) !== normalizePathForCompare(siblingDirPath)
    ) {
      siblingFileIndex = -1;
      return false;
    }

    const targetKey = normalizePathForCompare(targetPath);
    const index = siblingFilePaths.findIndex(
      (candidate) => normalizePathForCompare(candidate) === targetKey
    );
    siblingFileIndex = index;
    return index >= 0;
  }

  /**
   * @param {string} path
   */
  async function refreshSiblingFiles(path) {
    const targetPath = String(path || "");
    const dirPath = getParentPath(targetPath);

    const token = ++siblingRefreshToken;
    siblingFilePaths = [];
    siblingFileIndex = -1;
    siblingDirPath = dirPath;

    if (!targetPath || !dirPath) {
      return;
    }

    try {
      const entries = await invoke("fs_list_dir", {
        path: dirPath,
        showHidden: true,
        sortKey: "name",
        sortOrder: "asc",
      });
      if (token !== siblingRefreshToken) {
        return;
      }

      const files = Array.isArray(entries)
        ? entries
            .filter((entry) => String(entry?.type || "").toLowerCase() === "file")
            .map((entry) => String(entry?.path || ""))
            .filter((value) => value.length > 0)
        : [];

      siblingFilePaths = files;
      siblingFileIndex = files.findIndex(
        (candidate) => normalizePathForCompare(candidate) === normalizePathForCompare(targetPath)
      );

      if (siblingFileIndex < 0) {
        siblingFilePaths = [...files, targetPath];
        siblingFileIndex = siblingFilePaths.length - 1;
      }
    } catch {
      if (token !== siblingRefreshToken) {
        return;
      }
      siblingFilePaths = [targetPath];
      siblingFileIndex = 0;
    }
  }

  function hasPrevSiblingFile() {
    return siblingFileIndex > 0;
  }

  function hasNextSiblingFile() {
    return siblingFileIndex >= 0 && siblingFileIndex < siblingFilePaths.length - 1;
  }

  function getSiblingPositionText() {
    if (siblingFileIndex < 0 || siblingFilePaths.length === 0) {
      return "-- / --";
    }
    return `${siblingFileIndex + 1} / ${siblingFilePaths.length}`;
  }

  /**
   * @param {-1 | 1} delta
   */
  function moveSiblingFile(delta) {
    if (!siblingFilePaths.length || siblingFileIndex < 0) {
      return;
    }
    const nextIndex = siblingFileIndex + delta;
    if (nextIndex < 0 || nextIndex >= siblingFilePaths.length) {
      return;
    }
    const nextPath = siblingFilePaths[nextIndex];
    if (!nextPath) {
      return;
    }
    if (normalizePathForCompare(nextPath) === normalizePathForCompare(currentPath)) {
      return;
    }
    void openPath(nextPath);
  }

  function openPreviousSiblingFile() {
    moveSiblingFile(-1);
  }

  function openNextSiblingFile() {
    moveSiblingFile(1);
  }

  function syncTitle(path) {
    const base = "ReflexViewer";
    if (!path) {
      document.title = base;
      return;
    }
    document.title = `${base} - ${fileTail(path)}`;
  }

  function resetView() {
    textContent = "";
    textLines = [""];
    textLanguage = "";
    highlightedTextHtml = "";
    highlightedTextLines = [];
    resetVirtualTextView();
    markdownHighlightedLines = [];
    markdownHtml = "";
    markdownViewMode = "html";
    pendingMarkdownJumpHeading = "";
    error = "";
    resetImageView();
  }

  /**
   * @param {string} value
   */
  function normalizeMatchText(value) {
    return String(value || "").replace(/\s+/g, "").toLowerCase();
  }

  /**
   * @param {string} line
   */
  function extractHeadingText(line) {
    return String(line).replace(/^#{1,6}\s*/, "").trim();
  }

  /**
   * @param {string} markdownSource
   * @param {string} jumpHint
   */
  function resolveMarkdownJumpHeading(markdownSource, jumpHint) {
    const hint = String(jumpHint || "").trim();
    if (!hint) {
      return "";
    }

    const normalizedHint = hint.toLowerCase();
    if (normalizedHint === "keymap" || hint === "\u30ad\u30fc\u4e00\u89a7") {
      const lines = String(markdownSource || "").split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("#")) {
          continue;
        }
        const heading = extractHeadingText(trimmed);
        const normalized = heading.toLowerCase();
        if (
          normalized.includes("keymap") ||
          normalized.includes("keyboard") ||
          heading.includes("\u30ad\u30fc\u64cd\u4f5c") ||
          heading.includes("\u30ad\u30fc\u4e00\u89a7")
        ) {
          return heading;
        }
      }
      return "\u30ad\u30fc\u64cd\u4f5c";
    }

    return hint;
  }

  /**
   * @param {string} headingText
   */
  async function focusMarkdownHeading(headingText) {
    const heading = String(headingText || "").trim();
    if (!heading) {
      return false;
    }

    await tick();
    const root = markdownArticleEl;
    if (!root) {
      return false;
    }

    const targetNorm = normalizeMatchText(heading);
    const elements = root.querySelectorAll("h1, h2, h3, h4, h5, h6");
    for (const element of elements) {
      const currentNorm = normalizeMatchText(element.textContent || "");
      if (!currentNorm) {
        continue;
      }
      if (currentNorm.includes(targetNorm) || targetNorm.includes(currentNorm)) {
        element.scrollIntoView({ block: "start", inline: "nearest" });
        return true;
      }
    }

    return false;
  }

  /**
   * @param {"html" | "text"} mode
   */
  function setMarkdownViewMode(mode) {
    if (virtualTextMode && mode === "html") {
      return;
    }
    markdownViewMode = mode;
    if (mode === "text") {
      if (virtualTextMode) {
        scheduleVirtualChunkLoad(true);
      } else {
        refreshMarkdownTextHighlight();
      }
    }
  }

  /**
   * @param {unknown} value
   */
  function normalizeMarkdownHtmlZoom(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 1;
    }
    return Math.min(MARKDOWN_HTML_ZOOM_MAX, Math.max(MARKDOWN_HTML_ZOOM_MIN, numeric));
  }

  function saveMarkdownHtmlZoom() {
    try {
      localStorage.setItem(MARKDOWN_HTML_ZOOM_STORAGE_KEY, String(markdownHtmlZoom));
    } catch {
      // ignore persistence errors
    }
  }

  /**
   * @param {number} nextZoom
   * @param {boolean} persist
   */
  function setMarkdownHtmlZoom(nextZoom, persist = true) {
    const normalized = normalizeMarkdownHtmlZoom(nextZoom);
    markdownHtmlZoom = Math.round(normalized * 1000) / 1000;
    if (persist) {
      saveMarkdownHtmlZoom();
    }
  }

  /**
   * @param {number} factor
   */
  function zoomMarkdownHtmlBy(factor) {
    setMarkdownHtmlZoom(markdownHtmlZoom * factor);
  }

  function resetMarkdownHtmlZoom() {
    setMarkdownHtmlZoom(1);
  }

  function getMarkdownHtmlZoomText() {
    return `${Math.round(markdownHtmlZoom * 100)}%`;
  }

  function getMarkdownHtmlStyle() {
    return `font-size: ${Math.round(markdownHtmlZoom * 100)}%;`;
  }

  /**
   * @param {string} path
   */
  function isJpegPath(path) {
    const value = String(path || "").toLowerCase();
    return value.endsWith(".jpg") || value.endsWith(".jpeg");
  }

  function getActiveScrollContainer() {
    if (currentKind === "image") {
      return imageContainer || rootContainer;
    }
    if (isVirtualTextActive()) {
      return virtualTextContainer || rootContainer;
    }
    return rootContainer;
  }

  /**
   * @param {KeyboardEvent} event
   */
  function scrollByKey(event) {
    const container = getActiveScrollContainer();
    if (!container) {
      return false;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    const target = event.target;
    if (target instanceof HTMLElement) {
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return false;
      }
    }

    const lineStep = event.shiftKey ? 240 : 72;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        container.scrollBy({ top: -lineStep, left: 0, behavior: "auto" });
        return true;
      case "ArrowDown":
        event.preventDefault();
        container.scrollBy({ top: lineStep, left: 0, behavior: "auto" });
        return true;
      case "ArrowLeft":
        event.preventDefault();
        container.scrollBy({ top: 0, left: -lineStep, behavior: "auto" });
        return true;
      case "ArrowRight":
        event.preventDefault();
        container.scrollBy({ top: 0, left: lineStep, behavior: "auto" });
        return true;
      case "PageUp":
        event.preventDefault();
        container.scrollBy({
          top: -Math.max(120, container.clientHeight - 80),
          left: 0,
          behavior: "auto",
        });
        return true;
      case "PageDown":
        event.preventDefault();
        container.scrollBy({
          top: Math.max(120, container.clientHeight - 80),
          left: 0,
          behavior: "auto",
        });
        return true;
      default:
        return false;
    }
  }

  /**
   * @param {number} nextZoom
   * @param {boolean} keepCenter
   */
  async function setImageZoom(nextZoom, keepCenter = true) {
    if (!imageContainer || !imageNaturalWidth || !imageNaturalHeight) {
      imageZoom = clampImageZoom(nextZoom);
      return;
    }

    const container = imageContainer;
    const prevZoom = imageZoom;
    const clamped = clampImageZoom(nextZoom);

    const centerX = container.scrollLeft + container.clientWidth / 2;
    const centerY = container.scrollTop + container.clientHeight / 2;

    imageZoom = clamped;
    await tick();

    if (keepCenter && prevZoom > 0) {
      const ratio = clamped / prevZoom;
      const nextCenterX = centerX * ratio;
      const nextCenterY = centerY * ratio;
      container.scrollLeft = Math.max(0, nextCenterX - container.clientWidth / 2);
      container.scrollTop = Math.max(0, nextCenterY - container.clientHeight / 2);
    }
  }

  function getFitZoomValue() {
    if (!imageContainer || !imageNaturalWidth || !imageNaturalHeight) {
      return 1;
    }
    const availableWidth = Math.max(1, imageContainer.clientWidth - IMAGE_VIEW_PADDING);
    const availableHeight = Math.max(1, imageContainer.clientHeight - IMAGE_VIEW_PADDING);
    const fitZoom = Math.min(availableWidth / imageNaturalWidth, availableHeight / imageNaturalHeight);
    return clampImageZoom(fitZoom);
  }

  async function fitImageToWindow() {
    imageZoomMode = "fit";
    await tick();
    await setImageZoom(getFitZoomValue(), false);
  }

  /**
   * @param {number} percent
   */
  async function setImageZoomPreset(percent) {
    imageZoomMode = "custom";
    await setImageZoom(percent / 100);
  }

  /**
   * @param {WheelEvent} event
   */
  function handleImageWheel(event) {
    if (currentKind !== "image") {
      return;
    }
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    event.preventDefault();
    const factor = event.deltaY < 0 ? IMAGE_ZOOM_STEP : 1 / IMAGE_ZOOM_STEP;
    imageZoomMode = "custom";
    void setImageZoom(imageZoom * factor);
  }

  /**
   * @param {WheelEvent} event
   */
  function handleMarkdownHtmlWheel(event) {
    if (currentKind !== "markdown" || markdownViewMode !== "html") {
      return;
    }
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }
    event.preventDefault();
    if (event.deltaY < 0) {
      zoomMarkdownHtmlBy(MARKDOWN_HTML_ZOOM_STEP);
    } else if (event.deltaY > 0) {
      zoomMarkdownHtmlBy(1 / MARKDOWN_HTML_ZOOM_STEP);
    }
  }

  /**
   * @param {MouseEvent} event
   */
  function handleImageDoubleClick(event) {
    event.preventDefault();
    void setImageZoomPreset(100);
  }

  /**
   * @param {Event} event
   */
  function handleImageLoad(event) {
    const img = /** @type {HTMLImageElement} */ (event.currentTarget);
    imageLoadError = "";
    imageNaturalWidth = img.naturalWidth || 0;
    imageNaturalHeight = img.naturalHeight || 0;
    if (imageZoomMode === "fit") {
      void fitImageToWindow();
    }
  }

  function handleImageError() {
    imageLoadError = "\u753b\u50cf\u3092\u8868\u793a\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002";
  }

  /**
   * @param {PointerEvent} event
   */
  function handleImagePointerDown(event) {
    if (currentKind !== "image" || event.button !== 0 || !imageContainer || imageLoadError) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const onControls = target.closest(".image-controls");
    const onFrame = target.closest(".image-frame");
    if (onControls || !onFrame) {
      return;
    }

    imagePanning = true;
    imagePanStartX = event.clientX;
    imagePanStartY = event.clientY;
    imagePanScrollLeft = imageContainer.scrollLeft;
    imagePanScrollTop = imageContainer.scrollTop;

    try {
      /** @type {Element} */ (event.currentTarget).setPointerCapture(event.pointerId);
    } catch {
      // ignore pointer capture failure
    }

    event.preventDefault();
  }

  /**
   * @param {PointerEvent} event
   */
  function handleImagePointerMove(event) {
    if (!imagePanning || !imageContainer) {
      return;
    }

    const deltaX = event.clientX - imagePanStartX;
    const deltaY = event.clientY - imagePanStartY;
    imageContainer.scrollLeft = imagePanScrollLeft - deltaX;
    imageContainer.scrollTop = imagePanScrollTop - deltaY;
  }

  /**
   * @param {PointerEvent} event
   */
  function endImagePan(event) {
    if (!imagePanning) {
      return;
    }

    imagePanning = false;
    try {
      /** @type {Element} */ (event.currentTarget).releasePointerCapture(event.pointerId);
    } catch {
      // ignore pointer capture failure
    }
  }

  function getImageInlineStyle() {
    if (!imageNaturalWidth || !imageNaturalHeight) {
      return "";
    }
    const width = Math.max(1, Number((imageNaturalWidth * imageZoom).toFixed(3)));
    const height = Math.max(1, Number((imageNaturalHeight * imageZoom).toFixed(3)));
    return `width: ${width}px; height: ${height}px;`;
  }

  function getImageStatusText() {
    const zoomText = `${Math.round(imageZoom * 100)}%`;
    const modeText = imageZoomMode === "fit" ? " (Fit)" : "";
    if (!imageNaturalWidth || !imageNaturalHeight) {
      return `${zoomText}${modeText}`;
    }
    return `${imageNaturalWidth}x${imageNaturalHeight} | ${zoomText}${modeText}`;
  }

  /**
   * @param {string} path
   */
  async function openPath(path, options = undefined) {
    const jumpHint = String(options?.jumpHint || "");
    currentPath = String(path || "");
    syncTitle(currentPath);
    if (currentPath) {
      try {
        sessionStorage.setItem("__rf_viewer_last_path", currentPath);
      } catch {
        // ignore session storage errors
      }
      if (!syncSiblingIndex(currentPath)) {
        void refreshSiblingFiles(currentPath);
      }
    }
    if (!currentPath) {
      siblingRefreshToken += 1;
      siblingFilePaths = [];
      siblingFileIndex = -1;
      siblingDirPath = "";
      currentKind = "empty";
      resetView();
      loading = false;
      return;
    }

    resetView();
    loading = true;
    currentKind = detectKind(currentPath);
    pendingMarkdownJumpHeading = "";

    try {
      if (currentKind === "image") {
        // JPEG is rendered more reliably after normalization.
        if (isJpegPath(currentPath)) {
          try {
            const dataUrl = await invoke("fs_read_image_data_url", {
              path: currentPath,
              normalize: true,
            });
            imageSrc = String(dataUrl || "");
            return;
          } catch {
            // fall through
          }
        }

        try {
          const dataUrl = await invoke("fs_read_image_data_url", { path: currentPath, normalize: false });
          imageSrc = String(dataUrl || "");
          return;
        } catch {
          const dataUrl = await invoke("fs_read_image_data_url", { path: currentPath, normalize: true });
          imageSrc = String(dataUrl || "");
        }
        return;
      }

      const viewportInfoRaw = await invoke("fs_text_viewport_info", {
        path: currentPath,
      });
      const viewportFileSize = Math.max(0, Number(viewportInfoRaw?.fileSize ?? 0) || 0);
      const viewportTotalLines = Math.max(1, Number(viewportInfoRaw?.totalLines ?? 1) || 1);
      const useVirtualText =
        viewportFileSize >= LARGE_TEXT_THRESHOLD_BYTES || viewportTotalLines >= LARGE_TEXT_LINE_THRESHOLD;

      textLanguage = currentKind === "markdown" ? "markdown" : detectTextLanguage(currentPath);

      if (useVirtualText) {
        virtualTextMode = true;
        virtualTextFileSize = viewportFileSize;
        virtualTextTotalLines = viewportTotalLines;
        virtualTextStartLine = 0;
        virtualTextLines = [];
        virtualTextHighlightedLines = [];
        if (currentKind === "markdown") {
          markdownViewMode = "text";
        }
        await tick();
        if (virtualTextContainer) {
          virtualTextScrollTop = virtualTextContainer.scrollTop;
          virtualTextViewportHeight = virtualTextContainer.clientHeight;
        } else {
          virtualTextScrollTop = 0;
          virtualTextViewportHeight = rootContainer?.clientHeight || 1;
        }
        await loadVirtualChunkForViewport(true);
        return;
      }

      const rawText = await invoke("fs_read_text", {
        path: currentPath,
        maxBytes: MAX_TEXT_BYTES,
      });
      textContent = String(rawText ?? "");
      rebuildTextLines();
      refreshSyntaxHighlight();

      if (currentKind === "markdown") {
        markdownHtml = markdown.render(textContent);
        pendingMarkdownJumpHeading = resolveMarkdownJumpHeading(textContent, jumpHint);
        refreshMarkdownTextHighlight();
      }
    } catch (e) {
      error = String(e);
      currentKind = "error";
    } finally {
      loading = false;
      if (currentKind === "markdown" && pendingMarkdownJumpHeading) {
        const heading = pendingMarkdownJumpHeading;
        pendingMarkdownJumpHeading = "";
        // Ensure markdown DOM is rendered after Loading... is dismissed.
        await tick();
        await focusMarkdownHeading(heading);
      }
    }
  }

  function closeWindow() {
    void invoke("close_viewer").catch(() => {
      // ignore close failure from viewer
    });
  }

  onMount(() => {
    /**
     * @param {{ payload?: string | { path?: string } }} event
     */
    const unlistenPromise = listen("viewer:open-path", (event) => {
      const payload = event?.payload;
      const path = typeof payload === "string" ? payload : payload?.path;
      const jumpHint =
        typeof payload === "string"
          ? ""
          : String(payload?.jumpHint || payload?.jump_hint || "");
      void openPath(path || "", { jumpHint });
    });

    try {
      const saved = localStorage.getItem(MARKDOWN_HTML_ZOOM_STORAGE_KEY);
      setMarkdownHtmlZoom(normalizeMarkdownHtmlZoom(saved), false);
    } catch {
      setMarkdownHtmlZoom(1, false);
    }

    try {
      const savedProfile = localStorage.getItem(VIRTUAL_PROFILE_STORAGE_KEY);
      setVirtualProfile(normalizeVirtualProfile(savedProfile), false);
    } catch {
      setVirtualProfile("balanced", false);
    }

    /**
     * @param {KeyboardEvent} event
     */
    const onKeydown = (event) => {
      if (scrollByKey(event)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && isVirtualTextActive()) {
        if (event.key === "1") {
          event.preventDefault();
          setVirtualProfile("responsive");
          return;
        }
        if (event.key === "2") {
          event.preventDefault();
          setVirtualProfile("balanced");
          return;
        }
        if (event.key === "3") {
          event.preventDefault();
          setVirtualProfile("memory");
          return;
        }
      }

      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.altKey) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          openPreviousSiblingFile();
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          openNextSiblingFile();
          return;
        }
      }

      if (!event.shiftKey && !event.altKey && (event.ctrlKey || event.metaKey)) {
        if (event.key === "PageUp") {
          event.preventDefault();
          openPreviousSiblingFile();
          return;
        }
        if (event.key === "PageDown") {
          event.preventDefault();
          openNextSiblingFile();
          return;
        }
      }

      if ((event.ctrlKey || event.metaKey) && currentKind === "markdown" && markdownViewMode === "html") {
        if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") {
          event.preventDefault();
          zoomMarkdownHtmlBy(MARKDOWN_HTML_ZOOM_STEP);
          return;
        }
        if (event.key === "-" || event.key === "_" || event.code === "NumpadSubtract") {
          event.preventDefault();
          zoomMarkdownHtmlBy(1 / MARKDOWN_HTML_ZOOM_STEP);
          return;
        }
        if (event.key === "0" || event.code === "Numpad0") {
          event.preventDefault();
          resetMarkdownHtmlZoom();
          return;
        }
      }

      if ((event.ctrlKey || event.metaKey) && currentKind === "image") {
        if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          imageZoomMode = "custom";
          void setImageZoom(imageZoom * IMAGE_ZOOM_STEP);
          return;
        }

        if (event.key === "-" || event.key === "_") {
          event.preventDefault();
          imageZoomMode = "custom";
          void setImageZoom(imageZoom / IMAGE_ZOOM_STEP);
          return;
        }

        if (event.key === "0") {
          event.preventDefault();
          void setImageZoomPreset(100);
          return;
        }

        if (event.key === "9") {
          event.preventDefault();
          void fitImageToWindow();
          return;
        }

        if (event.key === "2") {
          event.preventDefault();
          void setImageZoomPreset(200);
          return;
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeWindow();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "q") {
        event.preventDefault();
        closeWindow();
      }
    };

    const onResize = () => {
      if (currentKind === "image" && imageZoomMode === "fit") {
        void fitImageToWindow();
      }
      if (virtualTextMode && virtualTextContainer) {
        virtualTextViewportHeight = virtualTextContainer.clientHeight;
        virtualTextScrollTop = virtualTextContainer.scrollTop;
        scheduleVirtualChunkLoad(false);
      }
    };

    window.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", onResize);

    const initialPath = getInitialPathFromUrl();
    const openInitialPath = async () => {
      if (initialPath) {
        await openPath(initialPath);
        return;
      }

      try {
        const pending = await invoke("viewer_take_pending_open");
        const pendingPath = pending?.path || "";
        const pendingJumpHint = String(pending?.jumpHint || pending?.jump_hint || "");
        if (pendingPath) {
          await openPath(pendingPath, { jumpHint: pendingJumpHint });
          return;
        }
      } catch {
        // fallback to older command
        try {
          const legacyPath = await invoke("viewer_take_pending_path");
          if (legacyPath) {
            await openPath(legacyPath);
            return;
          }
        } catch {
          // ignore and continue to session fallback
        }
      }

      const fallbackPath = getLastPathFromSession();
      await openPath(fallbackPath || "");
    };

    void openInitialPath().catch((e) => {
      error = String(e);
      currentKind = "error";
      loading = false;
    });

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("resize", onResize);
      if (virtualChunkRaf) {
        cancelAnimationFrame(virtualChunkRaf);
        virtualChunkRaf = 0;
      }
      void unlistenPromise.then((fn) => fn());
    };
  });
</script>

<main class="viewer-root" class:image-mode={currentKind === "image"} class:virtual-text-mode={isVirtualTextActive()} bind:this={rootContainer}>
  <div class="file-nav-controls">
    <button type="button" onclick={openPreviousSiblingFile} disabled={!hasPrevSiblingFile()}>Prev</button>
    <span class="file-nav-position">{getSiblingPositionText()}</span>
    <button type="button" onclick={openNextSiblingFile} disabled={!hasNextSiblingFile()}>Next</button>
  </div>
  {#if isVirtualTextActive()}
    <div class="virtual-profile-controls">
      <span class="virtual-profile-label">Prefetch: {getVirtualProfileLabel(virtualProfile)}</span>
      <button type="button" class:selected={virtualProfile === "responsive"} onclick={() => setVirtualProfile("responsive")}>Fast</button>
      <button type="button" class:selected={virtualProfile === "balanced"} onclick={() => setVirtualProfile("balanced")}>Balanced</button>
      <button type="button" class:selected={virtualProfile === "memory"} onclick={() => setVirtualProfile("memory")}>Memory</button>
    </div>
  {/if}
  {#if loading}
    <div class="loading">Loading...</div>
  {:else if currentKind === "image"}
    {#if error}
      <pre class="error">{error}</pre>
    {:else}
      <div
        class="image-scroll"
        role="region"
        aria-label="Image Viewer"
        class:panning={imagePanning}
        class:fit-mode={imageZoomMode === "fit"}
        bind:this={imageContainer}
        onwheel={handleImageWheel}
        ondblclick={handleImageDoubleClick}
        onpointerdown={handleImagePointerDown}
        onpointermove={handleImagePointerMove}
        onpointerup={endImagePan}
        onpointercancel={endImagePan}
      >
        {#if imageLoadError}
          <pre class="error image-error">{imageLoadError}</pre>
        {:else}
          <div class="image-frame">
            <img
              src={imageSrc}
              alt=""
              draggable="false"
              onerror={handleImageError}
              onload={handleImageLoad}
              style={getImageInlineStyle()}
            />
          </div>
          <div class="image-controls">
            <button type="button" onpointerdown={(event) => event.stopPropagation()} onclick={fitImageToWindow}>Fit</button>
            <button type="button" onpointerdown={(event) => event.stopPropagation()} onclick={() => setImageZoomPreset(100)}>100%</button>
            <button type="button" onpointerdown={(event) => event.stopPropagation()} onclick={() => setImageZoomPreset(200)}>200%</button>
          </div>
          <div class="image-zoom-indicator">{getImageStatusText()}</div>
        {/if}
      </div>
    {/if}
  {:else if currentKind === "markdown"}
    {#if error}
      <pre class="error">{error}</pre>
    {:else}
      <div class="markdown-view-controls">
        <button
          type="button"
          class:selected={markdownViewMode === "html"}
          disabled={virtualTextMode}
          onclick={() => setMarkdownViewMode("html")}
        >HTML</button>
        <button
          type="button"
          class:selected={markdownViewMode === "text"}
          onclick={() => setMarkdownViewMode("text")}
        >Text</button>
        {#if markdownViewMode === "html"}
          <span class="markdown-zoom-label">{getMarkdownHtmlZoomText()}</span>
          <button type="button" onclick={() => zoomMarkdownHtmlBy(1 / MARKDOWN_HTML_ZOOM_STEP)}>-</button>
          <button type="button" onclick={resetMarkdownHtmlZoom}>100%</button>
          <button type="button" onclick={() => zoomMarkdownHtmlBy(MARKDOWN_HTML_ZOOM_STEP)}>+</button>
        {/if}
      </div>
      {#if markdownViewMode === "html"}
        <article
          class="markdown"
          bind:this={markdownArticleEl}
          style={getMarkdownHtmlStyle()}
          onwheel={handleMarkdownHtmlWheel}
        >
          {@html markdownHtml}
        </article>
      {:else if virtualTextMode}
        <div
          class="text-virtual-scroll markdown-text-lines"
          aria-label="Markdown Source Lines"
          bind:this={virtualTextContainer}
          onscroll={handleVirtualTextScroll}
        >
          <div class="text-virtual-spacer" style={getVirtualTextSpacerStyle()}>
            <div class="text-virtual-lines" style={getVirtualTextLinesStyle()}>
              {#if virtualTextHighlightedLines.length > 0}
                {#each virtualTextHighlightedLines as lineHtml, index}
                  <div class="text-line">
                    <span class="line-number">{virtualTextStartLine + index + 1}</span>
                    <pre class="text line-code code-highlight"><code class="hljs language-markdown">{@html lineHtml || " "}</code></pre>
                  </div>
                {/each}
              {:else}
                {#each virtualTextLines as line, index}
                  <div class="text-line">
                    <span class="line-number">{virtualTextStartLine + index + 1}</span>
                    <pre class="text line-code">{line || " "}</pre>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </div>
      {:else}
        {#if markdownHighlightedLines.length > 0}
          <div class="text-lines markdown-text-lines" aria-label="Markdown Source Lines">
            {#each markdownHighlightedLines as lineHtml, index}
              <div class="text-line">
                <span class="line-number">{index + 1}</span>
                <pre class="text line-code code-highlight"><code class="hljs language-markdown">{@html lineHtml || " "}</code></pre>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-lines markdown-text-lines" aria-label="Markdown Source Lines">
            {#each textLines as line, index}
              <div class="text-line">
                <span class="line-number">{index + 1}</span>
                <pre class="text line-code">{line || " "}</pre>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    {/if}
  {:else if currentKind === "text"}
    {#if error}
      <pre class="error">{error}</pre>
    {:else if virtualTextMode}
      <div
        class="text-virtual-scroll"
        aria-label="Text Lines"
        bind:this={virtualTextContainer}
        onscroll={handleVirtualTextScroll}
      >
        <div class="text-virtual-spacer" style={getVirtualTextSpacerStyle()}>
          <div class="text-virtual-lines" style={getVirtualTextLinesStyle()}>
            {#if virtualTextHighlightedLines.length > 0}
              {#each virtualTextHighlightedLines as lineHtml, index}
                <div class="text-line">
                  <span class="line-number">{virtualTextStartLine + index + 1}</span>
                  <pre class="text line-code code-highlight"><code class={`hljs language-${getVirtualHighlightLanguage()}`}>{@html lineHtml || " "}</code></pre>
                </div>
              {/each}
            {:else}
              {#each virtualTextLines as line, index}
                <div class="text-line">
                  <span class="line-number">{virtualTextStartLine + index + 1}</span>
                  <pre class="text line-code">{line || " "}</pre>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>
    {:else if highlightedTextHtml}
      <div class="text-lines" aria-label="Text Lines">
        {#each highlightedTextLines as lineHtml, index}
          <div class="text-line">
            <span class="line-number">{index + 1}</span>
            <pre class="text line-code code-highlight"><code class={`hljs language-${textLanguage}`}>{@html lineHtml || " "}</code></pre>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-lines" aria-label="Text Lines">
        {#each textLines as line, index}
          <div class="text-line">
            <span class="line-number">{index + 1}</span>
            <pre class="text line-code">{line || " "}</pre>
          </div>
        {/each}
      </div>
    {/if}
  {:else if currentKind === "error"}
    <pre class="error">{error}</pre>
  {:else}
    <div class="empty">No file selected</div>
  {/if}
</main>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  :global(body) {
    font-family: "Segoe UI", Arial, sans-serif;
    background: #0f172a;
    color: #e5e7eb;
  }

  .viewer-root {
    width: 100vw;
    height: 100vh;
    overflow: auto;
    background: #0f172a;
  }

  .viewer-root.image-mode {
    overflow: hidden;
  }

  .viewer-root.virtual-text-mode {
    overflow: hidden;
  }

  .loading,
  .empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
    font-size: 14px;
  }

  .image-scroll {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: #0b1220;
    cursor: grab;
    user-select: none;
    touch-action: none;
  }

  .image-scroll.fit-mode {
    overflow: hidden;
  }

  .image-scroll.panning {
    cursor: grabbing;
  }

  .image-frame {
    min-width: 100%;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
  }

  .image-scroll img {
    display: block;
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    user-select: none;
  }

  .file-nav-controls {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 15;
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .file-nav-controls button {
    border: 1px solid #475569;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.86);
    color: #e2e8f0;
    padding: 5px 9px;
    font-size: 12px;
    cursor: pointer;
  }

  .file-nav-controls button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .file-nav-controls button:hover:not(:disabled) {
    background: #334155;
  }

  .file-nav-position {
    min-width: 68px;
    text-align: center;
    border: 1px solid #475569;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.86);
    color: #e2e8f0;
    font-size: 12px;
    line-height: 1;
    padding: 7px 8px;
    user-select: none;
  }

  .virtual-profile-controls {
    position: fixed;
    top: 44px;
    left: 10px;
    z-index: 15;
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 4px 6px;
    border: 1px solid #475569;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.9);
  }

  .virtual-profile-label {
    color: #cbd5e1;
    font-size: 12px;
    user-select: none;
    padding-right: 2px;
  }

  .virtual-profile-controls button {
    border: 1px solid #475569;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.86);
    color: #e2e8f0;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
  }

  .virtual-profile-controls button:hover {
    background: #334155;
  }

  .virtual-profile-controls button.selected {
    background: #0b60d1;
    border-color: #0b60d1;
    color: #f8fafc;
  }

  .image-controls {
    position: fixed;
    right: 12px;
    bottom: 44px;
    display: flex;
    gap: 6px;
    z-index: 12;
  }

  .image-controls button {
    border: 1px solid #475569;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.86);
    color: #e2e8f0;
    padding: 5px 8px;
    font-size: 12px;
    cursor: pointer;
  }

  .image-controls button:hover {
    background: #334155;
  }

  .image-zoom-indicator {
    position: fixed;
    right: 12px;
    bottom: 12px;
    background: rgba(15, 23, 42, 0.78);
    border: 1px solid #334155;
    border-radius: 6px;
    color: #e2e8f0;
    font-size: 12px;
    line-height: 1;
    padding: 6px 8px;
    user-select: none;
    pointer-events: none;
  }

  .image-error {
    color: #fca5a5;
    background: transparent;
  }

  .text,
  .error {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: Consolas, "Cascadia Mono", monospace;
    font-size: 13px;
    line-height: 20px;
    padding: 12px;
    box-sizing: border-box;
  }

  .text {
    color: #e5e7eb;
  }

  .text-lines {
    width: max-content;
    min-width: 100%;
    padding: 8px 0;
    box-sizing: border-box;
  }

  .text-virtual-scroll {
    width: 100%;
    height: 100%;
    overflow: auto;
  }

  .text-virtual-spacer {
    width: max-content;
    min-width: 100%;
    position: relative;
  }

  .text-virtual-lines {
    position: absolute;
    top: 0;
    left: 0;
    width: max-content;
    min-width: 100%;
    will-change: transform;
  }

  .text-line {
    display: grid;
    grid-template-columns: 72px 1fr;
    align-items: start;
    min-height: 20px;
  }

  .line-number {
    display: block;
    margin: 0;
    padding: 0 10px 0 0;
    border-right: 1px solid #334155;
    background: #111827;
    color: #94a3b8;
    text-align: right;
    font-family: Consolas, "Cascadia Mono", monospace;
    font-size: 13px;
    line-height: 20px;
    user-select: none;
  }

  .line-code {
    padding: 0 12px;
    white-space: pre;
    word-break: normal;
    overflow: visible;
    line-height: 20px;
  }

  .markdown-view-controls {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 14;
    display: flex;
    gap: 6px;
  }

  .markdown-view-controls button {
    border: 1px solid #475569;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.86);
    color: #e2e8f0;
    padding: 5px 9px;
    font-size: 12px;
    cursor: pointer;
  }

  .markdown-view-controls button:hover {
    background: #334155;
  }

  .markdown-view-controls button.selected {
    background: #0b60d1;
    border-color: #0b60d1;
    color: #f8fafc;
  }

  .markdown-zoom-label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 56px;
    padding: 0 6px;
    border: 1px solid #475569;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.86);
    color: #e2e8f0;
    font-size: 12px;
    user-select: none;
  }

  .markdown-text-lines {
    padding-top: 42px;
  }

  .code-highlight {
    white-space: pre;
    word-break: normal;
  }

  .code-highlight :global(.hljs) {
    display: block;
    margin: 0;
    padding: 0;
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    white-space: pre;
  }

  .code-highlight :global(.hljs-section) {
    color: #60a5fa;
    font-weight: 700;
  }

  .code-highlight :global(.hljs-bullet) {
    color: #f87171;
    font-weight: 700;
  }

  .code-highlight :global(.hljs-strong) {
    color: #f8fafc;
    font-weight: 700;
  }

  .code-highlight :global(.hljs-emphasis) {
    color: #cbd5e1;
    font-style: italic;
  }

  .error {
    color: #fca5a5;
  }

  .markdown {
    max-width: 980px;
    margin: 0 auto;
    padding: 54px 24px 32px;
    color: #111827;
    background: #ffffff;
    min-height: 100%;
    box-sizing: border-box;
    line-height: 1.65;
  }

  .markdown :global(h1),
  .markdown :global(h2),
  .markdown :global(h3) {
    margin: 0.9em 0 0.45em;
    line-height: 1.25;
  }

  .markdown :global(p) {
    margin: 0.5em 0;
  }

  .markdown :global(ul),
  .markdown :global(ol) {
    margin: 0.5em 0;
    padding-left: 1.35em;
  }

  .markdown :global(code) {
    font-family: Consolas, "Cascadia Mono", monospace;
    background: #e5e7eb;
    padding: 0.08em 0.3em;
    border-radius: 4px;
  }

  .markdown :global(pre) {
    background: #e5e7eb;
    padding: 10px 12px;
    border-radius: 6px;
    overflow: auto;
  }

  .markdown :global(pre code) {
    background: transparent;
    padding: 0;
  }
</style>

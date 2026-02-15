/**
 * @param {string} value
 */
function normalizeExt(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\./, "");
}

/**
 * @param {string} value
 */
function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * @param {string} value
 */
function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "simple" || mode === "none") {
    return mode;
  }
  return "by_type";
}

const IMAGE_EXTS = new Set([
  "png", "jpg", "jpeg", "bmp", "gif", "webp", "svg", "ico", "tif", "tiff", "avif", "heic", "heif"
]);
const VIDEO_EXTS = new Set(["mp4", "mkv", "avi", "mov", "wmv", "webm", "flv", "m4v", "ts", "mpeg", "mpg"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus"]);
const MARKDOWN_EXTS = new Set(["md", "markdown", "mdx"]);
const CODE_EXTS = new Set([
  "c", "h", "cpp", "cc", "cxx", "hpp", "hh", "hxx",
  "rs", "go", "java", "kt", "kts", "cs", "swift", "dart",
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "py", "rb", "php", "pl", "lua", "r",
  "html", "htm", "css", "scss", "sass", "less", "xml",
  "sql", "sh", "bash", "zsh", "ps1", "psm1", "bat", "cmd"
]);
const CONFIG_EXTS = new Set([
  "json", "jsonc", "toml", "yaml", "yml", "ini", "cfg", "conf", "properties", "env", "editorconfig"
]);
const ARCHIVE_EXTS = new Set(["zip", "7z", "rar", "tar", "gz", "bz2", "xz", "tgz", "tbz", "txz", "cab", "iso"]);
const EXECUTABLE_EXTS = new Set(["exe", "msi", "appref-ms", "com", "scr"]);
const DOCUMENT_EXTS = new Set(["pdf", "doc", "docx", "odt", "rtf"]);
const SPREADSHEET_EXTS = new Set(["xls", "xlsx", "ods", "csv", "tsv"]);
const PRESENTATION_EXTS = new Set(["ppt", "pptx", "odp", "key"]);
const LINK_EXTS = new Set(["lnk", "url", "webloc"]);
const TEXT_EXTS = new Set(["txt", "log", "text", "nfo", "readme", "license"]);
const GIT_BASENAMES = new Set([".gitignore", ".gitattributes", ".gitmodules"]);

/**
 * @param {{ type: "file" | "dir", name?: string, ext?: string }} entry
 * @param {"by_type" | "simple" | "none"} [mode]
 */
export function getEntryIcon(entry, mode = "by_type") {
  const normalizedMode = normalizeMode(mode);
  if (normalizedMode === "none") {
    return "";
  }
  if (normalizedMode === "simple") {
    return entry?.type === "dir" ? "📁" : "📄";
  }

  if (!entry || entry.type === "dir") {
    return "📁";
  }

  const ext = normalizeExt(entry.ext);
  const name = normalizeName(entry.name);

  if (GIT_BASENAMES.has(name) || name === ".git") return "🌿";
  if (name === "dockerfile" || name === "makefile") return "💻";

  if (LINK_EXTS.has(ext)) return "🔗";
  if (IMAGE_EXTS.has(ext)) return "🖼️";
  if (VIDEO_EXTS.has(ext)) return "🎞️";
  if (AUDIO_EXTS.has(ext)) return "🎵";
  if (MARKDOWN_EXTS.has(ext)) return "📝";
  if (CODE_EXTS.has(ext)) return "💻";
  if (CONFIG_EXTS.has(ext)) return "⚙️";
  if (ARCHIVE_EXTS.has(ext)) return "🗜️";
  if (EXECUTABLE_EXTS.has(ext)) return "🚀";
  if (DOCUMENT_EXTS.has(ext)) return "📕";
  if (SPREADSHEET_EXTS.has(ext)) return "📊";
  if (PRESENTATION_EXTS.has(ext)) return "📽️";
  if (TEXT_EXTS.has(ext)) return "📄";

  if (!ext) return "📄";
  return "❓";
}
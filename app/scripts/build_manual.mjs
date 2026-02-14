import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");
const inputPath = path.join(repoRoot, "user_manual.md");
const staticDir = path.join(__dirname, "..", "static");
const outputPath = path.join(staticDir, "user_manual.html");
const outputMarkdownPath = path.join(staticDir, "user_manual.md");
const logoSrc = path.join(repoRoot, "ReflexFiles.png");
const logoDest = path.join(staticDir, "ReflexFiles.png");
const resourcesDir = path.join(__dirname, "..", "src-tauri", "resources");
const resourceManual = path.join(resourcesDir, "user_manual.html");
const resourceManualMarkdown = path.join(resourcesDir, "user_manual.md");
const resourceLogo = path.join(resourcesDir, "ReflexFiles.png");

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
});

function getManualImageSources(markdown) {
  const tokens = md.parse(markdown, {});
  const sources = new Set();
  for (const token of tokens) {
    if (token.type !== "inline" || !token.children) continue;
    for (const child of token.children) {
      if (child.type !== "image") continue;
      const src = child.attrGet("src");
      if (src) sources.add(src.trim());
    }
  }
  return [...sources];
}

function isRemoteOrDataUrl(src) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src);
}

function normalizeAssetPath(src) {
  const cleaned = src.split("#")[0].split("?")[0].trim();
  return cleaned.replace(/^\.?[\\/]/, "");
}

async function copyAssetToRoots(absSrc, relSrc) {
  const staticAssetPath = path.join(staticDir, relSrc);
  const resourceAssetPath = path.join(resourcesDir, relSrc);
  await fs.mkdir(path.dirname(staticAssetPath), { recursive: true });
  await fs.copyFile(absSrc, staticAssetPath);
  await fs.mkdir(path.dirname(resourceAssetPath), { recursive: true });
  await fs.copyFile(absSrc, resourceAssetPath);
}

async function copyManualAssets(markdown) {
  const sources = getManualImageSources(markdown);
  for (const source of sources) {
    if (!source || isRemoteOrDataUrl(source)) continue;
    const normalized = normalizeAssetPath(source);
    if (!normalized) continue;
    const absSrc = path.resolve(repoRoot, normalized);
    const relSrc = path.relative(repoRoot, absSrc);
    if (relSrc.startsWith("..") || path.isAbsolute(relSrc)) {
      console.warn(`Skipped manual asset outside repository: ${source}`);
      continue;
    }
    try {
      await copyAssetToRoots(absSrc, relSrc);
    } catch (err) {
      console.warn(`Failed to copy manual asset: ${source}`, err);
    }
  }
}

async function main() {
  const markdown = await fs.readFile(inputPath, "utf-8");
  let body = md.render(markdown);
  // Add anchors for in-manual navigation (e.g., Help -> Keymap).
  body = body.replace(
    "<h2>キー操作（既定）</h2>",
    '<h2 id="keymap">キー操作（既定）</h2>'
  );
  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ReflexFiles ユーザーマニュアル</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        padding: 24px;
        font-family: "Segoe UI", "Yu Gothic UI", "Meiryo", system-ui, sans-serif;
        line-height: 1.6;
      }
      h1, h2, h3, h4, h5, h6 {
        margin: 1.2em 0 0.6em;
      }
      code {
        font-family: Consolas, "Cascadia Mono", "Noto Sans Mono", monospace;
        background: rgba(127, 127, 127, 0.15);
        padding: 0 4px;
        border-radius: 4px;
      }
      pre {
        background: rgba(127, 127, 127, 0.15);
        padding: 12px;
        overflow-x: auto;
        border-radius: 6px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
        font-size: 13px;
      }
      th, td {
        border: 1px solid rgba(127, 127, 127, 0.35);
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: rgba(127, 127, 127, 0.15);
      }
      ul, ol {
        padding-left: 1.6em;
      }
      hr {
        margin: 2em 0;
      }
    </style>
  </head>
  <body>
${body}
  </body>
</html>`;
  await fs.mkdir(staticDir, { recursive: true });
  await fs.writeFile(outputPath, html, "utf-8");
  await fs.writeFile(outputMarkdownPath, markdown, "utf-8");
  await copyManualAssets(markdown);
  try {
    await fs.copyFile(logoSrc, logoDest);
  } catch {
    // Logo is optional; ignore if missing.
  }
  await fs.mkdir(resourcesDir, { recursive: true });
  await fs.writeFile(resourceManual, html, "utf-8");
  await fs.writeFile(resourceManualMarkdown, markdown, "utf-8");
  try {
    await fs.copyFile(logoSrc, resourceLogo);
  } catch {
    // Logo is optional; ignore if missing.
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");
const staticDir = path.join(__dirname, "..", "static");
const resourcesDir = path.join(__dirname, "..", "src-tauri", "resources");

const manuals = [
  {
    id: "en",
    lang: "en",
    title: "ReflexFiles User Manual",
    source: path.join(repoRoot, "user_manual.md"),
    keymapHeadingHtmlCandidates: [
      "<h2>Default Key Bindings</h2>",
      "<h2>Key Bindings</h2>",
    ],
  },
  {
    id: "ja",
    lang: "ja",
    title: "ReflexFiles ユーザーマニュアル",
    source: path.join(repoRoot, "docs", "ja", "user_manual.ja.md"),
    keymapHeadingHtmlCandidates: [
      "<h2>キー操作（既定）</h2>",
      "<h2>キー一覧</h2>",
    ],
  },
];

const logoCandidates = [
  path.join(repoRoot, "ReflexFiles.png"),
  path.join(repoRoot, "docs", "ReflexFiles.png"),
];

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

function injectManualAnchors(body, manual) {
  for (const heading of manual.keymapHeadingHtmlCandidates) {
    if (body.includes(heading)) {
      return body.replace(heading, heading.replace("<h2>", '<h2 id="keymap">'));
    }
  }
  return body;
}

function buildManualHtml(manual, body) {
  return `<!doctype html>
<html lang="${manual.lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${manual.title}</title>
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
}

async function writeManualOutputs(manual, markdown, html) {
  const htmlName = `user_manual.${manual.id}.html`;
  const mdName = `user_manual.${manual.id}.md`;

  await fs.mkdir(staticDir, { recursive: true });
  await fs.writeFile(path.join(staticDir, htmlName), html, "utf-8");
  await fs.writeFile(path.join(staticDir, mdName), markdown, "utf-8");

  await fs.mkdir(resourcesDir, { recursive: true });
  await fs.writeFile(path.join(resourcesDir, htmlName), html, "utf-8");
  await fs.writeFile(path.join(resourcesDir, mdName), markdown, "utf-8");
}

async function writeCompatibilityAliases() {
  const aliases = [
    {
      from: path.join(staticDir, "user_manual.en.html"),
      to: path.join(staticDir, "user_manual.html"),
    },
    {
      from: path.join(staticDir, "user_manual.en.md"),
      to: path.join(staticDir, "user_manual.md"),
    },
    {
      from: path.join(resourcesDir, "user_manual.en.html"),
      to: path.join(resourcesDir, "user_manual.html"),
    },
    {
      from: path.join(resourcesDir, "user_manual.en.md"),
      to: path.join(resourcesDir, "user_manual.md"),
    },
  ];

  for (const pair of aliases) {
    await fs.copyFile(pair.from, pair.to);
  }
}

async function copyLogoIfPresent() {
  let logoSource = null;
  for (const candidate of logoCandidates) {
    try {
      await fs.access(candidate);
      logoSource = candidate;
      break;
    } catch {
      // ignore
    }
  }

  if (!logoSource) {
    return;
  }

  await fs.copyFile(logoSource, path.join(staticDir, "ReflexFiles.png"));
  await fs.copyFile(logoSource, path.join(resourcesDir, "ReflexFiles.png"));
}

async function buildManual(manual) {
  const markdown = await fs.readFile(manual.source, "utf-8");
  let body = md.render(markdown);
  body = injectManualAnchors(body, manual);
  const html = buildManualHtml(manual, body);
  await writeManualOutputs(manual, markdown, html);
  await copyManualAssets(markdown);
}

async function main() {
  for (const manual of manuals) {
    await buildManual(manual);
  }
  await writeCompatibilityAliases();
  await copyLogoIfPresent();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
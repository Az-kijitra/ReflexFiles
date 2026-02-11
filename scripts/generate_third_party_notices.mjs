import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const packageLockPath = path.join(repoRoot, "app", "package-lock.json");
const cargoLockPath = path.join(repoRoot, "app", "src-tauri", "Cargo.lock");
const outputEnPath = path.join(repoRoot, "docs", "THIRD_PARTY_NOTICES.md");
const outputJaPath = path.join(repoRoot, "docs", "THIRD_PARTY_NOTICES.ja.md");

const UNKNOWN_LICENSE = "UNKNOWN (resolve from upstream)";
const cargoHome =
  process.env.CARGO_HOME ||
  (process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, ".cargo")
    : null);
const registrySrcRoot = cargoHome ? path.join(cargoHome, "registry", "src") : null;

function normalizeLicense(value) {
  if (!value) return UNKNOWN_LICENSE;
  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).join(" OR ");
    return joined.trim() || UNKNOWN_LICENSE;
  }
  if (typeof value === "object") {
    if (value.type) return String(value.type).trim() || UNKNOWN_LICENSE;
    return UNKNOWN_LICENSE;
  }
  const text = String(value).trim();
  return text.length ? text : UNKNOWN_LICENSE;
}

function derivePackageName(pkgPath) {
  const normalized = pkgPath.replace(/\\/g, "/");
  const parts = normalized.split("node_modules/").filter(Boolean);
  if (!parts.length) return "";
  return parts[parts.length - 1];
}

function collectNpmPackages(lock) {
  const packages = lock?.packages ?? {};
  const map = new Map();

  for (const [pkgPath, info] of Object.entries(packages)) {
    if (!pkgPath || pkgPath === "") continue;
    if (!pkgPath.startsWith("node_modules/")) continue;

    const name = info?.name ?? derivePackageName(pkgPath);
    if (!name) continue;
    const version = info?.version ?? "";
    const license = normalizeLicense(info?.license);
    const dev = Boolean(info?.dev);
    const optional = Boolean(info?.optional);

    const key = `${name}@${version}::${license}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        name,
        version,
        license,
        scope: dev ? "dev" : "prod",
        optional: optional ? "optional" : "required",
      });
      continue;
    }

    if (existing.scope === "dev" && !dev) existing.scope = "prod";
    if (existing.optional === "optional" && !optional) existing.optional = "required";
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "en")
  );
}

function parseCargoLock(content) {
  const lines = content.split(/\r?\n/);
  const packages = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "[[package]]") {
      if (current) packages.push(current);
      current = {};
      continue;
    }
    if (!current || trimmed === "" || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("name = ")) {
      current.name = trimmed.slice(7).replace(/^\"|\"$/g, "");
      continue;
    }
    if (trimmed.startsWith("version = ")) {
      current.version = trimmed.slice(10).replace(/^\"|\"$/g, "");
      continue;
    }
    if (trimmed.startsWith("source = ")) {
      current.source = trimmed.slice(9).replace(/^\"|\"$/g, "");
      continue;
    }
  }
  if (current) packages.push(current);

  return packages
    .filter((pkg) => pkg.name && pkg.version)
    .filter((pkg) => pkg.source);
}

async function findRegistryIndexDirs() {
  if (!registrySrcRoot) return [];
  try {
    const entries = await fs.readdir(registrySrcRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

function parseCargoTomlLicense(content) {
  const lines = content.split(/\r?\n/);
  let inPackage = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      inPackage = trimmed === "[package]";
      continue;
    }
    if (!inPackage || trimmed.startsWith("#") || trimmed === "") continue;
    const licenseMatch = trimmed.match(/^license\s*=\s*"([^"]+)"/);
    if (licenseMatch) return licenseMatch[1];
    const licenseFileMatch = trimmed.match(/^license-file\s*=\s*"([^"]+)"/);
    if (licenseFileMatch) return `SEE LICENSE FILE (${licenseFileMatch[1]})`;
  }
  return null;
}

async function resolveCargoLicenses(cargoPackages) {
  const indexDirs = await findRegistryIndexDirs();
  if (!indexDirs.length) {
    return cargoPackages.map((pkg) => ({ ...pkg, license: UNKNOWN_LICENSE }));
  }

  const resolved = [];
  for (const pkg of cargoPackages) {
    let license = null;
    for (const indexDir of indexDirs) {
      const crateDir = path.join(registrySrcRoot, indexDir, `${pkg.name}-${pkg.version}`);
      const cargoTomlPath = path.join(crateDir, "Cargo.toml");
      try {
        const cargoToml = await fs.readFile(cargoTomlPath, "utf-8");
        license = parseCargoTomlLicense(cargoToml);
        if (license) break;
      } catch {
        // Keep trying other registry dirs.
      }
    }
    resolved.push({ ...pkg, license: license || UNKNOWN_LICENSE });
  }

  return resolved;
}

function renderMarkdown({ npmPackages, cargoPackages, generatedOn, lang }) {
  const isJa = lang === "ja";
  const title = isJa
    ? "第三者ライセンス一覧（自動生成）"
    : "Third-Party Notices (Generated)";
  const generatedLabel = isJa ? "生成日" : "Generated";
  const sourcesLabel = isJa ? "生成元" : "Sources";
  const scriptLabel = isJa ? "生成スクリプト" : "Generator";
  const notesTitle = isJa ? "補足" : "Notes";

  const intro = isJa
    ? [
        "このファイルはロックファイルから自動生成されています。",
        "ライセンスの完全性・正確性は必ず上流の LICENSE/NOTICE を確認してください。",
      ]
    : [
        "This file is generated from lockfiles.",
        "Verify license texts and NOTICE requirements against upstream LICENSE/NOTICE files.",
      ];

  const rustNote = isJa
    ? "Rust クレートのライセンスはローカルの Cargo レジストリを参照して補完します。未解決の項目がある場合は `cargo metadata` や `cargo about` で補完してください。"
    : "Rust crate licenses are resolved from the local Cargo registry when available. If any entries remain unresolved, use `cargo metadata` or `cargo about` to complete them.";

  const npmHeader = isJa ? "JavaScript / Node（app/package-lock.json）" : "JavaScript / Node (app/package-lock.json)";
  const rustHeader = isJa ? "Rust（app/src-tauri/Cargo.lock）" : "Rust (app/src-tauri/Cargo.lock)";

  const npmTableHeader = isJa
    ? "| パッケージ | バージョン | ライセンス | 区分 | 任意 |\n| --- | --- | --- | --- | --- |"
    : "| Package | Version | License | Scope | Optional |\n| --- | --- | --- | --- | --- |";

  const rustTableHeader = isJa
    ? "| クレート | バージョン | ソース | ライセンス |\n| --- | --- | --- | --- |"
    : "| Crate | Version | Source | License |\n| --- | --- | --- | --- |";

  const npmRows = npmPackages.map((pkg) => {
    const scope = pkg.scope;
    const optional = pkg.optional;
    return `| ${pkg.name} | ${pkg.version || "-"} | ${pkg.license} | ${scope} | ${optional} |`;
  });

  const rustRows = cargoPackages.map((pkg) => {
    const source = pkg.source ?? "-";
    return `| ${pkg.name} | ${pkg.version} | ${source} | ${pkg.license} |`;
  });

  const gplCandidates = npmPackages.filter((pkg) => /gpl/i.test(pkg.license));
  const gplNote = gplCandidates.length
    ? (isJa
        ? `GPL 系ライセンスの候補（要確認）: ${gplCandidates.map((pkg) => `${pkg.name}@${pkg.version}`).join(", ")}`
        : `GPL-family license candidates (review required): ${gplCandidates.map((pkg) => `${pkg.name}@${pkg.version}`).join(", ")}`)
    : (isJa ? "GPL 系ライセンスは検出されませんでした。" : "No GPL-family licenses detected.");

  return [
    `# ${title}`,
    "",
    `${generatedLabel}: ${generatedOn}`,
    `${sourcesLabel}: \`${path.relative(repoRoot, packageLockPath)}\`, \`${path.relative(repoRoot, cargoLockPath)}\``,
    `${scriptLabel}: \`scripts/generate_third_party_notices.mjs\``,
    "",
    ...intro,
    "",
    `## ${npmHeader}`,
    "",
    npmTableHeader,
    ...npmRows,
    "",
    `## ${rustHeader}`,
    "",
    rustTableHeader,
    ...rustRows,
    "",
    `## ${notesTitle}`,
    "",
    `- ${rustNote}`,
    `- ${gplNote}`,
    "",
  ].join("\n");
}

async function main() {
  const packageLockRaw = await fs.readFile(packageLockPath, "utf-8");
  const packageLock = JSON.parse(packageLockRaw);
  const npmPackages = collectNpmPackages(packageLock);

  const cargoLockRaw = await fs.readFile(cargoLockPath, "utf-8");
  const cargoPackagesRaw = parseCargoLock(cargoLockRaw);
  const cargoPackages = await resolveCargoLicenses(cargoPackagesRaw);

  const generatedOn = new Date().toISOString().slice(0, 10);
  const enDoc = renderMarkdown({ npmPackages, cargoPackages, generatedOn, lang: "en" });
  const jaDoc = renderMarkdown({ npmPackages, cargoPackages, generatedOn, lang: "ja" });

  await fs.mkdir(path.dirname(outputEnPath), { recursive: true });
  await fs.writeFile(outputEnPath, enDoc, "utf-8");
  await fs.writeFile(outputJaPath, jaDoc, "utf-8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

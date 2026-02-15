import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const appRoot = resolve(dirname(__filename), "..", "..");
const repoRoot = resolve(appRoot, "..");

const run = (command, args) => {
  console.log(`[precheck] running: ${command} ${args.join(" ")}`);
  const res = spawnSync(command, args, {
    cwd: appRoot,
    stdio: "inherit",
    shell: false,
    env: { ...process.env },
  });
  if (typeof res.status !== "number" || res.status !== 0) {
    throw new Error(`[precheck] failed: ${command} ${args.join(" ")}`);
  }
};

const findLatestInstaller = () => {
  const nsisDir = resolve(appRoot, "src-tauri", "target", "release", "bundle", "nsis");
  const files = readdirSync(nsisDir)
    .filter((name) => /\.exe$/i.test(name))
    .map((name) => ({
      name,
      path: join(nsisDir, name),
      mtimeMs: statSync(join(nsisDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!files.length) {
    throw new Error(`[precheck] installer not found in ${nsisDir}`);
  }
  return files[0];
};

const sha256File = (filePath) => {
  const bin = readFileSync(filePath);
  return createHash("sha256").update(bin).digest("hex").toUpperCase();
};

const main = () => {
  run("npm", ["run", "check"]);
  run("npm", ["run", "e2e:full"]);
  run("npm", ["run", "tauri", "build"]);

  const installer = findLatestInstaller();
  const sha256 = sha256File(installer.path);
  const now = new Date().toISOString();
  const relInstallerPath = installer.path.replace(repoRoot + "\\", "");

  const reportPath = resolve(repoRoot, "docs", "RELEASE_PRECHECK_LAST.md");
  const report = [
    "# Release Precheck Result",
    "",
    `- Generated: ${now}`,
    `- Installer: \`${relInstallerPath}\``,
    `- SHA256: \`${sha256}\``,
    "",
    "## Steps",
    "- npm run check",
    "- npm run e2e:full",
    "- npm run tauri build",
    "",
  ].join("\n");

  writeFileSync(reportPath, report, "utf8");
  console.log(`[precheck] report written: ${reportPath}`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

const tauriConfigPath = path.join(appRoot, "src-tauri", "tauri.conf.json");
const packageJsonPath = path.join(appRoot, "package.json");
const cargoTomlPath = path.join(appRoot, "src-tauri", "Cargo.toml");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return { raw, data: JSON.parse(raw) };
}

function updatePackageJson(pkg, version) {
  if (pkg.version === version) return null;
  return { ...pkg, version };
}

function updateCargoToml(content, version) {
  const lines = content.split(/\r?\n/);
  let inPackage = false;
  let updated = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      inPackage = trimmed === "[package]";
      continue;
    }
    if (!inPackage) continue;
    if (/^version\s*=/.test(trimmed)) {
      const next = line.replace(/version\s*=\s*"[^"]*"/, `version = "${version}"`);
      if (next !== line) {
        lines[i] = next;
        updated = true;
      }
      break;
    }
  }
  if (!updated) return null;
  return lines.join("\n");
}

async function main() {
  const { data: tauriConfig } = await readJson(tauriConfigPath);
  const targetVersion = tauriConfig?.version;
  if (!targetVersion) {
    throw new Error("tauri.conf.json missing version.");
  }

  const { data: packageJson } = await readJson(packageJsonPath);
  const nextPackageJson = updatePackageJson(packageJson, targetVersion);
  if (nextPackageJson) {
    await fs.writeFile(
      packageJsonPath,
      `${JSON.stringify(nextPackageJson, null, 2)}\n`,
      "utf-8"
    );
  }

  const cargoToml = await fs.readFile(cargoTomlPath, "utf-8");
  const nextCargoToml = updateCargoToml(cargoToml, targetVersion);
  if (nextCargoToml) {
    await fs.writeFile(cargoTomlPath, nextCargoToml, "utf-8");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

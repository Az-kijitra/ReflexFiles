import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const suiteId = Date.now().toString();
const suiteName = process.env.E2E_TAURI_SUITE_NAME ?? `suite_${suiteId}`;
const continueOnFailure = process.env.E2E_TAURI_SUITE_CONTINUE_ON_FAIL === "1";
const caseTimeoutMs = Number(process.env.E2E_TAURI_CASE_TIMEOUT_MS ?? 20 * 60 * 1000);

const artifactsRoot = resolve(process.cwd(), "..", "e2e_artifacts");
const suiteDir = resolve(artifactsRoot, suiteName);
const casesDir = resolve(suiteDir, "cases");
mkdirSync(casesDir, { recursive: true });

const cases = [
  { name: "smoke", cmd: "node e2e/tauri/smoke.mjs" },
  { name: "viewer_flow", cmd: "node e2e/tauri/viewer_flow.mjs" },
  { name: "settings_session", cmd: "node e2e/tauri/settings_session.mjs" },
];

const classifyFailure = (name, exitCode, spawnError) => {
  if (spawnError) return "runner_spawn_error";
  if (exitCode === 0) return null;
  if (name === "smoke") return "smoke_flow_failed";
  if (name === "viewer_flow") return "viewer_flow_failed";
  if (name === "settings_session") return "settings_session_failed";
  return "unknown_case_failed";
};

const runCase = (testCase) => {
  const startedAt = Date.now();
  console.log(`\n[suite] starting: ${testCase.name}`);

  const caseDir = resolve(casesDir, testCase.name);
  const caseWorkDir = resolve(caseDir, "work");
  mkdirSync(caseWorkDir, { recursive: true });

  const result = spawnSync(process.execPath, ["scripts/e2e/run-tauri-selenium.mjs"], {
    shell: false,
    stdio: "inherit",
    timeout: caseTimeoutMs,
    env: {
      ...process.env,
      E2E_TAURI_TEST_CMD: testCase.cmd,
      E2E_TAURI_KILL_APP: process.env.E2E_TAURI_KILL_APP ?? "1",
      E2E_TAURI_ARTIFACT_DIR: caseDir,
      E2E_TAURI_WORKDIR: caseWorkDir,
    },
  });

  const exitCode = typeof result.status === "number" ? result.status : 1;
  const durationMs = Date.now() - startedAt;
  const passed = exitCode === 0;
  const spawnError = result.error ? String(result.error) : null;
  const failureCategory = classifyFailure(testCase.name, exitCode, spawnError);

  if (spawnError) {
    console.error(`[suite] ${testCase.name} spawn error: ${spawnError}`);
  }

  if (!passed) {
    console.error(`[suite] ${testCase.name} failure category: ${failureCategory}`);
  }

  console.log(
    `[suite] ${testCase.name}: ${passed ? "PASS" : "FAIL"} (${durationMs}ms, exit=${exitCode})`
  );

  return {
    name: testCase.name,
    command: testCase.cmd,
    artifactDir: caseDir,
    workDir: caseWorkDir,
    exitCode,
    passed,
    durationMs,
    startedAt,
    failureCategory,
    spawnError,
  };
};

const results = [];
let hasFailure = false;
for (const testCase of cases) {
  const result = runCase(testCase);
  results.push(result);
  if (!result.passed) {
    hasFailure = true;
    if (!continueOnFailure) {
      break;
    }
  }
}

const firstFailure = results.find((r) => !r.passed) ?? null;
const summary = {
  suite: suiteName,
  startedAt: new Date(Number(suiteId)).toISOString(),
  continueOnFailure,
  caseTimeoutMs,
  total: results.length,
  passed: results.filter((r) => r.passed).length,
  failed: results.filter((r) => !r.passed).length,
  failureOverview: firstFailure
    ? {
        case: firstFailure.name,
        category: firstFailure.failureCategory,
        exitCode: firstFailure.exitCode,
        artifactDir: firstFailure.artifactDir,
        spawnError: firstFailure.spawnError,
      }
    : null,
  results,
};

const summaryPath = resolve(suiteDir, "summary.json");
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log(`\n[suite] summary written: ${summaryPath}`);
if (summary.failureOverview) {
  console.log(
    `[suite] failure overview: case=${summary.failureOverview.case}, category=${summary.failureOverview.category}`
  );
}
if (hasFailure) {
  process.exitCode = 1;
}
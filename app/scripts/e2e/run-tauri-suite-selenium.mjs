import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const suiteId = Date.now().toString();
const suiteName = process.env.E2E_TAURI_SUITE_NAME ?? `suite_${suiteId}`;
const continueOnFailure = process.env.E2E_TAURI_SUITE_CONTINUE_ON_FAIL === "1";

const artifactsRoot = resolve(process.cwd(), "..", "e2e_artifacts");
const suiteDir = resolve(artifactsRoot, suiteName);
mkdirSync(suiteDir, { recursive: true });

const cases = [
  { name: "smoke", cmd: "node e2e/tauri/smoke.mjs" },
  { name: "viewer_flow", cmd: "node e2e/tauri/viewer_flow.mjs" },
  { name: "settings_session", cmd: "node e2e/tauri/settings_session.mjs" },
];

const runCase = (testCase) => {
  const startedAt = Date.now();
  console.log(`\n[suite] starting: ${testCase.name}`);

  const result = spawnSync(process.execPath, ["scripts/e2e/run-tauri-selenium.mjs"], {
    shell: false,
    stdio: "inherit",
    env: {
      ...process.env,
      E2E_TAURI_TEST_CMD: testCase.cmd,
      E2E_TAURI_KILL_APP: process.env.E2E_TAURI_KILL_APP ?? "1",
    },
  });

  const exitCode = typeof result.status === "number" ? result.status : 1;
  const durationMs = Date.now() - startedAt;
  const passed = exitCode === 0;

  if (result.error) {
    console.error(`[suite] ${testCase.name} spawn error: ${String(result.error)}`);
  }

  console.log(
    `[suite] ${testCase.name}: ${passed ? "PASS" : "FAIL"} (${durationMs}ms, exit=${exitCode})`
  );

  return {
    name: testCase.name,
    command: testCase.cmd,
    exitCode,
    passed,
    durationMs,
    startedAt,
    spawnError: result.error ? String(result.error) : null,
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

const summary = {
  suite: suiteName,
  startedAt: new Date(Number(suiteId)).toISOString(),
  continueOnFailure,
  total: results.length,
  passed: results.filter((r) => r.passed).length,
  failed: results.filter((r) => !r.passed).length,
  results,
};

const summaryPath = resolve(suiteDir, "summary.json");
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log(`\n[suite] summary written: ${summaryPath}`);
if (hasFailure) {
  process.exitCode = 1;
}
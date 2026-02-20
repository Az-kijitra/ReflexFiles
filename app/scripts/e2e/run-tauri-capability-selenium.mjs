import { spawn } from "node:child_process";
import { once } from "node:events";

const child = spawn("node scripts/e2e/run-tauri-selenium.mjs", {
  shell: true,
  stdio: "inherit",
  env: {
    ...process.env,
    E2E_TAURI_TEST_CMD: "node e2e/tauri/capability_guard.mjs",
  },
});

const [code] = await once(child, "exit");
process.exit(code ?? 1);


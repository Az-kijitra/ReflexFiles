import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { ignoreTauriPatterns as defaultIgnoreTauriPatterns } from '../../e2e/log_filters.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, '..', '..');

const driverPort = Number(process.env.E2E_TAURI_DRIVER_PORT ?? 4444);
const driverCmdBase =
  process.env.E2E_TAURI_DRIVER_CMD ?? `tauri-driver --port ${driverPort}`;
const repoRoot = resolve(appRoot, '..');
const defaultDriverCandidates = [
  resolve(appRoot, 'msedgedriver.exe'),
  resolve(repoRoot, 'msedgedriver.exe'),
];
const detectedDriver = defaultDriverCandidates.find((candidate) =>
  existsSync(candidate)
);
const nativeDriver = process.env.E2E_TAURI_NATIVE_DRIVER ?? detectedDriver;
const driverCmd = nativeDriver
  ? `${driverCmdBase} --native-driver "${nativeDriver}"`
  : driverCmdBase;
const appCmd =
  process.env.E2E_TAURI_APP_CMD ??
  (process.env.E2E_TAURI_APP_PATH ? 'npm run dev' : 'npm run tauri dev');
const killApp = process.env.E2E_TAURI_KILL_APP === '1';
const skipApp = process.env.E2E_TAURI_SKIP_APP === '1';
const apiCmd = process.env.E2E_TAURI_API_CMD;
const testCmd = process.env.E2E_TAURI_TEST_CMD ?? 'node e2e/tauri/smoke.mjs';
const testRetries = Number(process.env.E2E_TAURI_TEST_RETRIES ?? 0);

const errorRegex = new RegExp(
  process.env.E2E_TAURI_ERROR_REGEX ?? '\\b(error|fatal|panic)\\b',
  'i'
);
const envIgnorePatterns = (process.env.E2E_TAURI_IGNORE ?? '')
  .split(';')
  .map((value) => value.trim())
  .filter(Boolean)
  .map((pattern) => new RegExp(pattern, 'i'));
const ignorePatterns = [...defaultIgnoreTauriPatterns, ...envIgnorePatterns];

const isIgnoredLine = (line) => ignorePatterns.some((pattern) => pattern.test(line));

const collectLines = (buffer, chunk, onLine) => {
  const text = buffer + chunk.toString('utf8');
  const lines = text.split(/\r?\n/);
  const tail = lines.pop() ?? '';
  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }
    onLine(line);
  }
  return tail;
};

const startProcess = (name, command, envOverrides = {}) => {
  const child = spawn(command, {
    cwd: appRoot,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...envOverrides },
  });

  let stdoutBuffer = '';
  let stderrBuffer = '';

  child.stdout.on('data', (chunk) => {
    stdoutBuffer = collectLines(stdoutBuffer, chunk, (line) => onLine(name, line));
  });
  child.stderr.on('data', (chunk) => {
    stderrBuffer = collectLines(stderrBuffer, chunk, (line) => onLine(name, line));
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });

  return child;
};

const logErrors = [];

const onLine = (name, line) => {
  const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, '');
  if (errorRegex.test(cleanLine) && !isIgnoredLine(cleanLine)) {
    logErrors.push(`[${name}] ${cleanLine}`);
  }
  console.log(`[${name}] ${cleanLine}`);
};

const waitForPort = async (port, timeoutMs) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.connect({ port, host: '127.0.0.1' }, () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', reject);
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`tauri-driver did not open port ${port} in time`);
};

if (killApp && process.platform === 'win32') {
  console.log('[runner] attempting to terminate existing ReflexFiles.exe...');
  spawn('taskkill /IM ReflexFiles.exe /F', {
    shell: true,
    stdio: 'ignore',
  });
}

const driver = startProcess('driver', driverCmd);
const app = skipApp
  ? null
  : startProcess('app', appCmd, { TAURI_DRIVER_PORT: String(driverPort) });
const api = apiCmd ? startProcess('api', apiCmd) : null;

const shutdown = async () => {
  if (app?.pid) {
    app.kill();
  }
  if (api?.pid) {
    api.kill();
  }
  if (driver?.pid) {
    driver.kill();
  }
};

try {
  console.log(`[runner] waiting for tauri-driver on port ${driverPort}...`);
  await waitForPort(driverPort, Number(process.env.E2E_TAURI_TIMEOUT_MS ?? 30_000));
  console.log(`[runner] tauri-driver is ready on port ${driverPort}.`);

  let lastCode = 0;
  for (let attempt = 0; attempt <= testRetries; attempt += 1) {
    if (attempt > 0) {
      console.log(`[runner] retrying Selenium test (${attempt}/${testRetries})...`);
    }
    console.log('[runner] starting Selenium test command...');
    const runner = spawn(testCmd, {
      cwd: appRoot,
      shell: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        E2E_TAURI_WEBDRIVER_URL:
          process.env.E2E_TAURI_WEBDRIVER_URL ?? `http://127.0.0.1:${driverPort}`,
      },
    });
    const [code] = await once(runner, 'exit');
    lastCode = code ?? 0;
    console.log(`[runner] Selenium test command exited with code ${lastCode}.`);
    if (lastCode === 0) {
      break;
    }
  }

  if (logErrors.length > 0) {
    console.error('\nTauri log errors detected:');
    for (const line of logErrors) {
      console.error(`- ${line}`);
    }
    process.exitCode = 1;
  } else if (lastCode && lastCode !== 0) {
    process.exitCode = lastCode;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await shutdown();
}

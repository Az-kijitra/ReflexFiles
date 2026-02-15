import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { ignoreTauriPatterns as defaultIgnoreTauriPatterns } from '../../e2e/log_filters.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, '..', '..');

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

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

const defaultAppCandidates = [
  resolve(appRoot, 'src-tauri', 'target', 'debug', 'ReflexFiles.exe'),
  resolve(appRoot, 'src-tauri', 'target', 'debug', 'app.exe'),
];
const detectedAppPath = defaultAppCandidates.find((candidate) =>
  existsSync(candidate)
);
const effectiveAppPath = process.env.E2E_TAURI_APP_PATH ?? detectedAppPath;

const appCmd =
  process.env.E2E_TAURI_APP_CMD ??
  (effectiveAppPath ? 'npm run dev' : 'npm run tauri dev');
const killApp = process.env.E2E_TAURI_KILL_APP === '1';
const skipApp = process.env.E2E_TAURI_SKIP_APP === '1';
const apiCmd = process.env.E2E_TAURI_API_CMD;
const testCmd = process.env.E2E_TAURI_TEST_CMD ?? 'node e2e/tauri/smoke.mjs';
const testRetries = Number(process.env.E2E_TAURI_TEST_RETRIES ?? 0);

const appReadyPort = Number(process.env.E2E_TAURI_APP_READY_PORT ?? 1422);
const appReadyTimeoutMs = Number(process.env.E2E_TAURI_APP_READY_TIMEOUT_MS ?? 60_000);
const appReadyHosts = (process.env.E2E_TAURI_APP_READY_HOSTS ?? '127.0.0.1,localhost,::1')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const waitAppReady = process.env.E2E_TAURI_WAIT_APP_READY !== '0';
const needsAppReadyWait = !skipApp && appCmd.trim() === 'npm run dev' && waitAppReady;

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

const logErrors = [];
const onLine = (name, line) => {
  const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, '');
  if (errorRegex.test(cleanLine) && !isIgnoredLine(cleanLine)) {
    logErrors.push(`[${name}] ${cleanLine}`);
  }
  console.log(`[${name}] ${cleanLine}`);
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

const waitForTcpPort = async (port, timeoutMs, label, hosts = ['127.0.0.1']) => {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    for (const host of hosts) {
      try {
        await new Promise((resolvePromise, reject) => {
          const socket = net.connect({ port, host }, () => {
            socket.destroy();
            resolvePromise();
          });
          socket.on('error', reject);
        });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    await sleep(200);
  }

  const hostText = hosts.join(', ');
  const reason = lastError instanceof Error ? ` (${lastError.message})` : '';
  throw new Error(`${label} did not open port ${port} in time [hosts: ${hostText}]${reason}`);
};

const waitForChildExit = async (child, timeoutMs) => {
  if (!child) return 0;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      return child.exitCode ?? 0;
    }
    await sleep(100);
  }
  return null;
};

const forceKillPidTree = (pid) => {
  if (!pid || process.platform !== 'win32') {
    return;
  }
  spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
    shell: false,
    stdio: 'ignore',
    timeout: 3000,
  });
};

const stopChild = async (name, child) => {
  if (!child?.pid) {
    return;
  }
  if (child.exitCode !== null) {
    return;
  }

  try {
    child.kill();
  } catch {
    // ignore
  }

  let exited = await waitForChildExit(child, 1200);
  if (exited !== null) {
    return;
  }

  forceKillPidTree(child.pid);
  exited = await waitForChildExit(child, 1600);
  if (exited !== null) {
    return;
  }

  try {
    child.kill('SIGKILL');
  } catch {
    // ignore
  }

  exited = await waitForChildExit(child, 600);
  if (exited === null) {
    console.log(`[runner] forced shutdown timeout: ${name} (pid=${child.pid})`);
  } else {
    console.log(`[runner] forced shutdown: ${name}`);
  }
};

const withTimeout = async (promise, timeoutMs, label) => {
  let timer;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

if (killApp && process.platform === 'win32') {
  console.log('[runner] attempting to terminate existing ReflexFiles.exe...');
  spawnSync('taskkill', ['/IM', 'ReflexFiles.exe', '/F'], {
    shell: false,
    stdio: 'ignore',
    timeout: 3000,
  });
}

console.log(
  `[runner] app bootstrap mode: ${effectiveAppPath ? 'existing-binary + vite-dev' : 'tauri-dev build-and-run'}`
);
if (effectiveAppPath) {
  console.log(`[runner] using app binary: ${effectiveAppPath}`);
}
if (needsAppReadyWait) {
  console.log(
    `[runner] app readiness wait enabled: port=${appReadyPort}, hosts=${appReadyHosts.join(',')}`
  );
}

const driver = startProcess('driver', driverCmd);
const app = skipApp
  ? null
  : startProcess('app', appCmd, {
      TAURI_DRIVER_PORT: String(driverPort),
      ...(effectiveAppPath ? { E2E_TAURI_APP_PATH: effectiveAppPath } : {}),
    });
const api = apiCmd ? startProcess('api', apiCmd) : null;

let lastCode = 0;

try {
  console.log(`[runner] waiting for tauri-driver on port ${driverPort}...`);
  await waitForTcpPort(
    driverPort,
    Number(process.env.E2E_TAURI_TIMEOUT_MS ?? 30_000),
    'tauri-driver'
  );
  console.log(`[runner] tauri-driver is ready on port ${driverPort}.`);

  if (needsAppReadyWait) {
    console.log(`[runner] waiting for app dev server on port ${appReadyPort}...`);
    await waitForTcpPort(appReadyPort, appReadyTimeoutMs, 'app dev server', appReadyHosts);
    console.log(`[runner] app dev server is ready on port ${appReadyPort}.`);
  }

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
        ...(effectiveAppPath ? { E2E_TAURI_APP_PATH: effectiveAppPath } : {}),
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
  console.log('[runner] shutdown start...');
  try {
    await withTimeout(
      (async () => {
        await stopChild('app', app);
        await stopChild('api', api);
        await stopChild('driver', driver);
      })(),
      Number(process.env.E2E_TAURI_SHUTDOWN_TIMEOUT_MS ?? 10_000),
      'runner shutdown'
    );
  } catch (error) {
    console.error(`[runner] shutdown timeout: ${error instanceof Error ? error.message : error}`);
    if (process.platform === 'win32') {
      forceKillPidTree(app?.pid);
      forceKillPidTree(api?.pid);
      forceKillPidTree(driver?.pid);
    }
  }
  console.log('[runner] shutdown complete.');
  const finalExitCode = typeof process.exitCode === 'number' ? process.exitCode : 0;
  process.exit(finalExitCode);
}
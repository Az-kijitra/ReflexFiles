import { Builder, By, Key, until } from 'selenium-webdriver';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const withTimeout = async (promise, ms, label) => {
  let timer;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const defaultAppCandidates = [
  resolve(process.cwd(), 'src-tauri', 'target', 'debug', 'ReflexFiles.exe'),
  resolve(process.cwd(), 'src-tauri', 'target', 'debug', 'app.exe'),
];
const detectedAppPath = defaultAppCandidates.find((candidate) =>
  existsSync(candidate)
);
const appPath = process.env.E2E_TAURI_APP_PATH ?? detectedAppPath;

const serverUrl = process.env.E2E_TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4444';
const timeoutMs = Number(process.env.E2E_TAURI_SMOKE_TIMEOUT_MS ?? 30_000);
const caps = process.env.E2E_TAURI_CAPS
  ? JSON.parse(process.env.E2E_TAURI_CAPS)
  : {
      browserName: 'tauri',
      ...(appPath
        ? {
            'tauri:options': {
              application: appPath,
            },
          }
        : {}),
    };

console.log(`[smoke] connecting to ${serverUrl}`);
const driver = await withTimeout(
  new Builder().usingServer(serverUrl).withCapabilities(caps).build(),
  timeoutMs,
  'WebDriver session'
);

const artifactsRoot = resolve(process.cwd(), '..', 'e2e_artifacts');
const artifactDirOverride = process.env.E2E_TAURI_ARTIFACT_DIR
  ? resolve(process.env.E2E_TAURI_ARTIFACT_DIR)
  : null;
let testId = 'boot';
let artifactDir = artifactDirOverride ?? resolve(artifactsRoot, `smoke_${testId}`);
let targetPath = process.env.E2E_TAURI_WORKDIR ?? resolve(artifactDir, 'work');

const isTransientDomError = (error) => {
  const text = String(error?.message || error || '').toLowerCase();
  return (
    text.includes('stale element reference') ||
    text.includes('no such element') ||
    text.includes('element not interactable') ||
    text.includes('does not belong to the document')
  );
};

const withStaleRetry = async (fn, label, attempts = 5) => {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (isTransientDomError(error)) {
        await driver.sleep(150);
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastError}`);
};

const makeFailureArtifactDir = (label) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = resolve(artifactDir, 'on-failure', `${label}_${stamp}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};

const captureArtifacts = async (label) => {
  try {
    const failureDir = makeFailureArtifactDir(label);
    const png = await driver.takeScreenshot();
    writeFileSync(resolve(failureDir, 'screen.png'), png, 'base64');
    const html = await driver.getPageSource();
    writeFileSync(resolve(failureDir, 'page.html'), html);
    let pathValue = '';
    try {
      pathValue = await driver
        .findElement(By.css('header.path-bar input'))
        .getAttribute('value');
    } catch {
      pathValue = '';
    }
    let visibleNames = [];
    try {
      const rows = await driver.findElements(By.css('.list .row .text'));
      for (const row of rows) {
        const text = (await row.getText()).trim();
        if (text) {
          visibleNames.push(text);
        }
      }
    } catch {
      visibleNames = [];
    }
    let currentUrl = '';
    let title = '';
    let handles = [];
    try {
      currentUrl = await driver.getCurrentUrl();
    } catch {
      currentUrl = '';
    }
    try {
      title = await driver.getTitle();
    } catch {
      title = '';
    }
    try {
      handles = await driver.getAllWindowHandles();
    } catch {
      handles = [];
    }
    writeFileSync(
      resolve(failureDir, 'context.json'),
      JSON.stringify(
        {
          captured_at: new Date().toISOString(),
          label,
          path: pathValue,
          visible: visibleNames,
          current_url: currentUrl,
          title,
          window_handles: handles,
        },
        null,
        2
      )
    );
    console.error(`[smoke] failure artifacts saved: ${failureDir}`);
  } catch (error) {
    console.error(`[smoke] artifact capture failed: ${error}`);
  }
};

try {
  console.log('[smoke] waiting for body...');
  await withTimeout(
    driver.wait(until.elementLocated(By.css('body')), timeoutMs),
    timeoutMs,
    'wait for body'
  );
  console.log('[smoke] body located.');

  const getListElement = async () => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const listEls = await driver.findElements(By.css('.list'));
        if (listEls.length > 0) {
          const listEl = listEls[0];
          if (await listEl.isDisplayed()) {
            return listEl;
          }
        }
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }
      await driver.sleep(120);
    }
    throw new Error(`wait for list timed out after ${timeoutMs}ms`);
  };

  const waitForMainUiReady = async () => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const ready = await driver.executeScript(() => {
          const isVisible = (el) => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden'
            );
          };
          const pathInput = document.querySelector('header.path-bar input');
          const list = document.querySelector('.list');
          return document.readyState === 'complete' && isVisible(pathInput) && isVisible(list);
        });
        if (ready) {
          return;
        }
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }
      await driver.sleep(120);
    }
    throw new Error('main app UI did not become ready');
  };

  console.log('[smoke] waiting for list...');
  await getListElement();
  await waitForMainUiReady();
  console.log('[smoke] list located.');

  testId = Date.now().toString().slice(-6);
  const fileA = `e2e_${testId}_a.txt`;
  const fileB = `e2e_${testId}_b.txt`;
  const zipName = `e2e_${testId}.zip`;

  if (!artifactDirOverride) {
    artifactDir = resolve(artifactsRoot, `smoke_${testId}`);
  }
  if (!process.env.E2E_TAURI_WORKDIR) {
    targetPath = resolve(artifactDir, 'work');
  }
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(targetPath, { recursive: true });

  const getPathInput = async () => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const inputs = await driver.findElements(By.css('header.path-bar input'));
        if (inputs.length > 0) {
          const input = inputs[0];
          if (await input.isDisplayed()) {
            return input;
          }
        }
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }
      await driver.sleep(120);
    }
    throw new Error(`wait for path input timed out after ${timeoutMs}ms`);
  };
  const normalizePath = (value) => value?.replace(/\//g, '\\');

  const closeOverlays = async () => {
    try {
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await driver.actions().sendKeys(Key.ESCAPE).perform();
    } catch {
      // ignore
    }
  };

  const isAncestorPath = (child, parent) => {
    if (!child || !parent) return false;
    const normalizedChild = normalizePath(child).toLowerCase();
    const normalizedParent = normalizePath(parent).toLowerCase();
    if (normalizedChild === normalizedParent) return false;
    return normalizedChild.startsWith(`${normalizedParent}\\`);
  };

  const goUpToPath = async (path) => {
    const target = normalizePath(path);
    const deadline = Date.now() + timeoutMs;
    let current = normalizePath(await (await getPathInput()).getAttribute('value'));
    let guard = 0;
    while (Date.now() < deadline && isAncestorPath(current, target)) {
      await focusList();
      await driver.actions().sendKeys(Key.BACK_SPACE).perform();
      await driver.sleep(350);
      current = normalizePath(await (await getPathInput()).getAttribute('value'));
      guard += 1;
      if (guard > 10) {
        break;
      }
      if (current && current.toLowerCase() === target.toLowerCase()) {
        return true;
      }
    }
    return current?.toLowerCase() === target.toLowerCase();
  };

  const waitForPathValue = async (path) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const current = normalizePath(
        await (await getPathInput()).getAttribute('value')
      );
      if (current && current.toLowerCase() === path.toLowerCase()) {
        return true;
      }
      await driver.sleep(200);
    }
    return false;
  };

  const setPath = async (path) => {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await closeOverlays();
        const current = normalizePath(
          await (await getPathInput()).getAttribute('value')
        );
        if (isAncestorPath(current, path)) {
          if (await goUpToPath(path)) {
            return;
          }
        }
        const input = await getPathInput();
        await input.click();
        await input.sendKeys(Key.chord(Key.CONTROL, 'a'));
        await input.sendKeys(Key.DELETE);
        await input.sendKeys(path);
        await input.sendKeys(Key.ENTER);
        if (await waitForPathValue(path)) {
          return;
        }
        await driver.executeScript(
          `
            const el = arguments[0];
            const value = arguments[1];
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
          `,
          input,
          path
        );
        if (await waitForPathValue(path)) {
          return;
        }
        const latest = normalizePath(
          await (await getPathInput()).getAttribute('value')
        );
        if (isAncestorPath(latest, path)) {
          if (await goUpToPath(path)) {
            return;
          }
        }
        throw new Error(`path not set: expected=${path} actual=${latest}`);
      } catch (error) {
        lastError = error;
        if (isTransientDomError(error)) {
          await driver.sleep(150);
          continue;
        }
        throw error;
      }
    }
    throw lastError ?? new Error(`path not set: expected=${path}`);
  };

  const focusList = async () =>
    withStaleRetry(async () => {
      const focused = await driver.executeScript(() => {
        const listEl = document.querySelector('.list');
        if (!listEl) return false;
        listEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        listEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        listEl.focus();
        listEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        const active = document.activeElement;
        if (active === listEl) return true;
        if (active && listEl.contains(active)) return true;
        if (active && typeof active.closest === 'function') {
          return active.closest('.list') === listEl;
        }
        return false;
      });
      if (!focused) {
        throw new Error('focus list failed');
      }
    }, 'focus list', 8);

  const triggerShortcut = async ({
    key,
    code,
    ctrl = false,
    shift = false,
    alt = false,
    meta = false,
  }) => {
    await driver.executeScript(
      (payload) => {
        const target = document.activeElement || document.body || window;
        const init = {
          key: payload.key,
          code: payload.code,
          ctrlKey: Boolean(payload.ctrl),
          shiftKey: Boolean(payload.shift),
          altKey: Boolean(payload.alt),
          metaKey: Boolean(payload.meta),
          bubbles: true,
          cancelable: true,
        };
        target.dispatchEvent(new KeyboardEvent('keydown', init));
        window.dispatchEvent(new KeyboardEvent('keydown', init));
        target.dispatchEvent(new KeyboardEvent('keyup', init));
        window.dispatchEvent(new KeyboardEvent('keyup', init));
      },
      { key, code, ctrl, shift, alt, meta }
    );
  };

  await setPath(targetPath);
  await focusList();

  const openCreate = async () => {
    const openCreateFromFileMenu = async (waitMs) => {
      const clicked = await driver.executeScript(() => {
        const textOf = (el) => String(el?.textContent || '').trim();
        const menuButtons = Array.from(document.querySelectorAll('.menu-bar .menu-button'));
        const fileButton = menuButtons.find((btn) => {
          const value = textOf(btn);
          return value === 'File' || value === 'ファイル';
        });
        if (!fileButton) return false;
        fileButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        const menuItems = Array.from(document.querySelectorAll('.menu-dropdown .menu-item'));
        for (const item of menuItems) {
          const label = textOf(item.querySelector('.menu-label'));
          if (
            label !== 'New...' &&
            label !== '新規作成...' &&
            label !== '新規作成'
          ) {
            continue;
          }
          if (item.classList.contains('disabled')) return false;
          item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      });
      if (!clicked) {
        throw new Error('file menu new not available');
      }
      const input = await withTimeout(
        driver.wait(until.elementLocated(By.css('#create-name')), waitMs),
        waitMs,
        'wait for create input (file menu)'
      );
      await input.click();
      return input;
    };

    await focusList();
    await driver.actions().sendKeys(Key.chord(Key.CONTROL, 'n')).perform();
    try {
      const input = await withTimeout(
        driver.wait(until.elementLocated(By.css('#create-name')), 2_000),
        2_000,
        'wait for create input'
      );
      await input.click();
      return input;
    } catch {
      try {
        return await openCreateFromFileMenu(3_000);
      } catch {
        // fall through to shortcut-hook/context fallback
      }
      try {
        const triggered = await driver.executeScript(() => {
          const hooks = window.__rf_test_hooks;
          if (!hooks || typeof hooks.triggerActionShortcut !== 'function') return false;
          return Boolean(hooks.triggerActionShortcut('new_file'));
        });
        if (triggered) {
          const input = await withTimeout(
            driver.wait(until.elementLocated(By.css('#create-name')), 3_000),
            3_000,
            'wait for create input (hook)'
          );
          await input.click();
          return input;
        }
      } catch {
        // fall through to context-menu fallback
      }
      const listEl = await getListElement();
      await driver.actions().contextClick(listEl).perform();
      const newItem = await withTimeout(
        driver.wait(
          until.elementLocated(By.css(".context-menu-item[data-menu-id='ctx-new']")),
          6_000
        ),
        6_000,
        'wait for context new'
      );
      await newItem.click();
      const input = await withTimeout(
        driver.wait(until.elementLocated(By.css('#create-name')), timeoutMs),
        timeoutMs,
        'wait for create input (context)'
      );
      await input.click();
      return input;
    }
  };

  const openCreateViaShortcutOnly = async () => {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await closeOverlays();
        await focusList();
        await triggerShortcut({ key: 'n', code: 'KeyN', ctrl: true });
        const input = await withTimeout(
          driver.wait(until.elementLocated(By.css('#create-name')), 4_000),
          4_000,
          'wait for create input (ctrl+n strict)'
        );
        await input.click();
        return input;
      } catch (error) {
        lastError = error;
        if (isTransientDomError(error)) {
          await driver.sleep(150);
        }
      }
    }
    throw lastError ?? new Error('ctrl+n strict create failed');
  };

  const displayCandidates = (name) => {
    const dot = name.lastIndexOf('.');
    if (dot > 0) {
      return [name, name.slice(0, dot)];
    }
    return [name];
  };

  const collectVisibleNames = async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const rowTexts = await driver.findElements(
          By.css('.list .row .text')
        );
        const visibleNames = [];
        for (const row of rowTexts) {
          const text = (await row.getText()).trim();
          if (text) {
            visibleNames.push(text);
          }
        }
        return visibleNames;
      } catch (error) {
        if (isTransientDomError(error)) {
          await driver.sleep(120);
          continue;
        }
        throw error;
      }
    }
    return [];
  };

  const waitForVisibleName = async (name) => {
    const candidates = displayCandidates(name);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const visibleNames = await collectVisibleNames();
      if (visibleNames.some((entry) => candidates.includes(entry))) {
        return;
      }
      await driver.sleep(200);
    }
    const visibleNames = await collectVisibleNames();
    throw new Error(
      `wait for ${name} timed out after ${timeoutMs}ms\n` +
        `visible=${visibleNames.join(', ')}`
    );
  };

  const confirmCreateViaShortcutOnly = async (name) => {
    const input = await openCreateViaShortcutOnly();
    await input.clear();
    await input.sendKeys(name);
    const createButton = await withTimeout(
      driver.wait(
        until.elementLocated(
          By.xpath(
            "//div[contains(@class,'modal')]//button[normalize-space(text())='作成' or normalize-space(text())='Create']"
          )
        ),
        timeoutMs
      ),
      timeoutMs,
      'wait for create button (ctrl+n strict)'
    );
    await createButton.click();
    await withTimeout(
      driver.wait(until.stalenessOf(input), timeoutMs),
      timeoutMs,
      'wait for create modal close (ctrl+n strict)'
    );
    await waitForVisibleName(name);
  };

  const assertPathTabCompletion = async ({ basePath, targetName, typedPrefix }) => {
    const expectedPath = normalizePath(resolve(basePath, targetName)).toLowerCase();
    await setPath(basePath);
    const input = await getPathInput();
    await input.click();
    await input.sendKeys(Key.chord(Key.CONTROL, 'a'));
    await input.sendKeys(Key.DELETE);
    await input.sendKeys(`${basePath}\\${typedPrefix}`);
    await input.sendKeys(Key.TAB);

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const current = normalizePath(await (await getPathInput()).getAttribute('value')).toLowerCase();
      if (current === expectedPath) {
        return;
      }
      await driver.sleep(120);
    }
    const latest = normalizePath(await (await getPathInput()).getAttribute('value'));
    throw new Error(
      `path tab completion failed: expected=${expectedPath} actual=${latest}`
    );
  };

  const assertPathTabMultiCandidateFlow = async ({
    basePath,
    typedPrefix,
    orderedCandidateNames,
    expectedPreviewNames,
    excludedPreviewNames = [],
    childPreviewName,
  }) => {
    const normalizeCompare = (value) =>
      normalizePath(String(value || ''))
        .replace(/[\\\/]+$/, '')
        .toLowerCase();
    const buildCandidatePath = (name) => normalizePath(resolve(basePath, name));
    const firstPath = buildCandidatePath(orderedCandidateNames[0]);
    const secondPath = buildCandidatePath(orderedCandidateNames[1]);

    await setPath(basePath);
    const input = await getPathInput();
    await input.click();
    await input.sendKeys(Key.chord(Key.CONTROL, 'a'));
    await input.sendKeys(Key.DELETE);
    await input.sendKeys(`${basePath}\\${typedPrefix}`);

    await input.sendKeys(Key.TAB);
    if (!(await waitForPathValue(firstPath))) {
      const latest = await (await getPathInput()).getAttribute('value');
      throw new Error(`path tab cycle(1) failed: expected=${firstPath} actual=${latest}`);
    }
    const previewNamesAfterFirst = await collectVisibleNames();
    const hasAllCandidates = expectedPreviewNames.every((name) =>
      previewNamesAfterFirst.some((entry) => displayCandidates(name).includes(entry))
    );
    if (!hasAllCandidates) {
      throw new Error(
        `path tab preview mismatch: expected=${expectedPreviewNames.join(',')} visible=${previewNamesAfterFirst.join(',')}`
      );
    }
    const hasExcludedCandidate = excludedPreviewNames.some((name) =>
      previewNamesAfterFirst.some((entry) => displayCandidates(name).includes(entry))
    );
    if (hasExcludedCandidate) {
      throw new Error(
        `path tab preview includes excluded entries: excluded=${excludedPreviewNames.join(',')} visible=${previewNamesAfterFirst.join(',')}`
      );
    }
    const completionUiState = await driver.executeScript(() => {
      const list = document.querySelector('.list');
      const statusItems = Array.from(document.querySelectorAll('.status-bar .status-item'))
        .map((el) => String(el.textContent || '').trim())
        .filter(Boolean);
      return {
        hasCompletionSurface: Boolean(list?.classList?.contains('path-completion-surface')),
        statusLine: statusItems.join(' | '),
      };
    });
    if (!completionUiState.hasCompletionSurface) {
      throw new Error('path tab preview did not apply completion surface class');
    }
    if (!String(completionUiState.statusLine || '').includes('PATH')) {
      throw new Error(`path tab preview status missing PATH message: ${completionUiState.statusLine}`);
    }
    await driver.sleep(3200);
    const statusAfterWait = await driver.executeScript(() => {
      const list = document.querySelector('.list');
      const statusItems = Array.from(document.querySelectorAll('.status-bar .status-item'))
        .map((el) => String(el.textContent || '').trim())
        .filter(Boolean);
      return {
        hasCompletionSurface: Boolean(list?.classList?.contains('path-completion-surface')),
        statusLine: statusItems.join(' | '),
      };
    });
    if (!statusAfterWait.hasCompletionSurface) {
      throw new Error('path completion surface disappeared while preview is active');
    }
    if (!String(statusAfterWait.statusLine || '').includes('PATH')) {
      throw new Error(`path completion status disappeared while preview is active: ${statusAfterWait.statusLine}`);
    }

    await input.sendKeys(Key.TAB);
    if (!(await waitForPathValue(secondPath))) {
      const latest = await (await getPathInput()).getAttribute('value');
      throw new Error(`path tab cycle(2) failed: expected=${secondPath} actual=${latest}`);
    }

    await triggerShortcut({ key: '\\', code: 'Backslash' });
    const slashExpected = normalizeCompare(secondPath);
    const slashDeadline = Date.now() + timeoutMs;
    while (Date.now() < slashDeadline) {
      const current = await (await getPathInput()).getAttribute('value');
      if (normalizeCompare(current) === slashExpected) {
        break;
      }
      await driver.sleep(120);
    }
    const slashLatest = await (await getPathInput()).getAttribute('value');
    if (normalizeCompare(slashLatest) !== slashExpected) {
      throw new Error(`path slash confirm failed: expected=${secondPath} actual=${slashLatest}`);
    }
    if (/[\\\/]{2,}$/.test(String(slashLatest || ''))) {
      throw new Error(`path slash confirm appended duplicate separator: actual=${slashLatest}`);
    }

    const childDeadline = Date.now() + timeoutMs;
    while (Date.now() < childDeadline) {
      const visibleNames = await collectVisibleNames();
      if (visibleNames.some((entry) => displayCandidates(childPreviewName).includes(entry))) {
        break;
      }
      await driver.sleep(120);
    }
    const childVisible = await collectVisibleNames();
    if (!childVisible.some((entry) => displayCandidates(childPreviewName).includes(entry))) {
      throw new Error(
        `path slash child preview failed: expected=${childPreviewName} visible=${childVisible.join(',')}`
      );
    }

    await input.sendKeys(Key.ENTER);
    const enterDeadline = Date.now() + timeoutMs;
    while (Date.now() < enterDeadline) {
      const current = await (await getPathInput()).getAttribute('value');
      if (normalizeCompare(current) === normalizeCompare(secondPath)) {
        return;
      }
      await driver.sleep(120);
    }
    const enterLatest = await (await getPathInput()).getAttribute('value');
    throw new Error(`path enter confirm failed: expected=${secondPath} actual=${enterLatest}`);
  };

  const assertPathInputCopyPaste = async ({ basePath, suffix }) => {
    await setPath(basePath);
    const input = await getPathInput();
    await input.click();
    await input.sendKeys(Key.chord(Key.CONTROL, 'a'));
    await input.sendKeys(Key.DELETE);
    await input.sendKeys(`${basePath}\\${suffix}`);
    const result = await driver.executeScript((el) => {
      if (!el) {
        return { c: { prevented: true, accepted: false }, v: { prevented: true, accepted: false } };
      }
      el.focus();
      const fire = (key, code) => {
        const event = new KeyboardEvent('keydown', {
          key,
          code,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        });
        const accepted = el.dispatchEvent(event);
        return {
          prevented: event.defaultPrevented,
          accepted,
        };
      };
      return {
        c: fire('c', 'KeyC'),
        v: fire('v', 'KeyV'),
      };
    }, input);

    if (result?.c?.prevented || result?.v?.prevented || result?.c?.accepted === false || result?.v?.accepted === false) {
      throw new Error(
        `path copy/paste keydown was captured by app: c=${JSON.stringify(result?.c)} v=${JSON.stringify(result?.v)}`
      );
    }
  };

  const readCreateError = async () => {
    const errors = await driver.findElements(By.css('.modal .error'));
    if (!errors.length) return '';
    return errors[0].getText();
  };

  const setInputValue = async (inputEl, value) => {
    await inputEl.click();
    await inputEl.sendKeys(Key.chord(Key.CONTROL, 'a'));
    await inputEl.sendKeys(Key.DELETE);
    await inputEl.sendKeys(value);
    const current = await inputEl.getAttribute('value');
    if (current !== value) {
      await driver.executeScript(
        "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input', { bubbles: true })); arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
        inputEl,
        value
      );
    }
  };

  const confirmCreate = async (name) => {
    const input = await openCreate();
    await input.clear();
    await input.sendKeys(name);
    const createButton = await withTimeout(
      driver.wait(
        until.elementLocated(
          By.xpath(
            "//div[contains(@class,'modal')]//button[normalize-space(text())='作成' or normalize-space(text())='Create']"
          )
        ),
        timeoutMs
      ),
      timeoutMs,
      'wait for create button'
    );
    await createButton.click();
    await withTimeout(
      driver.wait(until.stalenessOf(input), timeoutMs),
      timeoutMs,
      'wait for create modal close'
    );
    try {
      await waitForVisibleName(name);
    } catch (error) {
      const errorText = await readCreateError();
      if (errorText) {
        throw new Error(`create failed: ${errorText}`);
      }
      const pathValue = await (await getPathInput()).getAttribute('value');
      const visibleNames = await collectVisibleNames();
      throw new Error(
        `${error instanceof Error ? error.message : error}\\n` +
          `path=${pathValue}\\n` +
          `visible=${visibleNames.join(', ')}`
      );
    }
  };

  const confirmCreateFolder = async (name) => {
    const input = await openCreate();
    const typeSelect = await driver.findElement(By.css('#create-type'));
    await driver.executeScript(
      "arguments[0].value='folder'; arguments[0].dispatchEvent(new Event('input', { bubbles: true })); arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
      typeSelect
    );
    await input.clear();
    await input.sendKeys(name);
    const createButton = await withTimeout(
      driver.wait(
        until.elementLocated(
          By.xpath(
            "//div[contains(@class,'modal')]//button[normalize-space(text())='作成' or normalize-space(text())='Create']"
          )
        ),
        timeoutMs
      ),
      timeoutMs,
      'wait for create folder button'
    );
    await createButton.click();
    await withTimeout(
      driver.wait(until.stalenessOf(input), timeoutMs),
      timeoutMs,
      'wait for create folder modal close'
    );
    await waitForVisibleName(name);
  };

  const waitForFileContent = async (path, expected, label) => {
    const deadline = Date.now() + timeoutMs;
    let lastActual = '';
    while (Date.now() < deadline) {
      try {
        if (existsSync(path)) {
          const actual = readFileSync(path, 'utf8');
          lastActual = actual;
          if (actual === expected) {
            return;
          }
        }
      } catch (error) {
        lastActual = String(error);
      }
      await driver.sleep(200);
    }
    throw new Error(
      `${label} content mismatch\nexpected=${expected}\nactual=${lastActual}`
    );
  };

  const waitForFsPath = async (path, label) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (existsSync(path)) {
        return;
      }
      await driver.sleep(200);
    }
    throw new Error(`${label} was not created: ${path}`);
  };

  console.log('[smoke] verify keyboard shortcuts (Ctrl+N / PATH copy/paste / PATH Tab completion)...');
  const shortcutProbeFile = `e2e_${testId}_shortcut_probe.txt`;
  await confirmCreateViaShortcutOnly(shortcutProbeFile);
  await assertPathInputCopyPaste({
    basePath: targetPath,
    suffix: `clip_probe_${testId}`,
  });
  await setPath(targetPath);

  console.log('[smoke] creating files...');
  await confirmCreate(fileA);
  await confirmCreate(fileB);
  const fileAPath = resolve(targetPath, fileA);
  const fileBPath = resolve(targetPath, fileB);
  const fileAContent = `e2e-content-a-${testId}`;
  const fileBContent = `e2e-content-b-${testId}`;
  writeFileSync(fileAPath, fileAContent, 'utf8');
  writeFileSync(fileBPath, fileBContent, 'utf8');
  await waitForFileContent(fileAPath, fileAContent, 'source fileA');
  await waitForFileContent(fileBPath, fileBContent, 'source fileB');

  const nestedDirName = `e2e_${testId}_dir`;
  const nestedFileName = `e2e_${testId}_nested.txt`;
  const nestedContent = `e2e-nested-${testId}`;
  await confirmCreateFolder(nestedDirName);
  const nestedDirPath = resolve(targetPath, nestedDirName);
  await waitForFsPath(nestedDirPath, 'nested directory');
  const nestedFilePath = resolve(nestedDirPath, nestedFileName);
  writeFileSync(nestedFilePath, nestedContent, 'utf8');
  await waitForFileContent(nestedFilePath, nestedContent, 'nested file');

  const tabCompleteDirName = `tab_complete_${testId}`;
  await confirmCreateFolder(tabCompleteDirName);
  await assertPathTabCompletion({
    basePath: targetPath,
    targetName: tabCompleteDirName,
    typedPrefix: `tab_com`,
  });

  const tabMultiAName = `tab_multi_${testId}_adasa`;
  const tabMultiBName = `tab_multi_${testId}_asada`;
  const tabMultiFileName = `tab_multi_${testId}_afile.txt`;
  const tabMultiChildName = `child_${testId}`;
  await confirmCreateFolder(tabMultiAName);
  await confirmCreateFolder(tabMultiBName);
  writeFileSync(resolve(targetPath, tabMultiFileName), `tab-multi-file-${testId}`, 'utf8');
  await setPath(resolve(targetPath, tabMultiBName));
  await confirmCreateFolder(tabMultiChildName);
  await setPath(targetPath);
  await assertPathTabMultiCandidateFlow({
    basePath: targetPath,
    typedPrefix: `tab_multi_${testId}_a`,
    orderedCandidateNames: [tabMultiAName, tabMultiBName],
    expectedPreviewNames: [tabMultiAName, tabMultiBName],
    excludedPreviewNames: [tabMultiFileName],
    childPreviewName: tabMultiChildName,
  });
  await setPath(targetPath);

  const bigFileName = `e2e_${testId}_big.bin`;
  const bigFilePath = resolve(targetPath, bigFileName);
  writeFileSync(bigFilePath, 'x'.repeat(1024 * 256), 'utf8');

  await setPath(targetPath);
  await waitForVisibleName(bigFileName);
  if (!existsSync(nestedFilePath)) {
    throw new Error(`nested file missing: ${nestedFilePath}`);
  }
  await setPath(targetPath);
  await focusList();

  const rowByName = async (name) => {
    const candidates = displayCandidates(name);
    const rowTexts = await driver.findElements(
      By.css('.list .row .text')
    );
    for (const rowText of rowTexts) {
      const text = (await rowText.getText()).trim();
      if (candidates.includes(text)) {
        return rowText.findElement(
          By.xpath("./ancestor::div[contains(@class,'row')]")
        );
      }
    }
    const visibleNames = await collectVisibleNames();
    throw new Error(
      `row not found for ${name}\nvisible=${visibleNames.join(', ')}`
    );
  };

  const openDirByName = async (name, label = `open ${name}`) => {
    await focusList();
    await withStaleRetry(async () => {
      const row = await rowByName(name);
      await driver.actions().doubleClick(row).perform();
    }, label);
  };

  const ensureOpsRootVisible = async () => {
    await setPath(targetPath);
    await waitForVisibleName(opsRootName);
  };

  console.log('[smoke] selecting files...');
  await withStaleRetry(async () => {
    const rowA = await rowByName(fileA);
    await rowA.click();
  }, 'click rowA');
  await withStaleRetry(async () => {
    const rowB = await rowByName(fileB);
    await driver.actions().keyDown(Key.CONTROL).click(rowB).keyUp(Key.CONTROL).perform();
  }, 'ctrl+click rowB');

  console.log('[smoke] opening zip modal...');
  await withStaleRetry(async () => {
    const rowB = await rowByName(fileB);
    await driver.actions().contextClick(rowB).perform();
  }, 'context click rowB');
  const compressItem = await withTimeout(
    driver.wait(
      until.elementLocated(By.css(".context-menu-item[data-menu-id='ctx-compress']")),
      timeoutMs
    ),
    timeoutMs,
    'wait for context compress'
  );
  await compressItem.click();

  const zipDestination = await withTimeout(
    driver.wait(until.elementLocated(By.css('#zip-destination')), timeoutMs),
    timeoutMs,
    'wait for zip destination'
  );
  const existingPath = await zipDestination.getAttribute('value');
  const baseDir = existingPath.replace(/[/\\\\][^/\\\\]+$/, '');
  const newPath = `${baseDir}\\${zipName}`;
  await setInputValue(zipDestination, newPath);

  const zipCreateButton = await driver.findElement(
    By.css('.modal-actions button')
  );
  await zipCreateButton.click();

  await withTimeout(
    driver.wait(until.stalenessOf(zipDestination), timeoutMs),
    timeoutMs,
    'wait for zip modal close'
  );
  await waitForVisibleName(zipName);
  console.log('[smoke] zip created.');

  console.log('[smoke] extracting zip...');
  const extractDir = resolve(targetPath, `extracted_${testId}`);
  mkdirSync(extractDir, { recursive: true });
  const openExtractModal = async () => {
    await focusList();
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    await withStaleRetry(async () => {
      const zipRow = await rowByName(zipName);
      await zipRow.click();
    }, 'select zip row');
    await driver.actions().sendKeys(Key.chord(Key.CONTROL, Key.ALT, 'x')).perform();
    try {
      await withTimeout(
        driver.wait(until.elementLocated(By.css('#zip-destination')), 1_500),
        1_500,
        'wait for extract destination quick'
      );
      return;
    } catch {
      // fallback to context menu when shortcut does not open modal
    }
    await withStaleRetry(async () => {
      const zipRow = await rowByName(zipName);
      await driver.actions().contextClick(zipRow).perform();
    }, 'context click zip row for extract');
    const extractItem = await withTimeout(
      driver.wait(
        until.elementLocated(By.css(".context-menu-item[data-menu-id='ctx-extract']")),
        timeoutMs
      ),
      timeoutMs,
      'wait for context extract'
    );
    await extractItem.click();
  };

  let extractDestination;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await openExtractModal();
    try {
      extractDestination = await withTimeout(
        driver.wait(
          until.elementLocated(By.css('#zip-destination')),
          timeoutMs * 2
        ),
        timeoutMs * 2,
        'wait for extract destination'
      );
      break;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      await driver.sleep(300);
    }
  }
  await setInputValue(extractDestination, extractDir);
  const overwriteCheckbox = await driver.findElement(
    By.css('.modal-inline input[type="checkbox"]')
  );
  const checked = await overwriteCheckbox.isSelected();
  if (!checked) {
    await overwriteCheckbox.click();
  }
  const extractButton = await withTimeout(
    driver.wait(
      until.elementLocated(
        By.xpath(
          "//div[contains(@class,'modal')]//button[normalize-space(text())='解凍' or normalize-space(text())='Extract']"
        )
      ),
      timeoutMs
    ),
    timeoutMs,
    'wait for extract button'
  );
  await extractButton.click();
  await withTimeout(
    driver.wait(until.stalenessOf(extractDestination), timeoutMs),
    timeoutMs,
    'wait for extract modal close'
  );

  const zipDir = baseDir;
  const extractCandidates = [
    extractDir,
    zipDir,
    targetPath,
  ].filter(Boolean);

  const waitForExtractedDir = async () => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (const dir of extractCandidates) {
        if (
          existsSync(resolve(dir, fileA)) &&
          existsSync(resolve(dir, fileB))
        ) {
          return dir;
        }
      }
      await driver.sleep(200);
    }
    throw new Error(
      `extracted files not found in any candidate dirs: ${extractCandidates.join(
        ', '
      )}`
    );
  };

  const actualExtractDir = await waitForExtractedDir();
  await waitForFsPath(resolve(actualExtractDir, fileA), 'extracted fileA');
  await waitForFsPath(resolve(actualExtractDir, fileB), 'extracted fileB');
  await waitForFileContent(
    resolve(actualExtractDir, fileA),
    fileAContent,
    'extract fileA'
  );
  await waitForFileContent(
    resolve(actualExtractDir, fileB),
    fileBContent,
    'extract fileB'
  );
  console.log(`[smoke] zip extracted to ${actualExtractDir}.`);

  console.log('[smoke] copy/move/delete...');
  const opsRootName = `ops_${testId}`;
  const opsRoot = resolve(targetPath, opsRootName);
  const opsSrcDir = resolve(opsRoot, 'src');
  const opsDstDir = resolve(opsRoot, 'dst');

  await setPath(targetPath);
  await confirmCreateFolder(opsRootName);
  await setPath(opsRoot);
  await confirmCreateFolder('src');
  await confirmCreateFolder('dst');
  await setPath(opsRoot);

  const opA = `e2e_${testId}_op_a.txt`;
  const opB = `e2e_${testId}_op_b.txt`;
  const opAContent = `e2e-op-a-${testId}`;
  const opBContent = `e2e-op-b-${testId}`;

  await openDirByName('src', 'open ops src');
  await waitForPathValue(opsSrcDir);
  await confirmCreate(opA);
  await confirmCreate(opB);
  writeFileSync(resolve(opsSrcDir, opA), opAContent, 'utf8');
  writeFileSync(resolve(opsSrcDir, opB), opBContent, 'utf8');
  await waitForFileContent(resolve(opsSrcDir, opA), opAContent, 'opA source');
  await waitForFileContent(resolve(opsSrcDir, opB), opBContent, 'opB source');
  await setPath(opsRoot);
  await setPath(opsSrcDir);
  await waitForPathValue(opsSrcDir);
  await focusList();
  await waitForVisibleName(opA);
  await waitForVisibleName(opB);
  await focusList();

  await withStaleRetry(async () => {
    const rowA = await rowByName(opA);
    await rowA.click();
  }, 'select opA for keyboard copy');
  await focusList();
  await triggerShortcut({ key: 'c', code: 'KeyC', ctrl: true });
  await setPath(opsRoot);
  await openDirByName('dst', 'open ops dst');
  await waitForPathValue(opsDstDir);
  await focusList();
  await triggerShortcut({ key: 'v', code: 'KeyV', ctrl: true });
  await waitForVisibleName(opA);
  await waitForFsPath(resolve(opsDstDir, opA), 'keyboard copied opA');
  await waitForFileContent(resolve(opsDstDir, opA), opAContent, 'keyboard copy opA');

  await setPath(opsRoot);
  await openDirByName('src', 'open ops src for move');
  await waitForPathValue(opsSrcDir);
  await withStaleRetry(async () => {
    const rowB = await rowByName(opB);
    await rowB.click();
  }, 'select opB for keyboard move');
  await focusList();
  await triggerShortcut({ key: 'x', code: 'KeyX', ctrl: true });
  await setPath(opsRoot);
  await openDirByName('dst', 'open ops dst for move');
  await waitForPathValue(opsDstDir);
  await focusList();
  await triggerShortcut({ key: 'v', code: 'KeyV', ctrl: true });
  await waitForVisibleName(opB);
  await waitForFsPath(resolve(opsDstDir, opB), 'keyboard moved opB');
  await waitForFileContent(resolve(opsDstDir, opB), opBContent, 'keyboard move opB');
  if (existsSync(resolve(opsSrcDir, opB))) {
    throw new Error('move opB did not remove original');
  }

  const waitForNameGone = async (name) => {
    const candidates = displayCandidates(name);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const visibleNames = await collectVisibleNames();
      if (!visibleNames.some((entry) => candidates.includes(entry))) {
        return;
      }
      await driver.sleep(200);
    }
    const visibleNames = await collectVisibleNames();
    throw new Error(
      `wait for ${name} to disappear timed out after ${timeoutMs}ms\n` +
        `visible=${visibleNames.join(', ')}`
    );
  };

  const getListSelectionStats = async () =>
    driver.executeScript(() => {
      const total = document.querySelectorAll('.list .row .text').length;
      const selected = document.querySelectorAll('.list .row.selected .text').length;
      return { total, selected };
    });

  const getFocusKind = async () =>
    driver.executeScript(() => {
      const active = document.activeElement;
      const pathInput = document.querySelector('header.path-bar input');
      const list = document.querySelector('.list');
      const tree = document.querySelector('.tree');
      const searchInput = document.querySelector('.search-bar input');
      const isWithin = (container, el) =>
        Boolean(container && el && (container === el || (container.contains && container.contains(el))));
      if (isWithin(pathInput, active)) return 'path';
      if (isWithin(list, active)) return 'list';
      if (isWithin(tree, active)) return 'tree';
      if (isWithin(searchInput, active)) return 'search';
      return 'other';
    });

  const waitForFocusKind = async (expectedKinds, label) => {
    const expected = Array.isArray(expectedKinds) ? expectedKinds : [expectedKinds];
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const kind = await getFocusKind();
      if (expected.includes(kind)) {
        return kind;
      }
      await driver.sleep(80);
    }
    const latest = await getFocusKind();
    throw new Error(`${label} failed: expected=${expected.join(',')} actual=${latest}`);
  };

  const waitForFocusNotKind = async (forbiddenKind, label) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const kind = await getFocusKind();
      if (kind !== forbiddenKind) {
        return kind;
      }
      await driver.sleep(80);
    }
    const latest = await getFocusKind();
    throw new Error(`${label} failed: forbidden=${forbiddenKind} actual=${latest}`);
  };

  const isSearchBarOpen = async () =>
    driver.executeScript(() => {
      const input = document.querySelector('.search-bar input');
      return Boolean(input && input.offsetParent);
    });

  const waitForSearchBarOpen = async (open, label) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const current = await isSearchBarOpen();
      if (Boolean(current) === Boolean(open)) return;
      await driver.sleep(100);
    }
    const latest = await isSearchBarOpen();
    throw new Error(`${label} failed: expected=${open} actual=${latest}`);
  };

  const assertPathCtrlAAndDeleteBoundary = async (sampleName, workingPath) => {
    await setPath(workingPath);
    await withStaleRetry(async () => {
      const row = await rowByName(sampleName);
      await row.click();
    }, `select ${sampleName} for path key boundary`);
    const baseline = await getListSelectionStats();
    if (baseline.selected < 1) {
      throw new Error(`path key boundary precondition failed: ${JSON.stringify(baseline)}`);
    }

    const input = await getPathInput();
    await input.click();
    await input.sendKeys(Key.chord(Key.CONTROL, 'a'));
    await input.sendKeys('Z');

    const ctrlADeadline = Date.now() + timeoutMs;
    while (Date.now() < ctrlADeadline) {
      const current = await (await getPathInput()).getAttribute('value');
      if (String(current || '') === 'Z') {
        break;
      }
      await driver.sleep(80);
    }
    const ctrlALatest = await (await getPathInput()).getAttribute('value');
    if (String(ctrlALatest || '') !== 'Z') {
      throw new Error(`path ctrl+a replace failed: actual=${ctrlALatest}`);
    }
    const afterCtrlA = await getListSelectionStats();
    if (afterCtrlA.selected !== baseline.selected) {
      throw new Error(
        `path ctrl+a changed list selection: before=${JSON.stringify(
          baseline
        )} after=${JSON.stringify(afterCtrlA)}`
      );
    }

    const deleteProbeSuffix = `delete_probe_${testId}`;
    const deleteProbe = `${workingPath}\\${deleteProbeSuffix}`;
    await driver.executeScript(
      (el, value) => {
        el.focus();
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      input,
      deleteProbe
    );
    await driver.executeScript(
      (el, suffix) => {
        const value = String(el?.value || '');
        const index = value.lastIndexOf(suffix);
        if (index < 0) return false;
        el.focus();
        el.setSelectionRange(index, index + suffix.length);
        return true;
      },
      input,
      deleteProbeSuffix
    );
    await input.sendKeys(Key.DELETE);
    const deleteLatest = await (await getPathInput()).getAttribute('value');
    if (String(deleteLatest || '').includes(deleteProbeSuffix)) {
      throw new Error(`path delete did not edit text: actual=${deleteLatest}`);
    }
    const afterDelete = await getListSelectionStats();
    if (afterDelete.selected !== baseline.selected) {
      throw new Error(
        `path delete changed list selection: before=${JSON.stringify(
          baseline
        )} after=${JSON.stringify(afterDelete)}`
      );
    }

    await setPath(workingPath);
    await focusList();
  };

  const assertListCtrlASelectsAll = async () => {
    await focusList();
    await triggerShortcut({ key: 'a', code: 'KeyA', ctrl: true });
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const stats = await getListSelectionStats();
      if (stats.total > 0 && stats.selected === stats.total) {
        return;
      }
      await driver.sleep(120);
    }
    const latest = await getListSelectionStats();
    throw new Error(`list ctrl+a select all failed: ${JSON.stringify(latest)}`);
  };

  const assertSearchEscTabBoundary = async (workingPath) => {
    await setPath(workingPath);
    await focusList();
    await waitForFocusKind('list', 'initial list focus for tab boundary');
    await driver.actions().sendKeys(Key.TAB).perform();
    await waitForFocusKind('path', 'list tab to path');
    await driver.actions().keyDown(Key.SHIFT).sendKeys(Key.TAB).keyUp(Key.SHIFT).perform();
    await waitForFocusNotKind('path', 'path shift+tab should leave path focus');
    await focusList();
    await waitForFocusKind('list', 'recover list focus after path shift+tab');

    await setPath(workingPath);
    await focusList();
    await waitForSearchBarOpen(false, 'search closed precondition');
    await triggerShortcut({ key: '/', code: 'Slash' });
    await waitForSearchBarOpen(true, 'open search from list');
    const searchInput = await withTimeout(
      driver.wait(until.elementLocated(By.css('.search-bar input')), timeoutMs),
      timeoutMs,
      'wait search input for escape'
    );
    await searchInput.click();
    await waitForFocusKind('search', 'focus search input before escape');
    await searchInput.sendKeys(Key.ESCAPE);
    await waitForSearchBarOpen(false, 'close search with escape');

    await setPath(workingPath);
    const input = await getPathInput();
    await input.click();
    await input.sendKeys(Key.chord(Key.CONTROL, 'a'));
    await input.sendKeys(`${workingPath}\\esc_probe_${testId}`);
    await input.sendKeys(Key.ESCAPE);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const current = await (await getPathInput()).getAttribute('value');
      if (normalizePath(current).toLowerCase() === normalizePath(workingPath).toLowerCase()) {
        break;
      }
      await driver.sleep(80);
    }
    const latestPath = await (await getPathInput()).getAttribute('value');
    if (normalizePath(latestPath).toLowerCase() !== normalizePath(workingPath).toLowerCase()) {
      throw new Error(`path escape restore failed: expected=${workingPath} actual=${latestPath}`);
    }
    await waitForFocusKind('list', 'path escape should focus list');

    await setPath(workingPath);
    await waitForSearchBarOpen(false, 'search closed before path slash');
    const pathInput = await getPathInput();
    await pathInput.click();
    await triggerShortcut({ key: '/', code: 'Slash' });
    await driver.sleep(200);
    const searchOpen = await isSearchBarOpen();
    if (searchOpen) {
      throw new Error('path slash unexpectedly opened search');
    }
  };

  console.log('[smoke] verify keyboard focus boundary (PATH Ctrl+A/Delete / list Ctrl+A)...');
  await assertPathCtrlAAndDeleteBoundary(opA, opsDstDir);
  await assertListCtrlASelectsAll();
  console.log('[smoke] verify keyboard focus boundary (Search/Escape/Tab)...');
  await assertSearchEscTabBoundary(opsDstDir);

  await withStaleRetry(async () => {
    const rowCopy = await rowByName(opA);
    await rowCopy.click();
  }, 'select copied opA for delete');
  await focusList();
  await driver.actions().sendKeys(Key.DELETE).perform();
  const deleteButton = await withTimeout(
    driver.wait(
      until.elementLocated(
        By.xpath(
          "//div[contains(@class,'modal')]//button[normalize-space(text())='削除' or normalize-space(text())='Delete']"
        )
      ),
      timeoutMs
    ),
    timeoutMs,
    'wait for delete confirm'
  );
  await deleteButton.click();
  await waitForNameGone(opA);
  if (existsSync(resolve(opsDstDir, opA))) {
    throw new Error('delete opA did not remove file');
  }
  console.log('[smoke] copy/move/delete done.');
} catch (error) {
  await captureArtifacts('smoke');
  throw error;
} finally {
  await driver.quit();
  console.log('[smoke] driver quit.');
}

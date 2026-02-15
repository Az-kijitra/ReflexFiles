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

const isStaleError = (error) =>
  error &&
  typeof error.message === 'string' &&
  error.message.toLowerCase().includes('stale element reference');

const withStaleRetry = async (fn, label, attempts = 3) => {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (isStaleError(error)) {
        await driver.sleep(150);
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastError}`);
};

const captureArtifacts = async (label) => {
  try {
    mkdirSync(artifactDir, { recursive: true });
    const png = await driver.takeScreenshot();
    writeFileSync(resolve(artifactDir, `failure_${label}.png`), png, 'base64');
    const html = await driver.getPageSource();
    writeFileSync(resolve(artifactDir, `failure_${label}.html`), html);
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
    writeFileSync(
      resolve(artifactDir, `failure_${label}.json`),
      JSON.stringify({ path: pathValue, visible: visibleNames }, null, 2)
    );
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
    const listEl = await withTimeout(
      driver.wait(until.elementLocated(By.css('.list')), timeoutMs),
      timeoutMs,
      'wait for list'
    );
    await withTimeout(
      driver.wait(until.elementIsVisible(listEl), timeoutMs),
      timeoutMs,
      'wait for list visible'
    );
    return listEl;
  };

  console.log('[smoke] waiting for list...');
  await getListElement();
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

  const getPathInput = async () =>
    driver.findElement(By.css('header.path-bar input'));
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
        if (isStaleError(error)) {
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
      const listEl = await getListElement();
      await listEl.click();
    }, 'focus list');

  await setPath(targetPath);
  await focusList();

  const openCreate = async () => {
    await focusList();
    const listEl = await getListElement();
    await listEl.sendKeys(Key.chord(Key.CONTROL, 'n'));
    try {
      const input = await withTimeout(
        driver.wait(until.elementLocated(By.css('#create-name')), 2_000),
        2_000,
        'wait for create input'
      );
      await input.click();
      return input;
    } catch {
      await driver.actions().contextClick(listEl).perform();
      const newItem = await withTimeout(
        driver.wait(
          until.elementLocated(
            By.xpath(
              "//button[contains(@class,'context-menu-item')][.//span[contains(normalize-space(.),'新規作成') or contains(normalize-space(.),'New')]]"
            )
          ),
          timeoutMs
        ),
        timeoutMs,
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
        if (isStaleError(error)) {
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
      until.elementLocated(
        By.xpath(
          "//button[contains(@class,'context-menu-item')][.//span[contains(normalize-space(.),'ZIPに圧縮') or contains(normalize-space(.),'Compress to ZIP')]]"
        )
      ),
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
    const listEl = await getListElement();
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    await withStaleRetry(async () => {
      const zipRow = await rowByName(zipName);
      await zipRow.click();
    }, 'select zip row');
    await listEl.sendKeys(Key.chord(Key.CONTROL, Key.ALT, 'x'));
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

  const clickContextMenuItem = async (labelJa, labelEn) => {
    const item = await withTimeout(
      driver.wait(
        until.elementLocated(
          By.xpath(
            `//button[contains(@class,'context-menu-item')][.//span[contains(normalize-space(.),'${labelJa}') or contains(normalize-space(.),'${labelEn}')]]`
          )
        ),
        timeoutMs
      ),
      timeoutMs,
      `wait for context ${labelEn}`
    );
    await item.click();
  };

  await withStaleRetry(async () => {
    const rowA = await rowByName(opA);
    await rowA.click();
  }, 'select opA for copy');
  await driver.actions().contextClick(await rowByName(opA)).perform();
  await clickContextMenuItem('コピー', 'Copy');
  await setPath(opsRoot);
  await openDirByName('dst', 'open ops dst');
  await waitForPathValue(opsDstDir);
  await driver.actions().contextClick(await getListElement()).perform();
  await clickContextMenuItem('ペースト', 'Paste');
  await waitForVisibleName(opA);
  await waitForFsPath(resolve(opsDstDir, opA), 'copied opA');
  await waitForFileContent(resolve(opsDstDir, opA), opAContent, 'copy opA');

  await setPath(opsRoot);
  await openDirByName('src', 'open ops src for move');
  await waitForPathValue(opsSrcDir);
  await withStaleRetry(async () => {
    const rowB = await rowByName(opB);
    await rowB.click();
  }, 'select opB for move');
  await driver.actions().contextClick(await rowByName(opB)).perform();
  await clickContextMenuItem('カット', 'Cut');
  await setPath(opsRoot);
  await openDirByName('dst', 'open ops dst for move');
  await waitForPathValue(opsDstDir);
  await driver.actions().contextClick(await getListElement()).perform();
  await clickContextMenuItem('ペースト', 'Paste');
  await waitForVisibleName(opB);
  await waitForFsPath(resolve(opsDstDir, opB), 'moved opB');
  await waitForFileContent(resolve(opsDstDir, opB), opBContent, 'move opB');
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

  await withStaleRetry(async () => {
    const rowCopy = await rowByName(opA);
    await rowCopy.click();
  }, 'select copied opA for delete');
  const listForDelete = await getListElement();
  await listForDelete.sendKeys(Key.DELETE);
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

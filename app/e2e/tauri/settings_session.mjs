import { Builder, By, Key, until } from "selenium-webdriver";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
  resolve(process.cwd(), "src-tauri", "target", "debug", "ReflexFiles.exe"),
  resolve(process.cwd(), "src-tauri", "target", "debug", "app.exe"),
];
const detectedAppPath = defaultAppCandidates.find((candidate) => existsSync(candidate));
const appPath = process.env.E2E_TAURI_APP_PATH ?? detectedAppPath;

const serverUrl = process.env.E2E_TAURI_WEBDRIVER_URL ?? "http://127.0.0.1:4444";
const timeoutMs = Number(process.env.E2E_TAURI_SETTINGS_TIMEOUT_MS ?? 30_000);
const caps = process.env.E2E_TAURI_CAPS
  ? JSON.parse(process.env.E2E_TAURI_CAPS)
  : {
      browserName: "tauri",
      ...(appPath
        ? {
            "tauri:options": {
              application: appPath,
            },
          }
        : {}),
    };

const artifactsRoot = resolve(process.cwd(), "..", "e2e_artifacts");
const testId = Date.now().toString().slice(-6);
const artifactDir = process.env.E2E_TAURI_ARTIFACT_DIR
  ? resolve(process.env.E2E_TAURI_ARTIFACT_DIR)
  : resolve(artifactsRoot, `settings_session_${testId}`);
const workDir = process.env.E2E_TAURI_WORKDIR ?? resolve(artifactDir, "work");

const appData = process.env.APPDATA ?? "";
const appConfigDir = appData ? resolve(appData, "ReflexFIles") : "";
const backupsDir = appConfigDir ? resolve(appConfigDir, "backups") : "";
const diagnosticsDir = appConfigDir ? resolve(appConfigDir, "diagnostics") : "";
const undoSessionPath = appConfigDir ? resolve(appConfigDir, "undo_redo_session.json") : "";

const listFilesSafe = (dir, regex) => {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => regex.test(name))
    .sort();
};

const backupFilesBefore = listFilesSafe(backupsDir, /^config-\d{8}-\d{6}\.toml$/i);
const zipReportsBefore = listFilesSafe(diagnosticsDir, /^diagnostic-\d{8}-\d{6}\.zip$/i);

const displayCandidates = (name) => {
  const dot = name.lastIndexOf(".");
  if (dot > 0) {
    return [name, name.slice(0, dot)];
  }
  return [name];
};

const makeFailureArtifactDir = (label) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(artifactDir, "on-failure", `${label}_${stamp}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};

const captureArtifacts = async (driver, label) => {
  try {
    const failureDir = makeFailureArtifactDir(label);
    const png = await driver.takeScreenshot();
    writeFileSync(resolve(failureDir, "screen.png"), png, "base64");
    const html = await driver.getPageSource();
    writeFileSync(resolve(failureDir, "page.html"), html);

    let currentUrl = "";
    let title = "";
    let handles = [];
    try {
      currentUrl = await driver.getCurrentUrl();
    } catch {
      currentUrl = "";
    }
    try {
      title = await driver.getTitle();
    } catch {
      title = "";
    }
    try {
      handles = await driver.getAllWindowHandles();
    } catch {
      handles = [];
    }

    writeFileSync(
      resolve(failureDir, "context.json"),
      JSON.stringify(
        {
          captured_at: new Date().toISOString(),
          label,
          current_url: currentUrl,
          title,
          window_handles: handles,
          work_dir: workDir,
        },
        null,
        2
      )
    );
    console.error(`[settings-session] failure artifacts saved: ${failureDir}`);
  } catch (error) {
    console.error(`[settings-session] artifact capture failed: ${error}`);
  }
};

const normalizePath = (value) => String(value || "").replace(/\//g, "\\");

console.log(`[settings-session] connecting to ${serverUrl}`);
const driver = await withTimeout(
  new Builder().usingServer(serverUrl).withCapabilities(caps).build(),
  timeoutMs,
  "WebDriver session"
);

try {
  await withTimeout(driver.wait(until.elementLocated(By.css("body")), timeoutMs), timeoutMs, "wait body");

  const getPathInput = async () => driver.findElement(By.css("header.path-bar input"));

  const getListElement = async () => {
    const listEl = await withTimeout(
      driver.wait(until.elementLocated(By.css(".list")), timeoutMs),
      timeoutMs,
      "wait list"
    );
    await withTimeout(driver.wait(until.elementIsVisible(listEl), timeoutMs), timeoutMs, "wait list visible");
    return listEl;
  };

  const collectVisibleNames = async () => {
    const rows = await driver.findElements(By.css(".list .row .text"));
    const values = [];
    for (const row of rows) {
      const text = (await row.getText()).trim();
      if (text) values.push(text);
    }
    return values;
  };

  const waitForVisibleName = async (name) => {
    const candidates = displayCandidates(name);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const visible = await collectVisibleNames();
      if (visible.some((v) => candidates.includes(v))) {
        return;
      }
      await sleep(200);
    }
    throw new Error(`wait for visible name timeout: ${name}`);
  };

  const waitForNameGone = async (name) => {
    const candidates = displayCandidates(name);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const visible = await collectVisibleNames();
      if (!visible.some((v) => candidates.includes(v))) {
        return;
      }
      await sleep(200);
    }
    throw new Error(`wait for name gone timeout: ${name}`);
  };

  const rowByName = async (name) => {
    const candidates = displayCandidates(name);
    const rowTexts = await driver.findElements(By.css(".list .row .text"));
    for (const rowText of rowTexts) {
      const text = (await rowText.getText()).trim();
      if (candidates.includes(text)) {
        return rowText.findElement(By.xpath("./ancestor::div[contains(@class,'row')]"));
      }
    }
    throw new Error(`row not found: ${name}`);
  };

  const setPath = async (path) => {
    const input = await getPathInput();
    await input.click();
    await input.sendKeys(Key.chord(Key.CONTROL, "a"));
    await input.sendKeys(Key.DELETE);
    await input.sendKeys(path);
    await input.sendKeys(Key.ENTER);

    const expected = normalizePath(path).toLowerCase();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const current = normalizePath(await (await getPathInput()).getAttribute("value")).toLowerCase();
      if (current === expected) {
        return;
      }
      await sleep(200);
    }
    throw new Error(`path set timeout: ${path}`);
  };

  const openSettings = async () => {
    await driver.executeScript("window.dispatchEvent(new Event('rf:open-settings')); ");
    await withTimeout(
      driver.wait(until.elementLocated(By.css(".settings-modal")), timeoutMs),
      timeoutMs,
      "wait settings modal"
    );
    await withTimeout(
      driver.wait(until.elementLocated(By.css(".settings-sidebar")), timeoutMs),
      timeoutMs,
      "wait settings sidebar"
    );
  };

  const closeSettings = async () => {
    const cancelButtons = await driver.findElements(By.css(".settings-actions button:not(.primary)"));
    if (cancelButtons.length > 0) {
      await cancelButtons[0].click();
    } else {
      await driver.actions().sendKeys(Key.ESCAPE).perform();
    }
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const modals = await driver.findElements(By.css(".settings-modal"));
      if (modals.length === 0) return;
      await sleep(120);
    }
    throw new Error("settings modal did not close");
  };

  const clickSettingsSection = async (index) => {
    const buttons = await driver.findElements(By.css(".settings-sidebar button"));
    if (index < 0 || index >= buttons.length) {
      throw new Error(`settings section index out of range: ${index}`);
    }
    await buttons[index].click();
    await sleep(120);
  };

  const getIconMode = async () =>
    driver.executeScript(() => {
      const modal = document.querySelector(".settings-modal");
      if (!modal) return null;
      const selects = modal.querySelectorAll(".settings-main .settings-row select");
      if (!selects || selects.length < 3) return null;
      return selects[2].value;
    });

  const setIconMode = async (value) => {
    await driver.executeScript((nextValue) => {
      const modal = document.querySelector(".settings-modal");
      if (!modal) return;
      const selects = modal.querySelectorAll(".settings-main .settings-row select");
      if (!selects || selects.length < 3) return;
      const select = selects[2];
      select.value = nextValue;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  };

  const clickPrimarySave = async () => {
    const saveButton = await withTimeout(
      driver.wait(until.elementLocated(By.css(".settings-actions button.primary")), timeoutMs),
      timeoutMs,
      "wait settings save button"
    );
    await saveButton.click();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const modals = await driver.findElements(By.css(".settings-modal"));
      if (modals.length === 0) return;
      await sleep(150);
    }
    throw new Error("settings save did not close modal");
  };

  const configureDiagnosticOptions = async () => {
    await driver.executeScript(() => {
      const modal = document.querySelector(".settings-modal");
      if (!modal) return;
      const checks = modal.querySelectorAll(".settings-report-options input[type='checkbox']");
      if (!checks || checks.length < 4) return;

      const applyChecked = (el, checked) => {
        el.checked = checked;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };

      applyChecked(checks[0], true);  // mask
      applyChecked(checks[1], true);  // zip
      applyChecked(checks[2], false); // copy path
      applyChecked(checks[3], false); // open after
    });
  };

  mkdirSync(workDir, { recursive: true });
  mkdirSync(artifactDir, { recursive: true });

  const undoFile = `undo_${testId}.txt`;
  writeFileSync(resolve(workDir, undoFile), `undo-session-${testId}\n`, "utf8");

  await setPath(workDir);
  await getListElement();
  await waitForVisibleName(undoFile);

  console.log("[settings-session] verify settings save persistence...");
  await openSettings();
  await clickSettingsSection(0);

  const currentMode = String((await getIconMode()) || "by_type");
  const nextMode = currentMode === "by_type" ? "simple" : "by_type";
  await setIconMode(nextMode);
  await clickPrimarySave();

  await openSettings();
  await clickSettingsSection(0);
  const savedMode = String((await getIconMode()) || "");
  if (savedMode !== nextMode) {
    throw new Error(`settings persistence failed: expected ${nextMode}, got ${savedMode}`);
  }

  console.log("[settings-session] verify backup + diagnostic export...");
  await clickSettingsSection(2);

  const advancedButtons = await driver.findElements(By.css(".settings-advanced-actions button"));
  if (advancedButtons.length < 4) {
    throw new Error("advanced action buttons not found");
  }

  await advancedButtons[1].click(); // create backup
  await sleep(500);

  await configureDiagnosticOptions();
  await advancedButtons[3].click(); // export report

  await withTimeout(
    driver.wait(until.elementLocated(By.css(".settings-test-message")), timeoutMs),
    timeoutMs,
    "wait report message"
  );

  await closeSettings();

  const backupFilesAfter = listFilesSafe(backupsDir, /^config-\d{8}-\d{6}\.toml$/i);
  const zipReportsAfter = listFilesSafe(diagnosticsDir, /^diagnostic-\d{8}-\d{6}\.zip$/i);

  if (backupFilesAfter.length <= backupFilesBefore.length) {
    throw new Error("backup file was not created");
  }
  if (zipReportsAfter.length <= zipReportsBefore.length) {
    throw new Error("zip diagnostic report was not created");
  }

  console.log("[settings-session] verify undo/redo behavior and session file...");
  const listEl = await getListElement();
  const targetRow = await rowByName(undoFile);
  await targetRow.click();
  await listEl.sendKeys(Key.DELETE);

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
    "wait delete confirm"
  );
  await deleteButton.click();
  await waitForNameGone(undoFile);

  await listEl.click();
  await listEl.sendKeys(Key.chord(Key.CONTROL, "z"));
  await waitForVisibleName(undoFile);

  await listEl.click();
  await listEl.sendKeys(Key.chord(Key.CONTROL, Key.SHIFT, "z"));
  await waitForNameGone(undoFile);

  await sleep(700);
  if (!undoSessionPath || !existsSync(undoSessionPath)) {
    throw new Error("undo/redo session file not found");
  }

  const sessionRaw = readFileSync(undoSessionPath, "utf8");
  const session = JSON.parse(sessionRaw);
  const undoStack = Array.isArray(session?.undo_stack) ? session.undo_stack : [];
  const redoStack = Array.isArray(session?.redo_stack) ? session.redo_stack : [];
  if (undoStack.length === 0 && redoStack.length === 0) {
    throw new Error("undo/redo session file is empty");
  }

  writeFileSync(
    resolve(artifactDir, "settings_session_summary.json"),
    JSON.stringify(
      {
        workDir,
        nextMode,
        backupCountBefore: backupFilesBefore.length,
        backupCountAfter: backupFilesAfter.length,
        zipCountBefore: zipReportsBefore.length,
        zipCountAfter: zipReportsAfter.length,
        undoStackSize: undoStack.length,
        redoStackSize: redoStack.length,
      },
      null,
      2
    )
  );

  console.log("[settings-session] passed.");
} catch (error) {
  await captureArtifacts(driver, "settings_session");
  throw error;
} finally {
  await driver.quit();
  console.log("[settings-session] driver quit.");
}

import { Builder, By, Key, until } from "selenium-webdriver";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
const timeoutMs = Number(process.env.E2E_TAURI_VIEWER_TIMEOUT_MS ?? 30_000);
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
  : resolve(artifactsRoot, `viewer_flow_${testId}`);
const workDir = process.env.E2E_TAURI_WORKDIR ?? resolve(artifactDir, "work");

const captureFailureArtifacts = async (driver, label) => {
  try {
    mkdirSync(artifactDir, { recursive: true });
    const png = await driver.takeScreenshot();
    writeFileSync(resolve(artifactDir, `failure_${label}.png`), png, "base64");
    const html = await driver.getPageSource();
    writeFileSync(resolve(artifactDir, `failure_${label}.html`), html);
  } catch (error) {
    console.error(`[viewer-flow] failed to capture artifacts: ${error}`);
  }
};

const normalizePath = (value) => String(value || "").replace(/\//g, "\\");

console.log(`[viewer-flow] connecting to ${serverUrl}`);
const driver = await withTimeout(
  new Builder().usingServer(serverUrl).withCapabilities(caps).build(),
  timeoutMs,
  "WebDriver session"
);

try {
  await withTimeout(driver.wait(until.elementLocated(By.css("body")), timeoutMs), timeoutMs, "wait body");
  const mainHandle = await driver.getWindowHandle();

  const closeExtraWindows = async () => {
    const handles = await driver.getAllWindowHandles();
    for (const handle of handles) {
      if (handle === mainHandle) continue;
      await driver.switchTo().window(handle);
      await driver.close();
    }
    await driver.switchTo().window(mainHandle);
  };

  await closeExtraWindows();

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
    const candidates = [name, name.replace(/\.[^.]+$/, "")];
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

  const rowByName = async (name) => {
    const candidates = [name, name.replace(/\.[^.]+$/, "")];
    const rowTexts = await driver.findElements(By.css(".list .row .text"));
    for (const rowText of rowTexts) {
      const text = (await rowText.getText()).trim();
      if (candidates.includes(text)) {
        return rowText.findElement(By.xpath("./ancestor::div[contains(@class,'row')]"));
      }
    }
    throw new Error(`row not found: ${name}`);
  };

  const waitForViewerHandle = async (knownViewerHandle) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const handles = await driver.getAllWindowHandles();
      if (knownViewerHandle && handles.includes(knownViewerHandle)) {
        return knownViewerHandle;
      }
      const candidate = handles.find((h) => h !== mainHandle);
      if (candidate) {
        return candidate;
      }
      await sleep(150);
    }
    throw new Error("viewer window did not open");
  };

  const waitTitleContains = async (needle) => {
    const deadline = Date.now() + timeoutMs;
    const target = String(needle).toLowerCase();
    while (Date.now() < deadline) {
      const title = String(await driver.getTitle()).toLowerCase();
      if (title.includes(target)) {
        return;
      }
      await sleep(120);
    }
    throw new Error(`viewer title does not contain "${needle}"`);
  };

  const closeViewer = async (viewerHandle) => {
    await driver.switchTo().window(viewerHandle);
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const handles = await driver.getAllWindowHandles();
      if (!handles.includes(viewerHandle)) {
        await driver.switchTo().window(mainHandle);
        return;
      }
      await sleep(150);
    }
    await driver.close();
    await driver.switchTo().window(mainHandle);
  };

  const waitIndicatorContains = async (text) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const value = await driver.findElement(By.css(".image-zoom-indicator")).getText();
      if (value.includes(text)) {
        return;
      }
      await sleep(120);
    }
    throw new Error(`zoom indicator does not contain "${text}"`);
  };

  mkdirSync(workDir, { recursive: true });

  const textName = `viewer_${testId}.txt`;
  const mdName = `viewer_${testId}.md`;
  const pngName = `viewer_${testId}.png`;
  const textContent = `viewer text flow ${testId}`;
  const mdTitle = `Viewer Markdown ${testId}`;
  const mdContent = `# ${mdTitle}\n\nviewer markdown body`;
  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7nWZ0AAAAASUVORK5CYII=";

  writeFileSync(resolve(workDir, textName), textContent, "utf8");
  writeFileSync(resolve(workDir, mdName), mdContent, "utf8");
  writeFileSync(resolve(workDir, pngName), Buffer.from(pngBase64, "base64"));

  await setPath(workDir);
  await getListElement();
  await waitForVisibleName(textName);
  await waitForVisibleName(mdName);
  await waitForVisibleName(pngName);

  let viewerHandle = null;

  const openViewerForFile = async (name) => {
    await driver.switchTo().window(mainHandle);
    const row = await rowByName(name);
    await row.click();
    const listEl = await getListElement();
    await listEl.sendKeys(Key.ENTER);
    viewerHandle = await waitForViewerHandle(viewerHandle);
    await driver.switchTo().window(viewerHandle);
    await withTimeout(driver.wait(until.elementLocated(By.css("main.viewer-root")), timeoutMs), timeoutMs, "wait viewer root");
    await waitTitleContains(name);
  };

  console.log("[viewer-flow] verify text file rendering...");
  await openViewerForFile(textName);
  const textValue = await driver.findElement(By.css("pre.text")).getText();
  if (!textValue.includes(textContent)) {
    throw new Error("text content mismatch in viewer");
  }
  await closeViewer(viewerHandle);

  console.log("[viewer-flow] verify markdown rendering...");
  await openViewerForFile(mdName);
  const markdownText = await driver.findElement(By.css("article.markdown")).getText();
  if (!markdownText.includes(mdTitle)) {
    throw new Error("markdown title mismatch in viewer");
  }
  await closeViewer(viewerHandle);

  console.log("[viewer-flow] verify image rendering and zoom controls...");
  await openViewerForFile(pngName);
  await withTimeout(driver.wait(until.elementLocated(By.css(".image-controls")), timeoutMs), timeoutMs, "wait image controls");
  const imgSrc = await driver.findElement(By.css(".image-frame img")).getAttribute("src");
  if (!String(imgSrc).startsWith("data:image/")) {
    throw new Error("image src is not data url");
  }

  const zoom200Button = await driver.findElement(
    By.xpath("//div[contains(@class,'image-controls')]//button[normalize-space(text())='200%']")
  );
  await zoom200Button.click();
  await waitIndicatorContains("200%");

  const fitButton = await driver.findElement(
    By.xpath("//div[contains(@class,'image-controls')]//button[normalize-space(text())='Fit']")
  );
  await fitButton.click();
  await waitIndicatorContains("(Fit)");
  await closeViewer(viewerHandle);

  console.log("[viewer-flow] passed.");
} catch (error) {
  await captureFailureArtifacts(driver, "viewer_flow");
  throw error;
} finally {
  await driver.quit();
  console.log("[viewer-flow] driver quit.");
}

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

const makeFailureArtifactDir = (label) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(artifactDir, "on-failure", `${label}_${stamp}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};

const captureFailureArtifacts = async (driver, label) => {
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
    console.error(`[viewer-flow] failure artifacts saved: ${failureDir}`);
  } catch (error) {
    console.error(`[viewer-flow] failed to capture artifacts: ${error}`);
  }
};

const normalizePath = (value) => String(value || "").replace(/\//g, "\\");
const isTransientDomError = (error) => {
  const text = String(error?.message || error || "").toLowerCase();
  return (
    text.includes("stale element reference") ||
    text.includes("no such element") ||
    text.includes("element not interactable")
  );
};

console.log(`[viewer-flow] connecting to ${serverUrl}`);
const driver = await withTimeout(
  new Builder().usingServer(serverUrl).withCapabilities(caps).build(),
  timeoutMs,
  "WebDriver session"
);

try {
  await withTimeout(driver.wait(until.elementLocated(By.css("body")), timeoutMs), timeoutMs, "wait body");
  const pickMainHandle = async () => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const handles = await driver.getAllWindowHandles();
      for (const handle of handles) {
        await driver.switchTo().window(handle);
        let currentUrl = "";
        let title = "";
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
        if (currentUrl && currentUrl !== "about:blank") {
          return handle;
        }
        if (title && title !== "about:blank") {
          return handle;
        }
      }
      await sleep(150);
    }
    const fallback = await driver.getWindowHandle();
    await driver.switchTo().window(fallback);
    return fallback;
  };

  const mainHandle = await pickMainHandle();

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

  const waitForMainUiReady = async () => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await driver.switchTo().window(mainHandle);
      try {
        const ready = await driver.executeScript(() => {
          const isVisible = (el) => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden"
            );
          };
          const bodyReady = document.readyState === "complete";
          const pathInput = document.querySelector("header.path-bar input");
          const list = document.querySelector(".list");
          return bodyReady && isVisible(pathInput) && isVisible(list);
        });
        if (ready) {
          return;
        }
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }
      await sleep(120);
    }
    throw new Error("main app UI did not become ready");
  };

  const waitVisibleElement = async (selector, label) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const elements = await driver.findElements(By.css(selector));
        if (elements.length > 0) {
          const element = elements[0];
          if (await element.isDisplayed()) {
            return element;
          }
        }
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }
      await sleep(120);
    }
    throw new Error(`${label} timed out after ${timeoutMs}ms`);
  };

  const getPathInput = async () => {
    return waitVisibleElement("header.path-bar input", "wait path input");
  };
  const getListElement = async () => {
    return waitVisibleElement(".list", "wait list");
  };

  const setPath = async (path) => {
    const expected = normalizePath(path).toLowerCase();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const input = await getPathInput();
        await input.click();
        await input.sendKeys(Key.chord(Key.CONTROL, "a"), Key.DELETE, path, Key.ENTER);
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }

      try {
        const current = normalizePath(await (await getPathInput()).getAttribute("value")).toLowerCase();
        if (current === expected) {
          return;
        }
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }
      await sleep(200);
    }
    throw new Error(`path set timeout: ${path}`);
  };

  const collectVisibleNames = async () => {
    return driver.executeScript(() => {
      return Array.from(document.querySelectorAll(".list .row .text"))
        .map((el) => String(el.textContent || "").trim())
        .filter((text) => text.length > 0);
    });
  };

  const waitForVisibleName = async (name) => {
    const candidates = [name, name.replace(/\.[^.]+$/, "")];
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const visible = await collectVisibleNames();
        if (visible.some((v) => candidates.includes(v))) {
          return;
        }
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }
      await sleep(200);
    }
    throw new Error(`wait for visible name timeout: ${name}`);
  };

  const clickRowByName = async (name) => {
    const candidates = [name, name.replace(/\.[^.]+$/, "")];
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const clicked = await driver.executeScript((targets) => {
          const texts = Array.from(document.querySelectorAll(".list .row .text"));
          for (const textEl of texts) {
            const text = String(textEl.textContent || "").trim();
            if (!targets.includes(text)) continue;
            const row = textEl.closest(".row");
            if (!row) continue;
            row.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            row.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
            return true;
          }
          return false;
        }, candidates);
        if (clicked) {
          return;
        }
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }
      await sleep(120);
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

  const waitViewerInteractive = async () => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const ready = await driver.executeScript(() => {
          const root = document.querySelector("main.viewer-root");
          if (!root) return false;
          const loading = root.querySelector(".loading");
          if (!loading) return true;
          const rect = loading.getBoundingClientRect();
          const style = window.getComputedStyle(loading);
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden";
          return !visible;
        });
        if (ready) {
          return;
        }
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }
      await sleep(120);
    }
    throw new Error("viewer did not become interactive");
  };

  const waitVisibleCss = async (selector, label) => {
    return waitVisibleElement(selector, label);
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
      try {
        const value = await driver.findElement(By.css(".image-zoom-indicator")).getText();
        if (value.includes(text)) {
          return;
        }
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
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

  await waitForMainUiReady();
  await setPath(workDir);
  await getListElement();
  await waitForVisibleName(textName);
  await waitForVisibleName(mdName);
  await waitForVisibleName(pngName);

  let viewerHandle = null;

  const openViewerForFile = async (name) => {
    await driver.switchTo().window(mainHandle);
    await waitForMainUiReady();
    await waitForVisibleName(name);
    await clickRowByName(name);
    viewerHandle = await waitForViewerHandle(viewerHandle);
    await driver.switchTo().window(viewerHandle);
    await withTimeout(driver.wait(until.elementLocated(By.css("main.viewer-root")), timeoutMs), timeoutMs, "wait viewer root");
    await waitViewerInteractive();
  };

  console.log("[viewer-flow] verify text file rendering...");
  await openViewerForFile(textName);
  const textPre = await waitVisibleCss(".text-lines pre.text.line-code", "wait text pre");
  const textValue = await textPre.getText();
  if (!textValue.includes(textContent)) {
    throw new Error("text content mismatch in viewer");
  }
  await closeViewer(viewerHandle);

  console.log("[viewer-flow] verify markdown rendering...");
  await openViewerForFile(mdName);
  const markdownRoot = await waitVisibleCss(".markdown", "wait markdown root");
  const markdownText = await markdownRoot.getText();
  if (!markdownText.includes(mdTitle)) {
    throw new Error("markdown title mismatch in viewer");
  }
  await closeViewer(viewerHandle);

  console.log("[viewer-flow] verify image rendering and zoom controls...");
  await openViewerForFile(pngName);
  await withTimeout(driver.wait(until.elementLocated(By.css(".image-controls")), timeoutMs), timeoutMs, "wait image controls");
  const imgSrc = await driver.findElement(By.css(".image-frame img")).getAttribute("src");
  const normalizedImgSrc = String(imgSrc || "").toLowerCase();
  const isSupportedImageSrc =
    normalizedImgSrc.startsWith("data:image/") ||
    normalizedImgSrc.startsWith("http://asset.localhost/") ||
    normalizedImgSrc.startsWith("https://asset.localhost/") ||
    normalizedImgSrc.startsWith("tauri://localhost/") ||
    normalizedImgSrc.startsWith("file://");
  if (!isSupportedImageSrc) {
    throw new Error(`image src is unsupported: ${imgSrc}`);
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

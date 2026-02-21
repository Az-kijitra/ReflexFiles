import { Builder, By, Key, until } from "selenium-webdriver";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
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
const timeoutMs = Number(process.env.E2E_TAURI_CAPABILITY_TIMEOUT_MS ?? 30_000);
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
  : resolve(artifactsRoot, `capability_guard_${testId}`);

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
    const status = await driver.executeScript(() => {
      const hooks = window.__rf_test_hooks;
      if (!hooks) return "";
      return hooks.getStatusMessage?.() ?? "";
    });
    writeFileSync(
      resolve(failureDir, "context.json"),
      JSON.stringify(
        {
          captured_at: new Date().toISOString(),
          label,
          status_message: String(status || ""),
        },
        null,
        2
      )
    );
    console.error(`[capability-guard] failure artifacts saved: ${failureDir}`);
  } catch (error) {
    console.error(`[capability-guard] artifact capture failed: ${error}`);
  }
};

const isTransientDomError = (error) => {
  const text = String(error?.message || error || "").toLowerCase();
  return (
    text.includes("stale element reference") ||
    text.includes("no such element") ||
    text.includes("element not interactable")
  );
};

console.log(`[capability-guard] connecting to ${serverUrl}`);
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
        if ((currentUrl && currentUrl !== "about:blank") || (title && title !== "about:blank")) {
          return handle;
        }
      }
      await sleep(120);
    }
    return driver.getWindowHandle();
  };

  const mainHandle = await pickMainHandle();
  await driver.switchTo().window(mainHandle);

  const waitMainUiReady = async () => {
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
              style.display !== "none" &&
              style.visibility !== "hidden"
            );
          };
          const pathInput = document.querySelector("header.path-bar input");
          const list = document.querySelector(".list");
          return document.readyState === "complete" && isVisible(pathInput) && isVisible(list);
        });
        if (ready) return;
      } catch (error) {
        if (!isTransientDomError(error)) throw error;
      }
      await sleep(120);
    }
    throw new Error("main app UI did not become ready");
  };

  const waitHooksReady = async () => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const ready = await driver.executeScript(() => {
        return Boolean(
          window.__rf_test_hooks &&
            typeof window.__rf_test_hooks.setCurrentPathCapabilities === "function"
        );
      });
      if (ready) return;
      await sleep(120);
    }
    throw new Error("test hooks not available");
  };

  const assertDisabled = async (element, label) => {
    const disabledAttr = await element.getAttribute("disabled");
    const className = String((await element.getAttribute("class")) || "");
    const disabled = disabledAttr !== null || className.includes("disabled");
    if (!disabled) {
      throw new Error(`${label} should be disabled`);
    }
  };

  const assertReasonContains = async (element, needles, label) => {
    const reasonEl = await element.findElement(By.css(".menu-reason"));
    const reason = String((await reasonEl.getText()) || "").trim();
    const matched = needles.some((needle) => reason.includes(needle));
    if (!matched) {
      throw new Error(`${label} reason mismatch: "${reason}"`);
    }
  };

  const focusList = async () => {
    await driver.executeScript(() => {
      const list = document.querySelector(".list");
      if (list) {
        list.focus();
      }
    });
  };

  const setCapabilitiesBlocked = async () => {
    await driver.executeScript(() => {
      window.__rf_test_hooks.setCurrentPathCapabilities({
        can_read: true,
        can_create: false,
        can_rename: false,
        can_copy: false,
        can_move: false,
        can_delete: false,
        can_archive_create: false,
        can_archive_extract: false,
      });
      window.__rf_test_hooks.clearStatusMessage();
    });
  };

  const setCurrentPathForTest = async (path) => {
    await driver.executeScript((nextPath) => {
      window.__rf_test_hooks.setCurrentPathForTest?.(nextPath);
    }, path);
  };

  const openSettingsByEvent = async (section) => {
    await driver.executeScript((nextSection) => {
      window.dispatchEvent(
        new CustomEvent("rf:open-settings", {
          detail: { section: nextSection, reason: "e2e-capability-guard" },
        })
      );
    }, section);
  };

  await waitMainUiReady();
  await waitHooksReady();
  await setCapabilitiesBlocked();
  await setCurrentPathForTest("gdrive://root/shared-with-me");

  console.log("[capability-guard] verify blank context menu gating...");
  const listEl = await withTimeout(
    driver.wait(until.elementLocated(By.css(".list")), timeoutMs),
    timeoutMs,
    "wait list"
  );
  await driver.actions().contextClick(listEl).perform();
  const newItem = await withTimeout(
    driver.wait(
      until.elementLocated(By.css(".context-menu-item[data-menu-id='ctx-new']")),
      timeoutMs
    ),
    timeoutMs,
    "wait context new"
  );
  const pasteItem = await withTimeout(
    driver.wait(
      until.elementLocated(By.css(".context-menu-item[data-menu-id='ctx-paste']")),
      timeoutMs
    ),
    timeoutMs,
    "wait context paste"
  );
  await assertDisabled(newItem, "context new");
  await assertDisabled(pasteItem, "context paste");
  await assertReasonContains(
    pasteItem,
    ["書き込めません", "not writable"],
    "context paste"
  );
  await driver.actions().sendKeys(Key.ESCAPE).perform();

  console.log("[capability-guard] verify edit menu paste gating...");
  const editButton = await withTimeout(
    driver.wait(
      until.elementLocated(By.css(".menu-button[data-menu-group='edit']")),
      timeoutMs
    ),
    timeoutMs,
    "wait edit menu button"
  );
  await editButton.click();
  const menuPaste = await withTimeout(
    driver.wait(
      until.elementLocated(By.css(".menu-dropdown .menu-item[data-menu-id='menu-edit-paste']")),
      timeoutMs
    ),
    timeoutMs,
    "wait edit paste item"
  );
  await assertDisabled(menuPaste, "edit paste");
  await assertReasonContains(
    menuPaste,
    ["書き込めません", "not writable"],
    "edit paste"
  );
  await driver.actions().sendKeys(Key.ESCAPE).perform();

  console.log("[capability-guard] verify action-level capability decisions...");
  await focusList();
  const decisions = await driver.executeScript(() => {
    const hooks = window.__rf_test_hooks;
    return {
      canCreateCurrentPath: hooks?.canCreateCurrentPath?.(),
      canPasteCurrentPath: hooks?.canPasteCurrentPath?.(),
    };
  });
  if (Boolean(decisions?.canCreateCurrentPath)) {
    throw new Error("canCreateCurrentPath should be false under blocked capability");
  }
  if (Boolean(decisions?.canPasteCurrentPath)) {
    throw new Error("canPasteCurrentPath should be false under blocked capability");
  }

  console.log("[capability-guard] verify rf:open-settings advanced routing...");
  await openSettingsByEvent("advanced");
  await withTimeout(
    driver.wait(async () => {
      try {
        return Boolean(
          await driver.executeScript(() => Boolean(window.__rf_settings_open))
        );
      } catch {
        return false;
      }
    }, timeoutMs),
    timeoutMs,
    "wait settings open"
  );
  await withTimeout(
    driver.wait(
      until.elementLocated(
        By.css(".settings-sidebar button[data-settings-section='advanced'].selected")
      ),
      timeoutMs
    ),
    timeoutMs,
    "wait settings advanced section"
  );
  await openSettingsByEvent("general");
  await withTimeout(
    driver.wait(
      until.elementLocated(
        By.css(".settings-sidebar button[data-settings-section='general'].selected")
      ),
      timeoutMs
    ),
    timeoutMs,
    "wait settings general section switch"
  );

  console.log("[capability-guard] passed.");
} catch (error) {
  await captureArtifacts(driver, "capability_guard");
  throw error;
} finally {
  await driver.quit();
  console.log("[capability-guard] driver quit.");
}

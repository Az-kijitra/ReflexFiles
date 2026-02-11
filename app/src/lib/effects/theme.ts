/**
 * @param {boolean} uiConfigLoaded
 * @param {"light" | "dark"} uiTheme
 * @param {(command: string, payload?: Record<string, unknown>) => Promise<unknown>} invoke
 * @param {(err: unknown) => void} showError
 */
export function applyThemeEffect(uiConfigLoaded, uiTheme, invoke, showError) {
  const body = document.body;
  if (!body) return;
  body.classList.toggle("ui_theme-dark", uiTheme === "dark");
  if (uiConfigLoaded) {
    invoke("set_window_theme", { theme: uiTheme }).catch((err) => {
      showError(err);
    });
  }
}

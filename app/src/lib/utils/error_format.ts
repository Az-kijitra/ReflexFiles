/**
 * @param {unknown} err
 * @param {string} [fallback]
 * @param {(key: string, vars?: Record<string, string | number>) => string} [t]
 */
export function formatError(err, fallback = "unknown error", t) {
  if (err == null) return fallback;
  const structured = extractStructuredError(err);
  if (structured) {
    const key = `failure.code.${structured.code}`;
    if (t) {
      const translated = t(key);
      if (translated !== key) return translated;
    }
    return structured.message || fallback;
  }
  const raw = normalizeErrorText(err);
  const parsed = parseErrorCode(raw);
  if (parsed) {
    const key = `failure.code.${parsed.code}`;
    if (t) {
      const translated = t(key);
      if (translated !== key) return translated;
    }
    return parsed.message || fallback;
  }
  return raw || fallback;
}

/** @param {unknown} err */
function normalizeErrorText(err) {
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** @param {unknown} err */
function extractStructuredError(err) {
  if (typeof err !== "object" || err === null) return null;
  const maybe = /** @type {any} */ (err);
  const code = typeof maybe.code === "string" ? maybe.code : null;
  const message =
    typeof maybe.message === "string"
      ? maybe.message
      : typeof maybe.error === "string"
        ? maybe.error
        : "";
  if (!code) return null;
  return { code, message };
}

/** @param {string} message */
function parseErrorCode(message) {
  const match = /^code=([^;]+);\s*(.*)$/i.exec(message);
  if (!match) return null;
  return { code: match[1].trim(), message: match[2] ?? "" };
}

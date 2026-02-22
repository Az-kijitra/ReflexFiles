/**
 * @param {string} message
 * @param {number} durationMs
 * @param {{ getMessage: () => string, setMessage: (value: string) => void, getTimer: () => ReturnType<typeof setTimeout> | null, setTimer: (value: ReturnType<typeof setTimeout> | null) => void }} ctx
 */
export function updateStatusMessage(message, durationMs, ctx) {
  if (message === ctx.getMessage()) {
    ctx.setMessage("");
    queueMicrotask(() => {
      ctx.setMessage(message);
    });
  } else {
    ctx.setMessage(message);
  }
  const currentTimer = ctx.getTimer();
  if (currentTimer) {
    clearTimeout(currentTimer);
  }
  if (Number(durationMs) <= 0) {
    ctx.setTimer(null);
    return;
  }
  const timer = setTimeout(() => {
    ctx.setMessage("");
    ctx.setTimer(null);
  }, durationMs);
  ctx.setTimer(timer);
}

/**
 * @param {unknown} err
 * @param {(value: string) => void} setError
 * @param {(message: string, durationMs?: number) => void} setStatusMessage
 * @param {{ t?: (key: string, vars?: Record<string, string | number>) => string }} [options]
 */
export function applyError(
  err,
  setError,
  setStatusMessage,
  options: { t?: (key: string, vars?: Record<string, string | number>) => string } = {}
) {
  const message = formatError(err, "unknown error", options.t);
  setError(message);
  setStatusMessage(message);
  return message;
}

/**
 * @param {string} title
 * @param {import("$lib/types").OpFailure[]} failures
 * @param {{ setOpen: (value: boolean) => void, setTitle: (value: string) => void, setItems: (value: import("$lib/types").OpFailure[]) => void }} ctx
 */
export function openFailures(title, failures, ctx) {
  ctx.setTitle(title);
  ctx.setItems(Array.isArray(failures) ? failures : []);
  ctx.setOpen(true);
}

/**
 * @param {{ setOpen: (value: boolean) => void, setTitle: (value: string) => void, setItems: (value: import("$lib/types").OpFailure[]) => void }} ctx
 */
export function closeFailures(ctx) {
  ctx.setOpen(false);
  ctx.setTitle("");
  ctx.setItems([]);
}

/**
 * @param {import("$lib/types").OpFailure} item
 * @param {(key: string) => string} t
 */
export function getFailureMessage(item, t) {
  const code = item?.code || "";
  if (code) {
    const key = `failure.code.${code}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return item?.error || "";
}
import { formatError } from "$lib/utils/error_format";

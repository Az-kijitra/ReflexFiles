import { applyError, updateStatusMessage } from "$lib/utils/feedback";

/**
 * @param {object} params
 * @param {() => string} params.getStatusMessage
 * @param {(value: string) => void} params.setStatusMessage
 * @param {() => ReturnType<typeof setTimeout> | null} params.getStatusTimer
 * @param {(value: ReturnType<typeof setTimeout> | null) => void} params.setStatusTimer
 * @param {(key: string, vars?: Record<string, string | number>) => string} [params.t]
 */
export function createPageErrorHandler({
  getStatusMessage,
  setStatusMessage,
  getStatusTimer,
  setStatusTimer,
  setError,
  t,
}) {
  /**
   * @param {unknown} err
   */
  return function showError(err) {
    applyError(
      err,
      (value) => {
        if (setError) setError(value);
      },
      (message, durationMs) => {
        updateStatusMessage(message, durationMs ?? 2500, {
          getMessage: getStatusMessage,
          setMessage: setStatusMessage,
          getTimer: getStatusTimer,
          setTimer: setStatusTimer,
        });
      },
      { t }
    );
  };
}

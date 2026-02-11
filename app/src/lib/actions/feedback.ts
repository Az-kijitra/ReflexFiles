import { STATUS_DEFAULT_MS } from "$lib/ui_durations";

/**
 * @param {object} ctx
 */
export function createFeedbackActions(ctx) {
  /**
   * @param {string} message
   * @param {number} [durationMs]
   */
  function setStatusMessage(message, durationMs = STATUS_DEFAULT_MS) {
    ctx.updateStatusMessage(message, durationMs, {
      getMessage: () => ctx.getStatusMessage(),
      setMessage: (value) => {
        ctx.setStatusMessageState(value);
      },
      getTimer: () => ctx.getStatusTimer(),
      setTimer: (value) => {
        ctx.setStatusTimer(value);
      },
    });
  }

  /** @param {unknown} err */
  function showError(err) {
    ctx.applyError(
      err,
      (value) => {
        ctx.setError(value);
      },
      setStatusMessage,
      { t: ctx.t }
    );
  }

  /**
   * @param {string} title
   * @param {import("$lib/types").OpFailure[]} failures
   */
  function showFailures(title, failures) {
    ctx.openFailures(title, failures, {
      setOpen: (value) => {
        ctx.setFailureModalOpen(value);
      },
      setTitle: (value) => {
        ctx.setFailureModalTitle(value);
      },
      setItems: (value) => {
        ctx.setFailureItems(value);
      },
    });
  }

  /** @param {import("$lib/types").OpFailure} item */
  function failureMessage(item) {
    return ctx.getFailureMessage(item, ctx.t);
  }

  function closeFailureModal() {
    ctx.closeFailures({
      setOpen: (value) => {
        ctx.setFailureModalOpen(value);
      },
      setTitle: (value) => {
        ctx.setFailureModalTitle(value);
      },
      setItems: (value) => {
        ctx.setFailureItems(value);
      },
    });
  }

  return {
    setStatusMessage,
    showError,
    showFailures,
    failureMessage,
    closeFailureModal,
  };
}

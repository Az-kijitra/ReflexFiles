import { formatError } from "$lib/utils/error_format";

/**
 * @param {object} ctx
 * @param {object} helpers
 * @param {() => void} helpers.closeContextMenu
 */
export function createZipActions(ctx, helpers) {
  const { closeContextMenu } = helpers;

  function openZipCreate() {
    const selected = ctx.getSelectedPaths();
    if (!selected.length) return;
    const first = selected[0];
    const baseName = first.split(/[\\\/]/).pop() || "archive";
    const defaultName = selected.length === 1 ? `${baseName}.zip` : "archive.zip";
    ctx.setZipMode("create");
    ctx.setZipTargets([...selected]);
    ctx.setZipDestination(`${ctx.getCurrentPath()}\\${defaultName}`);
    ctx.setZipPassword("");
    ctx.setZipError("");
    ctx.setZipPasswordAttempts(0);
    ctx.setZipConfirmIndex(0);
    ctx.setZipOverwriteConfirmed(false);
    ctx.setZipModalOpen(true);
    closeContextMenu?.();
  }

  function openZipExtract() {
    const selected = ctx.getSelectedPaths();
    if (selected.length !== 1) return;
    ctx.setZipMode("extract");
    ctx.setZipTargets([selected[0]]);
    ctx.setZipDestination(ctx.getCurrentPath());
    ctx.setZipPassword("");
    ctx.setZipError("");
    ctx.setZipPasswordAttempts(0);
    ctx.setZipConfirmIndex(0);
    ctx.setZipOverwriteConfirmed(false);
    ctx.setZipModalOpen(true);
    closeContextMenu?.();
  }

  async function runZipAction() {
    const destination = ctx.getZipDestination();
    if (!destination) {
      ctx.setZipError(ctx.t("zip.error_destination_required"));
      return;
    }
    if (ctx.getZipMode() === "extract" && ctx.getZipPasswordAttempts() >= ctx.zipPasswordMaxAttempts) {
      ctx.setZipError(ctx.t("zip.error_password_attempts_exceeded"));
      return;
    }
    try {
      const targets = ctx.getZipTargets();
      if (ctx.getZipMode() === "create") {
        await ctx.zipCreate(
          targets,
          destination,
          ctx.getZipPassword() ? ctx.getZipPassword() : null
        );
      } else {
        const conflicts =
          typeof ctx.zipExtractListConflicts === "function"
            ? await ctx.zipExtractListConflicts(
                targets[0],
                destination,
                ctx.getZipPassword() ? ctx.getZipPassword() : null
              )
            : [];
        if (Array.isArray(conflicts) && conflicts.length > 0) {
          const preview = conflicts.slice(0, 5).join("\n");
          const more =
            conflicts.length > 5 ? `\n... (+${conflicts.length - 5})` : "";
          const message = `${ctx.t("zip.confirm_overwrite_conflicts", {
            count: conflicts.length,
          })}\n\n${preview}${more}`;
          const confirmed =
            typeof globalThis.confirm === "function" ? globalThis.confirm(message) : false;
          if (!confirmed) {
            ctx.setZipError(ctx.t("zip.error_overwrite_confirm"));
            return;
          }
        }
        await ctx.zipExtract(
          targets[0],
          destination,
          ctx.getZipPassword() ? ctx.getZipPassword() : null
        );
      }
      ctx.setZipModalOpen(false);
      ctx.setZipTargets([]);
      ctx.setZipPassword("");
      ctx.setZipError("");
      ctx.setZipPasswordAttempts(0);
      ctx.setZipConfirmIndex(0);
      ctx.setZipOverwriteConfirmed(false);
      await ctx.loadDir(ctx.getCurrentPath());
    } catch (err) {
      const message = formatError(err, "unknown error", ctx.t);
      if (message.includes("ZIP_BAD_PASSWORD")) {
        const attempts = ctx.getZipPasswordAttempts() + 1;
        ctx.setZipPasswordAttempts(attempts);
        if (attempts >= ctx.zipPasswordMaxAttempts) {
          ctx.setZipError(ctx.t("zip.error_password_failed"));
        } else {
          ctx.setZipError(
            ctx.t("zip.error_invalid_password", {
              count: attempts,
              total: ctx.zipPasswordMaxAttempts,
            })
          );
        }
      } else {
        ctx.setZipError(message);
      }
    }
  }

  function closeZipModal() {
    ctx.setZipModalOpen(false);
    ctx.setZipTargets([]);
    ctx.setZipPassword("");
    ctx.setZipError("");
    ctx.setZipPasswordAttempts(0);
    ctx.setZipConfirmIndex(0);
    ctx.setZipOverwriteConfirmed(false);
  }

  return {
    openZipCreate,
    openZipExtract,
    runZipAction,
    closeZipModal,
  };
}

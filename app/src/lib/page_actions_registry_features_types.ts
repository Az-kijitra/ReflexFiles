import type { ClipboardContext } from "./page_actions_registry_contexts/clipboard";
import type { ContextMenuContext } from "./page_actions_registry_contexts/context_menu";
import type { DeleteContext } from "./page_actions_registry_contexts/delete";
import type { EditContext } from "./page_actions_registry_contexts/edit";
import type { ExternalContext } from "./page_actions_registry_contexts/external";
import type { FeedbackContext } from "./page_actions_registry_contexts/feedback";
import type { FileOpsContext } from "./page_actions_registry_contexts/file_ops";
import type { HistoryContext } from "./page_actions_registry_contexts/history";
import type { SelectionContext } from "./page_actions_registry_contexts/selection";
import type { UndoContext } from "./page_actions_registry_contexts/undo";
import type { ZipContext } from "./page_actions_registry_contexts/zip";

export type PageActionsRegistryContext = ClipboardContext &
  ContextMenuContext &
  DeleteContext &
  EditContext &
  ExternalContext &
  FeedbackContext &
  FileOpsContext &
  HistoryContext &
  SelectionContext &
  UndoContext &
  ZipContext;

export type {
  ClipboardContext,
  ContextMenuContext,
  DeleteContext,
  EditContext,
  ExternalContext,
  FeedbackContext,
  FileOpsContext,
  HistoryContext,
  SelectionContext,
  UndoContext,
  ZipContext,
};

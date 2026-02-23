import type { Entry, ProviderCapabilities, StorageProvider } from "$lib/types";

export type DragDropPhase = "phase0_foundation" | "phase1_inbound_local_only" | "phase2_outbound_local_only";

export interface DragDropExperimentPolicy {
  enabled: boolean;
  phase: DragDropPhase;
}

export interface DragDropDecision {
  allowed: boolean;
  reason:
    | "ok"
    | "disabled"
    | "phase_not_supported"
    | "no_items"
    | "destination_not_local"
    | "destination_capability_denied"
    | "source_not_local"
    | "mixed_or_invalid_sources";
  acceptedPaths: string[];
  rejectedPaths: string[];
}

export const NATIVE_OUTBOUND_DND_SUPPRESS_START_MS = 15000;
export const NATIVE_OUTBOUND_DND_SUPPRESS_COOLDOWN_MS = 1000;

export const DND_EXPERIMENT_DEFAULT_POLICY: DragDropExperimentPolicy = {
  enabled: false,
  phase: "phase0_foundation",
};

export function parseDragDropExperimentPolicy(raw: unknown): DragDropExperimentPolicy {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value || value === "0" || value === "off" || value === "false") {
    return DND_EXPERIMENT_DEFAULT_POLICY;
  }
  if (value === "1" || value === "on" || value === "phase1" || value === "phase1_inbound_local_only") {
    return { enabled: true, phase: "phase1_inbound_local_only" };
  }
  if (value === "phase2" || value === "phase2_outbound_local_only") {
    return { enabled: true, phase: "phase2_outbound_local_only" };
  }
  if (value === "phase0" || value === "phase0_foundation") {
    return { enabled: true, phase: "phase0_foundation" };
  }
  return DND_EXPERIMENT_DEFAULT_POLICY;
}

export function readDragDropExperimentPolicyFromStorage(
  readItem: (key: string) => string | null
): DragDropExperimentPolicy {
  try {
    return parseDragDropExperimentPolicy(readItem("rf_experiment_dnd"));
  } catch {
    return DND_EXPERIMENT_DEFAULT_POLICY;
  }
}

function normalizeWindowsLikePath(path: string): string {
  return path.replace(/\//g, "\\").trim();
}

function isWindowsAbsoluteOrUnc(path: string): boolean {
  return /^[a-zA-Z]:\\/.test(path) || /^\\\\[^\\]+\\[^\\]+/.test(path);
}

function isLocalLikePath(path: string): boolean {
  if (!path) return false;
  if (path.startsWith("gdrive://")) return false;
  return isWindowsAbsoluteOrUnc(path);
}

export function normalizeDroppedOsPaths(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const normalized = normalizeWindowsLikePath(item);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function canAcceptInboundToDestination(
  destinationProvider: StorageProvider | undefined,
  destinationPath: string,
  caps?: ProviderCapabilities | null,
): DragDropDecision["reason"] | "ok" {
  if (destinationProvider === "gdrive" || destinationPath.startsWith("gdrive://")) {
    return "destination_not_local";
  }
  if (caps && (!caps.can_create || !caps.can_copy)) {
    return "destination_capability_denied";
  }
  return "ok";
}

export function evaluateInboundOsDrop(params: {
  policy?: DragDropExperimentPolicy | null;
  destinationPath: string;
  destinationProvider?: StorageProvider;
  destinationCapabilities?: ProviderCapabilities | null;
  droppedPaths: unknown;
}): DragDropDecision {
  const policy = params.policy ?? DND_EXPERIMENT_DEFAULT_POLICY;
  if (!policy.enabled) {
    return { allowed: false, reason: "disabled", acceptedPaths: [], rejectedPaths: [] };
  }
  if (policy.phase !== "phase1_inbound_local_only" && policy.phase !== "phase2_outbound_local_only") {
    return { allowed: false, reason: "phase_not_supported", acceptedPaths: [], rejectedPaths: [] };
  }

  const destinationReason = canAcceptInboundToDestination(
    params.destinationProvider,
    String(params.destinationPath || ""),
    params.destinationCapabilities ?? null,
  );
  if (destinationReason !== "ok") {
    return { allowed: false, reason: destinationReason, acceptedPaths: [], rejectedPaths: [] };
  }

  const normalized = normalizeDroppedOsPaths(params.droppedPaths);
  if (!normalized.length) {
    return { allowed: false, reason: "no_items", acceptedPaths: [], rejectedPaths: [] };
  }

  const acceptedPaths = normalized.filter(isLocalLikePath);
  const rejectedPaths = normalized.filter((p) => !isLocalLikePath(p));
  if (!acceptedPaths.length) {
    return { allowed: false, reason: "source_not_local", acceptedPaths, rejectedPaths };
  }
  if (rejectedPaths.length) {
    return { allowed: false, reason: "mixed_or_invalid_sources", acceptedPaths, rejectedPaths };
  }
  return { allowed: true, reason: "ok", acceptedPaths, rejectedPaths };
}

export function evaluateOutboundAppDragCandidate(params: {
  policy?: DragDropExperimentPolicy | null;
  selectedEntries: Pick<Entry, "path" | "provider">[];
}): DragDropDecision {
  const policy = params.policy ?? DND_EXPERIMENT_DEFAULT_POLICY;
  if (!policy.enabled) {
    return { allowed: false, reason: "disabled", acceptedPaths: [], rejectedPaths: [] };
  }
  if (policy.phase !== "phase2_outbound_local_only") {
    return { allowed: false, reason: "phase_not_supported", acceptedPaths: [], rejectedPaths: [] };
  }

  const paths = normalizeDroppedOsPaths(params.selectedEntries.map((entry) => entry.path));
  if (!paths.length) {
    return { allowed: false, reason: "no_items", acceptedPaths: [], rejectedPaths: [] };
  }

  const acceptedPaths: string[] = [];
  const rejectedPaths: string[] = [];
  for (const entry of params.selectedEntries) {
    const path = normalizeWindowsLikePath(String(entry.path || ""));
    const isLocal = (entry.provider ?? (path.startsWith("gdrive://") ? "gdrive" : "local")) === "local";
    if (isLocal && isLocalLikePath(path)) acceptedPaths.push(path);
    else rejectedPaths.push(path);
  }
  if (!acceptedPaths.length) {
    return { allowed: false, reason: "source_not_local", acceptedPaths, rejectedPaths };
  }
  if (rejectedPaths.length) {
    return { allowed: false, reason: "mixed_or_invalid_sources", acceptedPaths, rejectedPaths };
  }
  return { allowed: true, reason: "ok", acceptedPaths, rejectedPaths };
}

export function formatInboundDropProbeStatus(params: {
  currentPath: string;
  decision: DragDropDecision;
}): string {
  const count = params.decision.acceptedPaths.length + params.decision.rejectedPaths.length;
  if (params.decision.allowed) {
    return `D&D import probe (experimental): ${count} item(s) -> ${params.currentPath}`;
  }
  return `D&D import blocked (${params.decision.reason}): ${count} item(s)`;
}

type NativeOutboundSuppressWindow = {
  __rf_native_outbound_drag_suppress_until?: number;
  __rf_native_outbound_drag_inflight?: boolean;
};

export function markNativeOutboundDragSuppress(
  win: NativeOutboundSuppressWindow | null | undefined,
  durationMs: number
): number {
  if (!win || !Number.isFinite(durationMs) || durationMs <= 0) return 0;
  const until = Date.now() + Math.trunc(durationMs);
  win.__rf_native_outbound_drag_suppress_until = until;
  return until;
}

export function isNativeOutboundDragSuppressActive(
  win: NativeOutboundSuppressWindow | null | undefined,
  now = Date.now()
): boolean {
  if (!win) return false;
  const until = Number(win.__rf_native_outbound_drag_suppress_until ?? 0);
  return Number.isFinite(until) && now < until;
}

export function tryBeginNativeOutboundDrag(
  win: NativeOutboundSuppressWindow | null | undefined
): boolean {
  if (!win) return true;
  if (win.__rf_native_outbound_drag_inflight) return false;
  win.__rf_native_outbound_drag_inflight = true;
  return true;
}

export function endNativeOutboundDrag(
  win: NativeOutboundSuppressWindow | null | undefined
): void {
  if (!win) return;
  win.__rf_native_outbound_drag_inflight = false;
}

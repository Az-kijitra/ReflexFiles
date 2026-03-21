import { UNDO_LIMIT } from "$lib/page_constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UndoCopy   = { kind: "copy";   pairs: { from: string; to: string }[] };
export type UndoMove   = { kind: "move";   pairs: { from: string; to: string }[] };
export type UndoRename = { kind: "rename"; from: string; to: string };
export type UndoCreate = { kind: "create"; path: string; createKind: "file" | "folder" };
export type UndoDelete = { kind: "delete"; pairs: { from: string; to: string }[] };
export type UndoEntry  = UndoCopy | UndoMove | UndoRename | UndoCreate | UndoDelete;

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizeUndoPairs(rawPairs: unknown): { from: string; to: string }[] {
  if (!Array.isArray(rawPairs)) return [];
  const pairs: { from: string; to: string }[] = [];
  for (const pair of rawPairs) {
    const from = typeof pair?.from === "string" ? pair.from.trim() : "";
    const to   = typeof pair?.to   === "string" ? pair.to.trim()   : "";
    if (!from || !to) continue;
    pairs.push({ from, to });
  }
  return pairs;
}

export function normalizeUndoEntry(entry: unknown): UndoEntry | null {
  if (!entry || typeof entry !== "object") return null;
  const e = entry as Record<string, unknown>;
  const kind = String(e.kind ?? "").trim();

  if (kind === "copy" || kind === "move" || kind === "delete") {
    const pairs = normalizeUndoPairs(e.pairs);
    if (!pairs.length) return null;
    return { kind, pairs } as UndoCopy | UndoMove | UndoDelete;
  }

  if (kind === "rename") {
    const from = typeof e.from === "string" ? e.from.trim() : "";
    const to   = typeof e.to   === "string" ? e.to.trim()   : "";
    if (!from || !to) return null;
    return { kind: "rename", from, to };
  }

  if (kind === "create") {
    const path       = typeof e.path === "string" ? e.path.trim() : "";
    const createKind = e.createKind === "folder" ? "folder" as const : "file" as const;
    if (!path) return null;
    return { kind: "create", path, createKind };
  }

  return null;
}

export function normalizeUndoEntries(entries: unknown): UndoEntry[] {
  if (!Array.isArray(entries)) return [];
  const next: UndoEntry[] = [];
  for (const entry of entries) {
    const normalized = normalizeUndoEntry(entry);
    if (normalized) next.push(normalized);
    if (next.length >= UNDO_LIMIT) break;
  }
  return next;
}

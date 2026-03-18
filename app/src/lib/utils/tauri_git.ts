import { invoke } from "$lib/tauri_client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GitFileStatus {
  /** Path relative to repo root, forward-slash separators */
  path: string;
  /** Two-char porcelain v1 code, e.g. "M ", " M", "??" */
  xy: string;
}

export interface GitRepoStatus {
  is_repo: boolean;
  repo_root: string;
  branch: string;
  statuses: GitFileStatus[];
}

export interface GitBranch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
}

export interface GitWorktree {
  /** Absolute path of the worktree directory */
  path: string;
  /** Branch checked out (empty if detached HEAD) */
  branch: string;
  /** True for the main worktree */
  is_main: boolean;
  /** True if bare */
  is_bare: boolean;
}

// ── Tauri command wrappers ────────────────────────────────────────────────────

export function gitGetStatus(path: string): Promise<GitRepoStatus> {
  return invoke("git_get_status", { path });
}

export function gitListBranches(path: string): Promise<GitBranch[]> {
  return invoke("git_list_branches", { path });
}

export function gitCheckout(path: string, branch: string): Promise<void> {
  return invoke("git_checkout", { path, branch });
}

export function gitCreateBranch(path: string, name: string, from?: string): Promise<void> {
  return invoke("git_create_branch", { path, name, from: from ?? null });
}

export function gitStage(path: string, filePaths: string[]): Promise<void> {
  return invoke("git_stage", { path, filePaths });
}

export function gitUnstage(path: string, filePaths: string[]): Promise<void> {
  return invoke("git_unstage", { path, filePaths });
}

export function gitCommit(path: string, message: string): Promise<void> {
  return invoke("git_commit", { path, message });
}

export function gitClone(url: string, dest: string): Promise<void> {
  return invoke("git_clone", { url, dest });
}

export function gitListWorktrees(path: string): Promise<GitWorktree[]> {
  return invoke("git_list_worktrees", { path });
}

export function gitAddWorktree(path: string, worktreePath: string, branch: string, newBranch: boolean): Promise<void> {
  return invoke("git_add_worktree", { path, worktreePath, branch, newBranch });
}

export function gitRemoveWorktree(path: string, worktreePath: string): Promise<void> {
  return invoke("git_remove_worktree", { path, worktreePath });
}

// ── Badge logic ───────────────────────────────────────────────────────────────

/**
 * Badge priority (higher = more prominent):
 *   ! conflict  > S staged  > M modified/deleted  > ? untracked  > "" clean
 */
const BADGE_PRIORITY: Record<string, number> = {
  "!": 4,
  S: 3,
  M: 2,
  D: 2,
  "?": 1,
  "": 0,
};

function highestBadge(a: string, b: string): string {
  return (BADGE_PRIORITY[b] ?? 0) > (BADGE_PRIORITY[a] ?? 0) ? b : a;
}

/** Convert a two-char XY porcelain code to a one-char display badge. */
export function xyToBadge(xy: string): string {
  if (!xy || xy.length < 2) return "";
  const x = xy[0];
  const y = xy[1];

  if (x === "?" && y === "?") return "?"; // untracked
  if (x === "!" && y === "!") return "";  // ignored — hide

  // Conflict (both sides modified/added/deleted)
  if (
    x === "U" ||
    y === "U" ||
    (x === "A" && y === "A") ||
    (x === "D" && y === "D")
  )
    return "!";

  // Has staged changes (index column not clean)
  if (x !== " " && x !== "?") return "S";

  // Only working-tree changes
  if (y === "M" || y === "T") return "M";
  if (y === "D") return "D";

  return "";
}

/**
 * Compute the git badge string for a single file-list entry.
 *
 * @param entryAbsPath  Absolute path of the entry (may use backslashes)
 * @param repoRoot      Absolute path of the repo root (forward-slashes from backend)
 * @param statuses      File statuses from GitRepoStatus
 * @param isDir         Whether this entry is a directory
 */
export function getEntryGitBadge(
  entryAbsPath: string,
  repoRoot: string,
  statuses: GitFileStatus[],
  isDir: boolean
): string {
  const absNorm = entryAbsPath.replace(/\\/g, "/");
  const rootNorm = repoRoot.replace(/\\/g, "/");

  // Entry must be inside the repo
  if (!absNorm.toLowerCase().startsWith(rootNorm.toLowerCase())) return "";

  const relPath = absNorm.slice(rootNorm.length).replace(/^\//, "");

  if (isDir) {
    const prefix = relPath ? relPath + "/" : "";
    let best = "";
    for (const s of statuses) {
      if (!prefix || s.path === relPath || s.path.startsWith(prefix)) {
        best = highestBadge(best, xyToBadge(s.xy));
        if (best === "!") break; // can't get higher
      }
    }
    return best;
  } else {
    const match = statuses.find(
      (s) => s.path.toLowerCase() === relPath.toLowerCase()
    );
    return match ? xyToBadge(match.xy) : "";
  }
}

<script>
  import {
    gitListBranches,
    gitCheckout,
    gitCreateBranch,
    gitStage,
    gitUnstage,
    gitCommit,
    gitClone,
    gitListWorktrees,
    gitAddWorktree,
    gitRemoveWorktree,
    gitLogGraph,
  } from "$lib/utils/tauri_git";

  /** @type {import("$lib/utils/tauri_git").GitRepoStatus | null} */
  export let gitStatus = null;

  /** Current directory path of the active pane */
  export let currentPath = "";

  /** Called when the panel should close */
  export let onClose;

  /** Called after a branch switch / commit / clone so the pane can reload */
  export let onRefresh;

  /** Called when user clicks "Open Left" / "Open Right" for a worktree path */
  export let onOpenPath = null;

  // ── Local state ────────────────────────────────────────────────────────────
  let tab = "changes"; // "changes" | "branches" | "log" | "clone" | "worktrees"

  /** @type {import("$lib/utils/tauri_git").GitBranch[]} */
  let branches = [];
  let branchesLoading = false;
  let branchesError = "";

  let newBranchName = "";
  let newBranchError = "";
  let newBranchBusy = false;

  let commitMsg = "";
  let commitError = "";
  let commitBusy = false;

  let cloneUrl = "";
  let cloneDest = "";
  let cloneError = "";
  let cloneBusy = false;

  let stageError = "";
  let stageBusy = false;

  /** @type {import("$lib/utils/tauri_git").GitWorktree[]} */
  let worktrees = [];
  let worktreesLoading = false;
  let worktreesError = "";
  let wtPath = "";
  let wtBranch = "";
  let wtNewBranch = false;
  let wtBusy = false;
  let wtError = "";

  let logLines = /** @type {string[]} */ ([]);
  let logLoading = false;
  let logError = "";

  // ── Derived ────────────────────────────────────────────────────────────────
  $: stagedFiles   = (gitStatus?.statuses ?? []).filter(s => s.xy[0] !== " " && s.xy[0] !== "?");
  $: unstagedFiles = (gitStatus?.statuses ?? []).filter(s => s.xy[1] !== " " && s.xy !== "??");
  $: untrackedFiles = (gitStatus?.statuses ?? []).filter(s => s.xy === "??");
  $: allChanged = [...stagedFiles, ...unstagedFiles, ...untrackedFiles]
      .filter((v, i, a) => a.findIndex(x => x.path === v.path) === i);

  $: branch = gitStatus?.branch ?? "";
  $: isRepo = gitStatus?.is_repo ?? false;

  // ── Tab switch loads branches ──────────────────────────────────────────────
  async function switchTab(t) {
    tab = t;
    if (t === "branches" && branches.length === 0) {
      await loadBranches();
    }
    if (t === "worktrees") {
      await loadWorktrees();
    }
    if (t === "log") {
      await loadLog();
    }
  }

  async function loadBranches() {
    branchesLoading = true;
    branchesError = "";
    try {
      branches = await gitListBranches(currentPath);
    } catch (e) {
      branchesError = String(e);
    } finally {
      branchesLoading = false;
    }
  }

  // ── Stage / unstage ────────────────────────────────────────────────────────
  async function stageFile(path) {
    stageError = "";
    stageBusy = true;
    try {
      await gitStage(currentPath, [path]);
      onRefresh?.();
    } catch (e) {
      stageError = String(e);
    } finally {
      stageBusy = false;
    }
  }

  async function unstageFile(path) {
    stageError = "";
    stageBusy = true;
    try {
      await gitUnstage(currentPath, [path]);
      onRefresh?.();
    } catch (e) {
      stageError = String(e);
    } finally {
      stageBusy = false;
    }
  }

  async function stageAll() {
    stageError = "";
    stageBusy = true;
    try {
      const paths = allChanged.map(s => s.path);
      await gitStage(currentPath, paths);
      onRefresh?.();
    } catch (e) {
      stageError = String(e);
    } finally {
      stageBusy = false;
    }
  }

  async function unstageAll() {
    stageError = "";
    stageBusy = true;
    try {
      const paths = stagedFiles.map(s => s.path);
      await gitUnstage(currentPath, paths);
      onRefresh?.();
    } catch (e) {
      stageError = String(e);
    } finally {
      stageBusy = false;
    }
  }

  // ── Commit ─────────────────────────────────────────────────────────────────
  async function doCommit() {
    if (!commitMsg.trim()) { commitError = "Commit message is required."; return; }
    commitError = "";
    commitBusy = true;
    try {
      await gitCommit(currentPath, commitMsg.trim());
      commitMsg = "";
      onRefresh?.();
    } catch (e) {
      commitError = String(e);
    } finally {
      commitBusy = false;
    }
  }

  // ── Checkout ───────────────────────────────────────────────────────────────
  async function checkout(name) {
    branchesError = "";
    try {
      await gitCheckout(currentPath, name);
      await loadBranches();
      onRefresh?.();
    } catch (e) {
      branchesError = String(e);
    }
  }

  // ── Create branch ──────────────────────────────────────────────────────────
  async function createBranch() {
    if (!newBranchName.trim()) { newBranchError = "Branch name required."; return; }
    newBranchError = "";
    newBranchBusy = true;
    try {
      await gitCreateBranch(currentPath, newBranchName.trim());
      newBranchName = "";
      await loadBranches();
      onRefresh?.();
    } catch (e) {
      newBranchError = String(e);
    } finally {
      newBranchBusy = false;
    }
  }

  // ── Clone ──────────────────────────────────────────────────────────────────
  async function doClone() {
    if (!cloneUrl.trim()) { cloneError = "Repository URL required."; return; }
    if (!cloneDest.trim()) { cloneError = "Destination path required."; return; }
    cloneError = "";
    cloneBusy = true;
    try {
      await gitClone(cloneUrl.trim(), cloneDest.trim());
      cloneUrl = "";
      cloneDest = "";
      onRefresh?.();
    } catch (e) {
      cloneError = String(e);
    } finally {
      cloneBusy = false;
    }
  }

  // ── Log ─────────────────────────────────────────────────────────────────────
  async function loadLog() {
    logLoading = true;
    logError = "";
    try {
      const raw = await gitLogGraph(currentPath);
      logLines = raw.split("\n").filter(l => l.length > 0);
    } catch (e) {
      logError = String(e);
    } finally {
      logLoading = false;
    }
  }

  function escHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /** Colorize one log line: graph chars, hash, refs, message */
  function colorizeLogLine(line) {
    // Split: graph prefix | hash | rest
    const graphMatch = line.match(/^([^a-f0-9]*)([a-f0-9]{7,})?(.*)$/);
    if (!graphMatch) return escHtml(line);
    const graph = graphMatch[1] ?? "";
    const hash  = graphMatch[2] ?? "";
    const rest  = graphMatch[3] ?? "";

    // Process graph characters one by one to avoid span-tag corruption
    let coloredGraph = "";
    for (const ch of graph) {
      switch (ch) {
        case "*": coloredGraph += '<span class="lg-node">*</span>'; break;
        case "|": coloredGraph += '<span class="lg-pipe">│</span>'; break;
        case "/": coloredGraph += '<span class="lg-pipe">/</span>'; break;
        case "\\": coloredGraph += '<span class="lg-pipe">\\</span>'; break;
        case "-": coloredGraph += '<span class="lg-pipe">─</span>'; break;
        default:  coloredGraph += escHtml(ch);
      }
    }

    // Color (HEAD -> branch, tag: v1.0) refs inside parentheses
    const coloredRest = escHtml(rest).replace(
      /\(([^)]+)\)/g,
      (_, refs) => {
        const inner = refs.replace(/([^,\s]+)/g, (r) => {
          if (r.includes("HEAD")) return `<span class="lg-head">${r}</span>`;
          if (r.startsWith("tag:")) return `<span class="lg-tag">${r}</span>`;
          return `<span class="lg-ref">${r}</span>`;
        });
        return `(${inner})`;
      }
    );

    return `${coloredGraph}<span class="lg-hash">${escHtml(hash)}</span>${coloredRest}`;
  }

  // ── Worktrees ───────────────────────────────────────────────────────────────
  async function loadWorktrees() {
    worktreesLoading = true;
    worktreesError = "";
    try {
      worktrees = await gitListWorktrees(currentPath);
    } catch (e) {
      worktreesError = String(e);
    } finally {
      worktreesLoading = false;
    }
  }

  async function addWorktree() {
    if (!wtPath.trim()) { wtError = "Path required."; return; }
    if (!wtBranch.trim()) { wtError = "Branch required."; return; }
    wtError = "";
    wtBusy = true;
    try {
      await gitAddWorktree(currentPath, wtPath.trim(), wtBranch.trim(), wtNewBranch);
      wtPath = "";
      wtBranch = "";
      wtNewBranch = false;
      await loadWorktrees();
    } catch (e) {
      wtError = String(e);
    } finally {
      wtBusy = false;
    }
  }

  async function removeWorktree(path) {
    worktreesError = "";
    try {
      await gitRemoveWorktree(currentPath, path);
      await loadWorktrees();
    } catch (e) {
      worktreesError = String(e);
    }
  }

  function statusLabel(xy) {
    if (!xy) return "";
    const x = xy[0], y = xy[1] ?? " ";
    if (xy === "??") return "untracked";
    if (x !== " " && x !== "?" && y !== " " && y !== "?") return "staged+modified";
    if (x !== " " && x !== "?") return "staged";
    if (y === "M" || y === "T") return "modified";
    if (y === "D") return "deleted";
    return xy.trim();
  }
</script>

<div class="git-panel" role="complementary" aria-label="Git panel">
  <!-- Header -->
  <div class="panel-header">
    <span class="panel-title">Git</span>
    {#if isRepo}
      <span class="branch-badge" title="Current branch">{branch || "?"}</span>
    {:else}
      <span class="no-repo">Not a git repo</span>
    {/if}
    <button class="close-btn" onclick={onClose} aria-label="Close git panel">✕</button>
  </div>

  {#if isRepo}
    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" class:active={tab === "changes"} onclick={() => switchTab("changes")}>
        Changes {allChanged.length > 0 ? `(${allChanged.length})` : ""}
      </button>
      <button class="tab" class:active={tab === "branches"} onclick={() => switchTab("branches")}>
        Branches
      </button>
      <button class="tab" class:active={tab === "log"} onclick={() => switchTab("log")}>
        Log
      </button>
      <button class="tab" class:active={tab === "clone"} onclick={() => switchTab("clone")}>
        Clone
      </button>
      <button class="tab" class:active={tab === "worktrees"} onclick={() => switchTab("worktrees")}>
        Worktrees
      </button>
    </div>

    <!-- ── Changes tab ── -->
    {#if tab === "changes"}
      <div class="tab-body">
        {#if stageError}
          <div class="error-msg">{stageError}</div>
        {/if}

        {#if allChanged.length === 0}
          <div class="empty-msg">Working tree clean</div>
        {:else}
          <div class="section-actions">
            <button class="action-btn" onclick={stageAll} disabled={stageBusy}>Stage all</button>
            <button class="action-btn" onclick={unstageAll} disabled={stageBusy || stagedFiles.length === 0}>Unstage all</button>
          </div>

          <div class="file-list">
            {#each allChanged as s (s.path)}
              {@const isStaged = s.xy[0] !== " " && s.xy[0] !== "?"}
              <div class="file-row" title={s.path}>
                <span class="file-xy {isStaged ? 'staged' : 'unstaged'}">{s.xy.trim() || "??"}</span>
                <span class="file-path">{s.path.split("/").pop()}</span>
                <span class="file-status">{statusLabel(s.xy)}</span>
                {#if isStaged}
                  <button class="mini-btn" onclick={() => unstageFile(s.path)} disabled={stageBusy}>−</button>
                {:else}
                  <button class="mini-btn" onclick={() => stageFile(s.path)} disabled={stageBusy}>+</button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- Commit section -->
        <div class="commit-section">
          <div class="section-label">Commit message</div>
          <textarea
            class="commit-input"
            placeholder="Summary of changes..."
            rows="3"
            bind:value={commitMsg}
            onkeydown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) doCommit(); }}
          ></textarea>
          {#if commitError}
            <div class="error-msg">{commitError}</div>
          {/if}
          <button class="primary-btn" onclick={doCommit} disabled={commitBusy || !commitMsg.trim() || stagedFiles.length === 0}>
            {commitBusy ? "Committing..." : "Commit"}
          </button>
          {#if stagedFiles.length === 0 && allChanged.length > 0}
            <div class="hint">Stage files before committing.</div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- ── Branches tab ── -->
    {#if tab === "branches"}
      <div class="tab-body">
        {#if branchesError}
          <div class="error-msg">{branchesError}</div>
        {/if}
        {#if branchesLoading}
          <div class="loading-msg">Loading branches...</div>
        {:else}
          <div class="file-list">
            {#each branches.filter(b => !b.is_remote) as b (b.name)}
              <div class="file-row" class:current-branch={b.is_current}>
                <span class="branch-icon">{b.is_current ? "●" : "○"}</span>
                <span class="file-path">{b.name}</span>
                {#if !b.is_current}
                  <button class="mini-btn" onclick={() => checkout(b.name)}>switch</button>
                {/if}
              </div>
            {/each}
          </div>

          {#if branches.filter(b => b.is_remote).length > 0}
            <div class="section-label" style="margin-top:8px">Remote</div>
            <div class="file-list">
              {#each branches.filter(b => b.is_remote) as b (b.name)}
                <div class="file-row">
                  <span class="branch-icon remote">↑</span>
                  <span class="file-path">{b.name}</span>
                  <button class="mini-btn" onclick={() => checkout(b.name)}>track</button>
                </div>
              {/each}
            </div>
          {/if}

          <!-- New branch -->
          <div class="commit-section">
            <div class="section-label">New branch</div>
            <input
              class="text-input"
              type="text"
              placeholder="branch-name"
              bind:value={newBranchName}
              onkeydown={(e) => { if (e.key === "Enter") createBranch(); }}
            />
            {#if newBranchError}
              <div class="error-msg">{newBranchError}</div>
            {/if}
            <button class="primary-btn" onclick={createBranch} disabled={newBranchBusy || !newBranchName.trim()}>
              {newBranchBusy ? "Creating..." : "Create & switch"}
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- ── Log tab ── -->
    {#if tab === "log"}
      <div class="tab-body log-body">
        {#if logError}
          <div class="error-msg">{logError}</div>
        {:else if logLoading}
          <div class="loading-msg">Loading log...</div>
        {:else if logLines.length === 0}
          <div class="empty-msg">No commits found.</div>
        {:else}
          <div class="log-toolbar">
            <button class="action-btn" onclick={loadLog}>↺ Refresh</button>
          </div>
          <pre class="log-pre">{#each logLines as line}{@html colorizeLogLine(line) + "\n"}{/each}</pre>
        {/if}
      </div>
    {/if}

    <!-- ── Clone tab ── -->
    {#if tab === "clone"}
      <div class="tab-body">
        <div class="section-label">Repository URL</div>
        <input class="text-input" type="text" placeholder="https://github.com/user/repo.git" bind:value={cloneUrl} />
        <div class="section-label" style="margin-top:6px">Destination path</div>
        <input class="text-input" type="text" placeholder="C:\projects\repo" bind:value={cloneDest} />
        {#if cloneError}
          <div class="error-msg">{cloneError}</div>
        {/if}
        <button class="primary-btn" onclick={doClone} disabled={cloneBusy || !cloneUrl.trim() || !cloneDest.trim()}>
          {cloneBusy ? "Cloning..." : "Clone"}
        </button>
      </div>
    {/if}

    <!-- ── Worktrees tab ── -->
    {#if tab === "worktrees"}
      <div class="tab-body">
        {#if worktreesError}
          <div class="error-msg">{worktreesError}</div>
        {/if}
        {#if worktreesLoading}
          <div class="loading-msg">Loading worktrees...</div>
        {:else}
          <div class="file-list">
            {#each worktrees as wt (wt.path)}
              <div class="wt-row">
                <div class="wt-info">
                  <span class="wt-branch">{wt.branch || "(detached)"}</span>
                  {#if wt.is_main}<span class="wt-badge">main</span>{/if}
                  <span class="wt-path" title={wt.path}>{wt.path.split("/").pop() || wt.path}</span>
                </div>
                <div class="wt-actions">
                  {#if onOpenPath}
                    <button class="mini-btn" onclick={() => onOpenPath(wt.path.replace(/\//g, "\\"), "left")}>L</button>
                    <button class="mini-btn" onclick={() => onOpenPath(wt.path.replace(/\//g, "\\"), "right")}>R</button>
                  {/if}
                  {#if !wt.is_main}
                    <button class="mini-btn danger" onclick={() => removeWorktree(wt.path)}>✕</button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>

          <!-- Add worktree -->
          <div class="commit-section">
            <div class="section-label">Add worktree</div>
            <input class="text-input" type="text" placeholder="Path (e.g. C:\repos\feature)" bind:value={wtPath} />
            <input class="text-input" type="text" placeholder="Branch name" bind:value={wtBranch} style="margin-top:4px" />
            <label class="checkbox-row">
              <input type="checkbox" bind:checked={wtNewBranch} />
              Create new branch
            </label>
            {#if wtError}
              <div class="error-msg">{wtError}</div>
            {/if}
            <button class="primary-btn" onclick={addWorktree} disabled={wtBusy || !wtPath.trim() || !wtBranch.trim()}>
              {wtBusy ? "Adding..." : "Add worktree"}
            </button>
          </div>
        {/if}
      </div>
    {/if}

  {:else}
    <!-- Not a repo -->
    <div class="tab-body">
      <div class="empty-msg">Current directory is not inside a Git repository.</div>
      <div class="section-label" style="margin-top:12px">Clone a repository</div>
      <div class="tab-body" style="padding:0">
        <input class="text-input" type="text" placeholder="https://..." bind:value={cloneUrl} />
        <div style="margin-top:4px"></div>
        <input class="text-input" type="text" placeholder="Destination path" bind:value={cloneDest} />
        {#if cloneError}
          <div class="error-msg">{cloneError}</div>
        {/if}
        <button class="primary-btn" onclick={doClone} disabled={cloneBusy}>
          {cloneBusy ? "Cloning..." : "Clone"}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .git-panel {
    position: fixed;
    right: 0;
    top: 0;
    width: 300px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--ui-surface);
    border-left: 1px solid var(--ui-border);
    box-shadow: -3px 0 12px rgba(0,0,0,0.12);
    z-index: 160;
    font-size: 12px;
    color: var(--ui-fg);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-bg);
    flex-shrink: 0;
  }

  .panel-title {
    font-weight: 600;
    font-size: 12px;
  }

  .branch-badge {
    flex: 1;
    font-size: 11px;
    padding: 1px 6px;
    background: var(--ui-accent, #0078d4);
    color: #fff;
    border-radius: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 160px;
  }

  .no-repo {
    flex: 1;
    font-size: 11px;
    color: var(--ui-muted);
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--ui-muted);
    font-size: 13px;
    padding: 0 2px;
    line-height: 1;
    flex-shrink: 0;
  }
  .close-btn:hover { color: var(--ui-fg); }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--ui-border);
    flex-shrink: 0;
  }

  .tab {
    flex: 1;
    padding: 5px 4px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 11px;
    color: var(--ui-muted);
  }
  .tab:hover { color: var(--ui-fg); }
  .tab.active {
    color: var(--ui-fg);
    border-bottom-color: var(--ui-accent, #0078d4);
    font-weight: 600;
  }

  .tab-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
  }

  .section-actions {
    display: flex;
    gap: 6px;
    margin-bottom: 4px;
  }

  .action-btn {
    flex: 1;
    padding: 3px 6px;
    font-size: 11px;
    background: var(--ui-bg);
    border: 1px solid var(--ui-border);
    cursor: pointer;
    border-radius: 2px;
    color: var(--ui-fg);
  }
  .action-btn:hover:not(:disabled) { background: var(--ui-selected); }
  .action-btn:disabled { opacity: 0.5; cursor: default; }

  .file-list {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ui-border);
    border-radius: 2px;
    overflow: hidden;
    max-height: 220px;
    overflow-y: auto;
  }

  .file-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 6px;
    border-bottom: 1px solid var(--ui-border-muted, var(--ui-border));
    font-size: 11px;
  }
  .file-row:last-child { border-bottom: none; }
  .file-row.current-branch { background: color-mix(in srgb, var(--ui-accent, #0078d4) 8%, transparent); }

  .file-xy {
    flex-shrink: 0;
    font-weight: 700;
    width: 2em;
    font-size: 10px;
  }
  .file-xy.staged    { color: #1a8a1a; }
  .file-xy.unstaged  { color: #d08800; }

  .file-path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
  }

  .file-status {
    font-size: 10px;
    color: var(--ui-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .branch-icon {
    flex-shrink: 0;
    font-size: 10px;
    color: var(--ui-muted);
    width: 1.2em;
  }
  .branch-icon.remote { color: #888; }

  .mini-btn {
    flex-shrink: 0;
    padding: 1px 5px;
    font-size: 11px;
    background: var(--ui-bg);
    border: 1px solid var(--ui-border);
    cursor: pointer;
    border-radius: 2px;
    color: var(--ui-fg);
  }
  .mini-btn:hover:not(:disabled) { background: var(--ui-selected); }
  .mini-btn:disabled { opacity: 0.5; cursor: default; }

  .commit-section {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--ui-border);
    flex-shrink: 0;
  }

  .section-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--ui-muted);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .commit-input {
    width: 100%;
    font-family: inherit;
    font-size: 11px;
    padding: 4px 6px;
    border: 1px solid var(--ui-border);
    background: var(--ui-bg);
    color: var(--ui-fg);
    resize: vertical;
    box-sizing: border-box;
    border-radius: 2px;
  }
  .commit-input:focus { outline: 1px solid var(--ui-focused); }

  .text-input {
    width: 100%;
    font-family: inherit;
    font-size: 11px;
    padding: 4px 6px;
    border: 1px solid var(--ui-border);
    background: var(--ui-bg);
    color: var(--ui-fg);
    box-sizing: border-box;
    border-radius: 2px;
  }
  .text-input:focus { outline: 1px solid var(--ui-focused); }

  .primary-btn {
    width: 100%;
    padding: 5px;
    font-size: 12px;
    font-weight: 600;
    background: var(--ui-accent, #0078d4);
    color: #fff;
    border: none;
    cursor: pointer;
    border-radius: 2px;
  }
  .primary-btn:hover:not(:disabled) { opacity: 0.88; }
  .primary-btn:disabled { opacity: 0.5; cursor: default; }

  .error-msg {
    font-size: 11px;
    color: var(--ui-error, #c0392b);
    background: color-mix(in srgb, var(--ui-error, #c0392b) 8%, transparent);
    padding: 4px 6px;
    border-radius: 2px;
    word-break: break-word;
  }

  .empty-msg, .loading-msg {
    font-size: 11px;
    color: var(--ui-muted);
    text-align: center;
    padding: 16px 0;
  }

  .hint {
    font-size: 10px;
    color: var(--ui-muted);
  }

  .log-body {
    padding: 0;
    gap: 0;
  }

  .log-toolbar {
    padding: 4px 8px;
    border-bottom: 1px solid var(--ui-border);
    flex-shrink: 0;
  }

  .log-pre {
    flex: 1;
    overflow: auto;
    margin: 0;
    padding: 6px 8px;
    font-family: "Cascadia Code", "Consolas", "Courier New", monospace;
    font-size: 11px;
    line-height: 1.55;
    color: var(--ui-fg);
    white-space: pre;
    min-height: 0;
  }

  :global(.lg-node) { color: #f0c040; font-weight: 700; }
  :global(.lg-pipe) { color: #5599cc; }
  :global(.lg-hash) { color: #c0a060; }
  :global(.lg-ref)  { color: #4caf70; }
  :global(.lg-head) { color: #e05050; font-weight: 700; }
  :global(.lg-tag)  { color: #cc88cc; }

  .wt-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 6px;
    border-bottom: 1px solid var(--ui-border-muted, var(--ui-border));
    gap: 4px;
  }
  .wt-row:last-child { border-bottom: none; }

  .wt-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow: hidden;
    flex: 1;
  }

  .wt-branch {
    font-size: 11px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wt-path {
    font-size: 10px;
    color: var(--ui-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wt-badge {
    font-size: 9px;
    padding: 1px 4px;
    background: var(--ui-accent, #0078d4);
    color: #fff;
    border-radius: 2px;
    align-self: flex-start;
  }

  .wt-actions {
    display: flex;
    gap: 3px;
    flex-shrink: 0;
  }

  .mini-btn.danger {
    color: var(--ui-error, #c0392b);
    border-color: var(--ui-error, #c0392b);
  }
  .mini-btn.danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ui-error, #c0392b) 12%, transparent);
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: var(--ui-fg);
    cursor: pointer;
    margin-top: 2px;
  }
</style>

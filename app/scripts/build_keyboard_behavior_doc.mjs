import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KEYMAP_ACTIONS, KEYMAP_DEFAULTS, STRINGS } from "../src/lib/ui_constants.ts";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const outPath = resolve(repoRoot, "docs", "ja", "KEYBOARD_BEHAVIOR_MAIN.ja.md");

const ja = STRINGS.ja || {};

const CATEGORY_ORDER = [
  "移動",
  "選択",
  "表示/フォーカス",
  "検索/履歴/ジャンプリスト",
  "ファイル操作",
  "ZIP",
  "外部アプリ",
  "その他",
];

/** @type {Record<string,string>} */
const ACTION_CATEGORY = {
  move_up: "移動",
  move_down: "移動",
  move_left: "移動",
  move_right: "移動",
  page_up: "移動",
  page_down: "移動",
  open: "移動",
  go_parent: "移動",
  refresh: "移動",

  select_toggle: "選択",
  select_all: "選択",
  clear_selection: "選択",

  focus_path: "表示/フォーカス",
  toggle_hidden: "表示/フォーカス",
  toggle_tree: "表示/フォーカス",
  toggle_size: "表示/フォーカス",
  toggle_time: "表示/フォーカス",
  sort_menu: "表示/フォーカス",

  search: "検索/履歴/ジャンプリスト",
  history_jump_list: "検索/履歴/ジャンプリスト",
  jump_add: "検索/履歴/ジャンプリスト",
  jump_add_url: "検索/履歴/ジャンプリスト",
  history: "検索/履歴/ジャンプリスト",

  copy: "ファイル操作",
  duplicate: "ファイル操作",
  prefix_date: "ファイル操作",
  cut: "ファイル操作",
  paste: "ファイル操作",
  delete: "ファイル操作",
  rename: "ファイル操作",
  new_file: "ファイル操作",
  properties: "ファイル操作",
  undo: "ファイル操作",
  redo: "ファイル操作",

  zip_create: "ZIP",
  zip_extract: "ZIP",

  open_explorer: "外部アプリ",
  open_cmd: "外部アプリ",
  open_terminal_cmd: "外部アプリ",
  open_terminal_powershell: "外部アプリ",
  open_terminal_wsl: "外部アプリ",
  open_vscode: "外部アプリ",
  open_git_client: "外部アプリ",

  settings: "その他",
  help_keymap: "その他",
  exit: "その他",
};

const focusSpecificRows = [
  ["共通（モーダル優先）", "貼り付け確認 / 削除確認 / URL追加 / ZIP / エラー表示中", "通常の一覧キー操作を停止", "オーバーレイ優先"],
  ["共通（ソートメニュー）", "Tab 以外のキー", "ソートメニューに委譲", "一覧側に流さない"],
  ["共通", "Tab", "フォーカス循環（一覧→PATH→ツリー→一覧）", "ツリー非表示時は一覧↔PATH"],
  ["共通", "Shift+Tab", "逆方向フォーカス循環", "一覧←PATH←ツリー←一覧"],
  ["PATH入力", "Enter", "PATH移動を実行", "実行後は一覧へフォーカス"],
  ["PATH入力", "Esc", "補完候補を閉じる / 入力破棄して一覧へ戻る", "候補表示中はまず候補を閉じる"],
  ["PATH入力", "ArrowDown", "履歴ドロップダウンを開く", "履歴が空なら no_items"],
  ["PATH入力", "Ctrl+Space", "PATH補完候補を前進", "ローカルパスのみ"],
  ["PATH入力", "Ctrl+Shift+Space", "PATH補完候補を後退", "ローカルパスのみ"],
  ["PATH入力", "\\ / ¥", "補完候補のディレクトリ確定 / 通常入力", "候補がない場合は `\\` を入力"],
  ["PATH入力", "Ctrl+Shift+O", "ジャンプリストを開く", "PATH入力中のみ許可"],
  ["PATH入力", "Ctrl+H", "履歴を開く", "PATH入力中のみ許可"],
  ["PATH入力", "Ctrl+Shift+D", "URLをジャンプリストに追加", "PATH入力中のみ許可"],
  ["一覧", "Space", "選択トグル + 次行へ移動", "一覧/本文フォーカス時"],
  ["一覧", "Delete", "削除確認を開く", "選択またはフォーカス項目対象"],
  ["一覧", "Searchキー", "検索バーを開く", "Windows-like: Ctrl+F"],
  ["ツリー", "Tab / Shift+Tab", "一覧 / PATH へフォーカス移動", "通常のツリー移動キーとは別の共通処理"],
];

const fallbackRows = [
  ["Ctrl+N", "新規ファイル作成を開く", "入力欄以外（オーバーレイなし）"],
  ["Ctrl+C", "コピー", "PATH入力中は無効"],
  ["Ctrl+X", "カット", "PATH入力中は無効"],
  ["Ctrl+V", "ペースト", "PATH入力中は無効"],
  ["Alt+D", "PATHへフォーカス", "一覧/ツリー/その他（オーバーレイなし）"],
  ["Ctrl+F", "検索を開く", "PATH入力中は無効"],
  ["Ctrl+H", "履歴を開く", "PATH入力中は許可 / 他入力欄では無効"],
  ["Ctrl+Shift+O", "ジャンプリストを開く", "PATH入力中は許可 / 他入力欄では無効"],
  ["Ctrl+D", "ジャンプリストに追加", "入力欄では無効"],
  ["Ctrl+Shift+D", "URLをジャンプリストに追加", "PATH入力中は許可 / 他入力欄では無効"],
  ["Ctrl+,", "設定ファイルを開く", "入力欄でも有効"],
  ["F1", "キー一覧を開く", "入力欄でも有効"],
  ["Alt+S", "ソートメニューを開く", "入力欄では無効"],
];

const categoryGroups = new Map(CATEGORY_ORDER.map((c) => [c, []]));
for (const action of KEYMAP_ACTIONS) {
  const id = action.id;
  const category = ACTION_CATEGORY[id] || "その他";
  const label = ja[action.labelKey] || action.labelKey;
  categoryGroups.get(category)?.push({
    id,
    label,
    windows: KEYMAP_DEFAULTS.windows?.[id] || "",
    vim: KEYMAP_DEFAULTS.vim?.[id] || "",
  });
}

const lines = [];
lines.push("# キー操作一覧（メイン画面 / モード別・フォーカス別）");
lines.push("");
lines.push("> 自動生成: `app/scripts/build_keyboard_behavior_doc.mjs`");
lines.push("");
lines.push("## 目的");
lines.push("- メイン画面のキー操作を、既定キーマップとフォーカス依存挙動を分けて確認できるようにする");
lines.push("- キー操作の大規模見直し時に、仕様差分の確認漏れを減らす");
lines.push("");
lines.push("## 優先順位（上から先に処理）");
lines.push("1. モーダル/オーバーレイ専用キー（確認ダイアログ、ソートメニュー、コンテキストメニュー等）");
lines.push("2. トップレベル直接フォールバック（WebView差異対策の基本ショートカット）");
lines.push("3. 通常のキーマップ処理（`matchesAction` ベース）");
lines.push("");
lines.push("## フォーカス別・モード別の固定挙動（メイン画面）");
lines.push("| 対象 | キー | 挙動 | 備考 |");
lines.push("| --- | --- | --- | --- |");
for (const [target, key, behavior, note] of focusSpecificRows) {
  lines.push(`| ${target} | ${key} | ${behavior} | ${note} |`);
}
lines.push("");
lines.push("## 直接フォールバック（WebView差異対策）");
lines.push("| キー | 挙動 | 境界条件 |");
lines.push("| --- | --- | --- |");
for (const [key, behavior, boundary] of fallbackRows) {
  lines.push(`| ${key} | ${behavior} | ${boundary} |`);
}
lines.push("");
lines.push("## 既定キーマップ（設定で変更可能）");
for (const category of CATEGORY_ORDER) {
  const rows = categoryGroups.get(category) || [];
  if (!rows.length) continue;
  lines.push(`### ${category}`);
  lines.push("| 操作ID | 操作名（ja） | Windows-like | Vim-like |");
  lines.push("| --- | --- | --- | --- |");
  for (const row of rows) {
    lines.push(`| \`${row.id}\` | ${row.label} | ${row.windows || "-"} | ${row.vim || "-"} |`);
  }
  lines.push("");
}
lines.push("## 注意点");
lines.push("- PATH補完/候補表示はローカルパスのみを対象とし、`gdrive://` は対象外。");
lines.push("- 本書はメイン画面のキー操作一覧であり、ReflexViewer（別ウィンドウ）のキー操作は含まない。");
lines.push("- 実装変更後は `npm run test:keys` を先に実行し、その後 `npm run build` と対象E2Eで確認する。");
lines.push("");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`[docs:keymap-main] wrote ${outPath}`);


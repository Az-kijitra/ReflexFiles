# メンテナンスガイド
更新日: 2026-02-20

## 対象と目的
このドキュメントは ReflexFiles の**保守担当者向け**です（エンドユーザー向けではありません）。
アーキテクチャの参照ポイント、日常的な開発運用、E2E テスト運用、CI 連携、リリース前チェックをまとめています。

## プロダクト概要
- 製品: ReflexFiles（Windows 向けファイルマネージャ）
- 技術スタック: Tauri v2 + SvelteKit + Rust
- バージョンの正本: `app/src-tauri/tauri.conf.json` の `version`
- アプリ識別子: `com.toshi.reflexfiles`

## リポジトリ構成（保守観点）
```text
ReflexFiles/
  app/
    src/                # Svelte UI
      routes/+page.svelte
      routes/viewer/+page.svelte
      lib/
        actions/
        components/
        effects/
        menus/
        utils/
        page_*.ts
        ui_*.ts
    src-tauri/          # Rust バックエンド / Tauri 配線
      src/
        main.rs
        bootstrap.rs
        *_cmds.rs
        fs_ops_*.rs
        config_*.rs
        viewer_cmds.rs
        watch.rs
        log.rs
      tauri.conf.json
    e2e/tauri/
      smoke.mjs
      viewer_flow.mjs
      settings_session.mjs
    scripts/
      sync_version.mjs
      build_manual.mjs
      e2e/
        run-tauri-selenium.mjs
        run-tauri-capability-selenium.mjs
        run-tauri-viewer-selenium.mjs
        run-tauri-settings-selenium.mjs
        run-tauri-suite-selenium.mjs
  docs/
    maintenance_guide.md
  docs/ja/
    maintenance_guide.ja.md  # このファイル
  .github/workflows/
    e2e-tauri.yml
```

## 主要エントリポイント
### フロントエンド
- メイン画面: `app/src/routes/+page.svelte`
- Viewer 画面: `app/src/routes/viewer/+page.svelte`
- UI 不具合の追跡順（推奨）:
  1. `app/src/routes/+page.svelte`
  2. `app/src/lib/actions/*`
  3. `app/src/lib/page_*`（配線・オーケストレーション）
  4. `app/src/lib/components/*`

### バックエンド（Rust）
- プロセス入口: `app/src-tauri/src/main.rs`
- 初期化/コマンド登録: `app/src-tauri/src/bootstrap.rs`
- コマンド境界: `app/src-tauri/src/*_cmds.rs`
- 実処理: `fs_query.rs`, `fs_ops_*.rs`, `external_apps.rs`, `clipboard.rs`, `viewer_cmds.rs`

## 設定ファイルと実行時データ
### ユーザー設定ルート
- `%APPDATA%\ReflexFIles\`（表記は `ReflexFIles`）

### 主なファイル
- 設定: `%APPDATA%\ReflexFIles\config.toml`
- 旧設定（移行対象）: `%APPDATA%\ReflexFIles\config.json`
- 履歴: `%APPDATA%\ReflexFIles\history.toml`
- ジャンプリスト: `%APPDATA%\ReflexFIles\jump_list.toml`
- Undo/Redo セッション（E2E でも参照）: `%APPDATA%\ReflexFIles\undo_redo_session.json`

## ビルド・実行手順
`app/` で実行:
1. 依存インストール
```bash
npm install
```
2. 開発起動
```bash
npm run tauri dev
```
3. 本番ビルド
```bash
npm run tauri build
```

## バージョン管理ルール
- 正本は `app/src-tauri/tauri.conf.json` の `version`。
- `npm run dev` / `npm run build` 実行時に `scripts/sync_version.mjs` が自動実行される。
- 同期対象:
  - `app/package.json` の version
  - `app/src-tauri/Cargo.toml` の package version

## マニュアルリソース生成
- `scripts/build_manual.mjs` がユーザーマニュアルの実行用リソースを生成。
- `npm run dev` / `npm run build` で自動実行。
- 出力先:
  - `app/static/`
  - `app/src-tauri/resources/`

## 自動E2Eテスト運用
### テストレイヤー
- `e2e:tauri` -> smoke（ファイル操作の基礎フロー）
- `e2e:capability` -> provider capability ガード（メニュー/コンテキスト/操作可否）
- `e2e:viewer` -> viewer フロー
- `e2e:settings` -> 設定保存・バックアップ/レポート・undo/redo
- `e2e:full` -> 総合スイート（`smoke` -> `capability_guard` -> `viewer_flow` -> `settings_session`）

### 実行コマンド
`app/` で実行:
```bash
npm run e2e:tauri
npm run e2e:capability
npm run e2e:viewer
npm run e2e:settings
npm run e2e:full
```

### ランナーの挙動と安定化
`app/scripts/e2e/run-tauri-selenium.mjs`:
- `tauri-driver` を起動
- 起動モードを選択
  - debug EXE が存在する場合: `existing-binary + vite-dev`
  - それ以外: `tauri dev`
- Windows では起動前に、このリポジトリ配下で残留した `vite dev`（node）プロセスを明示終了
- アプリ起動待機を実施
- Selenium シナリオを実行
- Windows で子プロセスを強制終了してハングを回避

## Provider Capability 制御
- 対象パスの provider capability 取得APIは `fs_get_capabilities`。
- フロントは currentPath の capability を保持し、以下を制御:
  - 空白コンテキストメニュー（`新規作成...` / `ペースト`）
  - Edit メニュー（`Paste`）
  - キーボード操作（`new_file` / `paste`）
- 選択項目ベースの操作（`copy/move/delete/rename/zip`）は引き続き `entry.capabilities` を使用。
- capability で拒否された操作は実行せず、`capability.not_available` を表示する。

### スイートサマリーと失敗分類
`app/scripts/e2e/run-tauri-suite-selenium.mjs` は以下を出力:
- スイート `summary.json`
- 失敗時の `failureOverview`
- ケースごとの `failureCategory`（例）:
  - `smoke_flow_failed`
  - `capability_guard_failed`
  - `viewer_flow_failed`
  - `settings_session_failed`
  - `runner_spawn_error`

### 成果物（スイート時はケース固定）
`app/` から実行した場合、成果物はリポジトリ直下に出力:
- 単体実行: `e2e_artifacts/<case>_<id>/...`
- スイート要約: `e2e_artifacts/suite_<timestamp>/summary.json`
- スイートケース別: `e2e_artifacts/suite_<timestamp>/cases/<case>/...`

## CI連携
ワークフロー:
- `.github/workflows/quality.yml`
- `.github/workflows/e2e-tauri.yml`

現行の分割運用:
- **Quality gate（PR/Push）**:
  - `npm run check`
  - `cargo check`
  - `cargo test`
- **Dependency audit（nightly/manual）**:
  - `npm run audit:deps`
- **Pull Request**（高速セット）:
  - `e2e:tauri` + `e2e:capability` + `e2e:viewer`
- `e2e:full` は GitHub Actions では実行しない。必要時に手動実行する。

E2E 高速ジョブの構成:
- `windows-latest` で実行
- Node + Rust + `tauri-driver` セットアップ
- 対応する `msedgedriver` を取得
- debug ビルド
- `e2e_artifacts/**` をアップロード

## テスト運用方針（優先順位と代替案提示）
基本原則:
- テストの目的は、アプリ品質を守ること。
- 「テストを通すこと」自体は最終目的ではない。
- 品質は必須だが、担保手段はテストだけに限定しない（設計境界、コードレビュー、ログ、運用ルールを併用する）。

運用方針:
- PR の必須チェックは、安定した品質ゲート（`quality`、`e2e_pr_quick`）に限定する。
- `e2e:full` は手動の回帰確認として扱い、マージブロッカーにはしない。
- 不具合対応の優先順位は「プロダクトリスクの修正」を先、テスト不安定化対応を後とする。

時間制限とエスカレーション:
- 同一カテゴリの E2E 失敗に対する試行錯誤が `45分` を超えたら、深追いを止めて代替案を提示する。
- 同一カテゴリの失敗が CI で `2回` 連続再現したら、即時に代替案を提示する。
- 代替案には必ず以下を含める:
  - 何を変更するか
  - 品質への影響/リスク
  - 推奨案

推奨される代替案:
1. 不安定なスイートを必須チェックから一時的に外し、監視運用に切り替える。
2. 不安定な E2E を統合テストへ分割し、短い手動受け入れチェックリストを併用する。
3. E2E 安定化までの間、対象機能のログ/診断/ガードを強化して品質を補完する。

## リリース事前検証（1コマンド）
`app/` で実行:
```bash
npm run release:precheck
```

このコマンドで実行される内容:
1. `npm run check`
2. `npm run e2e:full`
3. `npm run tauri build`
4. 最新 NSIS インストーラーの SHA256 生成

出力レポート:
- `docs/RELEASE_PRECHECK_LAST.md`

## 日常メンテナンスチェックリスト
1. 変更後の整合チェック
```bash
cd app
npm run check
```
2. 変更領域ごとのE2E実行
- Viewer 変更: `npm run e2e:viewer`
- 設定系変更: `npm run e2e:settings`
- ファイル操作変更: `npm run e2e:tauri`
3. マージ前/リリース候補前
- `npm run e2e:full`
- スイート `summary.json` 生成と全ケース PASS を確認
4. リリース公開前
- `npm run release:precheck`
- `docs/RELEASE_PRECHECK_LAST.md` を確認

## トラブルシュート
### `os error 5`（ReflexFiles.exe アクセス拒否）
症状:
- `failed to remove ... ReflexFiles.exe`

対応:
- 既存 ReflexFiles プロセスを終了
- E2E実行時に `E2E_TAURI_KILL_APP=1` を有効化

### スイート実行で `Port 1422 is already in use`
症状:
- 後続ケースで Vite ポート競合が発生し、アプリ起動に失敗する
対応:
- `E2E_TAURI_KILL_APP=1` を維持する
- `E2E_TAURI_KILL_VITE_DEV=1`（既定値）を維持する
- ランナーログで startup/shutdown のポートクリーンアップ行を確認する

### E2E がケース後に止まる
対応:
- ランナーログで以下を確認
  - `shutdown start...`
  - `shutdown complete.`
- スイート `summary.json` の `failureOverview` を確認
- ケース別成果物: `e2e_artifacts/suite_<timestamp>/cases/<case>/`

### UI セレクタ不一致で E2E が落ちる
対応:
- 現行 Svelte コンポーネントに対してセレクタを見直す
- 古い構造依存セレクタより安定クラス（例: `.list`, `.row .text`）を優先

### Tauri パッケージのバージョン不整合
症状:
- Rust crate と npm package の mismatch エラー

対応:
- 以下の major/minor を揃える
  - `app/src-tauri/Cargo.toml`（`tauri`）
  - `app/package.json`（`@tauri-apps/api`, `@tauri-apps/cli`）

## 変更時の実装ルール
- `*_cmds.rs` は薄く保ち、処理本体は実装モジュールへ寄せる。
- UIロジックは `actions/`、配線は `page_*` へ。
- 定数の直書きを避け、`ui_*.ts` / config モジュールへ集約。
- 設定互換性（既存ユーザー環境）をできるだけ維持する。

## 関連ドキュメント
- `docs/maintenance_guide.md`
- `docs/VIEWER_SPEC.md`
- `docs/ADR-0001-storage-provider-boundary.md`
- `docs/ja/ADR-0001-storage-provider-boundary.ja.md`
- `docs/THREAT_MODEL_GDRIVE_GATE0.md`
- `docs/ja/THREAT_MODEL_GDRIVE_GATE0.ja.md`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_0.2.0.md`
- `docs/RELEASE_BODY_0.2.0.md`
- `docs/CONTRIBUTING.md`
- `docs/SECURITY.md`

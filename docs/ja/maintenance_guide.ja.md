# メンテナンスガイド
更新日: 2026-02-15

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
- `e2e:viewer` -> viewer フロー
- `e2e:settings` -> 設定保存・バックアップ/レポート・undo/redo
- `e2e:full` -> 総合スイート（`smoke` -> `viewer_flow` -> `settings_session`）

### 実行コマンド
`app/` で実行:
```bash
npm run e2e:tauri
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
- アプリ起動待機を実施
- Selenium シナリオを実行
- Windows で子プロセスを強制終了してハングを回避

### スイートサマリーと失敗分類
`app/scripts/e2e/run-tauri-suite-selenium.mjs` は以下を出力:
- スイート `summary.json`
- 失敗時の `failureOverview`
- ケースごとの `failureCategory`（例）:
  - `smoke_flow_failed`
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
- `.github/workflows/e2e-tauri.yml`

現行の分割運用:
- **Pull Request**（高速セット）:
  - `e2e:tauri` + `e2e:viewer`
- **main/master への push と nightly**（フル）:
  - `e2e:full`

両ジョブ共通:
- `windows-latest` で実行
- Node + Rust + `tauri-driver` セットアップ
- 対応する `msedgedriver` を取得
- debug ビルド
- `e2e_artifacts/**` をアップロード

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
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_0.2.0.md`
- `docs/RELEASE_BODY_0.2.0.md`
- `docs/CONTRIBUTING.md`
- `docs/SECURITY.md`
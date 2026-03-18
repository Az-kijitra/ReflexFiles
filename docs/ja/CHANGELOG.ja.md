# 変更履歴

本ファイルは変更内容の要約を記録します。

形式は Keep a Changelog に準拠し、Semantic Versioning を採用します。
https://keepachangelog.com/ja/1.1.0/

## [Unreleased]

### 追加
- デュアルペインレイアウト: **F3** でシングル/デュアルペインを切替え、**Ctrl+Tab** でアクティブペインを切替え。各ペインが独立したパスで操作可能。

### 削除
- Selenium ベースの E2E テストスイート（`app/e2e/`、`app/scripts/e2e/`、`.github/workflows/e2e-tauri.yml`）を削除。シングルペイン前提で書かれており、デュアルペインレイアウトへの追従が未完了だったため。

### 修正
- `getPasteConflicts` がファイル名を大文字小文字を区別せず比較するよう修正（Windows向け）。
- `loadDir` の競合状態を `loadSeq` カウンターで解決し、古いディレクトリ応答を破棄するように修正。
- `watchRefreshTimer` のアンマウント時クリーンアップが欠落していた問題を修正。祖先パスの FS watch トリガーによる不要なリフレッシュも除去。
- `autofocus` ヘルパーが破棄時にペンディング中のタイマーをクリアするよう `destroy()` を返すように修正。

# ReflexFiles へのコントリビュート

貢献ありがとうございます。

## 貢献方法
1. リポジトリをフォークし、`main` からブランチを作成してください。
2. 変更は小さく、レビューしやすい単位でまとめてください。
3. テストやリンタが通ることを確認してください。
4. 変更内容と確認手順を明記して Pull Request を作成してください。

## PR本文テンプレート
PR 作成時は以下の構成を使ってください。
```md
## Summary
- この PR で何を変更したか

## Why
- この変更が必要な理由

## Changes
- 主な実装ポイント

## Verification
- [x] npm run test:keys（キー操作/フォーカス/ショートカット変更時）
- [x] npm run check
- [x] cargo test --manifest-path app/src-tauri/Cargo.toml --locked

## Risks and Rollback
- 既知のリスク
- ロールバック手順
```

### 記載例（Rust テスト修正）
- `StorageProvider` への `Debug` derive 追加と、`app/src-tauri/src/storage_provider.rs` のアサーション調整で Rust テストのコンパイルエラーを修正。
- 検証:
  - `cargo test --manifest-path app/src-tauri/Cargo.toml --locked`

## 開発手順（Windows）
```bash
cd app
npm install
npm run tauri dev
```

## テスト
```bash
cd app
npm run test:keys   # キー操作/フォーカス/ショートカット変更時に先に実行
npm run docs:keymap-main   # メイン画面キー操作一覧の生成ドキュメントを更新
npm run check
```

キー関連の変更時の推奨順序:
1. `npm run test:keys`（軽量・高速）
2. `npm run docs:keymap-main`（内部文書 `development_documents/ja/KEYBOARD_BEHAVIOR_MAIN.ja.md` を再生成）
3. `npm run build`

## コード品質
- 変更は目的を明確にし、影響範囲を最小化してください。
- UI と Rust の変更は意図を短く説明してください。

## Issue 報告
テンプレートがある場合は使用し、以下を含めてください。
- 期待結果と実際の挙動
- 再現手順
- ログやスクリーンショット（可能な範囲）

## 行動規範
`CODE_OF_CONDUCT.md` に同意した上で参加してください。

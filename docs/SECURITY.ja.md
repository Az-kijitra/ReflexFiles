# セキュリティポリシー

## 脆弱性の報告
セキュリティ上の問題を発見した場合は、公開 Issue に投稿せず、
GitHub Security Advisories またはメンテナへ非公開で連絡してください。

## 対象バージョン
最新リリースに対して修正を行います。

## 目標応答時間
- 初回応答: 7日以内
- ステータス更新: 14日以内

## 依存関係監査
依存関係の脆弱性チェックは、少なくとも以下のタイミングで実施します。
- リリース前
- 依存パッケージ更新時
- 定期（週1回以上）

実行手順（リポジトリルートから）:
```bash
cd app
npm run audit:npm
npm run audit:cargo
```

一括実行:
```bash
cd app
npm run audit:deps
```

`cargo audit` が未導入の場合:
```bash
cargo install cargo-audit
```

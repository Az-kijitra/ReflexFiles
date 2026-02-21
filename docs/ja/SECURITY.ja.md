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

## 外部Providerの基準（Google Drive）
- Gate 0 脅威モデル: `docs/ja/THREAT_MODEL_GDRIVE_GATE0.ja.md`
- Storage Provider ADR: `docs/ja/ADR-0001-storage-provider-boundary.ja.md`
- ユーザー自己設定ガイド: `docs/ja/GOOGLE_DRIVE_SELF_SETUP.ja.md`

## 資格情報の所有モデル（Google Drive）
- 開発時はメンテナ個人の Google Cloud プロジェクト利用を許可する。
- 公開GitHubリポジトリには、共有Google API資格情報を含めない。
- 次をコミット/公開しない:
  - API key
  - OAuth client secret
  - refresh token / access token
  - 資格情報を含む `.env` ファイル
- 配布物・リポジトリの既定状態は「資格情報なし」を維持する。
- 利用者は各自の Google Cloud プロジェクト/アカウントで OAuth client（`client_id`）を設定する。

## Google Drive 実装前セキュリティチェックリスト（Gate 0）
Google Drive 実装に着手する前に、以下をすべて満たすこと。

1. 認証フローとスコープ
- OAuth フローを Authorization Code + PKCE（`S256`）+ `state` 検証で固定化している。
- Redirect URI は許可リスト化された固定値のみを使用している。
- スコープは read-only のみ（write scope は有効化しない）。

2. トークン管理
- アクセストークン/リフレッシュトークンは OS 資格情報ストアのみに保存している。
- OAuth client secret（ユーザーが入力した場合）は OS 資格情報ストアのみに保存し、`config.toml` には保存しない。
- 設定ファイル・ログ・一時成果物への平文フォールバックがない。
- トークン期限切れ・更新時の挙動を文書化している。
- リポジトリとドキュメントにはプレースホルダのみを掲載し、実値を置かない。

3. ログ/診断の衛生
- 次をログ出力しない: access token, refresh token, auth code, client secret, 生の ID token。
- 診断出力は export/upload 前にマスキングする。
- セキュリティ試験でログ/成果物に token-like 文字列が含まれないことを確認する。

4. セキュリティゲート証跡
- `npm run audit:deps` で High/Critical 未解決 0 件。
- 脅威モデルレビューで High/Critical 未解決 0 件。
- PR 必須チェック（`quality`, `e2e_pr_quick`）が成功している。

## 実装着手の停止ルール（Google Drive）
- 脅威モデル・依存監査・セキュリティレビューのいずれかで High/Critical が未解決なら、実装着手を停止する。
- 上記チェックリストの必須項目が1つでも未達なら、実装着手を停止する。
- 例外運用は、メンテナ承認と期限付きの緩和計画を文書化した場合に限る。
- PRに実際のGoogle資格情報が含まれていた場合はマージ禁止とし、資格情報をローテーションする。

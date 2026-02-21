# ADR-0002: Googleドライブ OAuth セキュリティ基準（Read-Only First）
更新日: 2026-02-21
ステータス: 承認済み
担当: ReflexFiles maintainers

## 背景
ReflexFiles では ADR-0001 により Provider 境界を導入し、Gate 0 脅威モデルも整備済みです。
次に実Googleドライブ API 統合へ進む前に、実装に先立って固定すべきセキュリティルールを明文化します。

基準を固定しないまま実装を進めると、以下のリスクがあります。
- ログ/診断へのトークン漏えい
- read-only から write 権限へのスコープ逸脱
- 認証失敗時の回復挙動の不統一
- フロント/バックエンド境界での不整合

## 決定
Googleドライブ OAuth とトークン管理について、以下を必須基準とする。

### 1. OAuth フロー
- OAuth 2.0 Authorization Code + PKCE（`S256`）のみを使用する。
- コールバック時に `state` 検証を必須とする。
- 有効な認証セッション情報と一致しないコールバックは拒否する。

### 2. スコープ方針（最小権限）
- 初期導入は read-only スコープに限定する。
- 初期許可スコープ:
  - `https://www.googleapis.com/auth/drive.readonly`
- write 可能なスコープは、別ADRとセキュリティレビュー承認なしに導入しない。

### 3. トークン保存方針
- access/refresh token を平文設定ファイルへ保存しない。
- refresh token は OS 保護の資格情報ストアにのみ保存する。
- access token はメモリ保持とし、必要時に再取得する。
- セキュアストアが使えない場合は fail closed（非安全な代替へフォールバックしない）。

### 4. ログ/診断方針
- 以下をログ出力しない:
  - OAuth authorization code
  - access token
  - refresh token
  - 生の `Authorization` ヘッダ
- 診断レポート出力時は秘密情報候補をマスクする。
- 代わりに以下を残して調査可能性を確保する:
  - provider id
  - operation class
  - error category/code
  - correlation id

### 5. 障害時の回復方針
- gdrive 認証障害が発生しても local provider の機能をブロックしない。
- token refresh 失敗時:
  - gdrive セッションを無効化
  - 明示的な再認証を要求
  - ユーザー向けに明確なエラーを返す
- リトライ方針:
  - 回数上限あり
  - タイムアウト必須
  - 無限ループ禁止

### 6. 品質ゲート方針
- PR 必須チェックは安定ゲート（`quality`, `e2e_pr_quick`）を維持する。
- `e2e:full` は手動の回帰確認として運用する（非ブロッカー）。
- セキュリティ重要挙動は以下で検証する:
  - ユニット/統合テスト
  - 必要に応じた対象E2E
  - 手動ネガティブチェックの明文化

### 7. 資格情報の所有と公開方針
- 開発時はメンテナ個人の Google Cloud 利用を許可する。
- 公開GitHubリポジトリには実際の Google API 資格情報を含めない。
- ユーザー運用は BYO（各自の Google Cloud クライアント設定）を前提とする。
- 公式セットアップ手順:
  - `docs/GOOGLE_DRIVE_SELF_SETUP.md`
  - `docs/ja/GOOGLE_DRIVE_SELF_SETUP.ja.md`

## 影響
利点:
- API 統合前に監査可能なセキュリティ基準を固定できる
- 秘密情報漏えいと権限逸脱のリスクを低減できる
- テスト不安定性とプロダクト品質リスクを分離して判断できる

トレードオフ:
- 一部の実装近道は意図的に禁止される
- 本番導入前にセキュアストア実装が必須になる

## 検討した代替案
1. 試作速度優先で平文トークン保存を一時許容する。
- 却下: 漏えいリスクが高く、受容不可。

2. 初期から広い Drive スコープを取り、後で絞る。
- 却下: 最小権限原則に反する。

3. `e2e:full` を PR 必須ブロッカーにする。
- 却下: 不安定要因で開発速度を過度に阻害する。

## 実装計画
1. 認証セッション状態モデルと callback 検証器を定義する。
2. Provider 境界でセキュアトークンストア抽象を導入する。
3. read-only スコープ固定と非許可スコープ拒否を実装する。
4. ログ/診断のマスキング層を追加する。
5. 障害分類（auth/session/network/rate limit）とユーザー向け文言を整備する。
6. Gate 1 レビュー向けのテスト証跡と手動チェックリストを作成する。

## 実装状況（2026-02-21 時点）
- 完了:
  - 認証セッション状態モデル + callback 検証（`state` 検証、PKCE verifier 取り扱い）
  - セキュアトークンストア抽象（`GdriveTokenStore`）
  - Windows セキュア保存バックエンド（Credential Manager、`windows-credential-manager`）
  - 非対応プラットフォームでの fail closed 既定動作
  - read-only スコープ許可リスト強制
- 残タスク:
  - ログ/診断の構造化マスキング層
  - 障害分類の強化とユーザー向け文言整備
  - Gate 1 セキュリティチェックリストとレビュー証跡の整備

## 受け入れ条件
- OAuth が Authorization Code + PKCE で実装され、`state` 検証があること。
- ログ/診断/設定ファイルに平文トークンが出力されないこと。
- read-only スコープ制約がコードと設定で強制されること。
- gdrive 認証障害時も local provider 操作が継続できること。
- Gate 1 進行前にメンテナのセキュリティレビューで承認されること。

## レビュー決定
- 2026-02-21 にメンテナレビューを実施。
- 決定: 実Googleドライブ API 統合前の必須基準として承認。

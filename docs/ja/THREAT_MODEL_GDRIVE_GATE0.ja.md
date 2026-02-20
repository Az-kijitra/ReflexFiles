# Google Drive Gate 0 脅威モデル
更新日: 2026-02-19
ステータス: レビュー用ドラフト
担当: ReflexFiles maintainers

## 対象範囲
この文書は、ReflexFiles で Google Drive 連携を有効化する前に満たすべき最低限のセキュリティ基準を定義します。
対象は Gate 0 から Gate 1（設計と内部検証）です。

対象:
- OAuth サインイン（Authorization Code + PKCE）
- アクセストークン / リフレッシュトークンの扱い
- read-only のメタデータ取得とファイル参照
- ログ、診断出力、テレメトリ
- CI の依存監査と秘密情報衛生

対象外:
- 書き込み操作（アップロード、リネーム、削除）
- 共有ドライブ管理ポリシー
- 企業向け SSO カスタマイズ

## 資産とセキュリティ目標
重要資産:
- OAuth クライアント設定
- アクセストークン
- リフレッシュトークン
- Google Drive 上のユーザーファイル情報

セキュリティ目標:
- 機密性: トークン値とユーザーデータを漏えいさせない。
- 完全性: 認証済みアカウントと許可スコープ内でのみ操作する。
- 可用性: 外部連携失敗でローカル機能を巻き込んで停止させない。
- 監査可能性: 秘密情報を含まずに追跡可能な記録を残す。

## 信頼境界
1. ReflexFiles UI <-> Tauri バックエンドのコマンド境界
2. Tauri バックエンド <-> OS 資格情報ストア
3. Tauri バックエンド <-> Google OAuth / Drive API
4. アプリ実行環境 <-> CI ログ / 成果物アップロード

## 脅威列挙（STRIDE）
### S: なりすまし（Spoofing）
- 脅威: OAuth コールバック URI の乗っ取り。
- 対策:
  - PKCE（`S256`）を必須化。
  - コールバックで `state` / `nonce` を検証。
  - リダイレクト URI は許可済み固定値のみ使用。

### T: 改ざん（Tampering）
- 脅威: provider/path の改ざんにより意図しないローカルアクセスが発生。
- 対策:
  - 内部識別子は `ResourceRef` を正本として扱う。
  - provider は allowlist（`local` / `gdrive`）で検証。
  - 未対応 provider は明示エラーで拒否。

### R: 否認（Repudiation）
- 脅威: 秘密情報を出さずに不正利用を追跡できない。
- 対策:
  - ログはイベント分類、相関ID、provider に限定。
  - トークン値、認可コード、PII をログ禁止。
  - E2E/CI 成果物に failure category を保持。

### I: 情報漏えい（Information Disclosure）
- 脅威: ログ、設定、クラッシュ成果物からトークン/PII が漏れる。
- 対策:
  - トークンは OS 資格情報ストアのみに保存。
  - 診断レポート書き出し前に機微情報をマスキング。
  - セキュリティ試験でトークンパターン漏えい検査を実施。

### D: サービス不能（Denial of Service）
- 脅威: 外部 API 障害でアプリ全体が停止。
- 対策:
  - API 呼び出しに timeout と上限付き retry を設定。
  - gdrive 障害をローカルFS処理と分離。
  - UI デッドロックを避け、利用者向けエラーを表示。

### E: 権限昇格（Elevation of Privilege）
- 脅威: セキュリティゲート前に write 権限へ拡大。
- 対策:
  - 初期は read-only scope 限定。
  - write scope は別 ADR と別セキュリティ審査を必須化。
  - capability により UI と backend 両方で write 操作を無効化。

## 必須コントロール（Gate 0 終了条件）
1. Provider 境界 ADR が承認済み（`docs/ADR-0001-storage-provider-boundary.md`）。
2. OAuth フローが Authorization Code + PKCE + `state` 検証で固定化されている。
3. トークン保存先が OS 資格情報ストアのみ（平文設定へのフォールバック禁止）。
4. 秘密情報を出さないログ方針が実装・検証されている。
5. 依存監査（`npm run audit:deps`）で High/Critical 未解決 0 件。
6. capability 制御と provider 拒否の回帰試験が存在する。

## 検証計画
Gate 1 へ進む前に次の証跡を必須とする。
1. セキュリティ設計レビューのチェックリスト承認。
2. テスト証跡:
  - `npm run check`
  - `cargo check --manifest-path app/src-tauri/Cargo.toml --locked`
  - `cargo test --manifest-path app/src-tauri/Cargo.toml --locked`
  - `npm run e2e:capability`
  - `npm run e2e:full`
3. 手動ネガティブ試験:
  - 不正な callback `state` を拒否できる
  - ログ/成果物にトークン形式文字列が出力されない
  - 未対応 provider で明示エラーとなりローカル副作用がない

## 残課題
- リフレッシュトークンのローテーション戦略は未確定。
- 外部 provider 障害時の運用ランブックが未作成。
- write scope 解放前（Gate 3）に再レビューが必要。

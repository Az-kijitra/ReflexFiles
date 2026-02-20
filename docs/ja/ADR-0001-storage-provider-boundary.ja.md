# ADR-0001: 外部ストレージ統合のための Storage Provider 境界
更新日: 2026-02-19
ステータス: 提案中
担当: ReflexFiles maintainers

## 背景
ReflexFiles は現在、コマンド境界・DTO境界でローカルパス文字列を前提にしています。
このまま Googleドライブ統合を行うと、以下のリスクが高いです。
- パス文字列が UI 表示と内部識別子を兼務している
- コマンドモジュールがローカルFSの前提に強く依存している
- プロバイダ固有のセキュリティ要件やエラー処理を分離できない

Pre-Feature Gate の P0-4 では、Googleドライブ実装前に Provider 境界の導入が必須です。

## 決定
バックエンドおよびDTO層に Storage Provider 境界を導入し、まず local provider で移行を完了する。

### 1. 内部識別子の導入
内部の正本キーは raw path ではなく provider スコープの識別子を使う。

```text
ResourceRef {
  provider: "local" | "gdrive" | <future>,
  resource_id: string
}
```

- `resource_id` は provider ネイティブ値（local は正規化済み絶対パス）
- UI表示パスとは分離する

### 2. 表示パスの分離
ユーザー表示用のパスは display 専用フィールドとして扱う。

```text
EntryView {
  ref: ResourceRef,
  display_path: string,
  name: string,
  ...
}
```

- `gdrive://...` は表示形式であり、内部実行キーではない
- 実コマンド処理は `ref` を使用する

### 3. Provider インターフェース
Rust で provider 契約（trait）と registry を定義する。

```text
StorageProvider
  list(ref, options) -> entries
  stat(ref) -> metadata
  read_text(ref, options)
  read_image(ref, options)
  open_ref(ref)
  ... (capability で制御)
```

- `ProviderRegistry` が `ref.provider` で実装を解決
- まず local provider を実装
- Google Drive provider は同一契約に従う

### 4. capability による操作制御
プロバイダごとに操作可能性を宣言する。

例:
- `can_write`
- `can_delete`
- `can_rename`
- `can_download`

UI側は capability を確認して操作の有効/無効を決定する。

### 5. 互換移行方針
段階移行で互換を維持する。
- Stage A: 既存 path 入力は `ResourceRef(local, normalized_path)` へ適応
- Stage B: 内部処理を `ResourceRef` 優先へ移行
- Stage C: 移行完了後に path-only 入力を廃止

### 6. 外部Providerのセキュリティ基準
Google Drive 初期導入では以下を必須とする。
- read-only scope から開始
- OAuth 2.0 Authorization Code + PKCE
- トークン値のログ出力禁止
- トークン保存は OS 資格情報ストア（平文設定ファイル禁止）

## 影響
利点:
- provider固有ロジックと障害の分離が可能
- 既存ローカル機能の回帰リスクを低減
- capability による段階公開が可能

トレードオフ:
- コマンド/DTO境界の初期リファクタ工数が増える
- 移行期間中は互換層の複雑性が一時的に増える

## 検討した代替案
1. path-only を維持し `gdrive://` プレフィックス分岐で対応
- 却下: 表示と内部識別が混在し、品質・セキュリティリスクが高い

2. 既存ローカルコマンドに Google Drive を直接実装
- 却下: 結合が強く、試験・ロールバックが困難

## 実装計画（ゲート連動）
1. DTOに `ResourceRef` / provider フィールドを追加
2. provider registry と local provider を実装
3. 主要コマンドを provider 契約経由へ置換（local で同等動作）
4. 既存E2E（`e2e:tauri`, `e2e:viewer`, `e2e:settings`）で回帰なしを確認
5. provider 契約テストを追加
6. Google Drive read-only を feature flag で導入

## 受け入れ条件
- local provider のみで既存E2Eが通過する
- 既存 path 入力は互換層で吸収される
- セキュリティレビューでトークン漏えいがない
- Gate 0 の脅威モデル文書がレビュー済みである（`docs/ja/THREAT_MODEL_GDRIVE_GATE0.ja.md`）
- Google Drive 本実装マージ前にこのADRが承認される

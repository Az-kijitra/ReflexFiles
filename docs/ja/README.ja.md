# ReflexFiles

ReflexFiles は Windows 向けのキーボード操作に最適化されたファイルマネージャです。
Tauri + SvelteKit で構成されています。

**重要:** 本アプリケーションは現在も開発途上であり、十分なテストが完了していません。
利用は自己責任でお願いします。

## 主な機能
- 複数列のファイル一覧とツリービュー
- 高速なキーボード操作とキーマップのカスタマイズ
- 検索（部分一致 / 正規表現）
- コピー / 移動 / 削除 / リネーム / 新規作成
- ZIP 作成 / 解凍
- ジャンプリスト / 履歴

## 開発要件
- Windows 10/11
- Node.js（LTS 推奨）
- Rust（stable）
- Tauri の前提ツール

## クイックスタート（開発）
```bash
cd app
npm install
npm run tauri dev
```

## ビルド
```bash
cd app
npm run tauri build
```

## E2E（Tauri）
~~~bash
cd app
npm run e2e:tauri    # smoke
npm run e2e:viewer   # viewer flow
npm run e2e:settings # settings + backup/report + undo/redo session
npm run e2e:full     # 総合スイート（上記を順番に実行）
~~~

## 依存関係監査
```bash
cd app
npm run audit:deps
```

個別実行:
```bash
npm run audit:npm
npm run audit:cargo
```

## ドキュメント
- ユーザーマニュアル: `user_manual.md`
- メンテナンスガイド（日本語）: `docs/ja/maintenance_guide.ja.md`
- メンテナンスガイド（英語）: `docs/maintenance_guide.md`
- ターミナル固定プロファイル（`Ctrl+Alt+1/2/3`）の設定手順は `docs/ja/user_manual.ja.md` を参照してください。

## コントリビュート
`CONTRIBUTING.md` を参照してください。

## セキュリティ
`SECURITY.md` を参照してください。

## ライセンス
MIT。`LICENSE` を参照してください。

## AI生成コードに関する注記
このリポジトリのコードは、人間の指示に基づき AI によって生成されています。
人間は指示とレビューのみを行いました。
AI を使用しているため、コードの一部または全部が著作権保護の対象外となる可能性があります。

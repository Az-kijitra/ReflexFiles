ReflexFiles v0.3.0 では、Google Drive の段階実装、キー操作の復旧・改善、リリース運用の強化を実施しました。

## 主な更新
- Google Drive 段階対応（`gdrive://`）を追加（ユーザー自身の Google Cloud / OAuth 設定フロー）。
- Google Drive の一覧取得/閲覧、ローカル作業コピーを使う外部アプリ連携、競合を考慮した手動書き戻しに対応。
- キー操作・操作性の改善:
  - `Ctrl+N` = 新規ファイル作成
  - `Ctrl+Shift+N` = 新規フォルダ作成
  - `Ctrl+F` / `F2` / `Ctrl+Alt+Z` / `Ctrl+Alt+X` の復旧・強化
  - PATH補完の候補循環・確定挙動の改善
- ZIP解凍UIをキーボード操作しやすく改善（衝突時のみ確認）。
- 軽量キー回帰テスト（`npm run test:keys`）をCI品質チェックに追加。

## インストーラー
- `ReflexFiles_0.3.0_x64-setup.exe`
- SHA256: `TBD（リリースビルド後に記入）`

## 補足
- 対応OS: Windows 10/11
- 公開ドキュメント（`docs/`）と内部作業記録（`development_documents/`）を分離。
- Google Drive の資格情報（client secret / token）はローカル管理前提で、Git にコミットしないでください。
- 問題があれば、再現手順付きで Issue をお願いします。

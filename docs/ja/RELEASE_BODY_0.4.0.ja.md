ReflexFiles v0.4.0 では、ローカル限定ドラッグ&ドロップの正式採用、キー操作の安定化、品質ゲートの強化を実施しました。

## 主な更新
- ローカル限定ドラッグ&ドロップを正式採用:
  - `Explorer -> ReflexFiles` のドラッグ取り込み
  - `ReflexFiles -> Explorer` の `Ctrl+Alt + 左クリック` によるドラッグ転送（コピーのみ）
  - Google Drive のドラッグ&ドロップは非対応を維持
- キー操作 / PATH補完の品質改善:
  - 主要ショートカットの回帰検出を強化
  - モーダル/オーバーレイ中のショートカット漏れを修正
  - PATH補完の候補表示・取消・ステータスの見やすさを改善
  - PATH補完中の `Enter` の挙動を仕様として固定
- 品質 / リリース運用の改善:
  - `npm run test:dnd` を CI `quality` に追加
  - smoke E2E のショートカット確認を拡張
  - `npm audit --audit-level=high` が通るよう lockfile を更新

## インストーラー
- `ReflexFIles_0.4.0_x64-setup.exe`
- SHA256: `C3E26197CAE3642E2BD168092FA7A6B2F3E420B9B0529E2A07A212ACC6C86A25`

## 補足
- 対応OS: Windows 10/11
- ドラッグ&ドロップはローカル限定です。
- 書き出しはコピーのみです。
- Google Drive のドラッグ&ドロップは非対応です。
- 問題があれば、再現手順付きで Issue をお願いします。

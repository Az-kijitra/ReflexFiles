# ReflexViewer 仕様メモ

## 対象
- ReflexFiles から起動される内蔵ビューア `ReflexViewer`。
- Windows デスクトップ利用を前提とする。

## 起動ルール（ファイル一覧）
- `Enter`:
  - フォルダ: フォルダへ移動。
  - ファイル:
    - 対応拡張子（`md/markdown/png/jpg/jpeg/bmp/txt/log/json/c/h/cpp/cc/cxx/hpp/hh/hxx/rs/js/ts/py`）は ReflexViewer で表示。
    - 非対応拡張子でも、先頭サンプル判定でテキストと判断された場合は ReflexViewer で表示。
    - それ以外は OS 関連付けアプリで開く。
- `Shift+Enter`:
  - ファイルを常に OS 関連付けアプリで開く（ReflexViewerを使わない）。

## 表示モード
- テキスト/ソース:
  - 固定幅フォント表示。
  - 行番号表示。
  - 対応言語はシンタックスハイライト表示（C/C++/Rust/JavaScript/TypeScript/Python/JSON/Markdown）。
- Markdown:
  - 初期表示は HTML レンダリング。
  - 画面内トグルで `HTML` / `Text` を切替可能。
  - `Text` 表示時も行番号表示。
- 画像:
  - `png/jpg/jpeg/bmp` を表示。
  - ズーム（Fit/100%/200%、ホイール拡大縮小）とドラッグスクロール対応。

## ヘルプ連携
- 「ユーザーマニュアル」: `user_manual.md` を ReflexViewer で開く。
- 「キー一覧」: 同じ `user_manual.md` を ReflexViewer で開き、キー操作見出しへジャンプする。
  - 見出しの日本語/英語表記揺れを吸収するため、本文見出しテキストを走査して一致候補へスクロールする。

## 終了・キー
- `Esc`: Viewer を閉じる。
- `Ctrl+Q`: Viewer を閉じる。

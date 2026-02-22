# ReflexFiles ユーザーマニュアル

## このアプリの概要
ReflexFiles は、キーボード操作に最適化された Windows 向けファイルマネージャです。
複数列表示のファイル一覧とツリービューを使い、移動・検索・コピー・圧縮などの操作を高速に行えます。

---

## インストール / アンインストール
### インストール
配布形式により手順が異なります。
- **ZIP 配布の場合**: ZIP を任意のフォルダに解凍し、`ReflexFiles.exe` を実行します。
- **インストーラー配布の場合**: セットアップを実行し、画面の指示に従ってインストールします。

### アンインストール
- **ZIP 配布の場合**: アプリを終了し、配置したフォルダを削除します。
- **インストーラー配布の場合**: 「アプリと機能」からアンインストールします。
- 設定や履歴も削除する場合は、`%APPDATA%\\ReflexFIles\\` を削除してください。

---

## 画面構成
1. **メニューバー**
2. **PATH バー**
3. **ツリービュー（左パネル）**
4. **ファイル一覧（複数列表示）**
5. **ステータスバー**

---

## 初めての使い方（3分で分かる）
1. **起動**
   - `ReflexFiles.exe` を実行します。
2. **移動**
   - 矢印キーで移動し、**Enter** でフォルダへ入ります。
3. **PATH で移動**
   - PATH バーにフォルダを入力し **Enter** で移動します。
4. **検索**
   - **Ctrl+F** で Search バーを表示し、文字列を入力します。
5. **コピー / ペースト**
   - **Ctrl+C** でコピー、**Ctrl+V** でペーストします。
6. **よく使う場所を登録**
   - **Ctrl+D** でジャンプリストに追加し、**Ctrl+Shift+O** で開きます。
7. **フォルダ履歴**
   - **Ctrl+H** でフォルダの履歴を開きます。

---

## 基本的な使い方
### 移動と開く
- **上下左右**でカーソル移動
- **Enter** で開く
  - フォルダ: そのフォルダに移動
  - ファイル: ReflexViewer 対応拡張子、または拡張子に関係なく中身がテキストと判定された場合は ReflexViewer で表示
  - 上記以外のファイル: OS の関連付けアプリで開く
- **Shift+Enter** で開く（ファイルを常に OS の関連付けアプリで開く）
- **Backspace** で親フォルダへ移動

### 選択
- **Space** で選択トグル（トグル後に次行へ移動）
- **Ctrl+A** で全選択
- **Esc** で選択解除

### PATH バー
- 直接入力して **Enter** で移動
- **Esc** で補完候補を閉じる（候補表示中）/ 入力を破棄して一覧へ戻る
- **Ctrl+Space / Ctrl+Shift+Space** で補完候補を前進 / 後退（PATH 入力時）
- 補完候補表示中に **\\ / ¥** を入力すると、現在候補のディレクトリを確定して続けて入力できます
- **Tab / Shift+Tab** でフォーカス移動（ファイル一覧 → PATH → ツリー → 一覧）
- **Ctrl+Shift+O / Ctrl+H** でジャンプリスト / 履歴を表示
- PATH補完および候補表示は、**ローカルファイルシステムのパスのみ**を対象とします。
- `gdrive://` パスは PATH補完/候補表示の対象外です。
- Google Drive で実用的に運用する場合は、Google Drive のローカル同期クライアントを併用し、同期済みローカルフォルダを ReflexFiles で操作してください。

---

## ReflexViewer（プレビュー / コード表示）
ReflexFiles からファイルを開くと、対応ファイルは ReflexViewer で表示されます。
- ビューアーのタイトルには、開いているファイル名が表示されます。
- 未対応形式や読み取り失敗時は、クラッシュせずにエラー表示になります。

### 主な表示モード
- **Markdown Preview**: Markdown を整形済み HTML として表示
- **Text（Markdown Source）**: Markdown のソース表示（シンタックス色分け対応）
- **Source Code Highlight**: C/C++/Rust/JavaScript/TypeScript/Python/JSON などの色分け表示
- **Image Viewer**: PNG/JPEG/BMP を表示（拡大縮小・パン対応）
  - ズームプリセット: **Fit / 100% / 200%**
  - ズームインジケータで現在の倍率/モードを表示

### 基本操作（ビューアー）
- **Esc**: ビューアーを閉じる
- **Ctrl+Q**: ビューアーを閉じる
- **Alt+Left / Alt+Right**: 同じフォルダ内の前/次ファイルへ移動
- **Ctrl+PageUp / Ctrl+PageDown**: 同じフォルダ内の前/次ファイルへ移動
- **Prev / Next ボタン**: 同じフォルダ内の前/次ファイルへ移動
- **位置表示**: 現在位置 / 総数（例: `2 / 3`）を表示
- **Ctrl+O**: ファイルを選択して開く
- **Ctrl+F**: 検索パネルを開く（テキスト/Markdown）
- **Ctrl + ホイール / Ctrl+Plus / Ctrl+Minus / Ctrl+0**: 拡大縮小（画像表示、または Markdown HTML 表示）
- **Ctrl+Shift+1 / Ctrl+Shift+2 / Ctrl+Shift+3**: 大容量テキストのプリフェッチ設定（Fast / Balanced / Memory）


---

## 機能一覧（詳細）
- **ツリービュー**
  - クリック / キーボードで展開・移動
  - ファイル一覧と連動
  - 表示/非表示の切り替え（View メニュー / Ctrl+Shift+B）
- **検索**
  - **Ctrl+F** で Search バーを表示
  - 部分一致 / 正規表現（Regex）
- **履歴 / ジャンプリスト**
  - 履歴: 過去に訪れたパス
  - ジャンプリスト: 任意のパスを登録
  - URL もジャンプリストに登録可能
- **ファイル操作**
  - コピー / カット / ペースト
  - 削除（ゴミ箱）
  - リネーム
  - 新規作成（ファイル/フォルダ）
  - 複製
  - 日付プレフィックス付与
- **ZIP**
  - ZIP 作成
  - ZIP 解凍
- **ソート**
  - ソートメニューから選択
- **外部アプリ起動**
  - エクスプローラー / ターミナル / VS Code / Git クライアント
  - ユーザー定義の外部アプリ
- **アンドゥ / リドゥ**
  - 直前の操作を元に戻す / やり直す（対応操作のみ）
- **ヘルプ**
  - キー一覧（ReflexViewer で表示、キー操作セクションへジャンプ）
  - ユーザーマニュアル（ReflexViewer で表示）
  - About（URL / ライセンス / ロゴ）

---

## キー操作（既定）
キーバインドは `input_keymap_profile` によって切り替わります。  
以下は **Windows-like** の既定です。Vim-like は設定で切替可能です。

### Windows-like（既定）
| カテゴリ | 操作 | キー |
| --- | --- | --- |
| 移動 | 上/下/左/右 | Up / Down / Left / Right |
| 移動 | ページ移動 | PageUp / PageDown |
| 操作 | 元に戻す | Ctrl+Z |
| 操作 | やり直し | Ctrl+Y |
| 選択 | 選択トグル | Space |
| 選択 | 全選択 | Ctrl+A |
| 選択 | 選択解除 | Esc |
| 操作 | 開く | Enter |
| 操作 | 関連付けアプリで開く（強制） | Shift+Enter |
| 操作 | 親フォルダへ | Alt+Up / Backspace |
| 操作 | 検索 | Ctrl+F |
| 操作 | 更新 | F5 |
| 操作 | プロパティ | Alt+Enter |
| 操作 | 設定ファイルを開く | Ctrl+, |
| 操作 | 終了 | Ctrl+Q |
| 表示 | ツリービュー表示切替 | Ctrl+Shift+B |
| 表示 | 隠しファイル切替 | Ctrl+Shift+H |
| 表示 | サイズ列切替 | Ctrl+Shift+S |
| 表示 | 時刻列切替 | Ctrl+Shift+T |
| 操作 | ソートメニュー | Alt+S |
| 操作 | PATHへフォーカス | Alt+D |
| 操作 | フォーカス移動（一覧/パス/ツリー） | Tab / Shift+Tab |
| 操作 | PATH補完 | Ctrl+Space / Ctrl+Shift+Space |
| 操作 | キー一覧 | F1 |
| 履歴 | 履歴を表示 | Ctrl+H |
| ジャンプリスト | ジャンプリストを表示 | Ctrl+Shift+O |
| ジャンプリスト | ジャンプリストに追加 | Ctrl+D |
| ジャンプリスト | URLをジャンプリストに追加 | Ctrl+Shift+D |
| ファイル | コピー | Ctrl+C |
| ファイル | カット | Ctrl+X |
| ファイル | ペースト | Ctrl+V |
| ファイル | 削除 | Delete |
| ファイル | リネーム | F2 |
| ファイル | 新規ファイル作成 | Ctrl+N |
| ファイル | 新規フォルダ作成 | Ctrl+Shift+N |
| ファイル | 複製 | Ctrl+Shift+C |
| ファイル | 日付プレフィックス | Ctrl+Alt+D |
| ZIP | ZIP 作成 | Ctrl+Alt+Z |
| ZIP | ZIP 解凍 | Ctrl+Alt+X |
| 外部アプリ | エクスプローラーで開く | Ctrl+Alt+E |
| 外部アプリ | ターミナルで開く（既定プロファイル） | Ctrl+Alt+C |
| 外部アプリ | CMD プロファイルで開く | Ctrl+Alt+1 |
| 外部アプリ | PowerShell プロファイルで開く | Ctrl+Alt+2 |
| 外部アプリ | WSL プロファイルで開く | Ctrl+Alt+3 |
| 外部アプリ | VS Code で開く | Ctrl+Alt+V |
| 外部アプリ | Git クライアントで開く | Ctrl+Alt+Shift+G |

> キーは設定ファイルで変更可能です。

---

## 設定ファイルの編集方法
設定は UI ではなく **設定ファイル編集**で行います。
ファイルメニューの「設定」または **Ctrl+,** で `config.toml` を開いてください。
`config.toml` は OS の既定テキストエディタで開かれます。

### 設定ファイルの場所
`%APPDATA%\\ReflexFIles\\config.toml`

### 履歴 / ジャンプリストの保存先
- 履歴: `%APPDATA%\\ReflexFIles\\history.toml`
- ジャンプリスト: `%APPDATA%\\ReflexFIles\\jump_list.toml`

### `Ctrl+Alt+1/2/3` の固定プロファイル設定
Windows Terminal のプロファイル名を固定で指定できます。
- `external_terminal_profile_cmd` : `Ctrl+Alt+1`（CMD）
- `external_terminal_profile_powershell` : `Ctrl+Alt+2`（PowerShell）
- `external_terminal_profile_wsl` : `Ctrl+Alt+3`（WSL）

フォールバック動作:
- 個別キーが空なら `external_terminal_profile` を使用
- それも空なら Windows Terminal の既定プロファイルを使用
- Windows Terminal が利用できない場合は `cmd.exe` にフォールバック

`config.toml` には保存時点で次のコメントも出力されます。
- `# 現在検出できた Windows Terminal プロファイル一覧（保存時点）`

このコメントに表示された名前を、そのまま各設定値に貼り付けてください。

### 設定バックアップ / 復元（設定画面）
**設定 > 詳細** で次を実行できます。
- **設定バックアップを作成**: config.toml を時刻付きで保存
- **最新バックアップを復元**: 最新バックアップで現在設定を上書き

バックアップ保存先:
- %APPDATA%\\ReflexFIles\\backups\\config-YYYYMMDD-HHMMSS.toml

### 診断レポート出力オプション（設定画面）
**設定 > 詳細 > 診断レポートを出力** で次を選べます。
- **機密パスをマスクする**（推奨）
- **ZIPで保存する**
- **出力先パスをクリップボードへコピー**
- **出力後に自動で開く**

診断レポート保存先:
- %APPDATA%\\ReflexFIles\\diagnostics\\

### Google Drive（個人Google Cloudでの設定と利用）
ReflexFiles は公開GitHubリポジトリのため、共通の Google API 資格情報は配布しません。  
各ユーザーが自分の Google Cloud プロジェクトと OAuth クライアントを設定して利用します。

ReflexFiles の Google Drive サポートは、意図的に限定範囲です。
- `バックエンド種別` が `実 Google Drive API` のときだけ、`gdrive://root/my-drive` の実データを表示します
- `バックエンド種別` が `スタブ（テスト用仮想データ）` の場合、`gdrive://` はテストデータ表示です
- 閲覧はビューア対応形式（テキスト / Markdown / 画像）に対応
- Google Drive への書き戻しは手動（コンテキストメニュー `Google Driveへ書き戻し`）
- 外部アプリで開くときはローカル作業コピーを開きます（自動書き戻しなし）
- PATH補完/候補表示は `gdrive://` を対象にしません
- 常時補完や大量操作を重視する場合は、Google Drive のローカル同期を利用し、ローカルミラーパス上で作業してください

#### セキュリティルール（必須）
- APIキー、OAuth クライアントシークレット、トークンを GitHub に公開しない
- 資格情報入りの `.env` をコミットしない
- 実資格情報は自分のローカル環境 / 自分の Google Cloud プロジェクトだけで管理する

#### 料金（重要）
- Google の公式説明では、Google Drive API 利用自体は追加料金なしです
- Drive API のリクエスト上限超過が、そのまま追加課金になるわけではありません
- ただし、同じ Google Cloud プロジェクトで別の有料サービスを有効化すると料金が発生し得ます
- 推奨: ReflexFiles 専用プロジェクトを作成し、`Google Drive API` のみ有効化する

#### 無課金運用の実践ルール（推奨）
1. ReflexFiles 専用の Google Cloud プロジェクトを作る
2. `Google Drive API` 以外を有効化しない
3. クォータ増加申請を行わない
4. 請求先をリンクしている場合は予算アラートを設定する
5. Billing レポートを定期確認し、当月コストを `¥0` / `$0` に保つ
6. 絶対に課金されたくない場合は請求先リンク解除を検討する（使えない機能が出る場合あり）

#### Google Cloud 側の設定（ユーザー自身）
1. Google Cloud Console を開き、プロジェクトを作成または選択する（例: `ReflexFiles Personal`）
2. `Google Auth Platform` を開き、必須のアプリ情報を入力する
3. `API とサービス` -> `ライブラリ` で `Google Drive API` を有効化する
4. OAuth 同意画面を設定する
   - Gmail がテストユーザーで「不適格」と出ても、プロジェクトのオーナー/編集者は追加不要で使える場合があります
5. OAuth クライアントID（`デスクトップアプリ`）を作成し、以下を控える
   - クライアントID（必須）
   - クライアントシークレット（任意・必要時のみ）

#### ReflexFiles 側の設定（設定画面）
1. **設定 > 詳細** の Google Drive 認証ブロックを開く
2. 以下を入力する
   - `OAuth クライアント ID`（必須）
   - `OAuth クライアント シークレット（任意）`（通常は空欄、必要時のみ）
   - `OAuth リダイレクト URI`（既定値 `http://127.0.0.1:45123/oauth2/callback`、完全一致必須）
3. **サインイン開始** を押し、ブラウザで Google ログイン/同意を完了する
4. 同意後、ReflexFiles が `コールバック URL` を自動入力する
   - 自動取得に失敗した場合だけ、`state` と `code` を含むURL全文を貼り付ける
5. `アカウント ID（メールアドレス）` を入力し、**サインイン完了** を押す
6. 成功メッセージと `認証フェーズ = 認証済み` を確認する
7. 一度成功すると、次回起動後は保存済み資格情報を再利用して `gdrive://` アクセス時に自動再接続します
8. サインアウト時は refresh token と閲覧キャッシュを削除します

#### よくあるエラーと対処
1. `Google token 交換に失敗しました: client_secret is missing.`
   - `OAuth クライアント シークレット（任意）` を入力して再実行
2. ブラウザで `ERR_CONNECTION_REFUSED`
   - 想定動作です。アドレスバーURL全文を使って続行してください
3. `state` / `code` 不足のコールバック解析エラー
   - URLの一部ではなく全文を貼り付けてください
4. `redirect_uri_mismatch`
   - ReflexFiles の URI と Google Cloud 設定値を完全一致させてください
5. 認証成功後も実ファイルが見えない
   - `バックエンド種別` が `スタブ` だとテストデータ表示です
6. 「ローカル作業コピーがありません」
   - 先に対象ファイルを外部アプリで1回開いてください
7. 書き戻し競合
   - 同じ Google Drive ファイルを外部アプリで開き直して最新リモート基準の作業コピーを作成/更新し、手動マージ後に再度 `Google Driveへ書き戻し` を実行してください
8. 書き戻し時に `Request had insufficient authentication scopes`
   - `サインアウト` 後、再サインインして `https://www.googleapis.com/auth/drive` を取得し直してください

### ショートカット競合警告（設定画面）
**設定 > 詳細** に、ショートカット競合の警告一覧を表示します。
- 既知のグローバルショートカット競合（例: `Ctrl+Alt+G` と Google Drive）
- アプリ内の重複割り当て（同じキーが複数操作に割り当てられている）

> 各ファイルには **項目ごとのコメント**があり、設定値の範囲/選択肢が記載されています。

---

## 典型的な使い方（ワークフロー例）
### 例1: 大量ファイルを整理する
1. PATH バーで対象フォルダに移動
2. **Ctrl+A** で全選択 → **Delete** で削除
3. 必要なら **Undo** で復元

### 例2: 作業フォルダをジャンプリストで管理
1. 作業フォルダを開く
2. **Ctrl+D** でジャンプリストに追加
3. 次回以降は **Ctrl+Shift+O** から即移動

### 例3: ZIP を作成して共有する
1. 対象ファイルを選択
2. **ZIP 作成** を実行
3. 生成された ZIP を外部アプリで開く / 送付する

---

## 既知の問題
- 一部のシステムフォルダは権限の都合でツリービューに表示できない場合があります。
  - 回避策: アクセス可能なフォルダから移動するか、PATH バーで直接指定してください。
- ドラッグ&ドロップは未対応です。
- 外部アプリ（VS Code / Git クライアント）は、未設定の場合起動できません。
  - 回避策: `config.toml` の `external_vscode_path` / `external_git_client_path` を設定してください。
- 大量の項目を含むフォルダでは、ツリービューの自動展開が抑制される場合があります。

---

## ライセンス
本アプリケーションは **MIT License** で提供されます。

---

## 免責事項
- 本ソフトウェアの使用により生じたいかなる損害についても、作者は責任を負いません。
- 重要なファイル操作の前にはバックアップを推奨します。

---

## 使用している OSS とライセンス
主な OSS とライセンスは以下の通りです（詳細は各プロジェクトの LICENSE を参照してください）。

- **Tauri**: MIT / Apache-2.0
- **tauri-plugin-opener**: MIT / Apache-2.0
- **tauri-plugin-global-shortcut**: MIT / Apache-2.0
- **Svelte / SvelteKit**: MIT
- **Vite**: MIT
- **Rust crates**（serde, serde_json, toml, chrono, windows, trash, zip, notify, once_cell など）:
  多くが MIT または Apache-2.0 で提供されています

---

## 付録: config.toml 全項目一覧
### 一般 / 表示・動作
| キー | 型 | 説明 | 例 / 備考 |
| --- | --- | --- | --- |
| `config_version` | number | 設定ファイルのバージョン | 通常は自動更新 |
| `perf_dir_stats_timeout_ms` | number | フォルダ集計のタイムアウト(ms) | 最小 500 |
| `ui_show_hidden` | boolean | 隠しファイル表示 | `true` / `false` |
| `ui_show_size` | boolean | サイズ列の表示 | `true` / `false` |
| `ui_show_time` | boolean | タイムスタンプ列の表示 | `true` / `false` |
| `ui_show_tree` | boolean | ツリービュー表示 | `true` / `false` |
| `view_sort_key` | string | 既定の並び替えキー | `name` / `size` / `type` / `modified` |
| `view_sort_order` | string | 既定の並び順 | `asc` / `desc` |
| `session_last_path` | string | 前回終了時のPATH | 例: `C:/Users` |
| `history_search` | array(string) | 検索履歴 | 例: `["foo","bar"]` |
| `ui_theme` | string | テーマ | `light` / `dark` |
| `ui_language` | string | 表示言語 | `en` / `ja` |

### ウィンドウ
| キー | 型 | 説明 | 例 / 備考 |
| --- | --- | --- | --- |
| `ui_window_x` | number | ウィンドウ位置X(px) | `0` なら復元しない |
| `ui_window_y` | number | ウィンドウ位置Y(px) | `0` なら復元しない |
| `ui_window_width` | number | ウィンドウ幅(px) | `0` なら復元しない |
| `ui_window_height` | number | ウィンドウ高さ(px) | `0` なら復元しない |
| `ui_window_maximized` | boolean | 最大化状態 | `true` / `false` |

### 入力 / キー設定
| キー | 型 | 説明 | 例 / 備考 |
| --- | --- | --- | --- |
| `input_keymap_profile` | string | キーマップ選択 | `windows` / `vim` |
| `input_keymap_custom` | table | キーの上書き設定 | 例: `{ open = "Enter", jump_add_url = "Ctrl+Shift+D" }` |

> `input_keymap_custom` で指定できる操作名は、ヘルプ → キー一覧に表示される操作IDです。

### 外部アプリ
| キー | 型 | 説明 | 例 / 備考 |
| --- | --- | --- | --- |
| `external_associations` | table | 拡張子ごとの関連付け | 例: `{ ".txt" = "C:\\App\\Editor.exe" }` |
| `external_apps` | array(table) | 外部アプリ一覧 | `name`/`command`/`args`/`shortcut` |
| `external_git_client_path` | string | Git クライアントの実行パス | 空なら既定を使用 |
| `external_vscode_path` | string | VS Code 実行パス | 空なら `code` を試行 |
| `external_terminal_profile` | string | ターミナル共通プロファイル名 | 空なら Windows Terminal 既定 |
| `external_terminal_profile_cmd` | string | `Ctrl+Alt+1` 用プロファイル名 | 空なら `external_terminal_profile` |
| `external_terminal_profile_powershell` | string | `Ctrl+Alt+2` 用プロファイル名 | 空なら `external_terminal_profile` |
| `external_terminal_profile_wsl` | string | `Ctrl+Alt+3` 用プロファイル名 | 空なら `external_terminal_profile` |

`external_apps` の `args` では `{path}` / `{cwd}` が使用できます。  
例:
```
external_apps = [
  { name = "Everything", command = "C:\\Path\\Everything.exe", args = ["-path", "{path}"], shortcut = "Ctrl+Alt+E" }
]
```

### ログ
| キー | 型 | 説明 | 例 / 備考 |
| --- | --- | --- | --- |
| `log_path` | string | ログ出力ファイル | 例: `%APPDATA%\\ReflexFIles\\app.log` |
| `log_enabled` | boolean | ログ出力の有効化 | `true` / `false` |

### 参考: キー割り当て
既定キーの一覧は、**ヘルプ → キー一覧** から確認できます。  
`config.toml` に既定キー一覧は出力されません。変更したい場合は `input_keymap_custom` を使用してください。




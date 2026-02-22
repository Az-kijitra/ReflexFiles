# キー操作一覧（メイン画面 / モード別・フォーカス別）

> 自動生成: `app/scripts/build_keyboard_behavior_doc.mjs`

## 目的
- メイン画面のキー操作を、既定キーマップとフォーカス依存挙動を分けて確認できるようにする
- キー操作の大規模見直し時に、仕様差分の確認漏れを減らす

## 優先順位（上から先に処理）
1. モーダル/オーバーレイ専用キー（確認ダイアログ、ソートメニュー、コンテキストメニュー等）
2. トップレベル直接フォールバック（WebView差異対策の基本ショートカット）
3. 通常のキーマップ処理（`matchesAction` ベース）

## フォーカス別・モード別の固定挙動（メイン画面）
| 対象 | キー | 挙動 | 備考 |
| --- | --- | --- | --- |
| 共通（モーダル優先） | 貼り付け確認 / 削除確認 / URL追加 / ZIP / エラー表示中 | 通常の一覧キー操作を停止 | オーバーレイ優先 |
| 共通（ソートメニュー） | Tab 以外のキー | ソートメニューに委譲 | 一覧側に流さない |
| 共通 | Tab | フォーカス循環（一覧→PATH→ツリー→一覧） | ツリー非表示時は一覧↔PATH |
| 共通 | Shift+Tab | 逆方向フォーカス循環 | 一覧←PATH←ツリー←一覧 |
| PATH入力 | Enter | PATH移動を実行 | 実行後は一覧へフォーカス |
| PATH入力 | Esc | 補完候補を閉じる / 入力破棄して一覧へ戻る | 候補表示中はまず候補を閉じる |
| PATH入力 | ArrowDown | 履歴ドロップダウンを開く | 履歴が空なら no_items |
| PATH入力 | Ctrl+Space | PATH補完候補を前進 | ローカルパスのみ |
| PATH入力 | Ctrl+Shift+Space | PATH補完候補を後退 | ローカルパスのみ |
| PATH入力 | \ / ¥ | 補完候補のディレクトリ確定 / 通常入力 | 候補がない場合は `\` を入力 |
| PATH入力 | Ctrl+Shift+O | ジャンプリストを開く | PATH入力中のみ許可 |
| PATH入力 | Ctrl+H | 履歴を開く | PATH入力中のみ許可 |
| PATH入力 | Ctrl+Shift+D | URLをジャンプリストに追加 | PATH入力中のみ許可 |
| 一覧 | Space | 選択トグル + 次行へ移動 | 一覧/本文フォーカス時 |
| 一覧 | Delete | 削除確認を開く | 選択またはフォーカス項目対象 |
| 一覧 | Searchキー | 検索バーを開く | Windows-like: Ctrl+F |
| ツリー | Tab / Shift+Tab | 一覧 / PATH へフォーカス移動 | 通常のツリー移動キーとは別の共通処理 |

## 直接フォールバック（WebView差異対策）
| キー | 挙動 | 境界条件 |
| --- | --- | --- |
| Ctrl+N | 新規ファイル作成を開く | 入力欄以外（オーバーレイなし） |
| Ctrl+C | コピー | PATH入力中は無効 |
| Ctrl+X | カット | PATH入力中は無効 |
| Ctrl+V | ペースト | PATH入力中は無効 |
| Alt+D | PATHへフォーカス | 一覧/ツリー/その他（オーバーレイなし） |
| Ctrl+F | 検索を開く | PATH入力中は無効 |
| Ctrl+H | 履歴を開く | PATH入力中は許可 / 他入力欄では無効 |
| Ctrl+Shift+O | ジャンプリストを開く | PATH入力中は許可 / 他入力欄では無効 |
| Ctrl+D | ジャンプリストに追加 | 入力欄では無効 |
| Ctrl+Shift+D | URLをジャンプリストに追加 | PATH入力中は許可 / 他入力欄では無効 |
| Ctrl+, | 設定ファイルを開く | 入力欄でも有効 |
| F1 | キー一覧を開く | 入力欄でも有効 |
| Alt+S | ソートメニューを開く | 入力欄では無効 |

## 既定キーマップ（設定で変更可能）
### 移動
| 操作ID | 操作名（ja） | Windows-like | Vim-like |
| --- | --- | --- | --- |
| `move_up` | 上へ移動 | ArrowUp | K |
| `move_down` | 下へ移動 | ArrowDown | J |
| `move_left` | 左へ移動 | ArrowLeft | H |
| `move_right` | 右へ移動 | ArrowRight | L |
| `page_up` | ページ上 | PageUp | Ctrl+U |
| `page_down` | ページ下 | PageDown | Ctrl+D |
| `open` | 開く | Enter | Enter |
| `go_parent` | 親フォルダ | Alt+Up, Backspace | Alt+Up, Backspace |
| `refresh` | 更新 | F5 | R |

### 選択
| 操作ID | 操作名（ja） | Windows-like | Vim-like |
| --- | --- | --- | --- |
| `select_toggle` | 選択トグル | Space | Space |
| `select_all` | すべて選択 | Ctrl+A | Ctrl+A |
| `clear_selection` | 選択解除 | Escape | Escape |

### 表示/フォーカス
| 操作ID | 操作名（ja） | Windows-like | Vim-like |
| --- | --- | --- | --- |
| `focus_path` | PATHにフォーカス | Alt+D | : |
| `toggle_hidden` | 隠しファイル切替 | Ctrl+Shift+H | Ctrl+H |
| `toggle_tree` | ツリービュー切替 | Ctrl+Shift+B | Ctrl+Shift+B |
| `sort_menu` | 並び替えメニュー | Alt+S | S |
| `toggle_size` | サイズ表示切替 | Ctrl+Shift+S | Ctrl+Shift+S |
| `toggle_time` | 時刻表示切替 | Ctrl+Shift+T | Ctrl+Shift+T |

### 検索/履歴/ジャンプリスト
| 操作ID | 操作名（ja） | Windows-like | Vim-like |
| --- | --- | --- | --- |
| `search` | 検索 | Ctrl+F | / |
| `history_jump_list` | ジャンプリスト | Ctrl+Shift+O | Ctrl+J |
| `jump_add` | ジャンプリストに追加 | Ctrl+D | Ctrl+Shift+J |
| `jump_add_url` | URLをジャンプリストに追加 | Ctrl+Shift+D | Ctrl+Shift+U |
| `history` | 履歴 | Ctrl+H | Ctrl+Y |

### ファイル操作
| 操作ID | 操作名（ja） | Windows-like | Vim-like |
| --- | --- | --- | --- |
| `undo` | 元に戻す | Ctrl+Z | U |
| `redo` | やり直し | Ctrl+Y | Ctrl+R |
| `copy` | コピー | Ctrl+C | Y |
| `duplicate` | 複製 | Ctrl+Shift+C | Shift+Y |
| `prefix_date` | 日付プレフィックス追加 | Ctrl+Alt+D | Shift+D |
| `cut` | カット | Ctrl+X | X |
| `paste` | ペースト | Ctrl+V | P |
| `delete` | 削除 | Delete | D |
| `rename` | 名前変更 | F2 | F2 |
| `new_file` | 新規作成 | Ctrl+N | Ctrl+N |
| `properties` | プロパティ | Alt+Enter | Alt+Enter |

### ZIP
| 操作ID | 操作名（ja） | Windows-like | Vim-like |
| --- | --- | --- | --- |
| `zip_create` | ZIPに圧縮 | Ctrl+Alt+Z | Z |
| `zip_extract` | ZIPを解凍 | Ctrl+Alt+X | Shift+Z |

### 外部アプリ
| 操作ID | 操作名（ja） | Windows-like | Vim-like |
| --- | --- | --- | --- |
| `open_explorer` | エクスプローラーで開く | Ctrl+Alt+E | Ctrl+Alt+E |
| `open_cmd` | ターミナルを開く | Ctrl+Alt+C | Ctrl+Alt+C |
| `open_terminal_cmd` | CMDで開く | Ctrl+Alt+1 | Ctrl+Alt+1 |
| `open_terminal_powershell` | PowerShellで開く | Ctrl+Alt+2 | Ctrl+Alt+2 |
| `open_terminal_wsl` | WSLで開く | Ctrl+Alt+3 | Ctrl+Alt+3 |
| `open_vscode` | VS Codeで開く | Ctrl+Alt+V | Ctrl+Alt+V |
| `open_git_client` | Gitクライアントで開く | Ctrl+Alt+Shift+G | Ctrl+Alt+Shift+G |

### その他
| 操作ID | 操作名（ja） | Windows-like | Vim-like |
| --- | --- | --- | --- |
| `exit` | 終了 | Ctrl+Q | Ctrl+Q |
| `settings` | 設定 | Ctrl+, | Ctrl+, |
| `help_keymap` | キー一覧 | F1 | F1 |

## 注意点
- PATH補完/候補表示はローカルパスのみを対象とし、`gdrive://` は対象外。
- 本書はメイン画面のキー操作一覧であり、ReflexViewer（別ウィンドウ）のキー操作は含まない。
- 実装変更後は `npm run test:keys` を先に実行し、その後 `npm run build` と対象E2Eで確認する。

# メールスパムフィルター

IMAP または POP3 でメールサーバーに接続し、受信トレイを差分スキャンしてスパムを自動処理する Python スクリプトです。

---

## 機能

- **差分処理**：前回実行時の続きから新着メールのみを処理（初回は最新 32 件をシードとして処理）
- **ヘッダーのみ取得**：本文はダウンロードせずヘッダーだけを検査するため、高速かつ低通信量
- **スパム判定（2 ルール）**

  | ルール | 判定条件 |
  |--------|----------|
  | DMARC 検証 | `Authentication-Results` ヘッダーに `dmarc=fail` または `dmarc=none` が含まれる |
  | 送信ドメイン不一致 | `Return-Path` のドメインと `From` のドメインが異なる（ESP ホワイトリスト除外） |

- **IMAP モード**：スパムを指定の迷惑メールフォルダへ移動（フォルダ名は設定で指定、省略時は自動検出）
- **POP3 モード**：スパムを `DELE+QUIT` でサーバーから削除。UIDL で処理済みメッセージを管理し、重複処理を防止
- **状態保存**：処理済み情報を `state.json` に保存し、再実行時はそこから再開

---

## 動作環境

| 項目 | 要件 |
|------|------|
| Python | **3.9 以上**（推奨: 3.11 以上） |
| 標準ライブラリのみ | `imaplib` / `poplib` / `email` / `configparser` / `json` など、追加インストール不要 |
| 対応 OS | Linux / macOS / Windows |

---

## インストール（取得方法）

```bash
git clone https://github.com/MrJasonZhou/ai.git
cd ai/mail
```

---

## 設定ファイル（mail.ini）

`mail.ini` を編集してアカウント情報と動作オプションを設定します。  
リポジトリには認証情報を除いたテンプレートが含まれています。実際の値は各自で入力してください。

### \[DEFAULT\] セクション（全アカウント共通）

```ini
[DEFAULT]
esp_whitelist = mpse.jp,
                amazonses.com,
                sendgrid.net,
                mailgun.org,
                ...
```

| キー | 説明 |
|------|------|
| `esp_whitelist` | ESP（メール配信サービス）のドメインホワイトリスト。カンマ区切りで複数指定可。続行行は先頭をスペースでインデントする。このリストに含まれるドメインはドメイン不一致ルールの対象外となる |

### 各アカウントセクション

```ini
[YahooJapanMail]
mode        = imap
junk_folder = 迷惑メール
imap_server = imap.example.com
imap_port   = 993
pop_server  = pop.example.com
pop_port    = 995
username    = yourname
email       = yourname@example.com
password    = yourpassword
```

| キー | 説明 |
|------|------|
| `mode` | `imap` または `pop3` を指定（必須） |
| `junk_folder` | **IMAP モードのみ**。スパムの移動先フォルダ名。省略すると `迷惑メール` / `Bulk Mail` / `Junk` / `Spam` などをサーバー一覧から自動検出 |
| `imap_server` | IMAP サーバーホスト名 |
| `imap_port` | IMAP ポート番号（SSL: 通常 993） |
| `pop_server` | **POP3 モードのみ**。POP3 サーバーホスト名 |
| `pop_port` | **POP3 モードのみ**。POP3 ポート番号（SSL: 通常 995） |
| `username` | メールアカウントのログイン名 |
| `email` | メールアドレス |
| `password` | メールアカウントのパスワード |

複数アカウントを管理する場合は `[Account2]`、`[Account3]` のようにセクションを追加してください。  
`[DEFAULT]` の `esp_whitelist` は全セクションで自動的に共有されます。

---

## 実行方法

```bash
python3 fetch_mail.py <セクション名>
```

**例：**

```bash
# mail.ini の [YahooJapanMail] セクションを処理
python3 fetch_mail.py YahooJapanMail
```

### 定期実行（cron）

```cron
# 毎時 0 分に実行
0 * * * * /usr/bin/python3 /path/to/ai/mail/fetch_mail.py YahooJapanMail >> /path/to/mail.log 2>&1
```

---

## ファイル構成

```
mail/
├── fetch_mail.py   # スパムフィルター本体
├── mail.ini        # 設定ファイルテンプレート（認証情報は要記入）
├── state.json      # 処理済み状態の保存ファイル（自動生成）
└── README.md       # このファイル
```

> **注意**：`state.json` と実際の認証情報を含む `mail.ini` は `.gitignore` に追加してバージョン管理から除外することを推奨します。

# mail-spam-filter

Yahoo Japan Mail（IMAP）の迷惑メール自動フィルタースクリプト。  
メールヘッダーを検査し、迷惑メールを「Bulk Mail」フォルダへ移動します。  
cron により 2 分ごとに自動実行されます。

---

## ファイル構成

```
mail/
├── fetch_mail.py     # メインスクリプト
├── mail.ini          # アカウント設定（ローカル専用、リポジトリ除外）
├── mail.ini.example  # 設定テンプレート
├── state.json        # 差分実行用の状態ファイル（ローカル専用、リポジトリ除外）
├── fetch_mail.log    # 実行ログ（ローカル専用、リポジトリ除外）
└── README.md
```

---

## クイックスタート

### 1. 依存関係のインストール

Python 標準ライブラリのみを使用しており、追加インストールは不要です。Python 3.9 以上が必要です。

### 2. アカウント設定

```bash
cp mail.ini.example mail.ini
# mail.ini を編集し、実際のアカウント情報を入力してください
```

### 3. 手動実行

```bash
python3 fetch_mail.py YahooJapanMail
```

### 4. cron の設定（2 分ごとに自動実行）

```bash
crontab -e
```

以下を追加：

```
*/2 * * * * /usr/bin/python3 /path/to/mail/fetch_mail.py YahooJapanMail >> /path/to/mail/fetch_mail.log 2>&1
```

---

## 設定ファイルの説明（mail.ini）

```ini
[YahooJapanMail]
; 受信メール（IMAP）
imap_server = imap.mail.yahoo.co.jp
imap_ssl    = SSL
imap_port   = 993

; 送信メール（SMTP）※ 現在のスクリプトは受信のみ対応、SMTP は拡張用
smtp_server = smtp.mail.yahoo.co.jp
smtp_auth   = SMTP_AUTH
smtp_ssl    = SSL
smtp_port   = 465

; アカウント情報（アカウント名/ログイン名 = Yahoo! JAPAN ID）
username    = Yahoo_JAPAN_IDを入力
email       = メールアドレスを入力
password    = パスワードを入力

; オプション：ESP ホワイトリスト（カンマ区切り、ルール2の適用除外）
; esp_whitelist = mpse.jp, amazonses.com

; オプション：迷惑メールフォルダ名（省略時は自動検出）
; junk_folder = Bulk Mail
```

---

## 迷惑メール判定ルール

| ルール | 検査項目 | 判定条件 |
|--------|----------|----------|
| 1 | DMARC | `Authentication-Results` に `dmarc=fail` または `dmarc=none` が含まれる |
| 2 | ドメイン不一致 | `Return-Path` のドメインと `From` のドメインが異なる（ESP ホワイトリスト除外） |
| 3 | SPF | `Received-SPF` が `none` または `fail` |
| 4 | 廉価 TLD | 送信ドメインが濫用の多い TLD を使用（`.top` `.xyz` `.icu` `.cfd` `.club` など） |

---

## 差分実行の仕組み

- **初回実行**：最新 32 件をシードとして処理し、最大 IMAP UID を保存
- **2 回目以降**：`UID > last_uid` の新着メールのみを処理（重複処理なし）
- 状態は `state.json` に保存

---

## 処理動作

- **保持**：判定を通過した正常メールはそのまま
- **移動**：迷惑メールと判定されたメールを `Bulk Mail` フォルダにコピー → 元メールを削除フラグ → EXPUNGE

---

## ログフォーマット

```
[2026-05-19 19:30:56] [YahooJapanMail] imap.mail.yahoo.co.jp:993 に接続中 (IMAP) ...
[2026-05-19 19:30:57] [YahooJapanMail] 差分実行 — UID 223255 以降の新着 3 件
[2026-05-19 19:30:57]   [移動済 UID=223260] 件名: 'iCloud次回請求についてのお知らせ'
[2026-05-19 19:30:57]            差出人: iCloud <info@suspicious.top>
[2026-05-19 19:30:57]            理由  : Suspicious TLD: .top (domain='suspicious.top')
[2026-05-19 19:30:58] [YahooJapanMail] 完了 — 保持: 2 件, 迷惑メールへ移動: 1 件
```

---

## 注意事項

- Yahoo Japan Mail の IMAP は**モバイル端末限定**の設定が必要です。アカウント設定で「IMAP アクセス」を有効にしてください。
- `mail.ini` にはパスワードが含まれるため、**絶対にリポジトリにコミットしないでください**（`.gitignore` で除外済み）。

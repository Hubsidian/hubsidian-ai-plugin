---
name: setup
description: >-
  hubsidian への接続を対話的にセットアップする。MCP サーバー登録
  (Claude Code / Codex)と接続確認を行う。ユーザーが
  「hubsidian をセットアップして」「hubsidian に接続して」
  「hubsidian の初期設定をして」と言ったとき、または hubsidian plugin の
  インストール直後に使う。
license: MIT
metadata:
  author: seiichi1101
  version: "1.1.0"
  homepage: https://github.com/Hubsidian/hubsidian-ai-plugin
---

# setup

hubsidian(Obsidian vault の Personal Knowledge MCP)への接続を、ユーザーと
対話しながらセットアップする。ゴールは MCP サーバー `hubsidian` が登録され、
ノートツール(検索・作成・編集)が使える状態。

配布スキル(save-summary など)は plugin と一緒にインストール済みなので、
このスキルで行うのは **MCP 登録だけ**でよい。

## 0. 前提の確認

ユーザーに hubsidian Worker がデプロイ済みか確認する。必要な値は 1 つ:

- **base URL** — デプロイ先(例: `https://hubsidian.example.com`)。
  `https://<host>/health` が JSON を返せば正しい。

まだデプロイしていない場合はセットアップを中断し、リポジトリ
(https://github.com/Hubsidian/hubsidian)の README にある
`make setup` → `make deploy` の手順を案内する。

値を受け取ったら、先に `curl -s <base URL>/health` で疎通を確認する。

## 1. MCP サーバーを登録する

実行環境に応じて登録する(どちらの環境か不明なら両方提案する):

- **Claude Code**:
  `claude mcp add --transport http hubsidian <base URL>/mcp`
  登録後、ユーザーに「セッション内で `/mcp` を実行して hubsidian を選び、
  ブラウザの consent 画面で Sign in with Google からログインしてください
  (サーバーの ALLOWED_EMAILS に登録済みの Google アカウントであること)」
  と案内する。
- **Codex**: `~/.codex/config.toml` に以下を追記する(既存の
  `[mcp_servers.hubsidian]` があれば URL のみ更新):

  ```toml
  [mcp_servers.hubsidian]
  url = "<base URL>/mcp"
  ```

  その後 `codex mcp login hubsidian` で OAuth 認証を案内する。

## 2. 最後の案内

- ツール一覧は**クライアントの再起動後**に反映される(起動時キャッシュ)。
- Claude Web / Desktop / Mobile でも使う場合は、Settings → Connectors →
  Add custom connector に `<base URL>/mcp` を登録すればよいことを伝える。
- 個人用のスキルを作りたい場合は `~/.claude/skills/<name>/SKILL.md` に
  ローカルで作ればよい(plugin のスキルとは名前空間が別なので衝突しない)
  ことを補足する。

各ステップの実行結果(成功/失敗)を最後にまとめて報告すること。失敗した
ステップは原因(疎通不可、許可されていない Google アカウントなど)と対処を
添える。

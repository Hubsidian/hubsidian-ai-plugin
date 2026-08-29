# hubsidian-ai-plugin

[hubsidian](https://github.com/Hubsidian/hubsidian)(Personal Knowledge MCP)
の Claude Code / Codex 用プラグイン。**配布用 agent skills の正(single
source of truth)はこのリポジトリの [`skills/`](skills/)**。

repo = plugin = marketplace の一人三役(hubsidian ROADMAP D7): リポジトリ
直下の `.claude-plugin/{plugin.json, marketplace.json}` だけで Claude Code と
Codex の両方に配布される(Codex は Claude Code のマニフェスト形式を
ネイティブに読む)。root の `skills/` がそのまま plugin のスキルになる。

## インストール

Claude Code:

```
/plugin marketplace add Hubsidian/hubsidian-ai-plugin
/plugin install hubsidian@hubsidian
```

Codex(repo が private の間は SSH URL で):

```bash
codex plugin marketplace add git@github.com:Hubsidian/hubsidian-ai-plugin.git
codex plugin add hubsidian@hubsidian
```

インストール後、新しいセッションで `/hubsidian:setup` を実行すると
ノート用 MCP 登録(hubsidian Worker への接続)を対話的に済ませられる。

## 更新

```
/plugin marketplace update hubsidian          # Claude Code
codex plugin marketplace upgrade hubsidian    # Codex
```

## スキル

| スキル | 用途 |
| --- | --- |
| `setup` | hubsidian への MCP 接続を対話的にセットアップ |
| `save-summary` | セッション内容を Obsidian vault に知識ノートとして保存 |

スキルの書き方・制約は [`skills/README.md`](skills/README.md) を参照。

## hubsidian サーバーとの関係

hubsidian(server)はこのリポジトリを git submodule(`vendor/ai-plugin`)
として特定コミットにピンし、`make skills-build` で skills を Worker
バンドルにコンパイルして MCP / HTTP API 経由でも配信する(plugin を
インストールできないクライアント — Claude Web/Desktop/Mobile など — 向け)。

skills を変更したら:

1. ここでコミット(CI の `validate` が通ること)
2. server 側で submodule を bump(`git submodule update --remote vendor/ai-plugin`)
   → `make skills-build` → 生成物ごとコミット → deploy

## 開発

```bash
node scripts/validate-skills.mjs   # server と同じルール + Agent Skills 仕様の検証
claude plugin validate .           # plugin / marketplace マニフェストの検証
```

バージョンは `.claude-plugin/plugin.json` と `marketplace.json` の
`plugins[0].version` の 2 箇所を揃えて上げる。

## License

MIT

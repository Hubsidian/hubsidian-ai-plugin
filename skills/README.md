# skills/

配布用 agent skills の**正(source of truth)**。ここを編集してコミット
すると、plugin のインストール/更新(marketplace 経由)でそのまま配布される
(コピーは発生しない — git が origin。hubsidian ROADMAP D8)。

hubsidian server はこのリポジトリを submodule(`vendor/ai-plugin`)として
ピンし、`make skills-build` で `src/skills/bundle.generated.ts` にコンパイル
して Worker バンドルに同梱する(MCP / HTTP API 配信用)。**skills を変更
したら server 側で submodule bump + 再ビルド + deploy が必要**(手順は root
の README 参照)。

ユーザーが自分専用のスキルを作りたい場合は、ここではなく各自のローカル
(`~/.claude/skills/<name>` / `~/.agents/skills/<name>` に実ディレクトリと
して置く)で作る。plugin のスキルとは名前空間が別なので衝突しない。

## レイアウト

スキル1つ = ディレクトリ1つ。`SKILL.md` の無いディレクトリはスキルとして
扱われない(サーバー側が無視する)。

```
skills/
└── research/
    ├── SKILL.md          # 必須
    └── references/…      # 任意の補助ファイル
```

`SKILL.md` の frontmatter は Agent Skills 仕様に準拠させる。同じファイルが
Claude Code / Codex にネイティブスキルとしてインストールされるため、
**仕様外のトップレベルキーを書かないこと**(Claude Code はローカルでは無視
するが、Skills API 経由の公開・パッケージ化では hard error になる)。安全に
使えるのは `name`, `description`, `metadata`, `license`, `compatibility`,
`allowed-tools`。独自フラグは `metadata:` の下に置く:

```yaml
---
name: research
description: Research the web and save findings under Research/
metadata:
  prompt: true      # 任意。MCP Prompt として公開するオプトイン(D4)
---
```

## 制約(server の `src/skills/store.ts` と同じルール)

`node scripts/validate-skills.mjs`(CI でも実行)が検証する:

- ディレクトリ名: `^[a-z0-9][a-z0-9_-]*$`、64 文字以内
- 1ファイル 1 MiB 以内
- テキストファイルのみ(バイナリ拡張子は Phase 2 まで非対応)
- frontmatter のトップレベルキーは Agent Skills 仕様の許可リストのみ
- この `README.md` のようなトップレベルのファイルはスキルに含まれない
- 全体で Worker バンドル上限(gzip 後 3 MB / 有料プラン 10 MB)に収まること

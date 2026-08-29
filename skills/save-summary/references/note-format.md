# Note Format（ノートのフォーマット）

`hubsidian/` 配下に保存するノートの正規スキーマ。ノートは YAML
フロントマター（Obsidian Properties）付きのプレーンな Obsidian フレーバー
Markdown である。AI 専用のマークアップは使わず、`cat` で読める状態を保つ。

セクション見出し（`## Question` など）は英語表記のまま固定する
（ベンダー間・時系列での一致判定を安定させるため）。本文の内容は日本語で
書いてよい。

## テンプレート

```markdown
---
type: research
created: 2026-08-21
updated: 2026-08-21
topic: Example Topic
status: active
tags:
  - example
source_ai:
  - claude
---

# Example Topic

## Question

何を調べた／決めたのかを1〜2文で。

## Conclusion

最も重要な結論を簡潔に。

## Key Findings

- 重要な事実
- 重要な事実

## Details

発見を後から使えるようにするための裏付け詳細。必要ならサブ見出しを使う。
時間依存の事実には必ず日付を付ける:「2026年8月時点、...」。

## Sources

- [出典タイトル](https://example.com) — 発行元, 公開日 2026-07-01, 確認日 2026-08-21

## Caveats

- 未確認の点
- 変わりやすい事項

## Related

- [[Related Topic]]

## Follow-up

- 後で確認すべきこと
```

## フロントマターのリファレンス

| プロパティ | 必須 | 値 |
|----------|------|-----|
| `type` | 必須 | 常に `research`。Obsidian Bases / Dataview でのフィルタリングを可能にする。 |
| `created` | 必須 | 初回作成日の ISO 日付（`YYYY-MM-DD`）。作成後は変更しない。 |
| `updated` | 必須 | 直近の実質的な更新の ISO 日付。 |
| `topic` | 必須 | 人間が読めるトピック名。H1 と一致させる。 |
| `status` | 必須 | `active`（まだ有効）または `archived`（陳腐化した）。デフォルトは `active`。 |
| `tags` | 必須 | 小文字・kebab-case。新しいタグを作る前に `list_tags` で既存タグを再利用する。 |
| `source_ai` | 必須 | 貢献した AI のリスト: `claude`、`chatgpt`、`codex` など。追記のみで置き換えない。トピックごとに 1 つの共有ノート — ベンダーごとに分けたノートは作らない。 |

`id` は書かない。`create_note` が安定した nanoid を自動で採番し、以降の
書き込みツールがそれを保持する。既存ノートの `id` は種類が違っていても
（例: Obsidian Advanced URI の UUID）正当なものなので、修正してはならない。

## ファイル名の規則

- 保存先: `hubsidian/<slug>.md`
- slug: 小文字・ハイフン区切りで、ファイル一覧を眺めた人間にとって意味が
  分かるもの。トピックが自然に日本語圏のものであれば非 ASCII の slug でも
  構わない。
- 良い例: `spring-ai-mcp.md`、`cloudflare-r2.md`、`hubsidian.md`
- 悪い例: `20260821.md`、`note123.md`、`claude-output.md`、`research.md`

## 出典の規則

- 素の名前より、常に Markdown のリンク形式で実際の URL を優先する:
  `[Cloudflare docs](https://...)` であって「Cloudflare docs」ではない。
- 可能であれば発行元と日付を em ダッシュの後に付ける:
  `— 発行元, 公開日 YYYY-MM-DD, 確認日 YYYY-MM-DD`。持っていない項目は
  省略してよい。
- 更新時に既存の出典を削除することは絶対にしない。新しいものを追記する。

## セクションの規則

- テンプレートの各セクションは、順序を保ったまま必ず存在させる。本当に
  空の場合でも見出しは残し「まだなし。」のような短い記述にする — ノートの
  構造を統一しておくことで、将来のマージやツール処理が安定する。
- `## Question` と `## Conclusion` は、ノートの他の部分を読まずに答えられる
  内容にする。
- チャットの会話ログ（`User: ... / Assistant: ...`）は、ノートのどこにも
  書いてはならない。

## 時系列での変更の記録

新しい情報が既存ノートの内容と矛盾したり陳腐化させたりする場合は、黙って
書き換えるのではなく、タイムラインを見える形で残す:

```markdown
## Details

### Pricing

- 2026年5月時点: プランXは月額10ユーロだった。
- 2026年8月: Yの発表を受けて月額12ユーロに変更。
```

これは特に、法律、公的制度、価格、API、製品仕様において重要になる。

## 編集ツールの使い分け（hub の MCP ツール）

| やること | 使うツール |
|---------|-----------|
| 新規作成 | `create_note`（`id` は自動採番） |
| 本文の一部を差し替え | `patch_note`（`old_str` / `new_str`。`new_str` はリテラル） |
| frontmatter の値を変更 | `patch_frontmatter`（`id` は変更不可） |
| 本文を丸ごと差し替え（frontmatter 保持） | `replace_body` — 既存の情報を失う操作なので原則使わない |
| ノート全体の上書き | `replace_note` — このスキルでは使わない |

書き込み系はすべて `if_match`（`read_note` が返す `etag`）を受け付ける。
**必ず渡すこと。** 他デバイスの Remotely Save 同期との競合を検出できる
唯一の手段である。

`patch_note` の `old_str` は frontmatter（特に `id:` 行）に重ならないよう、
本文側の一意なアンカーを選ぶ。

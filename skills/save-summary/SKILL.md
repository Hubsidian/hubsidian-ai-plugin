---
name: save-summary
description: >-
  現在のセッションで得た内容を、hubsidian の MCP ツール経由で
  ユーザーの Obsidian vault に再利用可能な知識ノートとして保存する。
  ユーザーがセッション内容の保存・記録・アーカイブを求めたとき、
  例えば "save this session"、"save this to Obsidian"、
  「これ保存して」「今日のまとめをObsidianに残して」
  「この調査を記録して」「セッションのサマリを吐き出して」
  のときに使う。
license: MIT
metadata:
  author: seiichi1101
  version: "1.1.0"
  homepage: https://github.com/Hubsidian/hubsidian-ai-plugin
  prompt: true
---

# save-summary

現在のセッションを、Obsidian vault 内の永続的で再利用可能な知識ノートに
変換する。vault はプレーンな Markdown であり、唯一の正（source of truth）
である。別のデータベースもチャットログのダンプも持たない。

このスキルは **hubsidian の MCP ツール経由でのみ** vault を操作する。
ローカルファイルシステムのパスを探したり推測したりしてはならない
（同じ vault が Claude Web / Mobile / ChatGPT / Claude Code のどこからでも
同じツールで見えることが、この hub の前提である）。

## ステップ0 — ツールの確認

`list_notes` / `read_note` / `search_notes` / `create_note` /
`patch_note` / `patch_frontmatter` / `list_tags` が使えることを確認する。

使えない場合（コネクタが未接続、または別クライアント）は、**vault への
書き込みを試みない**。代わりに完成した 1 本のノート本文（フロントマター
込み、[references/note-format.md](references/note-format.md) 準拠）を
出力として提示し、ファイル名の提案（`hubsidian/<slug>.md`）を添える。
既存ノートとの重複判定ができないことも明示的に伝える。

## セキュリティ境界（譲れない原則）

- **書き込みは `hubsidian/` の内側のみ。** それ以外のフォルダへの
  書き込み・移動・削除は、カジュアルに頼まれても行わない。ユーザーが
  明示的に別の場所を望む場合は、それがこのスキルの範囲外であることを
  伝え、判断を委ねる。
- **読み取りは vault 内のどこでも可** — 検索やリンクのために既存ノートを
  読むことは推奨される。
- ノートを削除しない（`delete_note` はこのスキルでは使わない）。
- 既存ノートの**全体書き換えをしない**（`replace_note` は使わない）。
  更新はターゲットを絞った `patch_note` / `patch_frontmatter` で行う。
- **frontmatter の `id:` を書き換えない。** `patch_note` には id の保護が
  ないので、`old_str` が `id:` 行に重なる置換を組んではならない。
  frontmatter を触るなら `patch_frontmatter` を使う。
- `..` を含むパスや vault 外に解決されるパスは使わない。

## 保存すべきもの・絶対に保存してはいけないもの

**再利用可能な知識**を保存する: 問い、結論、重要な発見、裏付けとなる
詳細、出典、留意点、今後の確認事項。

チャットの会話ログは絶対に保存しない。`User: ... / Assistant: ...` の
ようなダンプは禁止。セッションに残す価値のある永続的な知識がなければ、
ノートを無理に作らず、その旨を伝える。

## ワークフロー

1. **問いを特定する** — このセッションが実際に答えたものは何か。
2. **抽出する**: Conclusion（結論）、Key Findings（重要な発見）、
   Details（詳細）、Sources（URL 付き出典）、Caveats（留意点）、
   Follow-up（今後の確認事項）。
3. **何かを作る前に既存ノートを検索する。** `search_notes` を
   `path_prefix: "hubsidian/"` で呼び、トピックの言い換えを複数試す。
   文字列の完全一致ではなく意味で判定する — 「Spring AI MCP」
   「Spring AI and MCP」「MCP support in Spring AI」は 1 つのトピック。
   本当に異なるトピックを無理にマージしない。
4. **タグを揃える。** `list_tags` で vault に既にあるタグを確認し、
   新しいタグを作る前に既存のものを再利用する。
5. **一致するノートがある場合** → 下記「更新方針」へ。
6. **一致がない場合** → `create_note` で `hubsidian/<slug>.md` を作る。
   本文は [references/note-format.md](references/note-format.md) に従う。
   `id:` は hub が自動で採番するので、自分で書かない。
   slug は人間が読めるトピック名（`spring-ai-mcp.md`、
   `cloudflare-r2.md`）。日付・連番・AI ベンダー名にしてはならない。
7. **関連ノートをリンクする。** `search_notes` や `list_backlinks` で
   実在する関連ノートを探し、`## Related` に `[[Wiki Links]]` を追加する。
   デッドリンクを量産しない。
8. **報告する**: ファイルパス、新規作成か更新か、何を追加したか。
   `create_note` / `patch_note` が返す `permalink` があれば併せて伝える。

## 更新方針（既存ノート）

- **編集の直前に `read_note` で最新の内容と `etag` を取得し、書き込みでは
  その `etag` を `if_match` に渡す。** vault は他デバイスの Remotely Save
  と同期されるため、これが唯一の競合検出手段である。`if_match` 不一致で
  失敗したら、再度読み込んでからやり直す（黙って上書きしない）。
- 既存の情報を保持する。時間依存の事実（法律、API、価格、製品仕様、
  公的制度など）は古い記述を上書きせず、日付付きで変更を記録する。
  例:「2026年5月時点: X。2026年8月にYへ変更。」
- frontmatter の `updated` を今日の日付にする（`patch_frontmatter`）。
- `source_ai` にこの AI がまだ無ければ追記する（`claude`、`chatgpt`、
  `codex` など）。ノートを AI ベンダーごとに分割することは絶対にしない。
- 新しい出典は既存の Sources に、古いものを削除せずマージする。

## ノートのフォーマット

完全なスキーマ、フロントマターのリファレンス、ファイル名規則、例は
[references/note-format.md](references/note-format.md) にある
（MCP からは `get_skill_file` で読める）。ノートを書く前に必ず読むこと。

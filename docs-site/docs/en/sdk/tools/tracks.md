# Tracks

A track is a directory containing a `TRACK.md` file — instructions the model loads on demand instead of paying for them in every prompt. The system prompt lists each track's name and description; the model pulls in the full body with the `load_skill` tool only when it decides the track is relevant. You get a large library of specialized instructions at near-zero standing context cost.

## Writing a track

`TRACK.md` is YAML frontmatter plus a Markdown body:

```markdown
---
name: pdf-tools          # optional; defaults to the directory name
description: Extract and merge PDF files  # surfaced in the system prompt
tags: [docs, pdf]        # optional, string or list
---

When the user asks to merge PDFs, run ...
```

Drop the directory in one of the track locations and it is picked up automatically — no code changes needed.

## Loading order

Later directories override earlier ones on name collision:

1. Global: `~/.lite-agent/tracks`
2. Project: `<workdir>/.lite-agent/tracks`
3. `skillsDir` config option, if set

## On-demand injection

At run time only the name, description, and tags of each track appear in the system prompt. When the model judges a track relevant, it calls the `load_skill` tool with the track name, and the full `TRACK.md` body is injected into context as the tool result. Tracks the model never touches cost nothing beyond their one-line listing.

## Programmatic access

Use `SkillLoader` / `loadTrackTool` directly if you need the same mechanism outside `createLiteAgent`.

## See also

- [Built-in tools](/sdk/tools/builtin-tools) — the `load_skill` tool reference.
- [Subagents](/sdk/tools/subagents) — the sibling markdown-driven capability (`agents/*.md`).
- [Custom tools](/sdk/tools/custom-tools) — package reusable behavior as a tool instead.
- [Agent SDK overview](/sdk/overview) — where tracks fit in the assembled agent.

---
name: robots.txt per-bot group override
description: Why bot-specific User-agent groups in robots.txt must repeat the wildcard Disallow rules.
---

# robots.txt: most-specific group wins (no inheritance)

A crawler obeys ONLY its single most-specific matching `User-agent` group in
robots.txt. Groups do NOT inherit rules from `User-agent: *`.

**Why:** If a bot has its own group (e.g. `User-agent: Googlebot` or
`User-agent: GPTBot`) containing just `Allow: /`, it ignores every `Disallow`
in the wildcard `*` group — so private paths (`/admin`, `/api/`, `/dashboard`,
etc.) become crawlable for exactly the bots you tried to single out. This is
easy to introduce when "welcoming" AI crawlers with a bare `Allow: /` group.

**How to apply:** When adding/keeping a bot-specific group, repeat the same
`Disallow` list used under `User-agent: *` inside that group. To keep it
maintainable, list multiple AI user-agents under one combined group followed by
a single shared `Allow:` + `Disallow:` block. In this repo the AI-crawler block
lives in `client/public/robots.txt`; keep its disallows in lockstep with the
`*` group's disallows. (Pre-existing `Googlebot`/`Bingbot` bare-`Allow: /`
groups have the same caveat if ever edited.)

---
name: SEO prerender, sitemap & canonical coupling
description: Why Google "Duplicate without user-selected canonical" happens on this SPA and the invariants that prevent it.
---

# SEO prerender / sitemap / canonical coupling

This is a React SPA that serves a byte-identical `index.html` shell for every
route. Per-page canonical tags are injected two ways only:
1. Client-side via `client/src/lib/seo.tsx` (`<SEO>` / react-helmet-async) — requires JS execution.
2. Bot-only prerender middleware `server/seo-prerender.ts` — serves unique static HTML (title/description/h1 + self-referencing `<link rel="canonical">`) for an **explicit allowlist** of routes (`ROUTE_CONTENT`), gated on bot user-agent.

## The failure mode
"Duplicate without user-selected canonical" in Search Console means Googlebot's
first-wave (pre-JS) crawl received identical shell HTML with **no canonical** for
multiple URLs, so Google grouped them and found no canonical to pick. This happens
for any **sitemap** URL that is NOT in the prerender `ROUTE_CONTENT` allowlist.

## Invariants to keep (or the error returns)
- **Every URL in `client/public/sitemap.xml` must have a matching entry in `ROUTE_CONTENT`** (`/` is aliased via `"/": HOME`). Sitemap and ROUTE_CONTENT are two manually-maintained sources of truth — they drift easily. When adding/removing a sitemap URL, update the prerender in lockstep.
- **Never prerender a route that the SPA redirects.** A `<Redirect>` route in `client/src/App.tsx` (e.g. `/for-employers` → `/`) must NOT be in the sitemap or in `ROUTE_CONTENT`; giving bots unique 200 content while users get redirected is cloaking and creates a canonical conflict. Check App.tsx `<Redirect>` routes before adding a path.
- Trailing-slash variants are already normalized by a 301 middleware in `server/index.ts` (runs before prerender), so allowlist lookups can assume no trailing slash.

**Why:** the prerender exists precisely because Googlebot's pre-JS snapshot of the
SPA is identical across routes; the canonical/title only exist after JS or via the
prerender. Keeping sitemap ⊆ prerender (minus redirected routes) is what guarantees
each indexable URL self-canonicalizes.

**How to apply:** when changing routes, the sitemap, or redirects, reconcile all
three: App.tsx routes (is it a redirect?), sitemap.xml (should it be indexed?),
and ROUTE_CONTENT (does it have unique prerender content?).

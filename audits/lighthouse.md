# Lighthouse

Lighthouse runs in your browser, not in CI, so this doc captures **how to run it** and
**what to expect**.

## How to run

1. Open https://lunepitch.pages.dev/ in Chrome (incognito window, no extensions)
2. DevTools (Cmd+Opt+I / F12) → **Lighthouse** tab
3. Device: **Mobile** for the stricter test, **Desktop** for the kinder one
4. Categories: tick **Performance · Accessibility · Best Practices · SEO**
5. Mode: **Navigation (Default)**
6. **Analyze page load**

## Expected scores

| Category | Target | Why |
| --- | --- | --- |
| Performance | ≥ 90 | Static HTML, single deferred JS file, ~50KB CSS, no render-blocking resources. May lose a few points to Google Fonts CSS round-trip and Unsplash image loading. |
| Accessibility | ≥ 95 | Semantic HTML, labels on every input, `aria-label` on icon buttons, focus-visible, color contrast verified. |
| Best Practices | 100 | No console errors expected. HTTPS, CSP, no deprecated APIs, no third-party cookies. |
| SEO | 100 | Per-page meta description + title + canonical + Open Graph + JSON-LD. |

## Pages to test

Run Lighthouse on at least these:

- `/` (home) — most visited, sets the baseline
- `/contact.html` — exercises the Turnstile widget + form
- `/docs/` — the heavier docs layout with sidebar + code tabs
- `/blog.html` — many external images (Unsplash)

## Known performance trade-offs

- **Google Fonts via CDN** — costs one extra DNS lookup + connection. Could be eliminated by self-hosting Inter as woff2 in the repo and adjusting CSP `font-src` to `'self'`. Trade-off: +200KB in the repo, +zero ongoing maintenance.
- **Unsplash images on blog/case-studies cards** — external host, not optimized for our specific dimensions. In production, run these through Cloudflare Images or a CDN that emits `<source>` + AVIF/WebP.
- **No image preloading** for the LCP candidate (hero stat block). Could add `<link rel="preload">` for the largest hero asset, but the hero is a CSS gradient + text — no image to preload.
- **`Cache-Control: max-age=300` on HTML** — short so the pitch updates land in <5 min. In a real production rollout you'd extend this to `max-age=3600` + use `stale-while-revalidate` for snappier repeat visits.

## Record results here after running

Fill in once you've run Lighthouse against the deploy:

```
Date:       _________
URL:        https://lunepitch.pages.dev/
Device:     Mobile / Desktop

Performance:     ___/100
Accessibility:   ___/100
Best Practices:  ___/100
SEO:             ___/100

Notes:
```

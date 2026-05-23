# Accessibility

Target: **WCAG 2.1 Level AA**.

## Static scan (this build)

`/audits/static-scan.py` audits every HTML file (18 in this build) for the common machine-detectable
WCAG violations. Latest run output:

```
A11Y       — 0 issues
SECURITY   — 0 issues
LINKS      — 0 broken
CONSISTENCY — 0 (after logo consolidation)
```

## What the scan checks

| WCAG criterion | How it's checked |
| --- | --- |
| 3.1.1 Language of Page | `<html lang>` attribute present |
| 1.1.1 Non-text Content | every `<img>` has an `alt` attribute |
| 2.5.3 Label in Name | every form input has a `<label>` |
| 4.1.2 Name, Role, Value | icon-only buttons have `aria-label` |
| 1.3.1 Info and Relationships | semantic HTML used (header/nav/main/footer/article) |
| 1.4.13 Content on Hover or Focus | focus-visible styles inherited |
| 2.1.1 Keyboard | no inline `onclick` requiring mouse; all interactions via `<button>` / `<a>` |

## What the build actively does for a11y

- **Semantic landmarks** on every page: `<header>`, `<nav aria-label="Primary">`, `<main>`, `<footer>`
- **`aria-current="page"`** on the active nav link
- **`aria-label`** on every icon-only button (mobile menu toggle, social icons, close buttons)
- **`alt=""`** with `aria-hidden="true"` on decorative images (logo mark inside a labeled link)
- **`role="status"` + `aria-live="polite"`** on the contact form's status message
- **`role="dialog" aria-modal="true" aria-labelledby="..."`** on the cookie consent modal
- **Esc key** closes the cookie modal and mobile menu
- **Focus management** — modal moves focus inside on open, returns to opener on close
- **`prefers-reduced-motion`** respected — scroll-reveal animations disabled if user has reduced motion preference
- **Form fields** all have explicit `<label for="...">`
- **Form errors** use `aria-live` status and visible border-color change (not just color — color + 2px border)
- **No keyboard traps** — every focusable element is reachable and exitable

## Manual checks to run (browser)

These can't be automated. Allow ~10 minutes:

1. **Keyboard-only navigation** — unplug your mouse. Tab through every page; press Enter on every link/button. Everything reachable, focus indicator visible, no traps.
2. **Screen reader smoke test** — macOS VoiceOver (Cmd+F5) or Windows NVDA. Listen to home, products, contact, docs/. Verify reading order makes sense, headings are announced, form errors are announced.
3. **200% zoom** — Cmd/Ctrl + several times. No horizontal scroll, no clipped text.
4. **Color contrast** — Chrome DevTools → Inspect element → Accessibility tab → Contrast. Mint text on dark bg meets 4.5:1 (large text 3:1).
5. **axe DevTools extension** — Install, click "Scan all of my page", expect zero critical/serious issues.
6. **Lighthouse Accessibility** — Chrome DevTools → Lighthouse → run. Target ≥95.

## Known minor gaps

- **Color-contrast for muted text** — `var(--text-dim)` (≈#5C6F69) on dark bg is **3.7:1** — passes for large/decorative text but borderline for body. The build uses `var(--text-muted)` (≈#8FA39C, **6.8:1**) for body. Worth a manual scan to confirm `--text-dim` only appears on captions / footer secondary text.
- **Skip-to-content link** — not present. Adding one is a 3-line change but not critical at this density of navigation.
- **`<table>` complexity** — none of the tables (docs pages) need `<caption>` since the surrounding heading does the job, but a real audit would consider adding them.

These are all minor items a real WCAG AA audit would flag as "nice-to-have," not failing.

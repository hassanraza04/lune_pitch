# Security & privacy audit

This folder documents what's been audited on the live site at
**https://lunepitch.pages.dev** and what's deliberately out of scope.

## Summary

| Area | Status | Detail |
| --- | --- | --- |
| HTTP security headers | ✅ Live | See [security-headers.md](./security-headers.md) |
| Content Security Policy | ✅ Strict | No `'unsafe-eval'`, no inline scripts |
| Cookie consent | ✅ Live | Opt-in for analytics/preferences, see [`/cookies.html`](../cookies.html) |
| Form security | ✅ Live | Server validation, Turnstile, honeypot, rate limit |
| Accessibility | ✅ Static scan passes | See [accessibility.md](./accessibility.md) |
| SEO / structured data | ✅ Validated | Google Rich Results: 1 valid Organization schema |
| Penetration test | ⛔ Out of scope | See [penetration-test-scope.md](./penetration-test-scope.md) |
| Lighthouse | 🟡 Manual | See [lighthouse.md](./lighthouse.md) (you run in browser) |

## How to re-run scans

```bash
# Header grade
open "https://securityheaders.com/?q=lunepitch.pages.dev&followRedirects=on"

# Structured data
open "https://search.google.com/test/rich-results?url=https://lunepitch.pages.dev/"

# Open Graph preview (LinkedIn / Slack / iMessage)
open "https://www.linkedin.com/post-inspector/inspect/https%3A%2F%2Flunepitch.pages.dev%2F"

# Lighthouse (Chrome DevTools)
# Open https://lunepitch.pages.dev in Chrome → DevTools → Lighthouse → Analyze page load
```

## Repo-side static scan

`/audits/static-scan.py` (run from project root) audits every HTML file for:

- Missing `<html lang>` attribute
- `<img>` without `alt`
- Inline event handlers (`onclick=`, `onload=`, etc.)
- `javascript:` href targets
- Broken internal links
- Sitemap / actual-files drift

Latest output (committed audit run): **0 a11y issues, 0 security issues, 0 broken links.**

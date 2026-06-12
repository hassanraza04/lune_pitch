# Lune redesign pitch

A full-stack redesign concept for **lunedata.io**, built as an independent outreach pitch
by Hassan Raza. Not affiliated with Lune Data.

**Live:** https://lunepitch.pages.dev
**Pitch overview:** https://lunepitch.pages.dev/pitch.html
**Repo:** https://github.com/hassanraza04/lune_pitch

---

## What's in this repo

```
.
├── *.html                  13 marketing pages (home, products, industries, …)
├── docs/                   5 developer documentation pages with sidebar layout
├── functions/api/          Cloudflare Pages Function for the contact form backend
├── audits/                 Security & accessibility audit scripts + docs
├── assets/
│   ├── css/styles.css      Design system, all in one file, no preprocessor
│   ├── js/app.js           Frontend: nav, fades, code tabs, form validation
│   ├── js/consent.js       Cookie consent banner + preferences modal
│   └── images/             Brand mark, social card, customer logos (+ raw sources)
├── _headers                Cloudflare Pages — security & cache headers per path
├── _redirects              Cloudflare Pages — redirects + 404 fallback
├── sitemap.xml             SEO sitemap (clean URLs)
├── robots.txt              Crawl rules + sitemap pointer
├── .well-known/security.txt  Responsible-disclosure contact (RFC 9116)
├── favicon-{16,32}.png     Browser tab favicons
└── apple-touch-icon.png    iOS bookmark icon (180×180)
```

## Design language

Financial editorial meets terminal. Lune parses raw transaction strings
for a living, so the site borrows the visual language of the ledger:

- **Type** — Fraunces (optical sizing) for display, Hanken Grotesk for
  body and UI, IBM Plex Mono strictly for data: figures, codes, the ticker
- **Structure** — hairline-ruled rows and columns instead of card grids;
  mono-keyed section indices (`01 / The platform`) with a moon-phase
  glyph that waxes toward full at the proof section (Lune = moon)
- **Signature element** — the enrichment ticker under the hero: raw card
  descriptors stream past and resolve into clean records
- **Motion** — one signature animation, quick fades elsewhere, everything
  static under `prefers-reduced-motion`

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Hosting | Cloudflare Pages | Free tier, real HTTP headers via `_headers`, unlimited bandwidth |
| Backend | Cloudflare Pages Function (`functions/api/contact.js`) | Same platform, no separate provider |
| Email | Resend | 3000/mo free, simple API, good deliverability |
| Bot protection | Cloudflare Turnstile | Free, privacy-friendly, no CAPTCHA fatigue |
| Analytics | Cloudflare Web Analytics | Free, no cookies, opt-in gated |
| Build system | None | Static HTML + vanilla CSS + vanilla JS. Fast, auditable, no supply chain. |

**Zero runtime cost.** $0/month under expected pitch traffic.

## What's live

All of these are deployed and functional on `lunepitch.pages.dev`:

1. **Strict HTTP security headers** — HSTS preload, CSP without `unsafe-eval`, X-Frame-Options DENY, Permissions-Policy locked down, Cross-Origin-* same-origin. Expected `securityheaders.com` grade: A+.
2. **Live contact form** — POSTs to `/api/contact`, server-side validation, Turnstile verification, Resend email, IP rate limit, honeypot. Submissions land in inbox in <5 seconds.
3. **Cookie consent banner** — opt-in by category (Necessary always-on, Analytics, Preferences). Persists in localStorage. Footer link re-opens the preferences modal anywhere.
4. **Privacy-friendly analytics** — Cloudflare Web Analytics, beacon gated behind consent. No tracking until the user accepts.
5. **Full SEO** — canonical, Open Graph, Twitter Card, JSON-LD structured data (Organization + WebSite + per-page schema). Google Rich Results: 1 valid Organization detected.
6. **Developer documentation site** — sidebar layout, 5 endpoint pages, language-switching code samples (cURL / Python / Node / Go), parameter tables, prev/next nav.
7. **Audit folder** — see [audits/](./audits) for what's been verified and what's deliberately out of scope.

## What's intentionally out of scope (and why)

The pitch.html roadmap section documents this in marketing language. Engineering-side:

- **Real legal copy** — templates only. Production needs Lune's actual privacy / terms text from their counsel.
- **CMS** — blog & case-study cards currently link out to the live `lunedata.io` posts. Production would wire to a headless CMS (Sanity / Contentful) with preview branches.
- **Authentication / sign-in** — none. The original site has no public sign-in, so this is intentionally absent.
- **Custom illustrations** — Unsplash stock photography on a few cards. Production would replace with Lune's brand designer's output.
- **Penetration test** — premature for a pitch (no real PII, no production traffic). Scope documented in `audits/penetration-test-scope.md`.
- **Email DNS records (SPF / DKIM / DMARC)** — requires domain ownership. Resend currently sends from `onboarding@resend.dev`; when Lune connects their domain, that switches to `hello@lunedata.io`.

## Local development

No build step. Open `index.html` in a browser, or serve via:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

For local testing of the contact form, you'd need to run Cloudflare Pages locally
via `wrangler pages dev .` with the three required environment variables set.

## Deploying

Pushes to the `main` branch on GitHub auto-deploy via the Cloudflare Pages GitHub integration.
The build is trivial — no compilation, no transpilation — so deploys complete in ~30 seconds.

```bash
git push origin main
```

## Environment variables (Cloudflare Pages → Settings → Variables and Secrets)

| Name | Type | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Sending key for the contact form |
| `TURNSTILE_SECRET` | Secret | Server-side Turnstile verification |
| `CONTACT_EMAIL_TO` | Plaintext | Recipient address for form submissions |

The Turnstile **site key** (public) lives inline in `contact.html` and is safe to commit.

## Reproducing the audits

```bash
# Static scan — a11y, security, link integrity, sitemap drift
python3 audits/static-scan.py
# Exits 0 if everything passes

# Header grade (in browser)
open "https://securityheaders.com/?q=lunepitch.pages.dev&followRedirects=on"

# Structured data
open "https://search.google.com/test/rich-results?url=https://lunepitch.pages.dev/"

# Lighthouse (Chrome DevTools)
# Run against https://lunepitch.pages.dev/ in an incognito window
```

## License & affiliation

**Not affiliated with Lune Data.** This is an unsolicited redesign pitch.
Marketing copy is original; client names (ADIB, NBF, D360, Beyon Money, Alaan Pay) and
certification names (SOC, ISO 27001, Dubai AI Seal) are factual references to publicly listed
relationships on lunedata.io. Blog post titles and case study client names link directly to
the original `lunedata.io` for content ownership reasons.

For the Lune team: this site, the Cloudflare account, the Resend account, the Turnstile
config, and the GitHub repo are all owned by Hassan Raza. If you'd like to engage on a
real version, everything here can be migrated to your accounts in under an hour.

— Hassan Raza · hr2616@nyu.edu

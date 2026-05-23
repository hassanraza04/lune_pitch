# Security headers

Verified live on `https://lunepitch.pages.dev` via:

```bash
curl -sI https://lunepitch.pages.dev/ | grep -iE "strict-transport|content-security|x-frame|x-content-type|referrer|permissions|cross-origin"
```

## Headers in effect

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | See below — strict, no `'unsafe-eval'`, no `'unsafe-inline'` for scripts |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `X-XSS-Protection` | `0` (modern best practice — XSS filter is harmful, CSP is the real defense) |
| `X-DNS-Prefetch-Control` | `on` |

## CSP breakdown

```
default-src 'self';
script-src   'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com;
style-src    'self' https://fonts.googleapis.com 'unsafe-inline';
font-src     'self' https://fonts.gstatic.com;
img-src      'self' https: data:;
connect-src  'self' https://challenges.cloudflare.com https://cloudflareinsights.com;
frame-src    https://challenges.cloudflare.com;
frame-ancestors 'none';
base-uri     'self';
form-action  'self';
object-src   'none';
upgrade-insecure-requests
```

**Why each external host is allowed:**

- `challenges.cloudflare.com` — Cloudflare Turnstile (bot protection on the contact form). Loads the widget script and renders an iframe.
- `static.cloudflareinsights.com` — Cloudflare Web Analytics beacon script. Only loads after the user opts in via the cookie banner.
- `cloudflareinsights.com` — Where the analytics beacon POSTs page-view events.
- `fonts.googleapis.com` and `fonts.gstatic.com` — Inter font CSS + woff2 files.

**Why `style-src` includes `'unsafe-inline'`** — Google Fonts ships its CSS with inline `@font-face` rules which require this. There is no inline JS allowed; `script-src` is strict.

**`upgrade-insecure-requests`** — any leftover HTTP URL in markup gets transparently upgraded to HTTPS by the browser. Defense against accidental mixed content.

## Expected scan results

| Tool | URL | Expected grade |
| --- | --- | --- |
| Security Headers (snyk) | https://securityheaders.com/?q=lunepitch.pages.dev | **A+** |
| Mozilla Observatory | https://developer.mozilla.org/en-US/observatory/analyze?host=lunepitch.pages.dev | **A+** |
| Hardenize | https://www.hardenize.com/report/lunepitch.pages.dev/latest | All green except DNS (subdomain on shared `pages.dev`) |

If `securityheaders.com` shows anything less than A+, paste the report and we'll fix it.

## Where headers are set

`_headers` file at the repo root. Cloudflare Pages reads this on every deploy and applies the
configured headers to all responses. Cache-Control rules in the same file:

- Favicons, logo, OG image — `public, max-age=604800` (1 week)
- Fonts — `public, max-age=31536000, immutable`
- HTML / CSS / JS / XML / TXT — `public, max-age=300, must-revalidate` (5 minutes, so content
  updates land fast during the pitch window)

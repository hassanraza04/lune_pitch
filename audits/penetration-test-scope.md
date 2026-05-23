# Penetration test — scope (intentionally out of scope for this build)

A real penetration test is performed by an external firm against a production deployment with
real customer data and a defined contract. **This build is a design pitch, not a production
deployment**, so a pen test would be premature. This document captures what a real test would
cover, so we can hand it off when the time comes.

## What an external pen test would cover

### Application layer

- **Injection attacks** — SQL injection, NoSQL injection, command injection, LDAP injection against any backend that touches the contact form.
- **XSS** — reflected and stored. The build's CSP (`script-src 'self'` with no `unsafe-inline`) is the primary defense; pen test would attempt CSP bypasses.
- **CSRF** — confirm no state-changing endpoints accept cross-origin requests without a token. Currently the only state-changing endpoint is `/api/contact` and it's protected by Turnstile + same-origin form-action.
- **SSRF** — confirm the contact-form backend can't be tricked into fetching arbitrary URLs.
- **Authentication & session** — N/A here (no user auth surface). When sign-in is added, this becomes critical.
- **Authorization** — N/A here. When customer dashboards exist, test IDOR, privilege escalation, scope leakage between tenants.
- **Open redirects** — the only `_redirects` rule is `/docs.html → /docs/` (internal). Verify no user input can construct a redirect target.
- **Rate limiting & DoS** — confirm the contact form's IP rate limit holds under burst. Cloudflare's free tier provides DDoS protection at the edge.

### Infrastructure

- **TLS configuration** — Cloudflare manages the cert. Test cipher suites, protocol versions, OCSP stapling, HSTS preload submission.
- **DNS** — when a real domain is added, audit SPF, DKIM, DMARC, CAA, DNSSEC.
- **Subdomain takeover** — when subdomains exist (e.g. `docs.lunedata.io`), verify each has an active backing service.
- **Cloud configuration** — Cloudflare account audit: 2FA on all members, API token scopes minimized, audit log monitored.

### Secrets & supply chain

- **Secret leakage** — scan repo history (`gitleaks`, `truffleHog`) for any accidentally committed keys.
- **Dependency vulnerabilities** — currently none (no npm packages, no Python dependencies in production code). Re-audit when a build pipeline is added.
- **Subresource Integrity (SRI)** — third-party scripts (Google Fonts CSS, Cloudflare Turnstile, Cloudflare Analytics) are loaded without SRI hashes. This is the standard trade-off — those scripts auto-update — but a high-security target may want SRI on Turnstile + a frozen version.

### Privacy / data handling

- **GDPR / UAE PDPL data subject rights** — verify the data export and deletion flow when one exists.
- **Cookie consent flow** — verify analytics tag only fires after explicit opt-in, doesn't fire on legitimate-interest pretext.
- **Logging hygiene** — confirm no PII (email, name, message content) ends up in application logs or analytics events. The contact form's Pages Function only logs error categories, never payload contents.

## What this build does pre-emptively

- Strict CSP, HSTS preload, X-Frame-Options DENY, Permissions-Policy locked down — `audits/security-headers.md`
- Contact form: server-side validation, length caps, regex on names/email, Turnstile verification, IP-based rate limiting (Pages Function), honeypot field as second-line bot filter
- No inline scripts anywhere — CSP would block them and the audit confirms zero
- Outbound links use `rel="noopener noreferrer"` (defends against `window.opener` reverse-tab-nabbing)
- `.well-known/security.txt` published with disclosure contact

## When to run a real pen test

Before any of the following:

1. First production customer goes live with real PII
2. SOC 2 Type II audit window opens (the auditor will ask)
3. Major architectural changes (auth system, multi-tenant dashboard, payment integration)
4. After a near-miss security incident or industry CVE that touches our stack

## Recommended firms

(Decided by the customer's CISO. Common picks for fintech in MENA / Europe: Trail of Bits,
NCC Group, Cobalt, Bishop Fox. Cloudflare also offers managed pen testing for customers on
Enterprise plans.)

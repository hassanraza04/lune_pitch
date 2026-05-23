/**
 * Cloudflare Worker: serves static assets and applies security headers
 * on every response. Configured via wrangler.jsonc (assets.binding = ASSETS,
 * assets.run_worker_first = true).
 */

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' https: data:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "object-src 'none'; " +
    'upgrade-insecure-requests',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-XSS-Protection': '0',
  'X-DNS-Prefetch-Control': 'on',
};

const CACHE_RULES = [
  { pattern: /\.(svg|png|jpg|jpeg|gif|webp|ico)$/i, value: 'public, max-age=604800' },
  { pattern: /\.(woff2?|ttf|otf)$/i, value: 'public, max-age=31536000, immutable' },
  { pattern: /\.(html|css|js|xml|txt)$/i, value: 'public, max-age=300, must-revalidate' },
];

function applyHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  for (const rule of CACHE_RULES) {
    if (rule.pattern.test(pathname)) {
      headers.set('Cache-Control', rule.value);
      break;
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve the asset (or let the runtime's 404 handler return 404.html via not_found_handling).
    const assetResponse = await env.ASSETS.fetch(request);
    return applyHeaders(assetResponse, url.pathname);
  },
};

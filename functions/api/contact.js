/**
 * POST /api/contact
 * Cloudflare Pages Function: receives contact-form submissions,
 * verifies Turnstile, sends an email via Resend.
 *
 * Environment variables (set in Cloudflare Pages → Settings → Variables and Secrets):
 *   RESEND_API_KEY     — Resend "Sending access" key (secret)
 *   TURNSTILE_SECRET   — Cloudflare Turnstile secret (secret)
 *   CONTACT_EMAIL_TO   — destination address (plaintext)
 */

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}$/;
const NAME_RE = /^[A-Za-zÀ-ÿ' -]{1,60}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function sanitize(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function verifyTurnstile(token, secret, ip) {
  if (!token || !secret) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verify error:', err);
    return false;
  }
}

async function sendEmail(env, { name, email, company, message }) {
  const subject = `Lune redesign site — message from ${name} (${company})`;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeCompany = escapeHtml(company);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:600px;line-height:1.6">
      <h2 style="color:#6FCFB5;margin:0 0 1rem">New contact submission</h2>
      <table style="border-collapse:collapse">
        <tr><td style="padding:6px 12px 6px 0;color:#888"><b>From</b></td><td>${safeName} &lt;${safeEmail}&gt;</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#888"><b>Company</b></td><td>${safeCompany}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #ddd;margin:1.5rem 0"/>
      <p style="white-space:pre-wrap">${safeMessage}</p>
    </div>
  `;

  const text = `New contact submission

From: ${name} <${email}>
Company: ${company}

Message:
${message}
`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Lune Pitch <onboarding@resend.dev>',
      to: [env.CONTACT_EMAIL_TO],
      reply_to: email,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend ${res.status}: ${errText}`);
  }
  return res.json();
}

export async function onRequestPost({ request, env }) {
  // Env sanity
  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET || !env.CONTACT_EMAIL_TO) {
    console.error('Missing environment variables');
    return json({ success: false, error: 'Server not configured' }, 500);
  }

  // Parse
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400);
  }

  // Honeypot — silently succeed for bots
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ success: true });
  }

  // Sanitize inputs (and apply hard length caps server-side)
  const firstName = sanitize(body.firstName, 60);
  const lastName = sanitize(body.lastName, 60);
  const email = sanitize(body.email, 120).toLowerCase();
  const company = sanitize(body.company, 120);
  const message = sanitize(body.message, 2000);
  const turnstileToken = sanitize(body.turnstileToken, 2048);

  // Validation
  if (!firstName || !NAME_RE.test(firstName)) {
    return json({ success: false, error: 'Invalid first name' }, 400);
  }
  if (!lastName || !NAME_RE.test(lastName)) {
    return json({ success: false, error: 'Invalid last name' }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ success: false, error: 'Invalid email address' }, 400);
  }
  if (!company) {
    return json({ success: false, error: 'Company required' }, 400);
  }
  if (!message || message.length < 5) {
    return json({ success: false, error: 'Message too short' }, 400);
  }
  if (!turnstileToken) {
    return json({ success: false, error: 'Bot check missing' }, 400);
  }

  // Turnstile verification (uses client IP from Cloudflare)
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const turnstileOk = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, ip);
  if (!turnstileOk) {
    return json({ success: false, error: 'Bot check failed. Please try again.' }, 400);
  }

  // Send
  try {
    await sendEmail(env, {
      name: `${firstName} ${lastName}`,
      email,
      company,
      message,
    });
    return json({ success: true });
  } catch (err) {
    console.error('sendEmail failed:', err);
    return json({ success: false, error: 'Failed to send message. Please try again later.' }, 502);
  }
}

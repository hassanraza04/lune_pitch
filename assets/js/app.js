/* ============================================
   Lune — App scripts
   Strict mode, no globals, no eval/innerHTML.
   ============================================ */

(() => {
  'use strict';

  /* ---------- DOM helpers ---------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Nav: scroll-state + mobile toggle ---------- */
  const nav = $('#nav');
  const navToggle = $('#navToggle');
  const navLinks = $('#navLinks');

  /* ---------- Active-page marker on primary nav ---------- */
  // Adds aria-current="page" to the nav link matching the current URL.
  // Idempotent — won't override an aria-current already set by the markup.
  (function markActiveNav() {
    if (!navLinks) return;
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const file = path.split('/').pop() || 'index.html';
    $$('a', navLinks).forEach((a) => {
      if (a.hasAttribute('aria-current')) return;
      const href = (a.getAttribute('href') || '').replace(/^\.?\//, '');
      // skip the mobile CTA button
      if (a.classList.contains('btn')) return;
      const isHome = (file === '' || file === 'index.html') && (href === 'index.html' || href === '');
      const isMatch = isHome || href === file ||
                      (href === 'docs/' && path.includes('/docs/'));
      if (isMatch) a.setAttribute('aria-current', 'page');
    });
  })();

  const setNavState = () => {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  setNavState();
  window.addEventListener('scroll', setNavState, { passive: true });

  if (navToggle && navLinks) {
    const closeMenu = () => {
      navLinks.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    };
    const openMenu = () => {
      navLinks.classList.add('is-open');
      navToggle.classList.add('is-open');
      navToggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-open');
    };

    navToggle.addEventListener('click', () => {
      if (navLinks.classList.contains('is-open')) closeMenu();
      else openMenu();
    });

    $$('a', navLinks).forEach((a) => a.addEventListener('click', closeMenu));

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
        closeMenu();
        navToggle.focus();
      }
    });

    // Close if the viewport grows past the mobile breakpoint (e.g., orientation change)
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && navLinks.classList.contains('is-open')) closeMenu();
    });
  }

  /* ---------- Reveal-on-scroll ---------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* Stat counters removed by design. Figures are set statically in the
     markup: numbers that hold still read as audited, numbers that animate
     read as marketing. */

  /* ---------- Email validation (RFC-5322 simplified) ---------- */
  const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}$/;
  const isValidEmail = (s) => typeof s === 'string' && s.length <= 120 && EMAIL_RE.test(s);

  /* ---------- Contact form ---------- */
  const form = $('#contactForm');
  const status = $('#formStatus');

  // Simple client-side rate limit (best-effort; defense in depth, not security)
  const RATE_LIMIT_MS = 8000;
  let lastSubmit = 0;

  const setStatus = (msg, kind) => {
    if (!status) return;
    status.textContent = msg;
    status.style.color =
      kind === 'error' ? 'var(--danger)' :
      kind === 'success' ? 'var(--mint)' :
      'var(--text-muted)';
  };

  /* Per-field error helpers */
  const FIELD_LABELS = {
    firstName: 'first name',
    lastName: 'last name',
    email: 'work email',
    company: 'company',
    message: 'message',
  };

  const errorIdFor = (field) => `${field.id}-error`;

  const showFieldError = (field, msg) => {
    field.style.borderColor = 'var(--danger)';
    field.setAttribute('aria-invalid', 'true');
    const id = errorIdFor(field);
    let err = document.getElementById(id);
    if (!err) {
      err = document.createElement('p');
      err.id = id;
      err.className = 'form-field-error';
      err.setAttribute('role', 'alert');
      field.parentNode.appendChild(err);
      const described = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (!described.includes(id)) described.push(id);
      field.setAttribute('aria-describedby', described.join(' '));
    }
    err.textContent = msg;
  };

  const clearFieldError = (field) => {
    field.style.borderColor = '';
    field.removeAttribute('aria-invalid');
    const err = document.getElementById(errorIdFor(field));
    if (err) err.remove();
  };

  const validateField = (field) => {
    const name = field.name || field.id;
    const val = (field.value || '').trim();
    const label = FIELD_LABELS[name] || name || 'this field';
    if (field.hasAttribute('required') && !val) {
      showFieldError(field, `Please enter your ${label}.`);
      return false;
    }
    if (field.type === 'email' && val && !isValidEmail(val)) {
      showFieldError(field, 'Enter a valid work email address.');
      return false;
    }
    if (field.tagName === 'TEXTAREA' && val.length > 2000) {
      showFieldError(field, 'Please keep your message under 2,000 characters.');
      return false;
    }
    clearFieldError(field);
    return true;
  };

  if (form && status) {
    // Inline validation on blur — show errors only after the user finishes the field
    $$('input, textarea', form).forEach((field) => {
      if (!field.id || field.type === 'hidden') return;
      field.addEventListener('blur', () => { if (field.value || field.hasAttribute('required')) validateField(field); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Honeypot — bots fill hidden fields
      const honeypot = form.querySelector('input[name="website"]');
      if (honeypot && honeypot.value.trim() !== '') {
        setStatus('Thanks — we\'ll be in touch.', 'success');
        form.reset();
        return;
      }

      // Rate limit
      const now = Date.now();
      if (now - lastSubmit < RATE_LIMIT_MS) {
        setStatus('Please wait a moment before sending again.', 'error');
        return;
      }

      // Validate every field, collect first-invalid
      const fields = $$('input, textarea', form).filter((f) => f.id && f.type !== 'hidden');
      let firstInvalid = null;
      fields.forEach((field) => {
        const ok = validateField(field);
        if (!ok && !firstInvalid) firstInvalid = field;
      });

      const email = $('#email', form);
      const message = $('#message', form);

      if (firstInvalid) {
        setStatus('Please fix the highlighted fields and try again.', 'error');
        // Move focus to first invalid for keyboard / screen-reader users
        try { firstInvalid.focus({ preventScroll: false }); } catch (_) { firstInvalid.focus(); }
        return;
      }

      // Turnstile token must be present (widget auto-fills cf-turnstile-response)
      const turnstileField = form.querySelector('[name="cf-turnstile-response"]');
      const turnstileToken = turnstileField ? turnstileField.value : '';
      if (!turnstileToken) {
        setStatus('Please complete the bot check before sending.', 'error');
        return;
      }

      lastSubmit = now;
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      setStatus('', 'info');

      const payload = {
        firstName: $('#firstName', form)?.value || '',
        lastName: $('#lastName', form)?.value || '',
        email: email?.value || '',
        company: $('#company', form)?.value || '',
        message: message?.value || '',
        website: honeypot ? honeypot.value : '',
        turnstileToken,
      };

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) {
            form.reset();
            // Reset Turnstile widget so the user can submit again if they want
            if (window.turnstile && typeof window.turnstile.reset === 'function') {
              try { window.turnstile.reset(); } catch (_) { /* ignore */ }
            }
            setStatus('Thanks — your message is on its way. We\'ll be in touch within one business day.', 'success');
          } else {
            setStatus(data.error || 'Something went wrong. Please try again in a moment.', 'error');
            if (window.turnstile && typeof window.turnstile.reset === 'function') {
              try { window.turnstile.reset(); } catch (_) { /* ignore */ }
            }
          }
        })
        .catch(() => {
          setStatus('Network error. Please check your connection and try again.', 'error');
          if (window.turnstile && typeof window.turnstile.reset === 'function') {
            try { window.turnstile.reset(); } catch (_) { /* ignore */ }
          }
        })
        .finally(() => {
          btn.disabled = false;
          btn.textContent = originalText;
        });
    });

    // While the user types, clear that field's error state so it doesn't nag mid-keystroke
    $$('input, select, textarea', form).forEach((field) => {
      field.addEventListener('input', () => { clearFieldError(field); });
    });
  }

  /* ---------- Sign-in form (visual only — no auth backend) ---------- */
  const signinForm = $('#signinForm');
  const signinStatus = $('#signinStatus');
  if (signinForm && signinStatus) {
    signinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#signinEmail');
      const pwd = $('#signinPassword');
      const set = (msg, ok) => {
        signinStatus.textContent = msg;
        signinStatus.style.color = ok ? 'var(--mint)' : 'var(--danger)';
      };
      if (!email || !pwd) return;
      if (!isValidEmail(email.value.trim())) {
        email.style.borderColor = 'var(--danger)';
        set('Enter a valid email address.', false);
        return;
      }
      if (!pwd.value || pwd.value.length < 8) {
        pwd.style.borderColor = 'var(--danger)';
        set('Password must be at least 8 characters.', false);
        return;
      }
      email.style.borderColor = '';
      pwd.style.borderColor = '';
      set('Sign-in is not wired up in this demo build.', false);
    });
    $$('input', signinForm).forEach((f) =>
      f.addEventListener('input', () => { f.style.borderColor = ''; })
    );
  }

  /* ---------- Docs code tabs ---------- */
  $$('.code-tabs').forEach((group) => {
    const buttons = $$('.code-tabs-buttons button', group);
    const panels = $$('.code-tabs-panel', group);
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        buttons.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
        panels.forEach((p) => p.setAttribute('data-active', String(p.dataset.lang === lang)));
      });
    });
  });

  /* ---------- Smooth scroll for in-page anchors ---------- */
  $$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      let target;
      try { target = document.querySelector(id); } catch { return; }
      if (!target) return;
      e.preventDefault();
      const navHeight = nav ? nav.offsetHeight : 72;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

})();

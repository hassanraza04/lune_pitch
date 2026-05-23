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

  const setNavState = () => {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  setNavState();
  window.addEventListener('scroll', setNavState, { passive: true });

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });

    $$('a', navLinks).forEach((a) =>
      a.addEventListener('click', () => {
        navLinks.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      })
    );

    // Close menu on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
        navLinks.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
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

  /* ---------- Animated counters ---------- */
  const counters = $$('.counter');
  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.target || '0');
    if (!Number.isFinite(target)) return;
    const decimals = (el.dataset.target || '').split('.')[1]?.length || 0;
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = decimals > 0
        ? value.toFixed(decimals)
        : Math.round(value).toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = decimals > 0
          ? target.toFixed(decimals)
          : Math.round(target).toLocaleString();
      }
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window && counters.length) {
    const cio = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  } else {
    counters.forEach((el) => {
      const target = parseFloat(el.dataset.target || '0');
      const decimals = (el.dataset.target || '').split('.')[1]?.length || 0;
      if (Number.isFinite(target)) {
        el.textContent = decimals > 0 ? target.toFixed(decimals) : target.toLocaleString();
      }
    });
  }

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

  if (form && status) {
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

      // Required fields
      const required = $$('[required]', form);
      let valid = true;
      required.forEach((field) => {
        const val = (field.value || '').trim();
        if (!val) {
          field.style.borderColor = 'var(--danger)';
          valid = false;
        } else {
          field.style.borderColor = '';
        }
      });

      // Email
      const email = $('#email', form);
      if (email && !isValidEmail(email.value.trim())) {
        email.style.borderColor = 'var(--danger)';
        valid = false;
      }

      // Length sanity for textarea
      const message = $('#message', form);
      if (message && message.value.length > 2000) {
        message.style.borderColor = 'var(--danger)';
        valid = false;
      }

      if (!valid) {
        setStatus('Please fill in all required fields with a valid email.', 'error');
        return;
      }

      lastSubmit = now;
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      setStatus('', 'info');

      // No backend wired up — simulate. Replace with `fetch('/api/contact', { ... })`
      window.setTimeout(() => {
        form.reset();
        btn.disabled = false;
        btn.textContent = originalText;
        setStatus('Thanks — we\'ll be in touch within one business day.', 'success');
      }, 900);
    });

    $$('input, select, textarea', form).forEach((field) => {
      field.addEventListener('input', () => {
        field.style.borderColor = '';
      });
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

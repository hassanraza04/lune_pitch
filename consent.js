/**
 * Lune — Cookie consent (vanilla JS, no dependencies).
 *
 * Behavior:
 *   - First visit: shows a slim banner at the bottom.
 *   - User can accept all, reject all (non-essential), or customize per category.
 *   - Choice persists in localStorage under "lune.consent.v1".
 *   - A "Cookie preferences" link in the footer (or anywhere with
 *     data-consent-toggle) re-opens the preferences modal.
 *
 * Public API:
 *   window.luneConsent.get()          → current state object
 *   window.luneConsent.has(category)  → boolean
 *   window.luneConsent.show()         → opens preferences modal
 *   window.luneConsent.on(handler)    → subscribe to changes
 *
 * Gating scripts behind consent:
 *   <script type="text/plain" data-consent="analytics" src="..."></script>
 *   When consent is granted, the tag is rewritten to a live script tag.
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'lune.consent.v1';
  const CATEGORIES = ['analytics', 'preferences']; // necessary is always on

  const defaults = {
    necessary: true,
    analytics: false,
    preferences: false,
    decided: false,
    timestamp: 0,
  };

  const listeners = new Set();

  // ---------------- State ----------------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaults };
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed, necessary: true };
    } catch {
      return { ...defaults };
    }
  }

  function save(next) {
    const state = {
      ...next,
      necessary: true,
      decided: true,
      timestamp: Date.now(),
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    apply(state);
    listeners.forEach((fn) => { try { fn(state); } catch (_) {} });
    return state;
  }

  function apply(state) {
    document.querySelectorAll('script[type="text/plain"][data-consent]').forEach((tpl) => {
      const cat = tpl.dataset.consent;
      if (!state[cat]) return;
      const real = document.createElement('script');
      for (const a of tpl.attributes) {
        if (a.name !== 'type' && a.name !== 'data-consent') {
          real.setAttribute(a.name, a.value);
        }
      }
      if (!tpl.src) real.textContent = tpl.textContent;
      tpl.parentNode.insertBefore(real, tpl);
      tpl.remove();
    });
  }

  // ---------------- UI ----------------
  let bannerEl = null;
  let modalEl = null;
  let lastFocused = null;

  function bannerMarkup() {
    return `
      <div class="consent-banner" role="region" aria-label="Cookie consent">
        <div class="consent-banner-inner">
          <div class="consent-banner-text">
            <strong>We use cookies sparingly.</strong>
            <p>Some keep the site working. Others help us count visits. You choose.
              <a href="cookies.html">Read our cookie policy</a>.</p>
          </div>
          <div class="consent-banner-buttons">
            <button type="button" class="btn btn--ghost" data-consent-reject>Reject non-essential</button>
            <button type="button" class="btn btn--ghost" data-consent-customize>Customize</button>
            <button type="button" class="btn btn--primary" data-consent-accept>Accept all</button>
          </div>
        </div>
      </div>
    `;
  }

  function modalMarkup() {
    return `
      <div class="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-modal-title" hidden>
        <div class="consent-modal-backdrop" data-consent-cancel></div>
        <div class="consent-modal-card" role="document">
          <button type="button" class="consent-modal-close" aria-label="Close preferences" data-consent-cancel>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2 id="consent-modal-title">Cookie preferences</h2>
          <p class="consent-modal-intro">Choose which cookies you want us to use. You can change these anytime via the footer link.</p>

          <div class="consent-category consent-category--locked">
            <div class="consent-category-row">
              <strong>Strictly necessary</strong>
              <span class="consent-locked-label">Always on</span>
            </div>
            <p>Required for the site to function. Includes remembering your cookie preferences.</p>
          </div>

          <div class="consent-category">
            <div class="consent-category-row">
              <label class="consent-category-label" for="consent-cat-analytics">Analytics</label>
              <label class="consent-toggle">
                <input type="checkbox" id="consent-cat-analytics" data-consent-cat="analytics" />
                <span class="consent-toggle-track" aria-hidden="true"></span>
              </label>
            </div>
            <p>Privacy-friendly counts of visits and page reads. No cross-site tracking.</p>
          </div>

          <div class="consent-category">
            <div class="consent-category-row">
              <label class="consent-category-label" for="consent-cat-preferences">Preferences</label>
              <label class="consent-toggle">
                <input type="checkbox" id="consent-cat-preferences" data-consent-cat="preferences" />
                <span class="consent-toggle-track" aria-hidden="true"></span>
              </label>
            </div>
            <p>Remembers small UI choices like region or dashboard view.</p>
          </div>

          <div class="consent-modal-actions">
            <button type="button" class="btn btn--ghost" data-consent-reject>Reject non-essential</button>
            <button type="button" class="btn btn--primary" data-consent-save>Save preferences</button>
          </div>
        </div>
      </div>
    `;
  }

  function injectUI() {
    if (bannerEl || modalEl) return;
    const bannerWrap = document.createElement('div');
    bannerWrap.innerHTML = bannerMarkup();
    bannerEl = bannerWrap.firstElementChild;
    document.body.appendChild(bannerEl);

    const modalWrap = document.createElement('div');
    modalWrap.innerHTML = modalMarkup();
    modalEl = modalWrap.firstElementChild;
    document.body.appendChild(modalEl);

    // Wire buttons
    bannerEl.querySelector('[data-consent-accept]').addEventListener('click', acceptAll);
    bannerEl.querySelector('[data-consent-reject]').addEventListener('click', rejectAll);
    bannerEl.querySelector('[data-consent-customize]').addEventListener('click', openModal);

    modalEl.querySelectorAll('[data-consent-cancel]').forEach((el) =>
      el.addEventListener('click', closeModal)
    );
    modalEl.querySelector('[data-consent-save]').addEventListener('click', savePreferences);
    modalEl.querySelector('[data-consent-reject]').addEventListener('click', () => {
      rejectAll();
      closeModal();
    });

    // Escape closes
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalEl && !modalEl.hidden) closeModal();
    });
  }

  function showBanner() {
    if (!bannerEl) return;
    requestAnimationFrame(() => bannerEl.classList.add('is-visible'));
  }

  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove('is-visible');
  }

  function openModal() {
    if (!modalEl) return;
    lastFocused = document.activeElement;
    const state = load();
    CATEGORIES.forEach((cat) => {
      const cb = modalEl.querySelector(`[data-consent-cat="${cat}"]`);
      if (cb) cb.checked = !!state[cat];
    });
    modalEl.hidden = false;
    requestAnimationFrame(() => modalEl.classList.add('is-visible'));
    // Move focus into modal
    const closeBtn = modalEl.querySelector('.consent-modal-close');
    if (closeBtn) closeBtn.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('is-visible');
    document.body.style.overflow = '';
    // Wait for transition before hiding
    setTimeout(() => { if (modalEl) modalEl.hidden = true; }, 200);
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus(); } catch (_) {}
    }
  }

  function acceptAll() {
    const state = { necessary: true };
    CATEGORIES.forEach((c) => { state[c] = true; });
    save(state);
    hideBanner();
    closeModal();
  }

  function rejectAll() {
    const state = { necessary: true };
    CATEGORIES.forEach((c) => { state[c] = false; });
    save(state);
    hideBanner();
  }

  function savePreferences() {
    const state = { necessary: true };
    CATEGORIES.forEach((cat) => {
      const cb = modalEl.querySelector(`[data-consent-cat="${cat}"]`);
      state[cat] = !!(cb && cb.checked);
    });
    save(state);
    hideBanner();
    closeModal();
  }

  // ---------------- Init ----------------
  function init() {
    injectUI();
    const state = load();
    if (!state.decided) showBanner();
    apply(state);

    // Footer "Cookie preferences" link(s)
    document.querySelectorAll('[data-consent-toggle]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
      });
    });
  }

  // Public API
  window.luneConsent = {
    get: () => load(),
    has: (cat) => !!load()[cat],
    show: openModal,
    on: (fn) => {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

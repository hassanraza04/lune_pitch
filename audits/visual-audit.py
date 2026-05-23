#!/usr/bin/env python3
"""
Visual audit of the live site across breakpoints.

Captures viewport screenshots of the key pages at four common widths and
saves them to /tmp/audit-screenshots/ for review. Also captures the
mobile-menu-open state on the home page so we can verify the drawer UX.

Run from the project root:
    python3 audits/visual-audit.py
"""
from __future__ import annotations

import os
from playwright.sync_api import sync_playwright

BASE = "https://lunepitch.pages.dev"
OUT = "/tmp/audit-screenshots"
os.makedirs(OUT, exist_ok=True)

PAGES = [
    ("home", "/"),
    ("products", "/products.html"),
    ("industries", "/industries.html"),
    ("case-studies", "/case-studies.html"),
    ("about", "/about.html"),
    ("docs-index", "/docs/"),
    ("docs-enrich", "/docs/enrichment.html"),
    ("blog", "/blog.html"),
    ("contact", "/contact.html"),
    ("pitch", "/pitch.html"),
]

VIEWPORTS = [
    ("mobile", 390, 844),    # iPhone 14
    ("tablet", 768, 1024),   # iPad portrait
    ("laptop", 1280, 800),   # 13" laptop
    ("desktop", 1920, 1080), # 16" external monitor
]

CONSENT_INIT = """
  try {
    localStorage.setItem('lune.consent.v1', JSON.stringify({
      necessary: true, analytics: false, preferences: false,
      decided: true, timestamp: Date.now()
    }));
  } catch (e) {}
"""

def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for vp_name, w, h in VIEWPORTS:
            ctx = browser.new_context(viewport={'width': w, 'height': h},
                                      device_scale_factor=1)
            ctx.add_init_script(CONSENT_INIT)
            page = ctx.new_page()
            for page_name, path in PAGES:
                url = BASE + path
                try:
                    page.goto(url, wait_until='networkidle', timeout=15000)
                    page.wait_for_timeout(400)
                    out = f"{OUT}/{vp_name}_{page_name}.png"
                    page.screenshot(path=out, full_page=False)
                    print(f"  ✓ {vp_name}  {page_name:14} -> {out}")
                except Exception as e:
                    print(f"  ✗ {vp_name}  {page_name:14} FAILED: {e}")

            # Extra: mobile-menu-open state on the home page (mobile only)
            if vp_name == 'mobile':
                page.goto(BASE + "/", wait_until='networkidle', timeout=15000)
                page.wait_for_timeout(300)
                page.click('#navToggle')
                page.wait_for_timeout(450)
                out = f"{OUT}/{vp_name}_home-menu-open.png"
                page.screenshot(path=out, full_page=False)
                print(f"  ✓ {vp_name}  home-menu-open  -> {out}")

                # And the menu open after the user has scrolled
                page.goto(BASE + "/", wait_until='networkidle', timeout=15000)
                page.wait_for_timeout(300)
                page.evaluate("window.scrollTo(0, 600)")
                page.wait_for_timeout(200)
                page.click('#navToggle')
                page.wait_for_timeout(450)
                out = f"{OUT}/{vp_name}_home-menu-open-scrolled.png"
                page.screenshot(path=out, full_page=False)
                print(f"  ✓ {vp_name}  home-menu-open-scrolled -> {out}")

            ctx.close()
        browser.close()


if __name__ == "__main__":
    capture()
    print(f"\nAll screenshots saved to {OUT}/")

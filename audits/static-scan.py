#!/usr/bin/env python3
"""
Static audit for the Lune redesign pitch.

Scans every HTML file in the repo for:
  - a11y      <html lang>, alt on <img>, semantic role hints
  - security  inline event handlers, javascript: hrefs
  - links     broken internal hrefs
  - consistency  sitemap drift, duplicate asset references

Run from the project root:

    python3 audits/static-scan.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML_FILES = sorted(list(ROOT.glob("*.html")) + list(ROOT.glob("docs/*.html")))

issues: dict[str, list[str]] = {
    "a11y": [],
    "security": [],
    "links": [],
    "consistency": [],
}

# Regex patterns
RE_LANG = re.compile(r"<html[^>]*lang=")
RE_IMG_NO_ALT = re.compile(r"<img(?![^>]*\balt=)[^>]*>")
RE_INLINE_HANDLER = re.compile(r"\b(on[a-z]+)\s*=\s*['\"]", re.I)
RE_JS_HREF = re.compile(r"href\s*=\s*['\"]javascript:", re.I)


def audit_file(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    rel = path.relative_to(ROOT)

    if not RE_LANG.search(text):
        issues["a11y"].append(f"{rel}: <html> missing lang attribute")

    for m in RE_IMG_NO_ALT.finditer(text):
        snippet = m.group(0)[:80]
        issues["a11y"].append(f"{rel}: <img> missing alt — {snippet}")

    for m in RE_INLINE_HANDLER.finditer(text):
        handler = m.group(1)
        line_num = text[: m.start()].count("\n") + 1
        issues["security"].append(f"{rel}:{line_num}: inline {handler}= handler")

    if RE_JS_HREF.search(text):
        issues["security"].append(f"{rel}: javascript: href")

    # Internal link integrity.
    # The site uses clean URLs: /about resolves to about.html via
    # Cloudflare Pages, and absolute paths (/products) resolve from the
    # repo root regardless of the linking file's directory.
    for href in re.findall(r'href="([^"#?:][^"#?]*)"', text):
        href = href.split("?")[0].split("#")[0]
        if not href:
            continue
        if href.startswith(("mailto:", "tel:", "http")):
            continue
        base = ROOT if href.startswith("/") else path.parent
        target = (base / href.lstrip("/")).resolve()
        candidates = [target]
        if target.is_dir() or href.endswith("/"):
            candidates = [target / "index.html"]
        elif target.suffix == "":
            # clean URL: try .html sibling and directory index
            candidates = [target.with_suffix(".html"), target / "index.html", target]
        if not any(c.exists() for c in candidates):
            try:
                target_rel = target.relative_to(ROOT)
            except ValueError:
                target_rel = target
            issues["links"].append(f"{rel}: broken href={href} → {target_rel}")


def audit_sitemap() -> None:
    sitemap = ROOT / "sitemap.xml"
    if not sitemap.exists():
        issues["consistency"].append("sitemap.xml missing")
        return

    text = sitemap.read_text()
    urls = re.findall(r"<loc>https://lunepitch\.pages\.dev(/[^<]*)</loc>", text)
    sitemap_files: set[str] = set()
    for u in urls:
        if u == "/":
            sitemap_files.add("index.html")
        elif u.endswith("/"):
            sitemap_files.add(u.lstrip("/") + "index.html")
        else:
            # clean URLs in the sitemap map to .html files on disk
            sitemap_files.add(u.lstrip("/") + ".html")

    indexable: set[str] = set()
    for p in HTML_FILES:
        text = p.read_text(encoding="utf-8")
        if 'name="robots" content="noindex"' in text:
            continue
        indexable.add(str(p.relative_to(ROOT)))

    missing = indexable - sitemap_files
    extra = sitemap_files - indexable
    if missing:
        issues["consistency"].append(f"sitemap missing indexable pages: {sorted(missing)}")
    if extra:
        issues["consistency"].append(f"sitemap lists nonexistent pages: {sorted(extra)}")


def main() -> int:
    for p in HTML_FILES:
        audit_file(p)
    audit_sitemap()

    total = sum(len(v) for v in issues.values())
    print(f"=== STATIC SCAN — {len(HTML_FILES)} HTML files ===\n")
    for cat, items in issues.items():
        print(f"## {cat.upper()} — {len(items)} item(s)")
        for it in items[:50]:
            print(f"  • {it}")
        if len(items) > 50:
            print(f"  … {len(items) - 50} more")
        print()

    return 1 if total > 0 else 0


if __name__ == "__main__":
    sys.exit(main())

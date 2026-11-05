#!/usr/bin/env python3
"""Inline daylight-scene.js into an HTML file so it ships as one self-contained page.

Use it for claude.ai artifacts (no external script hosts allowed), email previews,
CMS blocks that accept a single HTML snippet, or zip-free handoffs.

    python3 scripts/inline_engine.py page.html [-o page.single.html] [--engine assets/daylight-scene.js]

Replaces every <script src="...daylight-scene.js"></script> with an inline <script>.
"""
import argparse
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
DEFAULT_ENGINE = HERE.parent / "assets" / "daylight-scene.js"
TAG = re.compile(r'<script\b[^>]*\bsrc=["\'][^"\']*daylight-scene(?:\.min)?\.js["\'][^>]*>\s*</script>', re.I)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("html")
    ap.add_argument("-o", "--out")
    ap.add_argument("--engine", default=str(DEFAULT_ENGINE))
    a = ap.parse_args()

    src = pathlib.Path(a.html)
    html = src.read_text(encoding="utf-8")
    engine = pathlib.Path(a.engine).read_text(encoding="utf-8").replace("</script", "<\\/script")
    new, n = TAG.subn(lambda _m: "<script>\n" + engine + "\n</script>", html)
    if n == 0:
        print("No <script src=\"daylight-scene.js\"> tag found; nothing inlined.", file=sys.stderr)
        return 1
    out = pathlib.Path(a.out) if a.out else src.with_name(src.stem + ".single" + src.suffix)
    out.write_text(new, encoding="utf-8")
    print(f"Inlined engine ({len(engine) // 1024} KB) into {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

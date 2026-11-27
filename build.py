#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).parent
src = (root / "app.html").read_text()
cut = src.index("</style>") + len("</style>")
head, body = src[:cut], src[cut:]

page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Barn Builder">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="favicon.png">
<style>
:root{{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}}
html{{box-sizing:border-box}}
body{{margin:0}}
img{{max-width:100%}}
[hidden]{{display:none!important}}
</style>
{head.strip()}
</head>
<body>
{body.strip()}
</body>
</html>
"""
(root / "index.html").write_text(page)
print("wrote index.html", len(page), "bytes")

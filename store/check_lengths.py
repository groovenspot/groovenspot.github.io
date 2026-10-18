"""Checks APP_STORE.md fields against App Store Connect character limits."""
import re, sys, pathlib

LIMITS = {"이름": 30, "Name": 30, "부제": 30, "Subtitle": 30,
          "프로모션 텍스트": 170, "Promotional Text": 170,
          "설명": 4000, "Description": 4000, "키워드": 100, "Keywords": 100}

text = pathlib.Path(__file__).with_name("APP_STORE.md").read_text(encoding="utf-8")
ok = True
for heading, body in re.findall(r"^### (.+?)\n```\n(.*?)\n```", text, re.S | re.M):
    key = re.sub(r"\s*\(.*\)$", "", heading).strip()
    if key not in LIMITS:
        continue
    n = len(body)
    status = "OK " if n <= LIMITS[key] else "OVER"
    ok &= n <= LIMITS[key]
    print(f"{status} {key:18} {n:5} / {LIMITS[key]}")
sys.exit(0 if ok else 1)

"""Checks store listing fields against App Store Connect / Google Play character limits."""
import re, sys, pathlib

LIMITS = {
    "APP_STORE.md": {"이름": 30, "Name": 30, "부제": 30, "Subtitle": 30,
                     "프로모션 텍스트": 170, "Promotional Text": 170,
                     "설명": 4000, "Description": 4000, "키워드": 100, "Keywords": 100},
    "GOOGLE_PLAY.md": {"앱 이름": 30, "App name": 30, "간단한 설명": 80, "Short description": 80,
                       "자세한 설명": 4000, "Full description": 4000},
}

ok = True
for filename, limits in LIMITS.items():
    print(filename)
    text = pathlib.Path(__file__).with_name(filename).read_text(encoding="utf-8")
    for heading, body in re.findall(r"^### (.+?)\n```\n(.*?)\n```", text, re.S | re.M):
        key = re.sub(r"\s*\(.*\)$", "", heading).strip()
        if key not in limits:
            continue
        n = len(body)
        ok &= n <= limits[key]
        print(f"  {'OK ' if n <= limits[key] else 'OVER'} {key:18} {n:5} / {limits[key]}")
sys.exit(0 if ok else 1)

#!/bin/bash
# 시뮬레이터에서 데모 기록(-demo)으로 화면을 찍습니다. 맥 없이 CI에서 화면을 확인하는 용도.
#   ./screenshots.sh <derivedDataPath> <출력 폴더>
set -euo pipefail
DERIVED=${1:-build}
OUT=${2:-shots}
mkdir -p "$OUT"
APP="$DERIVED/Build/Products/Debug-iphonesimulator/PulseCare.app"
WATCH_APP="$DERIVED/Build/Products/Debug-watchsimulator/PulseCareWatch.app"

pick() {
  xcrun simctl list devices available -j | python3 -c "
import json, sys
kind = sys.argv[1]
devices = json.load(sys.stdin)['devices']
for runtime in sorted(devices, reverse=True):
    if kind.lower() not in runtime.lower():
        continue
    for d in devices[runtime]:
        if sys.argv[2] in d['name']:
            print(d['udid']); sys.exit(0)
" "$1" "$2"
}

PHONE=$(pick iOS "iPhone 16" || true)
[ -z "$PHONE" ] && PHONE=$(pick iOS "iPhone")
echo "iPhone simulator: $PHONE"
xcrun simctl boot "$PHONE" || true
xcrun simctl bootstatus "$PHONE" -b
xcrun simctl status_bar "$PHONE" override --time "08:00" --batteryState charged --batteryLevel 100 --cellularBars 4 || true
xcrun simctl install "$PHONE" "$APP"

for screen in consent goal home history family chat settings easy guardian breathing medication; do
  xcrun simctl terminate "$PHONE" com.groovenspot.pulsecare 2>/dev/null || true
  # 화면마다 처음 상태에서 시작합니다.
  xcrun simctl uninstall "$PHONE" com.groovenspot.pulsecare
  xcrun simctl install "$PHONE" "$APP"
  xcrun simctl launch "$PHONE" com.groovenspot.pulsecare -demo -screen "$screen"
  sleep 6
  xcrun simctl io "$PHONE" screenshot "$OUT/iphone-$screen.png"
done

if [ -d "$WATCH_APP" ]; then
  WATCH=$(pick watchOS "Series" || true)
  [ -z "$WATCH" ] && WATCH=$(pick watchOS "Apple Watch" || true)
  if [ -n "$WATCH" ]; then
    echo "Watch simulator: $WATCH"
    xcrun simctl boot "$WATCH" || true
    xcrun simctl bootstatus "$WATCH" -b
    xcrun simctl install "$WATCH" "$WATCH_APP"
    xcrun simctl launch "$WATCH" com.groovenspot.pulsecare.watchkitapp -demo
    sleep 8
    xcrun simctl io "$WATCH" screenshot "$OUT/watch-today.png"
  fi
fi

# 로그에서도 볼 수 있게 작게 줄여 base64로 찍습니다 (아티팩트를 내려받지 못할 때).
for f in "$OUT"/*.png; do
  sips -s format jpeg -s formatOptions 45 -Z 520 "$f" --out "${f%.png}.jpg" >/dev/null
  echo "::group::screenshot $(basename "${f%.png}")"
  echo "SHOT-BEGIN $(basename "${f%.png}")"
  base64 -i "${f%.png}.jpg" | fold -w 2000
  echo "SHOT-END"
  echo "::endgroup::"
done

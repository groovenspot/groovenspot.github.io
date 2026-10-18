# Builds Google Play graphics from the app icon and the Paparazzi renders:
#   cd cardio-pacer/android && ./gradlew recordPaparazziDebug && cd .. && python3 Tools/make_play_assets.py <font>
# Needs Noto Sans CJK for Korean text (pass its path as the first argument).
import glob, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAPS = os.path.join(ROOT, "android/wear/src/test/snapshots/images")
OUT = os.path.join(ROOT, "store/google-play")
CJK = sys.argv[1]

ORDER = ["zone2", "zone3", "zone1", "summary", "start", "settings"]

def snap(name):
    path = glob.glob(os.path.join(SNAPS, f"*_{name}.png"))[0]
    im = Image.open(path).convert("RGBA")
    flat = Image.new("RGB", im.size, "black")  # Play rejects transparency
    flat.paste(im, (0, 0), im)
    return flat

os.makedirs(os.path.join(OUT, "screenshots"), exist_ok=True)
for i, name in enumerate(ORDER, 1):
    snap(name).save(os.path.join(OUT, "screenshots", f"{i}-{name}.png"))

# Phone screenshot from the companion app, cropped to Play's 2:1 maximum aspect ratio
PHONE = glob.glob(os.path.join(ROOT, "android/mobile/src/test/snapshots/images/*_companion.png"))[0]
phone = Image.open(PHONE).convert("RGB")
phone.crop((0, 0, phone.width, phone.width * 2)).save(os.path.join(OUT, "screenshots", "phone-1-companion.png"))

# 512×512 store icon
icon = Image.open(os.path.join(ROOT, "CardioPacer/Assets.xcassets/AppIcon.appiconset/AppIcon.png")).convert("RGB")
icon.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "icon-512.png"))

# 1024×500 feature graphic
W, H = 1024, 500
fg = Image.radial_gradient("L").resize((W * 2, W * 2)).crop((W // 2, W - H // 2, W // 2 + W, W + H // 2))
fg = Image.composite(Image.new("RGB", (W, H), (4, 8, 6)), Image.new("RGB", (W, H), (18, 40, 28)), fg)
d = ImageDraw.Draw(fg)

def round_img(im, size):
    im = im.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
    return im, mask.resize((size, size), Image.LANCZOS)

ic, m = round_img(icon, 120)
fg.paste(ic, (64, 70), m)
title = ImageFont.truetype(CJK, 64, index=1)  # index 1 = Korean face in the collection
sub = ImageFont.truetype(CJK, 34, index=1)
d.text((64, 214), "Cardio Pacer", font=title, fill="white", stroke_width=2, stroke_fill="white")
d.text((66, 300), "화면 색으로 지키는 Zone 2", font=sub, fill=(28, 179, 84), stroke_width=1, stroke_fill=(28, 179, 84))
d.text((66, 350), "Wear OS 심박수 가이드", font=sub, fill=(190, 200, 194))

for name, x, y, size in [("zone1", 560, 150, 210), ("zone3", 790, 150, 210), ("zone2", 650, 95, 270)]:
    im, m = round_img(snap(name), size)
    ring = Image.new("L", (size + 12, size + 12), 0)
    ImageDraw.Draw(ring).ellipse([0, 0, size + 11, size + 11], fill=255)
    fg.paste((4, 8, 6), (x - 6, y - 6), ring)
    fg.paste(im, (x, y), m)

fg.save(os.path.join(OUT, "feature-graphic-1024x500.png"))
print("wrote", OUT)

# Renders the app icon: python3 Tools/make_icon.py CardioPacer/Assets.xcassets/AppIcon.appiconset/AppIcon.png
import math, sys
from PIL import Image, ImageDraw
N=4096; c=N/2
img=Image.new("RGB",(N,N))
# radial background: deep green-black
px=img.load()
bg=Image.radial_gradient("L").resize((N,N))  # 0 center -> 255 edge
inner=(18,40,28); outer=(4,8,6)
img=Image.composite(Image.new("RGB",(N,N),outer),Image.new("RGB",(N,N),inner),bg)
d=ImageDraw.Draw(img)
BLUE=(31,115,242); GREEN=(28,179,84); RED=(230,46,46)
R=N*0.36; W=N*0.085
def arc(a0,a1,col):
    box=[c-R,c-R,c+R,c+R]
    d.arc(box,a0,a1,fill=col,width=int(W))
    for a in (a0,a1):
        r=R-W/2; x=c+r*math.cos(math.radians(a)); y=c+r*math.sin(math.radians(a))
        d.ellipse([x-W/2,y-W/2,x+W/2,y+W/2],fill=col)
arc(140,178,BLUE); arc(202,338,GREEN); arc(362,400,RED)
# heart
pts=[]
s=N*0.0118
for i in range(720):
    t=2*math.pi*i/720
    x=16*math.sin(t)**3; y=13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t)
    pts.append((c+x*s, c-y*s+N*0.02))
d.polygon(pts,fill=GREEN)
# pulse line across heart
r=N*0.0105
P=[(-14,0),(-6,0),(-3,-7),(1,8),(4,-3),(6,0),(14,0)]
line=[(c+x*r*1.0, c+N*0.01+y*r) for x,y in P]
d.line(line,fill=(255,255,255),width=int(N*0.022),joint="curve")
for x,y in (line[0],line[-1]):
    w=N*0.011; d.ellipse([x-w,y-w,x+w,y+w],fill=(255,255,255))
img.resize((1024,1024),Image.LANCZOS).save(sys.argv[1])

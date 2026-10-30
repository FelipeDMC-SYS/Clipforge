"""Create an original synthetic voxel scene with known audio and motion peaks."""
from PIL import Image, ImageDraw
from fonts import load_font
from pathlib import Path
import math, subprocess, wave, tempfile
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
W,H,FPS,DURATION=640,360,24,50
font=load_font(12)
small=load_font(9)
base=Image.new('RGB',(W+80,H+60),'#609ba8')
d=ImageDraw.Draw(base)
for y in range(190):
    d.line((0,y,W+80,y),fill=(43+int(y*.12),91+int(y*.18),112+int(y*.15)))
d.ellipse((515,35,552,72),fill='#f4cc92')
d.polygon([(0,183),(77,109),(116,150),(194,85),(266,170),(355,110),(445,176),(525,98),(640,177),(720,160),(720,270),(0,270)],fill='#426e6e')
d.polygon([(0,210),(100,156),(202,198),(330,135),(403,201),(552,158),(720,210),(720,360),(0,360)],fill='#54806d')
d.rectangle((0,210,720,420),fill='#667b48')
for row in range(12):
 for col in range(22):
    x=col*42+(row%2)*21-40;y=195+row*19
    color=['#748b4c','#6f844a','#607a43','#7d9252'][(row*3+col*7)%4]
    d.polygon([(x,y),(x+21,y-10),(x+42,y),(x+21,y+11)],fill=color)
    d.line((x,y,x+21,y+11,x+42,y),fill='#4c633b',width=1)
d.polygon([(365,210),(401,210),(507,420),(395,420)],fill='#549eb0')
for row in range(10):
 y=213+row*21;x=375+row*6;d.line((x,y,x+25+row*4,y),fill='#7db9bf',width=2)
def block(x,y,size,top,left,right):
 d.polygon([(x,y-size),(x+size,y-size/2),(x,y),(x-size,y-size/2)],fill=top)
 d.polygon([(x-size,y-size/2),(x,y),(x,y+size),(x-size,y+size/2)],fill=left)
 d.polygon([(x,y),(x+size,y-size/2),(x+size,y+size/2),(x,y+size)],fill=right)
for x,y,s in [(80,225,24),(160,248,31),(600,220,24),(520,258,30),(280,208,18),(30,300,34)]:
 d.rectangle((x-4,y,x+4,y+30),fill='#6d5842');block(x,y-3,s,'#93ae6c','#527448','#6c9355')
block(210,300,15,'#d5b287','#9c734d','#bb8a59');block(235,320,11,'#dbb77a','#a77d4b','#cba262')

def activity(t):
 return max(math.exp(-((t-p)/1.2)**4) for p in (10.5,27.5,44))

with tempfile.TemporaryDirectory() as tmp:
 audio=Path(tmp)/'audio.wav';sr=48000;t=np.arange(DURATION*sr)/sr
 a=sum(np.exp(-((t-p)/1.2)**4) for p in (10.5,27.5,44))
 rng=np.random.default_rng(4)
 samples=.006*np.sin(2*np.pi*100*t)+a*(.2*np.sin(2*np.pi*(370+100*np.sin(t*6))*t)+.13*rng.uniform(-1,1,len(t)))
 with wave.open(str(audio),'wb') as f:
  f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((np.clip(samples,-1,1)*32767).astype('<i2').tobytes())
 out=ROOT/'dist'/'demo.mp4'
 proc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(audio),'-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart','-shortest',str(out)],stdin=subprocess.PIPE)
 for frame in range(FPS*DURATION):
  tm=frame/FPS;level=activity(tm);dx=int(34+math.sin(tm*.35)*4+math.sin(tm*18)*12*level);dy=int(23+math.sin(tm*21)*7*level)
  im=base.crop((dx,dy,dx+W,dy+H));draw=ImageDraw.Draw(im)
  px=int(310+18*math.sin(tm*.6)+25*math.sin(tm*9)*level);py=250
  draw.rectangle((px-7,py-18,px+8,py-4),fill='#d6b38b');draw.rectangle((px-10,py-3,px+11,py+21),fill='#cc774c');draw.rectangle((px-9,py+22,px-2,py+36),fill='#3e5163');draw.rectangle((px+3,py+22,px+10,py+36),fill='#384959')
  if level>.2:
   for k in range(18):
    angle=k*2.4+tm*2;radius=24+((tm*40+k*13)%100)*level
    xx=px+math.cos(angle)*radius;yy=py-15+math.sin(angle)*radius*.6
    draw.rectangle((xx,yy,xx+4,yy+4),fill=['#ffe098','#f5a855','#d0e4a3'][k%3])
  draw.line((W/2-6,H/2,W/2+6,H/2),fill='#f6f1e0');draw.line((W/2,H/2-6,W/2,H/2+6),fill='#f6f1e0')
  draw.rounded_rectangle((17,16,239,47),5,fill='#17292c');draw.text((26,24),'CLIPFORGE / MUNDO DE PRUEBA',font=small,fill='#d7dfd5')
  draw.rounded_rectangle((18,H-39,163,H-17),4,fill='#253b36');draw.rectangle((24,H-32,150,H-25),fill='#adc77e')
  draw.text((W-155,H-32),'SECUENCIA SINTETICA',font=small,fill='#e5e9df')
  proc.stdin.write(im.tobytes())
 proc.stdin.close()
 if proc.wait()!=0:raise RuntimeError('No se pudo generar el video de demostración')
 print(f'Demo: {out.stat().st_size} bytes, {DURATION}s, {W}x{H}')

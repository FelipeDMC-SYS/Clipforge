"""Create synthetic HUD fixtures for OCR tests, not actual Fortnite captures."""
from pathlib import Path
from PIL import Image, ImageDraw
from fonts import load_font
import json,sys
root=Path(__file__).resolve().parents[1]
out=(Path(sys.argv[1]) if len(sys.argv)>1 else root/'scratch/ocr-fixtures').resolve()
out.mkdir(parents=True,exist_ok=True)
font=load_font(32,bold=True)
cases=[
 ('en-kill','ELIMINATED ','EnemyOne','banner','elimination'),
 ('es-kill','ELIMINASTE A ','RivalDos','banner','elimination'),
 ('es-kill-alt','HAS ELIMINADO A ','Jugador77','banner','elimination'),
 ('knock','KNOCKED DOWN ','EnemyThree','banner','knock'),
 ('death','ELIMINATED BY ','EnemyOne','banner',None),
 ('xp','+250 XP ','ELIMINATION','banner',None),
 ('assist','ELIMINATION ASSIST ','EnemyOne','banner',None),
 ('own-feed','FelipeDMC eliminated ','EnemyFour with a rifle','feed','elimination'),
 ('other-feed','EnemyFour eliminated ','FelipeDMC with a rifle','feed',None),
 ('spectator','SPECTATING ','EnemyOne','context','spectator'),
 ('spectator-es','OBSERVANDO ','RivalDos','context','spectator')]
manifest=[]
for name,left,right,source,expected in cases:
 image=Image.new('RGBA',(1120,200),(37,65,82,255));draw=ImageDraw.Draw(image)
 for y in range(200):draw.line((0,y,1120,y),fill=(28+y//8,60+y//12,71+y//9,255))
 x=max(22,int((1120-draw.textlength(left+right,font=font))/2));y=82
 draw.text((x,y),left,font=font,fill=(245,245,245),stroke_width=1,stroke_fill=(18,20,22))
 draw.text((x+draw.textlength(left,font=font),y),right,font=font,fill=(245,65,75),stroke_width=1,stroke_fill=(18,20,22))
 path=out/(name+'.rgba');path.write_bytes(image.tobytes());manifest.append(dict(name=name,source=source,expected=expected,width=1120,height=200,file=str(path)))
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')

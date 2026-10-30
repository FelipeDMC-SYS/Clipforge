import {ImageQualityProcessor} from './image-quality.js';
const qualityProcessors=new WeakMap();
import {FPS_VALUES} from './frame-rate.js?v=5';
import {restoreKillEvents} from './fortnite-events.js';
export const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(Number(n))?Number(n):lo));
export const timecode=(value,precise=false)=>{const t=Math.max(0,Number(value)||0),h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+(precise?'.'+Math.floor(t%1*10):'');};
export const defaultSettings=()=>({ratio:'16:9',fit:'contain',cropX:50,cropY:50,brightness:100,contrast:100,saturation:100,sharpness:0,text:'',textPosition:'bottom',textStyle:'white',watermark:false,volume:100,smoothMotion:false,motionFps:'60',exportResolution:1080,exportFps:'source',exportQuality:'high'});
export function safeSettings(s={}){const d=defaultSettings();for(const key of ['ratio','fit','textPosition','textStyle','exportFps','exportQuality']){const vals={ratio:['16:9','9:16','1:1'],fit:['contain','cover'],textPosition:['top','middle','bottom'],textStyle:['white','orange','lime'],exportFps:FPS_VALUES,exportQuality:['standard','high','ultra']};if(vals[key].includes(s[key]))d[key]=s[key];}for(const [key,min,max] of [['cropX',0,100],['cropY',0,100],['brightness',65,145],['contrast',70,145],['saturation',0,180],['sharpness',0,100],['volume',0,100]])if(s[key]!=null)d[key]=clamp(s[key],min,max);d.text=String(s.text||'').slice(0,120);d.watermark=s.watermark===true;d.smoothMotion=s.smoothMotion===true;d.motionFps=FPS_VALUES.includes(s.motionFps)&&s.motionFps!=='source'?s.motionFps:'60';d.exportResolution=[720,1080,1440,2160].includes(Number(s.exportResolution))?Number(s.exportResolution):1080;return d;}
export function adjustClipRange(range,delta,mode,duration){
 const min=Math.min(.1,duration),round=n=>Math.round(n*1000)/1000;
 const start=clamp(range.start,0,duration),end=clamp(range.end,start,duration);
 if(mode==='move'){const length=end-start;const moved=clamp(round(start+delta),0,Math.max(0,duration-length));return {start:moved,end:Math.min(duration,moved+length)};}
 if(mode==='start')return {start:clamp(round(start+delta),0,Math.max(0,end-min)),end};
 if(mode==='end')return {start,end:clamp(round(end+delta),Math.min(duration,start+min),duration)};
 return {start,end};
}
export function timelineViewport(duration,start=0,span=duration){const width=clamp(span,Math.min(1,duration),duration);const left=clamp(start,0,Math.max(0,duration-width));return {start:left,end:left+width};}
export function blendFraction(time,start,end,difference=0){if(end<=start||end-start>.25||difference>.24)return 0;return clamp((time-start)/(end-start),0,1);}
export function dimensions(ratio,resolution=1080){const base=[720,1080,1440,2160].includes(Number(resolution))?Number(resolution):1080;return ratio==='9:16'?[base,base/9*16]:ratio==='1:1'?[base,base]:[base/9*16,base];}
export function cropRect(sw,sh,dw,dh,x=50,y=50){const ratio=dw/dh;let cw=sw,ch=sh;if(sw/sh>ratio)cw=sh*ratio;else ch=sw/ratio;return [(sw-cw)*clamp(x,0,100)/100,(sh-ch)*clamp(y,0,100)/100,cw,ch];}
export function clipWindow(peak,duration,length){length=Math.min(length,duration);const start=clamp(peak-length*.65,0,Math.max(0,duration-length));return {start:Math.min(duration,Math.round(start*10)/10),end:Math.min(duration,Math.round((start+length)*10)/10)};}
function quantile(values,q){if(!values.length)return 0;const a=[...values].sort((a,b)=>a-b);return a[Math.floor((a.length-1)*q)];}
function salience(values,floor){const med=quantile(values,.5),hi=quantile(values,.95),maximum=Math.max(...values),range=Math.max(hi-med,(maximum-med)*.45);if(range<floor)return values.map(()=>0);return values.map((x,i)=>{const lo=Math.max(0,i-12),end=Math.min(values.length,i+13);let sum=0;for(let k=lo;k<end;k++)sum+=values[k];const local=sum/(end-lo);return clamp(.67*(x-med)/range+.33*(x-local)/range,0,1);});}
export function suggestClips(audio,motion,duration,{length=30,maxClips=5,sensitivity='balanced',game='fortnite',hasAudio=true}={}){
 const count=Math.max(audio.length,motion.length);if(!count||!Number.isFinite(duration)||duration<=0)return {clips:[],scores:[]};
 const a=salience(Array.from({length:count},(_,i)=>audio[i]||0),.007),v=salience(Array.from({length:count},(_,i)=>motion[i]||0),.012);
 const audioUseful=hasAudio&&a.some(n=>n>0),visualUseful=v.some(n=>n>0);let aw=game==='minecraft'?.42:.66,vw=1-aw;if(!audioUseful){aw=0;vw=1;}if(!visualUseful){aw=1;vw=0;}
 const raw=a.map((n,i)=>aw*n+vw*v[i]);const scores=raw.map((n,i)=>n*.7+(raw[i-1]||0)*.15+(raw[i+1]||0)*.15);
 const threshold={high:.23,balanced:.35,strict:.5}[sensitivity]||.35;
 const candidates=scores.map((score,i)=>({score,i})).filter(({score,i})=>score>=threshold&&score>=(scores[i-1]||0)&&score>=(scores[i+1]||0)).sort((a,b)=>b.score-a.score);
 const clips=[];for(const {score,i} of candidates){const peak=(i+.5)*duration/count;const window=clipWindow(peak,duration,clamp(length,3,180));if(clips.some(c=>Math.max(0,Math.min(c.end,window.end)-Math.max(c.start,window.start))>Math.min(c.end-c.start,window.end-window.start)*.15))continue;
 const reason=a[i]>.3&&v[i]>.3?'Audio + cambio visual':a[i]>v[i]?'Pico de audio':'Cambio visual';clips.push({...window,peak,score:Math.round(score*100),reason,title:`Momento ${clips.length+1}`,manual:false});if(clips.length>=clamp(maxClips,1,12))break;}
 return {clips,scores};
}
export function composeFrame(ctx,draw,sw,sh,settings){
 const s=settings,w=ctx.canvas.width,h=ctx.canvas.height;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#101319';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const filter=`brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%)`;const crop=cropRect(sw,sh,w,h,s.cropX,s.cropY);
 if(s.fit==='contain'&&Math.abs(sw/sh-w/h)>.02){ctx.filter=`blur(${Math.max(10,w*.018)}px) brightness(42%) saturate(80%)`;draw(ctx,...crop,-w*.04,-h*.04,w*1.08,h*1.08);ctx.filter=filter;const scale=Math.min(w/sw,h/sh);draw(ctx,0,0,sw,sh,(w-sw*scale)/2,(h-sh*scale)/2,sw*scale,sh*scale);}else{ctx.filter=filter;draw(ctx,...crop,0,0,w,h);}
 ctx.filter='none';if(s.sharpness>0){let processor=qualityProcessors.get(ctx);if(!processor){processor=new ImageQualityProcessor();qualityProcessors.set(ctx,processor);}processor.apply(ctx,s.sharpness);}if(s.text.trim()){const size=Math.round(Math.min(w*.060,h*.075));ctx.font=`800 ${size}px Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';const maxWidth=w*.84;const lines=[];for(const raw of s.text.split('\n')){let line='';for(const char of raw){if(ctx.measureText(line+char).width>maxWidth&&line){lines.push(line.trim());line=char;}else line+=char;}if(line)lines.push(line.trim());}const visible=lines.slice(0,4),lineHeight=size*1.22,blockHeight=visible.length*lineHeight;let y=s.textPosition==='top'?h*.12:s.textPosition==='middle'?h*.5-blockHeight/2+lineHeight/2:h*.82-blockHeight+lineHeight/2;ctx.strokeStyle='#0a0d14';ctx.lineWidth=Math.max(3,size*.13);ctx.fillStyle={white:'#ffffff',orange:'#ffac67',lime:'#c1f57f'}[s.textStyle]||'#fff';for(const line of visible){ctx.strokeText(line,w/2,y);ctx.fillText(line,w/2,y);y+=lineHeight;}}
 if(s.watermark){const size=Math.max(10,Math.round(Math.min(w*.028,h*.033)));ctx.font=`500 ${size}px Arial, sans-serif`;ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillStyle='#ffffffbf';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.fillText('by FelipeDMC',w*.96,h*.965);}
 ctx.restore();
}
export function restoreClips(items,duration){if(!Array.isArray(items))throw new Error('El proyecto no contiene una lista de clips válida.');return items.slice(0,100).map((c,i)=>{const start=clamp(c.start,0,Math.max(0,duration-.1)),end=clamp(c.end,start+.1,duration);return {id:`restored-${i}-${Date.now()}`,title:String(c.title||`Clip ${i+1}`).slice(0,70),start,end,peak:clamp(c.peak??start,start,end),score:clamp(c.score,0,100),reason:String(c.reason||'Proyecto guardado').slice(0,60),manual:!!c.manual,detection:c.detection==='fortnite-kill'?'fortnite-kill':undefined,killEvents:restoreKillEvents(c.killEvents,duration),settings:safeSettings(c.settings)};}).filter(c=>c.end>c.start);}

export function releaseFrameResources(ctx){qualityProcessors.get(ctx)?.dispose();qualityProcessors.delete(ctx);}

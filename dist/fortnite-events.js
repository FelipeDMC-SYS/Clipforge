const bound=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Number(n):min));
export const cleanText=text=>String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[|]/g,'I').replace(/\s+/g,' ').trim();
export const playerKey=text=>cleanText(text).replace(/\s*\(\d+\)\s*$/,'').replace(/\s+/g,'');
export function detectorSettings(raw={}){
 return {mode:raw.mode==='activity'?'activity':'kills',playerName:String(raw.playerName||'').trim().slice(0,40),includeKnocks:raw.includeKnocks===true,lead:bound(raw.lead??12,2,60),tail:bound(raw.tail??5,2,30),scanRate:raw.scanRate==='fast'?'fast':'detailed',hud:raw.hud==='wide'?'wide':'standard'};
}
export function isSpectatorText(text){
 return /\b(SPECTATING|SPECTATOR|OBSERVANDO|ESPECTADOR|ESPECTANDO|WATCHING|REPLAY|REPETICION|YOU PLACED|HAS QUEDADO|ELIMINATED BY|ELIMINADO POR|TE HA ELIMINADO|TE ELIMINARON)\b/.test(cleanText(text));
}
function targetName(text){
 const target=cleanText(text).replace(/\s+(WITH|CON|USANDO|A UNA DISTANCIA|FROM)\b.*$/,'').replace(/\s*\+?\d+\s*(XP|PE|EXP)\b.*$/,'').replace(/^[\s:!\-]+|[\s!.,]+$/g,'').slice(0,60);
 if(/^(?:\d+\s+)?(?:OPPONENTS|ENEMIES|ENEMIGOS|JUGADORES|PLAYERS)\b/.test(target))return null;
 if(playerKey(target).length<2||/^(BY|POR|A|XP|PE|ASSIST|ASISTENCIA|OPPONENTS|ENEMIGOS|JUGADORES|PLAYER|ELIMINACIONES|ENEMIES|OPPONENT|CHALLENGE|OBJETIVO)\b/.test(target)||/^\d+$/.test(target))return null;
 return target;
}
export function parseBanner(text,{includeKnocks=false}={}){
 const t=cleanText(text).replace(/EL[1IL]M[1IL]NATED/g,'ELIMINATED');
 if(isSpectatorText(t)||/\b(ASISTENCIA|ASSIST|ASISTISTE|MISSION|MISION|QUEST)\b/.test(t))return null;
 let kind='elimination',match=t.match(/^(?:ELIMINATED|YOU ELIMINATED|HAS ELIMINADO(?: A)?|ELIMINASTE(?: A)?|ELIMINADO(?: A)?)\s+(.+)$/);
 if(!match&&includeKnocks){kind='knock';match=t.match(/^(?:KNOCKED DOWN|KNOCKED OUT|HAS DERRIBADO(?: A)?|DERRIBASTE(?: A)?|DERRIBADO(?: A)?)\s+(.+)$/);}
 if(!match)return null;const target=targetName(match[1]);return target?{kind,target,source:'banner',text:t}:null;
}
export function parseKillFeed(text,playerName,{includeKnocks=false}={}){
 const self=playerKey(playerName);if(self.length<3)return null;const t=cleanText(text);
 if(/\b(ASSIST|ASISTENCIA|ASISTIO|REVIVIO|REVIVED)\b/.test(t))return null;
 const match=t.match(/^(.+?)\s+(ELIMINATED|FINALLY ELIMINATED|HA ELIMINADO(?: A)?|ELIMINO(?: A)?|ELIMINASTE(?: A)?|KNOCKED OUT|KNOCKED DOWN|HA DERRIBADO(?: A)?|DERRIBO(?: A)?)\s+(.+)$/);
 if(!match||playerKey(match[1])!==self)return null;const kind=/KNOCKED|DERRIB/.test(match[2])?'knock':'elimination';if(kind==='knock'&&!includeKnocks)return null;
 const target=targetName(match[3]);if(!target||playerKey(target)===self)return null;return {kind,target,source:'feed',text:t};
}
export function ocrLines(data){
 const lines=[];for(const b of data.blocks||[])for(const p of b.paragraphs||[])for(const line of p.lines||[])if(line.text?.trim())lines.push({text:line.text.trim(),confidence:line.confidence??data.confidence??0,bbox:line.bbox});
 return lines;
}
function sameTarget(a,b){return playerKey(a)===playerKey(b);}
// Repeated OCR frames confirm one event; a persistent notification is never
// counted again. A different target creates a separate event even in one frame.
export class EliminationTracker{
 constructor({sensitivity='balanced'}={}){this.minimum={strict:65,balanced:45,high:30}[sensitivity]??45;this.pending=[];this.events=[];this.spectatorFrames=0;}
 observe(time,readings,{spectator=false}={}){
  if(spectator){this.spectatorFrames++;this.pending=[];return;}
  const inFrame=[];
  for(const reading of readings){
   if(reading.confidence<this.minimum||!['elimination','knock'].includes(reading.kind))continue;
   const seen=inFrame.find(r=>r.kind===reading.kind&&sameTarget(r.target,reading.target));if(seen){seen.item.sources.add(reading.source);if(seen.item.event&&seen.item.sources.size>1)seen.item.event.source='both';continue;}
   let item=this.pending.find(r=>r.kind===reading.kind&&sameTarget(r.target,reading.target)&&time-r.lastSeen<=5);
   if(!item){item={kind:reading.kind,target:reading.target,time,lastSeen:time,hits:0,confidence:0,sources:new Set(),event:null};this.pending.push(item);}
   inFrame.push({...reading,item});item.lastSeen=time;item.hits++;item.confidence=Math.max(item.confidence,reading.confidence);item.sources.add(reading.source);
   if(item.hits>=2&&!item.event){
    const nearby=this.events.find(e=>e.kind===item.kind&&sameTarget(e.target,item.target)&&Math.abs(e.time-item.time)<6);
    if(nearby){item.event=nearby;}else{item.event={time:item.time,kind:item.kind,target:item.target,confidence:Math.round(item.confidence),source:reading.source,observations:item.hits};this.events.push(item.event);}
   }
   if(item.event){item.event.observations=item.hits;item.event.confidence=Math.round(item.confidence);if(item.sources.size>1)item.event.source='both';}
  }
  this.pending=this.pending.filter(r=>time-r.lastSeen<12);
 }
}
export function buildEliminationClips(events,duration,{lead=12,tail=5,maxClips=100}={}){
 const ordered=events.filter(e=>Number.isFinite(e.time)&&e.time>=0&&e.time<duration).sort((a,b)=>a.time-b.time),groups=[];
 for(const event of ordered){const previous=groups.at(-1);if(previous&&event.time-previous.at(-1).time<=tail&&event.time-previous[0].time+lead+tail<=180)previous.push(event);else groups.push([event]);}
 return groups.slice(0,bound(maxClips,1,100)).map((group,i)=>{
  const kills=group.filter(e=>e.kind==='elimination').length,knocks=group.length-kills,start=Math.max(0,group[0].time-lead),end=Math.min(duration,group.at(-1).time+tail);
  const label=kills>1?`${kills} eliminaciones`:kills?'Eliminación':knocks>1?`${knocks} derribos`:'Derribo';
  return {start,end,peak:group[0].time,score:Math.round(group.reduce((n,e)=>n+e.confidence,0)/group.length),title:`Fortnite · ${label} ${i+1}`,reason:`${label} · ${group.some(e=>e.source==='feed'||e.source==='both')?'tu nombre en el registro':'aviso central'} · revisar`,manual:false,detection:'fortnite-kill',killEvents:group.map(e=>({...e}))};
 });
}
export function restoreKillEvents(events,duration){
 if(!Array.isArray(events))return [];return events.slice(0,1000).filter(e=>Number.isFinite(e?.time)&&e.time>=0&&e.time<=duration&&['elimination','knock'].includes(e.kind)).map(e=>({time:e.time,kind:e.kind,target:String(e.target||'').slice(0,60),confidence:bound(e.confidence,0,100),source:['banner','feed','both'].includes(e.source)?e.source:'banner',observations:bound(e.observations,0,1000)}));
}
// White/yellow HUD labels and colored opponent names become dark text on a
// light background. This removes much of the dark game scene without a model.
export function prepareTextPixels(pixels){
 let foreground=0;for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],maximum=Math.max(r,g,b),minimum=Math.min(r,g,b);const white=minimum>165&&maximum-minimum<85,colored=r>145&&r>g*1.3&&r>b*1.12,yellow=r>180&&g>145&&b<135;const ink=white||colored||yellow;foreground+=ink?1:0;pixels[i]=pixels[i+1]=pixels[i+2]=ink?0:255;pixels[i+3]=255;}return foreground;
}

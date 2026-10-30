import {adjustClipRange,clamp,timecode,timelineViewport} from './core.js';

export class TimelineEditor {
 constructor({getClip,getDuration,getSignals,isBusy,onBegin,onChange,onCommit,onCancel,onSeek}){
  Object.assign(this,{getClip,getDuration,getSignals,isBusy,onBegin,onChange,onCommit,onCancel,onSeek});this.$=id=>document.getElementById(id);this.range={start:0,end:1};this.drag=null;this.playtime=0;
  const timeline=this.$('timeline');
  timeline.addEventListener('pointerdown',e=>this.pointerDown(e));
  document.addEventListener('pointermove',e=>this.pointerMove(e),{passive:false});
  document.addEventListener('pointerup',e=>this.pointerEnd(e));
  document.addEventListener('pointercancel',e=>this.pointerEnd(e,true));
  timeline.addEventListener('keydown',e=>this.keyDown(e));
  this.$('zoomIn').addEventListener('click',()=>this.zoom(.5));this.$('zoomOut').addEventListener('click',()=>this.zoom(2));
  this.$('fitClipBtn').addEventListener('click',()=>this.fitClip());this.$('fullTimelineBtn').addEventListener('click',()=>this.setRange(0,this.getDuration()));
  this.$('panRange').addEventListener('input',e=>this.setRange(Number(e.target.value),this.span));
 }
 get span(){return Math.max(.001,this.range.end-this.range.start);}
 setDuration(duration){this.range=timelineViewport(duration);this.draw();this.sync();}
 setRange(start,span){const duration=this.getDuration();if(!duration)return;this.range=timelineViewport(duration,start,span);this.draw();this.sync();this.setPlayhead(this.playtime);}
 zoom(factor){const duration=this.getDuration();if(!duration)return;const c=this.getClip(),center=this.playtime>=this.range.start&&this.playtime<=this.range.end?this.playtime:c?(c.start+c.end)/2:(this.range.start+this.range.end)/2;const span=clamp(this.span*factor,Math.min(2,duration),duration);this.setRange(center-span/2,span);}
 fitClip(){const c=this.getClip();if(!c)return;const span=Math.max(4,(c.end-c.start)*1.65);this.setRange((c.start+c.end-span)/2,span);}
 ensureVisible(){const c=this.getClip();if(!c)return;const w=this.$('timeline').getBoundingClientRect().width||700;if(c.start<this.range.start||c.end>this.range.end||(c.end-c.start)/this.span*w<75)this.fitClip();else this.sync();}
 sync(){
  const c=this.getClip(),duration=this.getDuration(),selection=this.$('timelineSelection');selection.hidden=!c||!duration;
  if(c&&duration){const left=clamp((c.start-this.range.start)/this.span*100,0,100),right=clamp((c.end-this.range.start)/this.span*100,0,100);selection.style.left=left+'%';selection.style.width=Math.max(0,right-left)+'%';selection.hidden=right<=left;selection.classList.toggle('compact',right-left<18);
   this.$('selectionLabel').textContent=`${(c.end-c.start).toFixed(1)} s`;
   for(const [id,value,min,max] of [['trimHandleStart',c.start,0,c.end-.1],['trimHandleEnd',c.end,c.start+.1,duration]]){const el=this.$(id);el.setAttribute('aria-valuenow',value.toFixed(3));el.setAttribute('aria-valuemin',Math.max(0,min));el.setAttribute('aria-valuemax',Math.max(0,max));el.setAttribute('aria-valuetext',timecode(value,true));el.disabled=this.isBusy();}
   this.$('moveSelection').disabled=this.isBusy();this.$('moveSelection').setAttribute('aria-label',`Mover clip de ${timecode(c.start,true)} a ${timecode(c.end,true)}. Flechas para mover, Mayús para pasos de un segundo.`);
  }
  for(const id of ['zoomIn','zoomOut','fullTimelineBtn'])this.$(id).disabled=!duration||this.isBusy();this.$('fitClipBtn').disabled=!c||this.isBusy();
  const zoom=duration?duration/this.span:1;this.$('zoomLabel').textContent=(zoom<10?zoom.toFixed(1).replace('.0',''):zoom.toFixed(0))+'×';
  this.$('timelinePan').hidden=zoom<=1.01;const pan=this.$('panRange');pan.disabled=this.isBusy();pan.max=Math.max(0,duration-this.span);pan.value=this.range.start;this.$('viewportLabel').textContent=`${timecode(this.range.start)} — ${timecode(this.range.end)}`;
  this.$('timelineTicks').innerHTML=Array.from({length:5},(_,i)=>`<span>${timecode(this.range.start+this.span*i/4)}</span>`).join('');
  this.drawEvents();
 }
 drawEvents(){const layer=this.$('killMarkerLayer');if(!layer)return;layer.replaceChildren();const events=(this.getSignals().events||[]).filter(e=>e.time>=this.range.start&&e.time<=this.range.end);const legend=this.$('killLegend');if(legend)legend.hidden=!events.length;for(const event of events.slice(0,300)){const marker=document.createElement('button');marker.type='button';marker.className='kill-marker'+(event.kind==='knock'?' knock':'');marker.textContent='×';marker.style.left=((event.time-this.range.start)/this.span*100)+'%';marker.title=`${event.kind==='knock'?'Derribo':'Eliminación'} · ${timecode(event.time,true)} · ${event.target}`;marker.setAttribute('aria-label',marker.title);marker.disabled=this.isBusy();marker.addEventListener('pointerdown',e=>e.stopPropagation());marker.addEventListener('click',e=>{e.stopPropagation();this.onSeek(event.time);});layer.append(marker);}}
 setPlayhead(time){this.playtime=time;const el=this.$('playhead');el.hidden=!this.getDuration()||time<this.range.start||time>this.range.end;el.style.left=clamp((time-this.range.start)/this.span*100,0,100)+'%';}
 pointerDown(e){
  if(this.drag||this.isBusy()||!this.getDuration()||(e.button!==undefined&&e.button!==0))return;
  const handle=e.target.closest('[data-drag]'),rect=this.$('timeline').getBoundingClientRect();if(!rect.width)return;
  if(!handle){this.onSeek(this.range.start+(e.clientX-rect.left)/rect.width*this.span);return;}
  const c=this.getClip();if(!c)return;e.preventDefault();e.stopPropagation();
  this.drag={pointerId:e.pointerId,x:e.clientX,clipId:c.id,start:c.start,end:c.end,span:this.span,width:rect.width,mode:handle.dataset.drag,target:handle,moved:false};this.onBegin();handle.focus({preventScroll:true});
  try{handle.setPointerCapture(e.pointerId);}catch{}
  this.$('timelineSelection').classList.add('dragging');
 }
 pointerMove(e){const d=this.drag;if(!d||d.pointerId!==e.pointerId)return;e.preventDefault();if(this.isBusy()||this.getClip()?.id!==d.clipId){this.pointerEnd(e,true);return;}const delta=(e.clientX-d.x)/d.width*d.span;if(Math.abs(e.clientX-d.x)>2)d.moved=true;const next=adjustClipRange(d,delta,d.mode,this.getDuration());this.onChange(next,d.mode);this.sync();this.$('dragReadout').textContent=`${timecode(next.start,true)} → ${timecode(next.end,true)}`;}
 pointerEnd(e,cancel=false){const d=this.drag;if(!d||d.pointerId!==e.pointerId)return;this.drag=null;try{d.target.releasePointerCapture(e.pointerId);}catch{}this.$('timelineSelection').classList.remove('dragging');if(cancel)this.onCancel({start:d.start,end:d.end});else{if(!d.moved&&d.mode==='move'){const rect=this.$('timeline').getBoundingClientRect();this.onSeek(this.range.start+(e.clientX-rect.left)/rect.width*this.span);}this.onCommit();}this.ensureVisible();}
 keyDown(e){const handle=e.target.closest('[data-drag]');if(!['ArrowLeft','ArrowRight','Home','End','Escape'].includes(e.key)||this.isBusy())return;
  if(e.key==='Escape'&&this.drag){e.preventDefault();this.pointerEnd({pointerId:this.drag.pointerId},true);return;}
  if(e.key==='Escape')return;
  if(handle){const c=this.getClip();if(!c)return;e.preventDefault();e.stopPropagation();const mode=handle.dataset.drag;let delta=(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?1:.1);if(e.key==='Home')delta=-this.getDuration();if(e.key==='End')delta=this.getDuration();this.onBegin();this.onChange(adjustClipRange(c,delta,mode,this.getDuration()),mode);this.onCommit();this.ensureVisible();}
  else if(e.target===this.$('timeline')){e.preventDefault();this.onSeek(e.key==='Home'?this.range.start:e.key==='End'?this.range.end:this.playtime+(e.key==='ArrowLeft'?-1:1));}
 }
 draw(){const canvas=this.$('waveCanvas'),rect=this.$('timeline').getBoundingClientRect(),dpr=window.devicePixelRatio||1;canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const w=rect.width,h=rect.height;ctx.clearRect(0,0,w,h);const {audio,motion}=this.getSignals();if(!audio.length&&!motion.length){ctx.strokeStyle='#303730';ctx.beginPath();ctx.moveTo(0,h*.52);ctx.lineTo(w,h*.52);ctx.stroke();return;}const aMax=Math.max(.001,...audio),mMax=Math.max(.001,...motion),n=Math.max(audio.length,motion.length),duration=this.getDuration(),bars=Math.max(1,Math.floor(w/4));for(let i=0;i<bars;i++){const start=Math.floor((this.range.start+i/bars*this.span)/duration*n),end=Math.min(n,Math.max(start+1,Math.floor((this.range.start+(i+1)/bars*this.span)/duration*n)));let a=0,m=0;for(let j=start;j<end;j++){a=Math.max(a,audio[j]||0);m=Math.max(m,motion[j]||0);}ctx.fillStyle='#53fc18';ctx.fillRect(i/bars*w,h*.53-Math.max(1,a/aMax*h*.38),2.4,Math.max(1,a/aMax*h*.38));ctx.fillStyle='#b6c2b2';ctx.fillRect(i/bars*w,h*.59,2.4,Math.max(1,m/mMax*h*.26));}}
}

// Run with JSDOM_PATH pointing to an available jsdom installation. This is a
// DOM interaction test; it deliberately does not claim browser codec coverage.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const html=await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const dom=new JSDOM(html,{url:'https://clipforge.test',pretendToBeVisual:true});
const {window}=dom;
for(const key of ['document','localStorage','HTMLElement','HTMLCanvasElement','HTMLMediaElement','HTMLDialogElement','File','Event','DOMException'])globalThis[key]=window[key];
globalThis.window=window;Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});
globalThis.requestAnimationFrame=window.requestAnimationFrame.bind(window);globalThis.cancelAnimationFrame=window.cancelAnimationFrame.bind(window);
globalThis.VideoDecoder=class{};globalThis.OffscreenCanvas=class{};
let blobId=0;URL.createObjectURL=()=>`blob:test-${++blobId}`;URL.revokeObjectURL=()=>{};
let scrolledTo=null;HTMLElement.prototype.scrollIntoView=function(){scrolledTo=this.id;};window.scrollTo=()=>{};
HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,right:600,top:0,bottom:85,width:600,height:85};};
HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,clearRect(){},fillRect(){},save(){},restore(){},scale(){},setTransform(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},strokeText(){},measureText(t){return {width:t.length*12};},getImageData(x,y,width,height){return {data:new Uint8ClampedArray(width*height*4)};},createImageData(width,height){return {width,height,data:new Uint8ClampedArray(width*height*4)};},putImageData(){}};};
HTMLCanvasElement.prototype.toBlob=function(cb){cb(new Blob(['thumb']));};
HTMLMediaElement.prototype.load=function(){this.dispatchEvent(new Event('loadeddata'));};
HTMLMediaElement.prototype.pause=function(){this.dispatchEvent(new Event('pause'));};
for(const [key,value] of [['readyState',4],['videoWidth',640],['videoHeight',360],['paused',true]])Object.defineProperty(HTMLMediaElement.prototype,key,{get:()=>value,configurable:true});
let exportSuccess=false,killResponse=null,holdExports=false;const workerRequests=[],workers=[],downloadRequests=[];
window.HTMLAnchorElement.prototype.click=function(){downloadRequests.push({href:this.href,filename:this.download});};
const meta={duration:120,fps:30,width:640,height:360,hasAudio:true,audioTracks:1,videoCodec:'avc',canDecodeVideo:true,canDecodeAudio:true};
globalThis.Worker=class{
 constructor(){workers.push(this);}
 postMessage(data){this.data=data;workerRequests.push(data);if(data.action==='export'&&holdExports)return;setTimeout(()=>this.respond(),5);}
 respond(){if(this.dead)return;const data=this.data;let result;
  if(data.action==='inspect')result={meta,thumbs:[]};
  else if(data.action==='analyze'&&killResponse)result=killResponse;
  else if(data.action==='analyze')result={meta,clips:[{start:10,end:40,peak:30,score:88,title:'Moment',reason:'Pico de audio',manual:false},{start:70,end:100,peak:90,score:72,title:'Moment',reason:'Cambio visual',manual:false}],thumbs:[],audio:[.1,.7,.2],motion:[.1,.5,.1],warnings:[]};
  else if(data.action==='thumbnails')result={thumbs:[]};
  else if(data.action==='export'){
   if(!exportSuccess){this.onmessage({data:{type:'error',message:'Códec no disponible en prueba'}});return;}
   result={buffer:new ArrayBuffer(128),type:'video/mp4',extension:'mp4',width:1080,height:1920,fps:data.options.fps==='max'?144:data.options.fps==='source'?30:Number(data.options.fps),motionApplied:true,automatic:data.options.fps==='max',bitrate:28000000};
   this.onmessage({data:{type:'encoding',...result}});
  }
  this.onmessage({data:{type:'result',result}});
 }
 terminate(){this.dead=true;}
};
await import('../dist/app.js');
const $=id=>document.getElementById(id);
assert.equal($('analyzeBtn').disabled,true);assert.equal($('editSection').hidden,true);
Object.defineProperty($('fileInput'),'files',{value:[new File(['file bytes'],'game.mp4',{type:'video/mp4',lastModified:1})],configurable:true});$('fileInput').dispatchEvent(new Event('change'));
await new Promise(r=>setTimeout(r,80));
assert.equal(document.querySelectorAll('.clip-card').length,2);assert.equal($('navCount').textContent,'2');assert.equal($('editSection').hidden,false);assert.equal($('analyzeBtn').disabled,false);
document.querySelector('[data-ratio="9:16"]').click();assert.equal($('previewCanvas').width,720);assert.equal($('previewCanvas').height,1280);
$('clipTitle').value='<img src=x onerror=alert(1)>';$('clipTitle').dispatchEvent(new Event('input'));assert.equal(document.querySelectorAll('.clip-body img').length,0);assert.ok(document.querySelector('.clip-body h3').textContent.includes('<img'));
$('trimStart').value='20';$('trimStart').dispatchEvent(new Event('change'));assert.equal($('trimDuration').textContent,'20.0 s');
$('overlayText').value='Mi primer clip';$('overlayText').dispatchEvent(new Event('input'));
$('volume').value='40';$('volume').dispatchEvent(new Event('input'));assert.equal($('video').volume,.4);
$('exportBtn').click();assert.equal($('exportDialog').open,true);assert.ok($('exportSpec').textContent.includes('1080 × 1920'));
$('exportForm').dispatchEvent(new Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,30));assert.equal($('exportDialog').open,false);assert.ok($('exportsList').textContent.includes('Códec'));assert.equal(document.querySelectorAll('[data-export-action=download]').length,0);assert.equal($('startExport').disabled,false);assert.equal($('exportQueueToggle').hidden,false);
$('exportDialog').close();$('addClipBtn').click();assert.equal(document.querySelectorAll('.clip-card').length,3);document.querySelector('.clip-card.selected [data-remove]').click();assert.equal(document.querySelectorAll('.clip-card').length,2);
await new Promise(r=>setTimeout(r,300));const saved=JSON.parse(localStorage.getItem(localStorage.key(0)));assert.equal(saved.clips[0].settings.ratio,'9:16');assert.equal(saved.clips[0].settings.text,'Mi primer clip');assert.equal(saved.clips[0].settings.volume,40);
const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
console.log('DOM OK: carga → detección → recorte → formato → texto/audio → error de códec recuperable → persistencia.');
// A mouse/touch pointer stream changes the actual selected range, not just CSS.
document.querySelector('[data-select]').click();assert.equal(scrolledTo,'previewSection');
$('fullTimelineBtn').click();
function pointer(target,type,x,id=1,pointerType='mouse'){const e=new Event(type,{bubbles:true,cancelable:true});for(const [key,value] of Object.entries({clientX:x,pointerId:id,pointerType,button:0}))Object.defineProperty(e,key,{value});target.dispatchEvent(e);}
let start=Number($('trimStart').value),end=Number($('trimEnd').value);
pointer($('moveSelection'),'pointerdown',150);pointer(document,'pointermove',200);pointer(document,'pointerup',200);
assert.equal(Number($('trimStart').value),start+10);assert.equal(Number($('trimEnd').value),end+10);assert.equal($('undoBtn').disabled,false);
$('undoBtn').click();assert.equal(Number($('trimStart').value),start);assert.equal(Number($('trimEnd').value),end);$('redoBtn').click();assert.equal(Number($('trimStart').value),start+10);
start=Number($('trimStart').value);end=Number($('trimEnd').value);pointer($('trimHandleStart'),'pointerdown',150,2,'touch');pointer(document,'pointermove',175,2,'touch');pointer(document,'pointerup',175,2,'touch');assert.equal(Number($('trimStart').value),start+5);assert.equal(Number($('trimEnd').value),end);
start=Number($('trimStart').value);end=Number($('trimEnd').value);pointer($('trimHandleEnd'),'pointerdown',200,3,'touch');pointer(document,'pointermove',225,3,'touch');pointer(document,'pointercancel',225,3,'touch');assert.equal(Number($('trimStart').value),start);assert.equal(Number($('trimEnd').value),end);
$('trimHandleEnd').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',shiftKey:true,bubbles:true}));assert.equal(Number($('trimEnd').value),end+1);
$('fitClipBtn').click();assert.equal($('timelinePan').hidden,false);assert.notEqual($('zoomLabel').textContent,'1×');$('fullTimelineBtn').click();assert.equal($('timelinePan').hidden,true);
$('qualityShortcut').click();assert.equal($('tool-quality').hidden,false);$('enhanceBtn').click();assert.equal($('brightness').value,'103');assert.equal($('contrast').value,'110');assert.ok($('qualityApplied').textContent.includes('Mejora aplicada'));
$('motionMode').value='blend';$('motionMode').dispatchEvent(new Event('change'));assert.equal($('motionBadge').hidden,false);$('exportBtn').click();assert.equal($('exportFps').value,'120');assert.equal($('exportFps').disabled,false);assert.ok($('exportSpec').textContent.includes('120 fps'));$('exportDialog').close();
document.querySelector('[data-fps-preset="240"]').click();assert.equal($('qualityFps').value,'240');assert.equal($('motionMode').value,'blend');assert.ok($('motionBadge').textContent.includes('240'));
$('exportBtn').click();assert.equal($('exportFps').value,'240');$('exportFps').value='165';$('exportFps').dispatchEvent(new Event('change'));assert.equal($('qualityFps').value,'165');$('exportDialog').close();
document.querySelector('[data-fps-preset="max"]').click();assert.equal($('qualityFps').value,'max');
exportSuccess=true;$('qualityPreviewBtn').click();await new Promise(r=>setTimeout(r,30));
const sampleRequest=workerRequests.filter(r=>r.action==='export').at(-1);assert.equal(sampleRequest.options.fps,'max');assert.equal(sampleRequest.options.resolution,1080);assert.ok(sampleRequest.clip.end-sampleRequest.clip.start<=4);assert.equal($('sampleCompare').hidden,false);assert.ok($('sampleSpec').textContent.includes('144'));
$('sampleOriginalBtn').click();assert.equal($('sampleOriginal').hidden,false);assert.equal($('sampleVideo').hidden,true);assert.equal($('sampleOriginal').currentTime,sampleRequest.clip.start);$('sampleResultBtn').click();assert.equal($('sampleVideo').hidden,false);assert.equal($('sampleOriginal').hidden,true);
document.querySelector('[data-close="sampleDialog"]').click();$('exportBtn').click();$('exportForm').dispatchEvent(new Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,30));assert.equal($('exportDialog').open,false);assert.ok(document.querySelector('[data-export-action=download]').download.includes('144fps'));assert.ok($('exportsList').textContent.includes('144 fps'));assert.ok(downloadRequests.some(r=>r.filename.includes('144fps')));
await new Promise(r=>setTimeout(r,300));const updated=JSON.parse(localStorage.getItem(localStorage.key(0)));assert.equal(updated.clips[0].settings.smoothMotion,true);assert.equal(updated.clips[0].settings.motionFps,'max');assert.equal(updated.clips[0].settings.exportFps,'max');assert.equal(updated.clips[0].settings.contrast,110);
$('qualityFps').value='source';$('qualityFps').dispatchEvent(new Event('change'));assert.equal($('motionMode').value,'off');assert.equal($('motionBadge').hidden,true);
console.log('HFR OK: 120/240/máximo, sincronización entre paneles, muestra con resolución elegida, comparación, fps reales del resultado y persistencia.');
console.log('Studio OK: selección sube al monitor; arrastre, tiradores táctiles, cancelar, teclado, zoom, deshacer/rehacer y calidad persistente.');
document.querySelector('[data-game="minecraft"]').click();assert.equal($('fortniteControls').hidden,true);assert.equal($('clipLengthField').hidden,false);document.querySelector('[data-game="fortnite"]').click();assert.equal($('fortniteControls').hidden,false);assert.equal($('clipMax').value,'100');assert.equal($('clipLengthField').hidden,true);
$('fortniteName').value='FelipeDMC';$('fortniteName').dispatchEvent(new Event('input'));$('killLead').value='20';$('killLead').dispatchEvent(new Event('change'));$('killTail').value='8';$('killTail').dispatchEvent(new Event('change'));
const {buildEliminationClips}=await import('../dist/fortnite-events.js');const events=[{kind:'elimination',target:'EnemyOne',time:30,confidence:91,source:'banner',observations:3},{kind:'elimination',target:'EnemyTwo',time:70,confidence:86,source:'feed',observations:2}];
killResponse={meta,events,clips:buildEliminationClips(events,120,{lead:20,tail:8,maxClips:100}),thumbs:[],audio:[],motion:[],warnings:[],detectionMode:'fortnite-kills',scanStats:{kills:2,knocks:0}};
const oldCount=document.querySelectorAll('.clip-card').length;$('analyzeBtn').click();await new Promise(r=>setTimeout(r,30));
const killRequest=workerRequests.filter(r=>r.action==='analyze').at(-1);assert.equal(killRequest.options.fortnite.playerName,'FelipeDMC');assert.equal(killRequest.options.fortnite.mode,'kills');assert.equal(killRequest.options.fortnite.includeKnocks,false);assert.equal(killRequest.options.maxClips,100);assert.equal(killRequest.options.fortnite.lead,20);
assert.equal(document.querySelectorAll('.clip-card').length,oldCount+2);assert.equal(document.querySelectorAll('.kill-card').length,2);assert.ok($('analysisSummary').textContent.includes('2 eliminaciones'));assert.ok(document.querySelector('.kill-card h3').textContent.includes('Eliminación'));
$('fullTimelineBtn').click();assert.equal(document.querySelectorAll('.kill-marker').length,2);document.querySelector('.kill-marker').click();assert.equal($('video').currentTime,30);
$('analyzeBtn').click();await new Promise(r=>setTimeout(r,30));assert.equal(document.querySelectorAll('.clip-card').length,oldCount+2);
await new Promise(r=>setTimeout(r,300));const killProject=JSON.parse(localStorage.getItem(localStorage.key(0)));assert.equal(killProject.fortnite.playerName,'FelipeDMC');assert.equal(killProject.events.length,2);assert.equal(killProject.clips.filter(c=>c.detection==='fortnite-kill').length,2);
killResponse={...killResponse,events:[],clips:[],scanStats:{kills:0,knocks:0}};$('analyzeBtn').click();await new Promise(r=>setTimeout(r,30));assert.equal(document.querySelectorAll('.clip-card').length,oldCount+2);assert.ok($('analysisSummary').textContent.includes('No se pudieron confirmar'));assert.equal(document.querySelectorAll('.kill-marker').length,0);
console.log('Fortnite DOM OK: modos, contexto, nombre, metadatos, marcadores, guardado, deduplicación y cero detecciones sin falsos clips de actividad.');
// The reference profile changes image detail, not timing, crop or text.
$('qualityShortcut').click();document.querySelector('[data-fps-preset="240"]').click();
const preservedRatio=JSON.parse(localStorage.getItem(localStorage.key(0))).clips[0].settings.ratio;
$('fortniteLook').click();assert.equal($('qualityFps').value,'240');assert.equal($('motionMode').value,'blend');
assert.equal($('brightness').value,'102');assert.equal($('contrast').value,'112');assert.equal($('saturation').value,'122');assert.equal($('imageSharpness').value,'42');assert.equal($('qualityLevel').value,'ultra');assert.equal($('fortniteLook').getAttribute('aria-pressed'),'true');
$('undoBtn').click();assert.equal($('imageSharpness').value,'18');$('redoBtn').click();assert.equal($('imageSharpness').value,'42');
$('qualityResolution').value='2160';$('qualityResolution').dispatchEvent(new Event('change'));assert.ok($('sourceQualityNote').textContent.includes('amplía'));assert.ok($('qualityOutputSpec').textContent.includes('2160'));
$('imageSharpness').value='65';$('imageSharpness').dispatchEvent(new Event('input'));assert.equal($('imageSharpnessOut').textContent,'65%');assert.equal($('fortniteLook').getAttribute('aria-pressed'),'false');
$('qualityPreviewBtn').click();await new Promise(r=>setTimeout(r,50));const sharpRequest=workerRequests.filter(r=>r.action==='export').at(-1);
assert.equal(sharpRequest.options.resolution,2160);assert.equal(sharpRequest.options.quality,'ultra');assert.equal(sharpRequest.options.fps,'240');assert.equal(sharpRequest.clip.settings.sharpness,65);assert.equal(sharpRequest.clip.settings.ratio,preservedRatio);
document.querySelector('[data-close="sampleDialog"]').click();$('exportBtn').click();assert.equal($('exportResolution').value,'2160');assert.equal($('exportQuality').value,'ultra');$('exportDialog').close();
await new Promise(r=>setTimeout(r,300));const sharpProject=JSON.parse(localStorage.getItem(localStorage.key(0)));assert.equal(sharpProject.clips[0].settings.sharpness,65);assert.equal(sharpProject.clips[0].settings.exportQuality,'ultra');assert.equal(sharpProject.clips[0].settings.exportResolution,2160);
$('resetQualityImage').click();assert.equal($('imageSharpness').value,'0');assert.equal($('contrast').value,'100');assert.equal($('qualityFps').value,'240');
console.log('Image quality DOM OK: preset, preserved fps/crop, undo/redo, sharpness, source warning, 4K/ultra sample settings, export and persistence.');

// Keep actual background worker promises pending while using the editor.
$('clearExports').click();holdExports=true;exportSuccess=true;
$('exportAutoDownload').checked=false;
document.querySelectorAll('[data-select]')[0].click();
$('exportBtn').click();$('exportForm').dispatchEvent(new Event('submit',{cancelable:true}));
const firstBackground=workers.at(-1),firstStart=firstBackground.data.clip.start,firstTitle=firstBackground.data.clip.title,sourceName=firstBackground.data.file.name;
assert.equal($('exportDialog').open,false);assert.equal($('editSection').inert,false);assert.equal($('quickTrim').inert,false);
assert.equal($('qualityControls').disabled,false);assert.equal($('importTop').disabled,false);assert.equal($('exportBtn').disabled,false);
$('trimStart').value=String(firstStart+1);$('trimStart').dispatchEvent(new Event('change'));
assert.equal(Number($('trimStart').value),firstStart+1);assert.equal(firstBackground.data.clip.start,firstStart);
assert.equal($('undoBtn').disabled,false);$('undoBtn').click();assert.equal(Number($('trimStart').value),firstStart);
$('redoBtn').click();assert.equal(Number($('trimStart').value),firstStart+1);assert.equal(firstBackground.data.clip.start,firstStart);
$('seekBar').value='33';$('seekBar').dispatchEvent(new Event('input'));assert.equal($('video').currentTime,33);
$('exportQueueToggle').click();assert.equal($('exportsPanel').hidden,false);assert.equal(document.querySelector('dialog[open]'),null);
const cancelFocused=document.querySelector('[data-status=processing] [data-export-action=cancel]');cancelFocused.focus();
firstBackground.onmessage({data:{type:'progress',phase:'Creando archivo',value:43}});
assert.equal(document.activeElement,cancelFocused);assert.ok($('exportQueueHeading').textContent.includes('43%'));
$('minimizeExports').click();assert.equal($('exportsPanel').hidden,true);assert.equal(firstBackground.dead,undefined);
// Foreground sample cancellation must leave the export worker alive.
$('qualityPreviewBtn').click();const sampleWorker=workers.at(-1);assert.notEqual(sampleWorker,firstBackground);
$('cancelSample').click();await new Promise(r=>setTimeout(r,20));assert.equal(sampleWorker.dead,true);assert.equal(firstBackground.dead,undefined);
document.querySelector('[data-close=sampleDialog]').click();
document.querySelectorAll('[data-select]')[1].click();$('clipTitle').value='Segundo en cola';$('clipTitle').dispatchEvent(new Event('input'));
$('exportAutoDownload').checked=true;$('exportBtn').click();const exportsBefore=workerRequests.filter(r=>r.action==='export').length;
$('exportForm').dispatchEvent(new Event('submit',{cancelable:true}));
assert.equal(workerRequests.filter(r=>r.action==='export').length,exportsBefore,'El segundo codificador espera su turno');
assert.equal(document.querySelectorAll('[data-status=queued]').length,1);
const savedSecondStart=Number($('trimStart').value);
$('trimStart').value=String(savedSecondStart+1);$('trimStart').dispatchEvent(new Event('change'));
$('clipTitle').value='Cambios posteriores';$('clipTitle').dispatchEvent(new Event('input'));
const unloading=new Event('beforeunload',{cancelable:true});window.dispatchEvent(unloading);assert.equal(unloading.defaultPrevented,true);
// Importing another source must not replace either queued job's source.
$('autoAnalyze').checked=false;
Object.defineProperty($('fileInput'),'files',{value:[new File(['new bytes'],'otra-partida.mp4',{type:'video/mp4',lastModified:2})],configurable:true});
$('fileInput').dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,30));
assert.equal($('fileName').textContent,'otra-partida.mp4');assert.equal($('exportBtn').disabled,false);
firstBackground.respond();const secondBackground=workers.at(-1);
assert.equal(firstBackground.dead,true);assert.equal(secondBackground.data.clip.title,'Segundo en cola');
assert.equal(secondBackground.data.clip.start,savedSecondStart);assert.equal(secondBackground.data.file.name,sourceName);
assert.equal($('fileName').textContent,'otra-partida.mp4');assert.equal($('exportBtn').disabled,false);
assert.ok($('exportsList').textContent.includes(firstTitle));
const autoBefore=downloadRequests.length;secondBackground.respond();assert.equal(downloadRequests.length,autoBefore+1);
assert.equal(document.querySelectorAll('[data-status=ready]').length,2);assert.equal(document.querySelector('dialog[open]'),null);
assert.equal($('fileName').textContent,'otra-partida.mp4');assert.equal($('exportBtn').disabled,false);
const safeUnload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(safeUnload);assert.equal(safeUnload.defaultPrevented,false);
$('clearExports').click();assert.equal($('exportQueueToggle').hidden,true);assert.equal($('exportCount').textContent,'0');
console.log('Background exports OK: editor/seek/undo available, non-modal panel, focus during progress, independent cancellation, FIFO, source/settings snapshots, import during export, unload guard and automatic download.');

// No duration cap in the actual export UI; direct saves capture settings before
// the asynchronous picker and never trigger a duplicate automatic download.
meta.duration=400;$('autoAnalyze').checked=false;
Object.defineProperty($('fileInput'),'files',{value:[new File(['long video'],'larga.mp4',{type:'video/mp4',lastModified:3})],configurable:true});
$('fileInput').dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,30));
$('addClipBtn').click();$('trimStart').value='0';$('trimStart').dispatchEvent(new Event('change'));
$('trimEnd').value='400';$('trimEnd').dispatchEvent(new Event('change'));
window.showSaveFilePicker=async()=>{throw new DOMException('cancelled','AbortError');};
$('exportBtn').click();assert.equal($('exportDialog').open,true);assert.equal($('exportDirectField').hidden,false);
$('exportDirect').checked=true;$('exportDirect').dispatchEvent(new Event('change'));assert.equal($('exportAutoDownload').disabled,true);
const beforePicker=workers.length;$('exportForm').dispatchEvent(new Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));
assert.equal(workers.length,beforePicker);assert.equal($('startExport').disabled,false);assert.equal($('exportError').hidden,true);
const chosenHandle={name:'Video largo.mp4',createWritable(){}};let releasePicker;
window.showSaveFilePicker=()=>new Promise(resolve=>{releasePicker=resolve;});
$('exportForm').dispatchEvent(new Event('submit',{cancelable:true}));assert.equal($('startExport').disabled,true);
$('exportQuality').value='standard';$('exportQuality').dispatchEvent(new Event('change'));
releasePicker(chosenHandle);await new Promise(r=>setTimeout(r,5));const directWorker=workers.at(-1);
assert.equal(directWorker.data.clip.end,400);assert.equal(directWorker.data.destination.handle,chosenHandle);
assert.equal(directWorker.data.options.quality,'high','La selección queda guardada antes de abrir el selector de archivo');
assert.equal($('exportDialog').open,false);
const beforeDirect=downloadRequests.length;
directWorker.onmessage({data:{type:'result',result:{saved:true,filename:chosenHandle.name,size:3*1024**3,extension:'mp4',width:3840,height:2160,fps:240}}});
assert.equal(downloadRequests.length,beforeDirect);assert.equal(document.querySelector('[data-export-action=download]'),null);
assert.ok($('exportsList').textContent.includes('Guardado en tu equipo'));
console.log('Large exports DOM OK: 400-second clip, cancelled save picker, frozen export settings, direct disk result and no duplicate download.');

// Full recording works immediately, without analyzing or creating any clips.
$('clearExports').click();$('exportDirect').checked=false;$('exportAutoDownload').checked=false;
const wholeFile=new File(['entire source'],'todo-el-video.mp4',{type:'video/mp4',lastModified:4});
Object.defineProperty($('fileInput'),'files',{value:[wholeFile],configurable:true});
$('fileInput').dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,30));
assert.equal(document.querySelectorAll('.clip-card').length,0);
assert.equal($('qualityControls').disabled,false);assert.equal($('exportBtn').disabled,false);
assert.equal($('editFullVideoBtn').getAttribute('aria-pressed'),'true');assert.equal($('quickTrim').hidden,true);
$('qualityShortcut').click();$('fortniteLook').click();document.querySelector('[data-fps-preset="120"]').click();
$('qualityResolution').value='2160';$('qualityResolution').dispatchEvent(new Event('change'));
document.querySelector('[data-ratio="9:16"]').click();
$('overlayText').value='Toda mi partida';$('overlayText').dispatchEvent(new Event('input'));
$('volume').value='55';$('volume').dispatchEvent(new Event('input'));
$('clipWatermark').checked=true;$('clipWatermark').dispatchEvent(new Event('change'));
$('markStart').click();$('trimEnd').value='20';$('trimEnd').dispatchEvent(new Event('change'));
$('exportFullVideoBtn').click();assert.equal($('exportScope').value,'full');
assert.equal($('exportScope').querySelector('[value=selection]').disabled,true);
assert.ok($('exportSpec').textContent.includes('400.0 s'));assert.ok($('qualityOutputSpec').textContent.includes('por video completo'));
$('exportForm').dispatchEvent(new Event('submit',{cancelable:true}));const wholeWorker=workers.at(-1);
assert.equal(wholeWorker.data.clip.start,0);assert.equal(wholeWorker.data.clip.end,400);
assert.deepEqual(wholeWorker.data.options,{format:'mp4',resolution:2160,fps:'120',quality:'ultra'});
const wholeSettings=structuredClone(wholeWorker.data.clip.settings);
for(const [key,value] of Object.entries({sharpness:42,contrast:112,saturation:122,brightness:102,smoothMotion:true,ratio:'9:16',text:'Toda mi partida',watermark:true,volume:55}))assert.equal(wholeSettings[key],value,key);
assert.equal($('exportDialog').open,false);assert.equal($('qualityControls').disabled,false);
$('imageSharpness').value='20';$('imageSharpness').dispatchEvent(new Event('input'));assert.equal(wholeWorker.data.clip.settings.sharpness,42);
wholeWorker.respond();$('clearExports').click();
await new Promise(r=>setTimeout(r,300));
const wholeKey=[...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).find(k=>k.includes('todo-el-video'));
const wholeProject=JSON.parse(localStorage.getItem(wholeKey));assert.equal(wholeProject.clips.length,0);assert.equal(wholeProject.video.settings.sharpness,20);assert.equal(wholeProject.editingFullVideo,true);
$('fileInput').dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,30));
assert.equal($('imageSharpness').value,'20');assert.equal($('overlayText').value,'Toda mi partida');assert.equal($('editFullVideoBtn').getAttribute('aria-pressed'),'true');
// Export a selected clip's settings across the source, without changing its cut
// or replacing the independently saved whole-video settings.
$('addClipBtn').click();$('trimStart').value='20';$('trimStart').dispatchEvent(new Event('change'));
$('trimEnd').value='35';$('trimEnd').dispatchEvent(new Event('change'));
$('fortniteLook').click();$('qualityFps').value='60';$('qualityFps').dispatchEvent(new Event('change'));
$('exportBtn').click();assert.equal($('exportScope').value,'selection');assert.ok($('exportSpec').textContent.includes('15.0 s'));
$('exportScope').value='full';$('exportScope').dispatchEvent(new Event('change'));assert.ok($('exportSpec').textContent.includes('400.0 s'));
assert.ok($('exportScopeNote').textContent.includes('Tu recorte se conserva'));
$('exportScope').value='selection';$('exportScope').dispatchEvent(new Event('change'));assert.ok($('exportSpec').textContent.includes('15.0 s'));
$('exportDialog').close();$('exportFullVideoBtn').click();$('exportForm').dispatchEvent(new Event('submit',{cancelable:true}));
const fromClipWorker=workers.at(-1);assert.equal(fromClipWorker.data.clip.start,0);assert.equal(fromClipWorker.data.clip.end,400);
assert.equal(fromClipWorker.data.clip.settings.sharpness,42);assert.equal(fromClipWorker.data.options.fps,'60');
assert.equal(Number($('trimStart').value),20);assert.equal(Number($('trimEnd').value),35);assert.equal(document.querySelectorAll('.clip-card').length,1);
$('editFullVideoBtn').click();assert.equal($('imageSharpness').value,'20');assert.equal($('qualityFps').value,'120');assert.equal($('quickTrim').hidden,true);
assert.equal(fromClipWorker.data.clip.settings.sharpness,42);fromClipWorker.respond();$('clearExports').click();
// Last-clip deletion returns to the full recording, preserving its settings.
document.querySelector('[data-select]').click();document.querySelector('[data-remove]').click();
assert.equal($('qualityControls').disabled,false);assert.equal($('editFullVideoBtn').getAttribute('aria-pressed'),'true');assert.equal($('imageSharpness').value,'20');
console.log('Full-video DOM OK: no clips required, all image/audio/fps settings, entire 400s range, fixed full range, background snapshots, persistence, clip/full switching and independent settings.');
dom.window.close();process.exit(0);

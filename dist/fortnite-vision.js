import {CanvasSink} from './vendor/mediabunny.mjs';
import {detectorSettings,prepareTextPixels,ocrLines,parseBanner,parseKillFeed,isSpectatorText,EliminationTracker,buildEliminationClips} from './fortnite-events.js';

function makeRegion(frame,rect,width=1120){
 const [x,y,w,h]=rect,sw=frame.width,sh=frame.height;
 const canvas=new OffscreenCanvas(width,Math.max(32,Math.round(width*h*sh/(w*sw))));
 const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#000';context.fillRect(0,0,canvas.width,canvas.height);
 context.drawImage(frame,x*sw,y*sh,w*sw,h*sh,0,0,canvas.width,canvas.height);
 const pixels=context.getImageData(0,0,canvas.width,canvas.height),foreground=prepareTextPixels(pixels.data);context.putImageData(pixels,0,0);
 return {canvas,rect,foreground};
}
async function readRegion(worker,region){
 if(region.foreground<24)return {text:'',confidence:0,blocks:[]};
 const bytes=new Uint8Array(await (await region.canvas.convertToBlob({type:'image/png'})).arrayBuffer());
 return (await worker.recognize(bytes,{}, {text:true,blocks:true})).data;
}
function centralLine(line,region){
 if(!line.bbox)return false;const {x0,x1}=line.bbox;
 // Reject a line cut off at a crop edge, and left-aligned feed fragments.
 const center=region.rect[0]+(x0+x1)/2/region.canvas.width*region.rect[2];
 return x0>6&&x1<region.canvas.width-6&&center>.36&&center<.73;
}
export async function scanFortnite(video,meta,raw,progress){
 const settings=detectorSettings(raw.fortnite),tracker=new EliminationTracker(raw);
 progress('Preparando lectura de eliminaciones',1,true);
 let worker,frames=0,readFrames=0;
 try{
  const {default:Tesseract}=await import('./vendor/tesseract/tesseract.esm.min.js');
  worker=await Tesseract.createWorker('eng',1,{
   workerPath:new URL('./vendor/tesseract/worker.min.js',import.meta.url).href,
   corePath:new URL('./vendor/tesseract/core/',import.meta.url).href,
   langPath:new URL('./vendor/tesseract/lang/',import.meta.url).href,
   workerBlobURL:false,gzip:true,cachePath:'clipforge-ocr-v1'
  },{load_system_dawg:'0',load_freq_dawg:'0'});
  await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1',user_defined_dpi:'150'});
  const interval=settings.scanRate==='fast'?1:.5,times=[];for(let t=0;t<meta.duration-.01;t+=interval)times.push(t);
  const sink=new CanvasSink(video,{width:Math.min(meta.width,1920),poolSize:1});
  const bannerRect=settings.hud==='wide'?[.22,.38,.56,.49]:[.28,.53,.44,.31];
  for await(const frame of sink.canvasesAtTimestamps(times)){
   const time=times[frames++];if(!frame){progress('Leyendo la partida',4+frames/times.length*88);continue;}readFrames++;
   const readings=[],banner=makeRegion(frame.canvas,bannerRect),data=await readRegion(worker,banner);
   for(const line of ocrLines(data)){const event=parseBanner(line.text,settings);if(event&&centralLine(line,banner))readings.push({...event,confidence:line.confidence});}
   if(settings.playerName){
    const feed=makeRegion(frame.canvas,[.005,.48,.48,.36],1280),feedData=await readRegion(worker,feed);
    for(const line of ocrLines(feedData)){const event=parseKillFeed(line.text,settings.playerName,settings);if(event)readings.push({...event,confidence:line.confidence});}
   }
   let spectator=false;
   if(readings.length){
    const top=makeRegion(frame.canvas,[.18,.015,.66,.32],1120),context=await readRegion(worker,top);
    spectator=isSpectatorText(context.text)||isSpectatorText(data.text);
   }
   tracker.observe(time,readings,{spectator});
   progress(`Leyendo eliminaciones · ${tracker.events.filter(e=>e.kind==='elimination').length} detectadas`,4+frames/times.length*88);
  }
  if(!readFrames)throw new Error('No se pudieron leer imágenes del video. Prueba una grabación MP4 con el HUD visible.');
  const events=tracker.events,clips=buildEliminationClips(events,meta.duration,{lead:settings.lead,tail:settings.tail,maxClips:raw.maxClips});
  const warnings=['Detección por texto visible; revisa las propuestas. No reconoce avisos ocultos ni garantiza encontrar todas las bajas.'];
  if(tracker.spectatorFrames)warnings.push('Se descartaron avisos con señales de modo espectador o repetición.');
  if(frames-readFrames>Math.max(3,frames*.05))warnings.push('No se pudieron leer algunos instantes del video.');
  return {clips,events,audio:[],motion:[],warnings,detectionMode:'fortnite-kills',scanStats:{frames:readFrames,kills:events.filter(e=>e.kind==='elimination').length,knocks:events.filter(e=>e.kind==='knock').length,spectatorFrames:tracker.spectatorFrames}};
 }catch(error){throw new Error(`Detector de Fortnite: ${error.message||'no se pudo iniciar la lectura de avisos'}. Tus clips anteriores se conservan.`);}
 finally{await worker?.terminate();}
}

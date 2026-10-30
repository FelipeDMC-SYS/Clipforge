import {createExportSession,removeStoredExport} from './export-storage.js?v=10';
const ACTIVE = new Set(['queued','processing']);
const safeName = value => String(value).replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ _-]/g,'').trim().replace(/\s+/g,'-').slice(0,70)||'clip';

// Export workers belong to this queue, never to the editor's inspection,
// analysis or sample job. One encoder runs at a time; editing stays available.
export class ExportQueue {
 constructor({createWorker=()=>new Worker(new URL('./media-worker.js?v=10',import.meta.url),{type:'module'}),createURL=blob=>URL.createObjectURL(blob),revokeURL=url=>URL.revokeObjectURL(url),session=createExportSession(),removeStorage=removeStoredExport}={}){
  this.items=[];this.active=null;this.sequence=0;this.listeners=new Set();this.closed=false;
  this.createWorker=createWorker;this.createURL=createURL;this.revokeURL=revokeURL;
  this.session=session;this.removeStorage=removeStorage;
 }
 get pendingCount(){return this.items.filter(item=>ACTIVE.has(item.status)).length;}
 get hasPending(){return this.pendingCount>0;}
 subscribe(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 notify(type,item){for(const listener of this.listeners){try{listener({type,item});}catch(error){console.error('No se pudo actualizar la cola de exportación.',error);}}}
 add({file,clip,options,autoDownload=true,fileHandle=null}){
  if(this.closed)throw new Error('La cola de exportación ya está cerrada.');
  if(!file?.size)throw new Error('Carga un video antes de exportar.');
  if(!Number.isFinite(clip?.start)||!Number.isFinite(clip?.end)||clip.start<0||clip.end-clip.start<.099)throw new Error('El recorte debe durar al menos 0.1 segundos y tener tiempos válidos.');
  const {thumb,...savedClip}=clip;
  const item={id:crypto.randomUUID(),order:++this.sequence,file,fileHandle,destination:null,storage:null,sourceName:file.name||'Video original',clip:structuredClone(savedClip),options:structuredClone(options),autoDownload:!!autoDownload,status:'queued',progress:0,phase:'En cola',error:null,encoding:null,result:null,downloadRequested:false};
  this.items.push(item);this.notify('added',item);this.pump();return item;
 }
 pump(){
  if(this.closed||this.active)return;
  const item=this.items.filter(item=>item.status==='queued').sort((a,b)=>a.order-b.order)[0];
  if(!item)return;
  const destination=item.fileHandle?{kind:'file',handle:item.fileHandle}:{kind:'temporary',session:this.session.id,name:crypto.randomUUID()+'.'+item.options.format};
  const run={item,worker:null,destination};item.destination=destination;this.active=run;item.status='processing';item.phase='Preparando el archivo';
  this.notify('started',item);
  if(this.active!==run)return;
  try{
   const worker=this.createWorker();run.worker=worker;
   worker.onmessage=({data})=>{
    if(this.active!==run)return;
    if(data.type==='progress'){
     item.progress=Math.max(item.progress,Math.min(99,Math.max(0,Number(data.value)||0)));
     item.phase=String(data.phase||'Exportando');this.notify('progress',item);
    }else if(data.type==='encoding'){
     const {fps,bitrate,motionApplied,automatic}=data;item.encoding={fps,bitrate,motionApplied,automatic};this.notify('encoding',item);
    }else if(data.type==='storage'){item.storage=data.mode;this.notify('storage',item);}
    else if(data.type==='error')this.finish(run,'failed',String(data.message||'No se pudo exportar el clip.'));
    else if(data.type==='result'){
     try{
      const result=data.result;
      if(!result||!['mp4','webm'].includes(result.extension))throw new Error('La exportación no generó un archivo válido.');
      const saved=result.saved===true&&destination.kind==='file';
      const blob=result.file instanceof Blob?result.file.slice(0,result.file.size,result.type):result.buffer instanceof ArrayBuffer?new Blob([result.buffer],{type:result.type}):null;
      const size=saved?result.size:blob?.size;
      if(!Number.isFinite(size)||size<100)throw new Error('La exportación no generó un archivo válido.');
      const filename=saved?result.filename:`${safeName(item.clip.title)}-${item.clip.settings.ratio.replace(':','x')}${Number.isFinite(result.fps)?'-'+Math.round(result.fps)+'fps':''}.${result.extension}`;
      item.result={url:saved?null:this.createURL(blob),saved,filename,size,width:result.width,height:result.height,fps:result.fps,bitrate:result.bitrate};
      this.finish(run,'ready');
     }catch(error){this.finish(run,'failed',error.message||'No se pudo preparar la descarga.');}
    }
   };
   worker.onerror=event=>{event.preventDefault?.();this.finish(run,'failed','El motor de exportación se quedó sin recursos o no pudo iniciarse. Puedes reintentar este clip o exportarlo con otros ajustes.');};
   worker.onmessageerror=()=>this.finish(run,'failed','No se pudo recibir el archivo exportado. Vuelve a intentarlo.');
   const dispatch=()=>{if(this.active!==run)return;try{worker.postMessage({action:'export',file:item.file,clip:item.clip,options:item.options,destination});}catch(error){this.finish(run,'failed',error.message);}};
   if(this.session.ready)this.session.ready.then(dispatch,error=>this.finish(run,'failed',error.message));else dispatch();
  }catch(error){this.finish(run,'failed',error.message||'No se pudo iniciar la exportación.');}
 }
 stop(run){
  if(run.worker){run.worker.onmessage=null;run.worker.onerror=null;run.worker.onmessageerror=null;run.worker.terminate();}
  if(this.active===run)this.active=null;
 }
 finish(run,status,error=null){
  if(this.active!==run)return;
  this.stop(run);const item=run.item;item.status=status;item.error=error;
  if(status==='ready'){item.progress=100;item.phase='Archivo listo';item.file=null;}
  else{this.releaseStored(item.destination);item.destination=null;}
  this.notify(status,item);this.pump();
 }
 cancel(id){
  const item=this.items.find(item=>item.id===id);if(!item||!ACTIVE.has(item.status))return false;
  if(this.active?.item===item)this.stop(this.active);
  this.releaseStored(item.destination);item.destination=null;
  item.status='cancelled';item.phase='Cancelada';item.file=null;this.notify('cancelled',item);this.pump();return true;
 }
 retry(id){
  const item=this.items.find(item=>item.id===id);if(!item||item.status!=='failed'||!item.file||this.closed)return false;
  item.status='queued';item.order=++this.sequence;item.error=null;item.progress=0;item.phase='En cola';item.encoding=null;item.storage=null;
  this.notify('retried',item);this.pump();return true;
 }
 markDownloadRequested(id){
  const item=this.items.find(item=>item.id===id);if(item?.status!=='ready')return;
  item.downloadRequested=true;this.notify('download-requested',item);
 }
 remove(id){
  const item=this.items.find(item=>item.id===id);if(!item)return;
  if(ACTIVE.has(item.status))this.cancel(id);
  if(item.result?.url)this.revokeURL(item.result.url);
  this.releaseStored(item.destination);item.destination=null;item.fileHandle=null;
  item.file=null;item.result=null;this.items=this.items.filter(entry=>entry!==item);this.notify('removed',item);
 }
 clearFinished(){for(const item of [...this.items])if(!ACTIVE.has(item.status))this.remove(item.id);}
 releaseStored(destination){return Promise.resolve().then(()=>this.removeStorage(destination)).catch(()=>{});}
 dispose(){
  this.closed=true;if(this.active)this.stop(this.active);
  const cleanup=[];
  for(const item of this.items){if(item.result?.url)this.revokeURL(item.result.url);cleanup.push(this.releaseStored(item.destination));item.file=null;item.fileHandle=null;item.result=null;}
  Promise.all(cleanup).finally(()=>this.session.release());
  this.items=[];this.listeners.clear();
 }
}

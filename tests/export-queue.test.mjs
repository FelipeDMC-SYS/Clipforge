import test from 'node:test';
import assert from 'node:assert/strict';
import {ExportQueue} from '../dist/export-queue.js';
import {defaultSettings} from '../dist/core.js';

function harness(extra={}){
 const workers=[],revoked=[],blobs=[];
 const queue=new ExportQueue({
  createWorker:()=>{const worker={dead:false,postMessage(data){this.data=data;},terminate(){this.dead=true;},emit(data){this.onmessage?.({data});}};workers.push(worker);return worker;},
  createURL:blob=>{blobs.push(blob);return 'blob:export-'+blobs.length;},revokeURL:url=>revoked.push(url),...extra
 });
 const file=new File(['source video'],'partida-A.mp4',{type:'video/mp4'});
 const request=(title='Clip A')=>({file,clip:{id:title,title,start:10,end:20,thumb:'blob:thumbnail',settings:defaultSettings()},options:{format:'mp4',resolution:2160,fps:'240',quality:'ultra'}});
 const complete=worker=>worker.emit({type:'result',result:{buffer:new ArrayBuffer(256),type:'video/mp4',extension:'mp4',width:3840,height:2160,fps:240,bitrate:100000000}});
 return {queue,workers,revoked,blobs,request,complete};
}

test('la cola usa un solo codificador y conserva archivo, recorte y ajustes al editar o cambiar de partida',()=>{
 const {queue,workers,request,complete}=harness();
 const first=request(),second=request('Clip B');second.file=new File(['another video'],'partida-B.mp4');
 const a=queue.add(first),b=queue.add(second);
 assert.equal(workers.length,1);assert.equal(queue.pendingCount,2);assert.equal(b.status,'queued');
 first.clip.start=99;first.clip.settings.volume=0;first.options.resolution=720;
 second.clip.title='Título editado después';second.clip.end=80;second.options.fps='30';
 assert.equal(workers[0].data.clip.start,10);assert.equal(workers[0].data.clip.settings.volume,100);
 assert.equal(workers[0].data.options.resolution,2160);assert.equal(workers[0].data.clip.thumb,undefined);
 complete(workers[0]);
 assert.equal(a.status,'ready');assert.equal(a.file,null);assert.equal(workers[0].dead,true);
 assert.equal(workers.length,2);assert.equal(workers[1].data.file.name,'partida-B.mp4');
 assert.equal(workers[1].data.clip.title,'Clip B');assert.equal(workers[1].data.clip.end,20);
 assert.equal(workers[1].data.options.fps,'240');assert.equal(workers[1].data.options.quality,'ultra');
 complete(workers[1]);assert.equal(queue.hasPending,false);queue.dispose();
});

test('cancelar una tarea en espera no interrumpe la activa; cancelar la activa avanza y descarta mensajes tardíos',()=>{
 const {queue,workers,request,complete}=harness();
 const a=queue.add(request('A')),b=queue.add(request('B')),c=queue.add(request('C'));
 const oldMessage=workers[0].onmessage;
 assert.equal(queue.cancel(b.id),true);assert.equal(workers.length,1);assert.equal(workers[0].dead,false);assert.equal(b.file,null);
 queue.cancel(a.id);assert.equal(workers[0].dead,true);assert.equal(workers.length,2);assert.equal(c.status,'processing');
 oldMessage({data:{type:'progress',value:99,phase:'late'}});oldMessage({data:{type:'error',message:'late error'}});
 assert.equal(c.progress,0);assert.equal(c.error,null);assert.equal(a.status,'cancelled');
 complete(workers[1]);assert.equal(queue.pendingCount,0);queue.dispose();
});

test('un error no bloquea las siguientes exportaciones; reintentar conserva la captura original y respeta la cola',()=>{
 const {queue,workers,request,complete}=harness();
 const req=request('A'),a=queue.add(req),b=queue.add(request('B'));
 workers[0].emit({type:'error',message:'Códec no disponible'});
 assert.equal(a.status,'failed');assert.equal(a.error,'Códec no disponible');assert.ok(a.file);
 const c=queue.add(request('C'));req.clip.settings.sharpness=90;
 assert.equal(queue.retry(a.id),true);assert.equal(a.error,null);assert.equal(workers.length,2);
 complete(workers[1]);assert.equal(c.status,'processing');complete(workers[2]);
 assert.equal(a.status,'processing');assert.equal(workers[3].data.clip.settings.sharpness,0);
 complete(workers[3]);assert.equal(a.result.filename,'A-16x9-240fps.mp4');assert.equal(b.status,'ready');queue.dispose();
});

test('el progreso y la frecuencia real de un trabajo no se mezclan con los de otro',()=>{
 const {queue,workers,request,complete}=harness();
 const a=queue.add(request('A')),b=queue.add(request('B'));
 workers[0].emit({type:'progress',value:43,phase:'Suavizando'});
 workers[0].emit({type:'encoding',fps:144,bitrate:50000000,motionApplied:true,automatic:true});
 assert.equal(a.progress,43);assert.equal(a.encoding.fps,144);assert.equal(b.progress,0);assert.equal(b.encoding,null);
 workers[0].emit({type:'progress',value:2});assert.equal(a.progress,43);
 workers[0].emit({type:'progress',value:100});assert.equal(a.progress,99);
 complete(workers[0]);assert.equal(a.progress,100);assert.equal(b.progress,0);queue.dispose();
});

test('fallos de inicio, del worker o del resultado se notifican sin dejar la cola bloqueada',()=>{
 let starts=0;const {queue,workers,request}=harness();const create=queue.createWorker;
 queue.createWorker=()=>{if(starts++===0)throw new Error('No se pudo iniciar');return create();};
 const a=queue.add(request('A'));assert.equal(a.status,'failed');assert.equal(queue.active,null);
 const b=queue.add(request('B')),c=queue.add(request('C'));
 workers[0].onerror({preventDefault(){}});assert.equal(b.status,'failed');assert.equal(c.status,'processing');
 workers[1].emit({type:'result',result:{buffer:new ArrayBuffer(0),extension:'mp4'}});
 assert.equal(c.status,'failed');assert.equal(queue.hasPending,false);queue.dispose();
});

test('descargar no elimina el archivo; quitar terminadas libera URLs y mantiene los trabajos pendientes',()=>{
 const {queue,workers,request,complete,revoked}=harness();
 const a=queue.add(request('A'));complete(workers[0]);queue.markDownloadRequested(a.id);
 const url=a.result.url;assert.equal(a.downloadRequested,true);assert.deepEqual(revoked,[]);
 const b=queue.add(request('B')),c=queue.add(request('C'));
 queue.clearFinished();assert.deepEqual(revoked,[url]);assert.equal(a.result,null);assert.deepEqual(queue.items,[b,c]);
 queue.dispose();assert.equal(workers[1].dead,true);assert.equal(b.file,null);assert.equal(c.file,null);
 assert.throws(()=>queue.add(request()),/cerrada/);
});

test('los recortes inválidos se rechazan antes de iniciar un worker',()=>{
 const {queue,workers,request}=harness();const req=request();req.clip.end=req.clip.start;
 assert.throws(()=>queue.add(req),/0.1 segundos/);assert.equal(workers.length,0);assert.equal(queue.items.length,0);
});


test('acepta más de tres minutos y resultados en disco sin leerlos completos en memoria',()=>{
 const removed=[];const {queue,workers,request,blobs}=harness({removeStorage:destination=>removed.push(destination)});
 const req=request();req.clip.start=0;req.clip.end=3600;const item=queue.add(req);
 assert.equal(workers[0].data.clip.end,3600);assert.equal(workers[0].data.destination.kind,'temporary');
 const file=new File([new Uint8Array(512)],'stored.mp4',{type:'video/mp4'});
 file.arrayBuffer=()=>{throw new Error('No cargar todo el video en RAM');};
 workers[0].emit({type:'storage',mode:'disk'});
 workers[0].emit({type:'result',result:{file,extension:'mp4',type:'video/mp4',width:3840,height:2160,fps:240}});
 assert.equal(item.status,'ready');assert.equal(item.storage,'disk');assert.equal(item.result.size,512);assert.equal(blobs.length,1);
 queue.dispose();
});

test('guardar directamente no genera otra descarga ni borra el archivo elegido',async()=>{
 const removed=[];const {queue,workers,request,blobs}=harness({removeStorage:destination=>{if(destination?.kind==='temporary')removed.push(destination);}});
 const handle={name:'Mi video.mp4',createWritable(){}};const req=request();req.fileHandle=handle;
 const item=queue.add(req);assert.equal(workers[0].data.destination.handle,handle);
 workers[0].emit({type:'result',result:{saved:true,filename:handle.name,size:3*1024**3,extension:'mp4',width:3840,height:2160,fps:240}});
 assert.equal(item.status,'ready');assert.equal(item.result.saved,true);assert.equal(item.result.url,null);assert.equal(blobs.length,0);
 queue.remove(item.id);await Promise.resolve();assert.deepEqual(removed,[]);queue.dispose();
});

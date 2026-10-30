import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createExportOutput} from '../dist/export-output.js';
import {createExportSession,removeStoredExport,exportStorageError,EXPORT_DIRECTORY} from '../dist/export-storage.js?v=10';
import {Input,BlobSource,ALL_FORMATS,Output,Mp4OutputFormat,EncodedVideoPacketSource,EncodedPacketSink,StreamTarget} from '../dist/vendor/mediabunny.mjs';

test('MP4 de 200 segundos: escribe al disco antes de finalizar, conserva posiciones y vuelve a abrirse',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'clipforge-disk-'));
 const filename=path.join(directory,'export.mp4'),writes=[];let fd,closed=false;
 const handle={name:'export.mp4',async createWritable(){fd=await fs.open(filename,'w');return {
  async write({position,data}){writes.push({position,size:data.byteLength});await fd.write(data,0,data.byteLength,position);},
  async close(){closed=true;await fd.close();},async abort(){await fd.close();}
 };},async getFile(){return new File([await fs.readFile(filename)],this.name);}};
 let input,resultInput;
 try{
  const sink=await createExportOutput({kind:'file',handle});assert.ok(sink.target instanceof StreamTarget);
  input=new Input({source:new BlobSource(new Blob([await fs.readFile(new URL('../dist/demo.mp4',import.meta.url))])),formats:ALL_FORMATS});
  const track=await input.getPrimaryVideoTrack(),config=await track.getDecoderConfig();
  const packets=[];for await(const packet of new EncodedPacketSink(track).packets())packets.push(packet);
  const source=new EncodedVideoPacketSource(await track.getCodec());
  const output=new Output({format:new Mp4OutputFormat({fastStart:false}),target:sink.target});
  output.addVideoTrack(source);await output.start();
  for(let loop=0;loop<4;loop++)for(const packet of packets)await source.add(packet.clone({timestamp:packet.timestamp+loop*50}),{decoderConfig:config});
  assert.ok(writes.length>0,'No debe esperar al final para escribir todo el video');
  source.close();await output.finalize();assert.equal(closed,false,'Cerrar el muxer no confirma aún el archivo de destino');
  const result=await sink.finish();assert.equal(closed,true);assert.equal(result.saved,true);assert.ok(result.size>1000000);
  assert.ok(writes.every(write=>write.size<=1024*1024),'Cada escritura se mantiene acotada');
  resultInput=new Input({source:new BlobSource(await handle.getFile()),formats:ALL_FORMATS});
  assert.ok(Math.abs(await resultInput.computeDuration()-200)<.1);
  const outputTrack=await resultInput.getPrimaryVideoTrack();assert.equal(await outputTrack.getCodec(),'avc');
  assert.equal(await outputTrack.getDisplayWidth(),640);assert.equal(await outputTrack.getDisplayHeight(),360);
 }finally{input?.dispose();resultInput?.dispose();await fs.rm(directory,{recursive:true,force:true});}
});

test('escritura temporal maneja escrituras parciales y devuelve un File, sin ArrayBuffer final',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const bytes=new Uint8Array(512);let size=0,closed=false,flushed=false;
 const handle={async createSyncAccessHandle(){return {
  truncate(){size=0;},write(data,{at}){const n=Math.min(data.length,37);bytes.set(data.subarray(0,n),at);size=Math.max(size,at+n);return n;},
  flush(){flushed=true;},close(){closed=true;}
 };},async getFile(){assert.equal(closed,true);return new File([bytes.subarray(0,size)],'temporary.mp4');}};
 const dir={async getDirectoryHandle(){return this;},async getFileHandle(){return handle;}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{getDirectory:async()=>dir}}});
 try{
  const sink=await createExportOutput({kind:'temporary',session:'session-1',name:'video.mp4'});
  // Exercise the underlying WritableStream used by the pinned StreamTarget.
  const writer=sink.target._writable.getWriter();
  await writer.write({data:new Uint8Array(200).fill(1),position:0});
  await writer.write({data:new Uint8Array(25).fill(7),position:12});await writer.close();
  const result=await sink.finish();assert.ok(result.file instanceof File);assert.equal(result.buffer,undefined);assert.equal(flushed,true);
  const stored=new Uint8Array(await result.file.arrayBuffer());assert.equal(stored.length,200);assert.equal(stored[11],1);assert.equal(stored[12],7);assert.equal(stored[37],1);
 }finally{if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;}
});

test('cancelar o agotar el disco aborta el guardado directo y nunca confirma un archivo incompleto',async()=>{
 let commits=0,aborts=0;
 const quota=new DOMException('disk full','QuotaExceededError');
 const handle={async createWritable(){return {write:async()=>{throw quota;},close:async()=>{commits++;},abort:async()=>{aborts++;}};}};
 const sink=await createExportOutput({kind:'file',handle});const writer=sink.target._writable.getWriter();
 await assert.rejects(writer.write({data:new Uint8Array(100),position:0}),{name:'QuotaExceededError'});
 await sink.abort();await sink.abort();assert.equal(commits,0);assert.equal(aborts,1);
 assert.match(exportStorageError(quota,{kind:'temporary'}),/Guardar directamente/);
 assert.match(exportStorageError(quota,{kind:'file'}),/otra unidad/);
});

test('limpiar una exportación elimina solo su archivo temporal; nunca un destino del usuario',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');const removed=[],opened=[];
 const dir={async getDirectoryHandle(name){opened.push(name);return this;},async removeEntry(name){removed.push(name);}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{getDirectory:async()=>dir}}});
 try{
  await removeStoredExport({kind:'file',handle:{name:'original.mp4'}});assert.deepEqual(removed,[]);
  await removeStoredExport({kind:'temporary',session:'session-1',name:'clip.mp4'});
  assert.deepEqual(opened,[EXPORT_DIRECTORY,'session-1']);assert.deepEqual(removed,['clip.mp4']);
  await removeStoredExport({kind:'temporary',session:'../other',name:'clip.mp4'});assert.equal(removed.length,1);
 }finally{if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;}
});

test('la limpieza de sesiones respeta otra pestaña abierta y reclama solo sesiones abandonadas',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');const removed=[];
 const root={async getDirectoryHandle(){return this;},async *entries(){yield ['live',{kind:'directory'}];yield ['abandoned',{kind:'directory'}];},async removeEntry(name){removed.push(name);}};
 const locks={request(name,options,callback){if(typeof options==='function')return Promise.resolve(options({name}));return Promise.resolve(callback(name.endsWith(':live')?null:{name}));}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{getDirectory:async()=>root},locks}});
 try{const session=createExportSession();await session.ready;await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(removed,['abandoned']);session.release();}
 finally{if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;}
});

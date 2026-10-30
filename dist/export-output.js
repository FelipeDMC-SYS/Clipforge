import {BufferTarget,StreamTarget} from './vendor/mediabunny.mjs';
import {EXPORT_DIRECTORY} from './export-storage.js?v=10';

// Samples stay small. Full exports use positional disk writes, not an ever
// growing ArrayBuffer. MP4 can rewrite its header without corrupting the file.
export async function createExportOutput(destination,onStorage=()=>{}){
 if(!destination||destination.kind==='memory'||(destination.kind==='temporary'&&!globalThis.navigator?.storage?.getDirectory)){
  const target=new BufferTarget();
  if(destination)onStorage('memory');
  return {target,mode:'memory',async finish(){
   if(!target.buffer||target.buffer.byteLength<100)throw new Error('La exportación no generó un archivo válido.');
   return {buffer:target.buffer,size:target.buffer.byteLength};
  },async abort(){}};
 }
 let handle,sync=null,writable=null,closed=false,bytes=0;
 const direct=destination.kind==='file';
 if(direct){
  handle=destination.handle;
  if(!handle?.createWritable)throw new Error('Vuelve a elegir el archivo de destino.');
 }else{
  if(destination.kind!=='temporary'||![destination.session,destination.name].every(value=>typeof value==='string'&&/^[a-zA-Z0-9_.-]{1,160}$/.test(value)))throw new Error('El destino de exportación no es válido.');
  const root=await navigator.storage.getDirectory();
  const dir=await(await root.getDirectoryHandle(EXPORT_DIRECTORY,{create:true})).getDirectoryHandle(destination.session,{create:true});
  handle=await dir.getFileHandle(destination.name,{create:true});
 }
 try{
  if(!direct&&typeof handle.createSyncAccessHandle==='function'){
   sync=await handle.createSyncAccessHandle();sync.truncate(0);
  }else writable=await handle.createWritable({keepExistingData:false});
 }catch(error){try{sync?.close();}catch{}throw error;}
 const close=async(commit)=>{
  if(closed)return;closed=true;
  if(sync){try{if(commit)sync.flush();}finally{sync.close();}}
  if(writable){if(commit)await writable.close();else await writable.abort();}
 };
 const stream=new WritableStream({
  async write({data,position}){
   if(closed)throw new Error('El archivo de exportación ya está cerrado.');
   if(sync){
    let offset=0;
    while(offset<data.byteLength){
     const written=sync.write(data.subarray(offset),{at:position+offset});
     if(!Number.isInteger(written)||written<=0)throw new Error('No se pudo escribir el video completo en el disco.');
     offset+=written;
    }
   }else await writable.write({type:'write',position,data});
   bytes=Math.max(bytes,position+data.byteLength);
  },
  // Mediabunny also closes targets when cancelling. Only finish() commits a
  // complete video; errors abort direct saves instead of replacing an old file.
  close(){},abort(){return close(false);}
 });
 const target=new StreamTarget(stream,{chunked:true,chunkSize:1024*1024});
 onStorage(direct?'file':'disk');
 return {target,mode:direct?'file':'disk',async finish(){
  if(bytes<100)throw new Error('La exportación no generó un archivo válido.');
  await close(true);
  const file=await handle.getFile();
  if(file.size!==bytes)throw new Error('El tamaño guardado no coincide con el video exportado.');
  return direct?{saved:true,filename:handle.name,size:file.size}:{file,size:file.size};
 },async abort(){try{await close(false);}catch{}}};
}

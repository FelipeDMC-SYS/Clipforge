// One directory and Web Lock per open editor. A new editor can safely remove
// abandoned temporary exports without touching another tab's active downloads.
export const EXPORT_DIRECTORY='clipforge-export-cache-v1';
const validName=value=>typeof value==='string'&&/^[a-zA-Z0-9_.-]{1,160}$/.test(value);
const sessionLock=id=>'clipforge-export-session:'+id;

export function createExportSession(){
 // The editor shell still loads on non-HTTPS previews; disk APIs themselves
 // remain available only when the browser permits them in a secure context.
 const id=globalThis.crypto?.randomUUID?.()||'session-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 let release=()=>{},ready=null;
 const storage=globalThis.navigator?.storage,locks=globalThis.navigator?.locks;
 if(storage?.getDirectory&&locks?.request){
  let accept,decline;ready=new Promise((resolve,reject)=>{accept=resolve;decline=reject;});
  const held=new Promise(resolve=>{release=resolve;});
  locks.request(sessionLock(id),async()=>{accept();await held;}).catch(decline);
  ready.then(async()=>{
   let root;try{root=await(await storage.getDirectory()).getDirectoryHandle(EXPORT_DIRECTORY);}catch{return;}
   for await(const [name,entry] of root.entries()){
    if(entry.kind!=='directory'||name===id||!validName(name))continue;
    await locks.request(sessionLock(name),{ifAvailable:true},async lock=>{
     if(lock)try{await root.removeEntry(name,{recursive:true});}catch{}
    });
   }
  }).catch(()=>{});
 }
 return {id,ready,release};
}

export async function removeStoredExport(destination){
 if(destination?.kind!=='temporary'||!validName(destination.session)||!validName(destination.name)||!globalThis.navigator?.storage?.getDirectory)return;
 // Terminated workers may need a moment to release a synchronous file lock.
 for(const delay of [0,100,500]){
  if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
  try{
   const root=await navigator.storage.getDirectory();
   const dir=await(await root.getDirectoryHandle(EXPORT_DIRECTORY)).getDirectoryHandle(destination.session);
   await dir.removeEntry(destination.name);return;
  }catch(error){if(error.name==='NotFoundError')return;}
 }
 // The next editor session reclaims any remaining abandoned directory.
}

export function exportStorageError(error,destination){
 if(error?.name==='QuotaExceededError')return destination?.kind==='file'
  ?'No queda espacio para guardar el video en el destino elegido. Libera espacio o elige otra unidad y vuelve a exportar.'
  :'No queda espacio para los archivos temporales del navegador. Descarga y quita las exportaciones terminadas, o elige «Guardar directamente en mi equipo». No se redujo la calidad.';
 if(error?.name==='NotAllowedError'||error?.name==='SecurityError')return 'El navegador no permitió escribir el archivo. Vuelve a elegir el destino o utiliza la descarga al terminar.';
 return error?.message||'No se pudo guardar el archivo de video.';
}

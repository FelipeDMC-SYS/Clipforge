// Local development server. Node.js built-ins only; no installation step.
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=await realpath(fileURLToPath(new URL('../dist/',import.meta.url)));
const port=Number(process.env.PORT??8000);
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT debe ser un puerto entre 0 y 65535.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm','.wasm':'application/wasm','.gz':'application/gzip','.txt':'text/plain; charset=utf-8'};
const inside=p=>p===root||p.startsWith(root+path.sep);
const server=createServer(async(req,res)=>{
  const reply=(code,message,headers={})=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8',...headers});res.end(req.method==='HEAD'?undefined:message);};
  if(!['GET','HEAD'].includes(req.method)){reply(405,'Metodo no permitido',{'Allow':'GET, HEAD'});return;}
  try{
    const url=new URL(req.url,'http://localhost');
    let pathname;
    try{pathname=decodeURIComponent(url.pathname);}catch{reply(400,'Ruta no valida');return;}
    if(pathname.includes('\0')||pathname.includes('\\')){reply(400,'Ruta no valida');return;}
    let filename=path.resolve(root,'.'+pathname);
    if(!inside(filename)){reply(403,'Ruta fuera del sitio');return;}
    filename=await realpath(filename);
    if(!inside(filename)){reply(403,'Ruta fuera del sitio');return;}
    let info=await stat(filename);
    if(info.isDirectory()){
      if(!pathname.endsWith('/')){res.writeHead(301,{Location:url.pathname+'/'+url.search});res.end();return;}
      filename=await realpath(path.join(filename,'index.html'));
      if(!inside(filename)){reply(403,'Ruta fuera del sitio');return;}
      info=await stat(filename);
    }
    if(!info.isFile()){reply(404,'Archivo no encontrado');return;}
    const headers={'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
    let start=0,end=info.size-1,status=200;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match||(!match[1]&&!match[2])){reply(416,'Rango no valido',{'Content-Range':`bytes */${info.size}`});return;}
      start=match[1]?Number(match[1]):Math.max(0,info.size-Number(match[2]));
      end=match[1]&&match[2]?Math.min(Number(match[2]),info.size-1):info.size-1;
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=info.size){reply(416,'Rango no valido',{'Content-Range':`bytes */${info.size}`});return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=String(Math.max(0,end-start+1));
    res.writeHead(status,headers);
    if(req.method==='HEAD'||!info.size){res.end();return;}
    const stream=createReadStream(filename,{start,end});
    stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch(error){
    if(!res.headersSent)reply(error.code==='ENOENT'||error.code==='ENOTDIR'?404:500,'No se pudo abrir el archivo');
    else res.destroy();
  }
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Puerto ocupado. Cierra el otro servidor o cambia PORT.':error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
  console.log(`ClipForge: http://localhost:${server.address().port}/`);
  console.log('Abre esa direccion en Chrome o Edge. Ctrl+C para detener.');
});

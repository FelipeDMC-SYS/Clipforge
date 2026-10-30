// Exercise the real worker, MP4 reader, capability mapping and Conversion.init.
// WebCodecs device support, the optional decoded-frame probe and canvas are
// simulated. Stop before
// execute(): this is a regression test of encoder settings, not a video encode.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Conversion,VideoSampleSink} from '../dist/vendor/mediabunny.mjs';
import {dimensions,defaultSettings} from '../dist/core.js';
import {videoBitrate} from '../dist/frame-rate.js';

test('el worker prepara la calidad solicitada con Mediabunny real',async t=>{
 const names=['self','postMessage','VideoEncoder','VideoDecoder','AudioEncoder','AudioDecoder','OffscreenCanvas'];
 const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const realInit=Conversion.init;
 const realGetSample=VideoSampleSink.prototype.getSample;
 // Conversion may probe the first decoded source frame during setup. There
 // is no device decoder here; test rate-control mapping independently of it.
 VideoSampleSink.prototype.getSample=async()=>null;
 const checked=[];
 let messages=[],prepared=null;
 const stopped='Prueba: configuración preparada; codificación de dispositivo no ejecutada.';
 globalThis.self=globalThis;
 globalThis.postMessage=message=>messages.push(message);
 globalThis.VideoDecoder=globalThis.AudioDecoder=class {
  static async isConfigSupported(config){return {supported:true,config};}
 };
 globalThis.VideoEncoder=class {
  static async isConfigSupported(config){
   checked.push(config);
   const finite=Number.isInteger(config.bitrate)&&config.bitrate>0&&config.bitrate<=100000000;
   // A representative device supports 4K only up to 60 fps, and has no
   // quantizer mode. Maximum quality must still work with finite VBR.
   const fits=config.width*config.height<=5000000||(config.framerate??30)<=60;
   return {supported:finite&&fits&&config.bitrateMode!=='quantizer',config};
  }
 };
 globalThis.AudioEncoder=class {
  static async isConfigSupported(config){return {supported:Number.isFinite(config.bitrate),config};}
 };
 globalThis.OffscreenCanvas=class {
  constructor(width,height){this.width=width;this.height=height;}
  getContext(){return {canvas:this};}
 };
 Conversion.init=async options=>{
  const video=await options.input.getPrimaryVideoTrack();
  const audio=await options.input.getPrimaryAudioTrack();
  const conversion=await realInit.call(Conversion,options);
  try{
   assert.equal(conversion.isValid,true,'Mediabunny debe aceptar la configuración final');
   assert.ok(conversion.utilizedTracks.includes(video),'Debe conservar la pista de video');
   assert.ok(conversion.utilizedTracks.includes(audio),'Debe conservar la pista de audio');
   prepared=options.video(video);
  }finally{await conversion.cancel();}
  throw new Error(stopped);
 };
 try{
  await import('../dist/media-worker.js');
  const file=new Blob([await fs.readFile(new URL('../dist/demo.mp4',import.meta.url))],{type:'video/mp4'});
  async function prepare({ratio='1:1',resolution=2160,fps='240',quality='ultra',format='mp4'}={}){
   messages=[];prepared=null;
   await self.onmessage({data:{action:'export',file,clip:{start:0,end:4,title:'Export regression',settings:{...defaultSettings(),ratio}},options:{format,resolution,fps,quality}}});
   return messages.find(message=>message.type==='error')?.message;
  }
  for(const format of ['mp4','webm']){
   await t.test(`${format}: 2160 × 2160, 240 fps y máxima, como en la captura`,async()=>{
    assert.equal(await prepare({format}),stopped);
    assert.equal(prepared.processedWidth,2160);
    assert.equal(prepared.processedHeight,2160);
    assert.equal(prepared.frameRate,240);
    assert.equal(prepared.codec,format==='mp4'?'avc':'vp9');
    const encoding=messages.find(message=>message.type==='encoding');
    assert.equal(encoding.bitrate,100000000);
    assert.equal(encoding.automatic,false);
   });
  }
  for(const quality of ['standard','high','ultra']){
   await t.test(`1080p con fps originales y calidad ${quality}`,async()=>{
    assert.equal(await prepare({ratio:'16:9',resolution:1080,fps:'source',quality}),stopped);
    assert.equal(prepared.frameRate,undefined,'Se conservan los tiempos originales');
    const encoding=messages.find(message=>message.type==='encoding');
    assert.ok(Math.abs(encoding.fps-24)<.1);
    assert.equal(encoding.bitrate,videoBitrate(1920,1080,encoding.fps,quality));
   });
  }
  await t.test('máximo compatible conserva 4K y máxima; ajusta únicamente los fps',async()=>{
   assert.equal(await prepare({ratio:'16:9',fps:'max'}),stopped);
   assert.deepEqual([prepared.processedWidth,prepared.processedHeight],dimensions('16:9',2160));
   assert.equal(prepared.frameRate,60);
   const encoding=messages.find(message=>message.type==='encoding');
   assert.equal(encoding.automatic,true);
   assert.equal(encoding.bitrate,100000000);
  });
  await t.test('un límite real del dispositivo no reduce una selección fija en silencio',async()=>{
   assert.match(await prepare({ratio:'16:9'}),/no admite 240 fps/);
   assert.equal(prepared,null);
   assert.equal(messages.some(message=>message.type==='result'),false);
  });
  assert.ok(checked.length>0,'Se debe llamar a WebCodecs mediante Mediabunny');
  for(const config of checked){
   assert.ok(Number.isFinite(config.bitrate)&&config.bitrate>0,'Nunca enviar Infinity ni NaN al codificador');
   assert.notEqual(config.bitrateMode,'quantizer','Un bitrate explícito debe seguir siendo bitrate');
  }
 }finally{
  Conversion.init=realInit;
  VideoSampleSink.prototype.getSample=realGetSample;
  delete globalThis.onmessage;
  for(const [name,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
 }
});

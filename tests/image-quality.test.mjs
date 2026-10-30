import test from 'node:test';
import assert from 'node:assert/strict';
import {IMAGE_PRESETS,matchesImagePreset,sharpenPixels,ImageQualityProcessor} from '../dist/image-quality.js';
import {safeSettings,defaultSettings,dimensions,restoreClips,composeFrame,releaseFrameResources} from '../dist/core.js';
import {videoBitrate,chooseFrameRate} from '../dist/frame-rate.js';

const rgba=values=>new Uint8ClampedArray(values.flatMap(v=>[v,v,v,255]));
test('nitidez cero conserva todos los píxeles y no inicia ningún procesamiento',()=>{
 const original=new Uint8ClampedArray([23,72,154,88,230,27,18,255]);
 assert.deepEqual(sharpenPixels(original,2,1,0),original);
 const processor=new ImageQualityProcessor({createCanvas(){throw new Error('must stay lazy');}});
 processor.apply(null,0);assert.equal(processor.mode,'uninitialized');
});
test('zonas uniformes, incluso un solo píxel, conservan su color y alfa',()=>{
 const pixels=new Uint8ClampedArray(Array.from({length:100},()=>[85,124,170,210]).flat());
 assert.deepEqual(sharpenPixels(pixels,10,10,100),pixels);
 assert.deepEqual(sharpenPixels(pixels.slice(0,4),1,1,100),pixels.slice(0,4));
});
test('refuerza un borde sin invertir lados, alterar la fuente ni exceder el límite',()=>{
 const original=rgba([60,60,60,180,180,180]),copy=original.slice();
 const result=sharpenPixels(original,6,1,50);
 assert.ok(result[2*4]<60);assert.ok(result[3*4]>180);
 assert.equal(result[0],60);assert.equal(result[5*4],180);
 for(let i=0;i<result.length;i+=4){assert.ok(Math.abs(result[i]-original[i])<=12);assert.equal(result[i+3],255);}
 assert.deepEqual(original,copy);
});
test('el umbral no amplifica ruido mínimo y no derrama filas en los bordes',()=>{
 const noise=rgba([100,100,101,100,100]);assert.deepEqual(sharpenPixels(noise,5,1,100),noise);
 const columns=rgba([30,30,30,220,220,220]);assert.deepEqual(sharpenPixels(columns,3,2,0),columns);
 const r=sharpenPixels(columns,3,2,100);assert.equal(r[0],r[8]);assert.equal(r[12],r[20]);
});
test('la alternativa sin WebGL aplica el efecto real y reutiliza su memoria',()=>{
 const pixels=rgba([60,60,60,180,180,180]);let written,allocations=0;
 const processor=new ImageQualityProcessor({createCanvas:()=>({getContext:()=>null})});
 const ctx={canvas:{width:6,height:1},getImageData:()=>({data:pixels}),createImageData:(width,height)=>{allocations++;return {width,height,data:new Uint8ClampedArray(width*height*4)};},putImageData:im=>written=im.data.slice()};
 processor.apply(ctx,42);assert.equal(processor.mode,'cpu');assert.deepEqual(written,sharpenPixels(pixels,6,1,42));
 processor.apply(ctx,70);assert.equal(allocations,1);assert.deepEqual(written,sharpenPixels(pixels,6,1,70));processor.dispose();assert.equal(processor.output,null);
});
test('proyectos existentes siguen sin nitidez y el preset conserva fps, texto, recorte y volumen',()=>{
 assert.equal(safeSettings({brightness:111}).sharpness,0);
 assert.equal(safeSettings({sharpness:900}).sharpness,100);assert.equal(safeSettings({sharpness:-1}).sharpness,0);
 const original={...defaultSettings(),ratio:'9:16',cropX:24,text:'Mi jugada',volume:48,smoothMotion:true,motionFps:'240',exportFps:'240'};
 const result=safeSettings({...original,...IMAGE_PRESETS.fortnite});
 for(const key of ['ratio','cropX','text','volume','smoothMotion','motionFps','exportFps'])assert.equal(result[key],original[key]);
 assert.equal(matchesImagePreset(result,'fortnite'),true);assert.equal(matchesImagePreset(result,'fake'),false);
 const restored=restoreClips([{start:2,end:20,settings:{...result,exportResolution:2160,exportQuality:'ultra'}}],40)[0].settings;
 assert.equal(restored.sharpness,42);assert.equal(restored.exportResolution,2160);assert.equal(restored.exportQuality,'ultra');
});
test('1440p y 4K dan dimensiones exactas para cada formato y respetan el soporte del códec',async()=>{
 assert.deepEqual(dimensions('16:9',2160),[3840,2160]);assert.deepEqual(dimensions('9:16',2160),[2160,3840]);
 assert.deepEqual(dimensions('1:1',1440),[1440,1440]);assert.deepEqual(dimensions('16:9',1440),[2560,1440]);
 assert.ok(videoBitrate(1920,1080,60,'ultra')>videoBitrate(1920,1080,60,'high'));
 assert.equal(videoBitrate(3840,2160,240,'ultra'),100000000);
 await assert.rejects(()=>chooseFrameRate({selection:'240',sourceFps:60,width:3840,height:2160,quality:'ultra',isSupported:async config=>{assert.equal(config.width,3840);assert.equal(config.height,2160);assert.equal(config.bitrate,100000000);return false;}}),/240 fps/);
});
test('el procesamiento de detalle ocurre antes del texto y la marca de agua',()=>{
 const order=[],data=rgba([80,80,180,180]);
 const ctx={canvas:{width:4,height:1},save(){},restore(){},setTransform(){},clearRect(){},fillRect(){},getImageData(){order.push('detail');return {data};},createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),putImageData(){},measureText:()=>({width:1}),strokeText(){order.push('text');},fillText(){order.push('overlay');}};
 composeFrame(ctx,()=>order.push('frame'),4,1,{...defaultSettings(),sharpness:42,text:'A',watermark:true});
 assert.ok(order.indexOf('detail')>order.indexOf('frame'));assert.ok(order.indexOf('text')>order.indexOf('detail'));assert.ok(order.lastIndexOf('overlay')>order.indexOf('detail'));releaseFrameResources(ctx);
});

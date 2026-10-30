import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseFrameRate,outputFpsSetting,videoBitrate,shouldInterpolate} from '../dist/frame-rate.js';
import {safeSettings,defaultSettings} from '../dist/core.js';
import {FrameMixer} from '../dist/frame-mixer.js';
const base={width:1920,height:1080,sourceFps:60,quality:'high'};

test('máximo compatible comprueba resolución, fps y bitrate y elige 144 sin afirmar 240',async()=>{
 const seen=[];const result=await chooseFrameRate({...base,selection:'max',isSupported:async c=>{seen.push(c);return c.frameRate<=144;}});
 assert.deepEqual(seen.map(c=>c.frameRate),[240,165,144]);assert.equal(result.fps,144);assert.equal(result.automatic,true);
 for(const config of seen){assert.equal(config.width,1920);assert.equal(config.height,1080);assert.equal(config.bitrate,videoBitrate(1920,1080,config.frameRate,'high'));}
});
test('240 fps explícitos no se rebajan cuando el navegador los rechaza',async()=>{
 let calls=0;await assert.rejects(()=>chooseFrameRate({...base,selection:'240',isSupported:async()=>{calls++;return false;}}),/240 fps/);assert.equal(calls,1);
});
test('el modo original conserva 119.88 fps sin convertirlos a 60',async()=>{
 let config;const result=await chooseFrameRate({...base,sourceFps:119.88,selection:'source',isSupported:async c=>{config=c;return true;}});
 assert.equal(config.frameRate,119.88);assert.equal(result.fps,undefined);assert.equal(result.testedFps,119.88);
});
test('metadatos de fps desconocidos conservan la temporización variable original',async()=>{
 const result=await chooseFrameRate({...base,sourceFps:null,selection:'source',isSupported:async c=>{assert.equal(c.frameRate,undefined);return true;}});assert.equal(result.fps,undefined);
});
test('el bitrate crece con fps y resolución y se mantiene acotado',()=>{
 assert.ok(videoBitrate(1920,1080,240)>videoBitrate(1920,1080,60));assert.ok(videoBitrate(1920,1080,120)>videoBitrate(1280,720,120));assert.ok(videoBitrate(1920,1080,240,'high')>videoBitrate(1920,1080,240,'standard'));assert.ok(videoBitrate(10000,10000,1000)<=80000000);
});
test('proyectos antiguos mantienen su suavizado a 60 y los nuevos guardan hasta 240 o máximo',()=>{
 assert.equal(outputFpsSetting(safeSettings({smoothMotion:true,exportFps:'source'})),'60');
 for(const fps of ['90','120','144','165','240','max']){const restored=safeSettings({...defaultSettings(),smoothMotion:true,motionFps:fps,exportFps:fps});assert.equal(outputFpsSetting(restored),fps);assert.equal(restored.exportFps,fps);}
 assert.equal(safeSettings({motionFps:'10000'}).motionFps,'60');
});
test('solo se interpolan tasas mayores a las del archivo original',()=>{
 assert.equal(shouldInterpolate({smoothMotion:true},240,60),true);assert.equal(shouldInterpolate({smoothMotion:true},120,240),false);assert.equal(shouldInterpolate({smoothMotion:true},60,59.94),false);assert.equal(shouldInterpolate({smoothMotion:false},240,30),false);
});
test('30 a 240 fps produce siete mezclas diferentes entre dos cuadros sin acelerar el tiempo',async()=>{
 const source=[{timestamp:10,value:0,close(){}},{timestamp:10+1/30,value:240,close(){}},{timestamp:10+2/30,value:120,close(){}}];
 const mixer=new FrameMixer((async function*(){yield*source;})());const output=[];
 for(let frame=0;frame<9;frame++){const {current,next,alpha}=await mixer.frameAt(10+frame/240);output.push(Math.round(current.value*(1-alpha)+(next?.value??current.value)*alpha));}
 assert.deepEqual(output,[0,30,60,90,120,150,180,210,240]);await mixer.close();
});

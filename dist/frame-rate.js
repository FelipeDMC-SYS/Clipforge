export const FPS_VALUES = ['source','30','60','90','120','144','165','240','max'];
export const MAX_FPS_CANDIDATES = [240,165,144,120,90,60,30];

export function outputFpsSetting(settings){
 return settings.smoothMotion ? settings.motionFps : settings.exportFps;
}

export function fpsDescription(value){
 return value==='max'?'Máximo compatible · hasta 240 fps':value==='source'?'FPS del original':`${value} fps`;
}

// More frames need more bandwidth. Resolution and frame rate use the exact
// same budget for capability checks and the final encoder configuration.
export function videoBitrate(width,height,fps,quality='high'){
 const rate=Number.isFinite(fps)&&fps>0?fps:60;
 const base=quality==='ultra'?32000000:quality==='high'?16000000:9000000;
 const ceiling=quality==='ultra'?100000000:80000000;
 return Math.round(Math.max(2000000,Math.min(ceiling,base*width*height/(1920*1080)*Math.pow(rate/60,.65))));
}

export async function chooseFrameRate({selection,sourceFps,width,height,quality,isSupported}){
 if(!FPS_VALUES.includes(String(selection)))throw new Error('Selecciona una frecuencia de fotogramas válida.');
 const original=selection==='source';
 const source=Number.isFinite(sourceFps)&&sourceFps>0?sourceFps:undefined;
 const candidates=selection==='max'?MAX_FPS_CANDIDATES:[original?source:Number(selection)];
 for(const candidate of candidates){
  const bitrate=videoBitrate(width,height,candidate,quality);
  if(await isSupported({width,height,frameRate:candidate,bitrate})){
   return {fps:original?undefined:candidate,testedFps:candidate,bitrate,automatic:selection==='max'};
  }
 }
 const wanted=selection==='max'?'ninguna de las frecuencias del editor':original?'los fps del original':`${selection} fps`;
 throw new Error(`Tu navegador no admite ${wanted} con este formato y resolución. Prueba 720p, el otro formato o «Máximo compatible». No se han reducido los fps de una selección fija.`);
}

export function shouldInterpolate(settings,targetFps,sourceFps){
 return settings.smoothMotion&&Number.isFinite(targetFps)&&(!Number.isFinite(sourceFps)||targetFps>sourceFps*1.01);
}

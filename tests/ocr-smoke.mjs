// Real WASM OCR with the bundled language model and an installed Node engine.
// Synthetic HUD fixtures do not measure recall on actual gameplay.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareTextPixels,ocrLines,parseBanner,parseKillFeed,isSpectatorText} from '../dist/fortnite-events.js';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const require=createRequire(path.resolve(process.env.OCR_QA_PATH||root,'package.json'));
const {createWorker}=require('tesseract.js'),bmp=require('bmp-js');
const fixtures=JSON.parse(await fs.readFile(path.join(process.env.OCR_FIXTURES||path.join(root,'scratch/ocr-fixtures'),'manifest.json'),'utf8'));
const worker=await createWorker('eng',1,{langPath:path.join(root,'dist/vendor/tesseract/lang'),cacheMethod:'none',gzip:true},{load_system_dawg:'0',load_freq_dawg:'0'});
await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1',user_defined_dpi:'150'});
let passed=0;
try{for(const fixture of fixtures){
 const pixels=await fs.readFile(fixture.file);prepareTextPixels(pixels);
 const abgr=Buffer.alloc(pixels.length);for(let i=0;i<pixels.length;i+=4){abgr[i]=255;abgr[i+1]=pixels[i+2];abgr[i+2]=pixels[i+1];abgr[i+3]=pixels[i];}
 const image=bmp.encode({data:abgr,width:fixture.width,height:fixture.height}).data;
 const {data}=await worker.recognize(image,{}, {text:true,blocks:true});
 const readings=ocrLines(data).map(line=>fixture.source==='feed'?parseKillFeed(line.text,'FelipeDMC',{includeKnocks:true}):parseBanner(line.text,{includeKnocks:true})).filter(Boolean);
 const got=fixture.source==='context'?(isSpectatorText(data.text)?'spectator':null):readings[0]?.kind||null;
 console.log(fixture.name,JSON.stringify(data.text.trim()),'→',got);
 assert.equal(got,fixture.expected,fixture.name);passed++;
}console.log(`${passed} imágenes sintéticas verificadas con OCR WASM real.`);}finally{await worker.terminate();}

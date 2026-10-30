import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBanner,parseKillFeed,isSpectatorText,EliminationTracker,buildEliminationClips,detectorSettings,prepareTextPixels} from '../dist/fortnite-events.js';
import {restoreClips} from '../dist/core.js';
const reading=(target='EnemyOne',extra={})=>({kind:'elimination',target,source:'banner',confidence:85,...extra});
test('aviso central reconoce bajas EN/ES y no muerte propia, XP o asistencias',()=>{
 for(const text of ['ELIMINATED Anonymous[123]','ELIMINASTE A Rival23','HAS ELIMINADO A Rival23','ELIMINADO Rival23'])assert.equal(parseBanner(text)?.kind,'elimination',text);
 for(const text of ['ELIMINATED BY Rival23','ELIMINADO POR Rival23','TE HA ELIMINADO Rival23','ELIMINATION +250 XP','ELIMINATION ASSIST','ELIMINATED 20 OPPONENTS','EnemyOne eliminated Rival23','KNOCKED DOWN Rival23','ELIMINATED'])assert.equal(parseBanner(text),null,text);
});
test('derribos son optativos y distintos de kills',()=>{assert.equal(parseBanner('DERRIBASTE A Rival23'),null);assert.equal(parseBanner('DERRIBASTE A Rival23',{includeKnocks:true}).kind,'knock');assert.equal(parseBanner('KNOCKED DOWN Rival23',{includeKnocks:true}).kind,'knock');});
test('registro requiere tu nombre completo como atacante; ser la víctima no cuenta',()=>{
 assert.equal(parseKillFeed('FelipeDMC eliminó a Rival23 con un rifle','FelipeDMC')?.target,'RIVAL23');
 assert.equal(parseKillFeed('FelipeDMC (42) eliminated Rival23 with a rifle','FelipeDMC')?.kind,'elimination');
 for(const text of ['Rival23 eliminated FelipeDMC','OtherFelipeDMC eliminated Rival23','FelipeDMC2 eliminated Rival23','FelipeDMC was eliminated by Rival23','Rival23 knocked out FelipeDMC'])assert.equal(parseKillFeed(text,'FelipeDMC'),null,text);
 assert.equal(parseKillFeed('FelipeDMC eliminated Rival23',''),null);
});
test('se detectan avisos de espectador y repetición en español e inglés',()=>{for(const text of ['SPECTATING Rival23','OBSERVANDO A Rival23','YOU PLACED #3','REPETICIÓN','ELIMINADO POR Rival23'])assert.equal(isSpectatorText(text),true);assert.equal(isSpectatorText('VICTORY ROYALE'),false);});
test('un solo frame y ruido de baja confianza no crean kills',()=>{const t=new EliminationTracker();t.observe(1,[reading()]);assert.equal(t.events.length,0);for(let i=2;i<5;i++)t.observe(i,[reading('Other',{confidence:15})]);assert.equal(t.events.length,0);});
test('persistencia del aviso y dos fuentes no duplican una baja',()=>{const t=new EliminationTracker();for(let i=0;i<20;i++)t.observe(10+i*.5,[reading(),reading('EnemyOne',{source:'feed'})]);assert.equal(t.events.length,1);assert.equal(t.events[0].time,10);assert.equal(t.events[0].source,'both');});
test('kills de objetivos diferentes a poca distancia se conservan',()=>{const t=new EliminationTracker();t.observe(10,[reading()]);t.observe(10.5,[reading(),reading('EnemyTwo')]);t.observe(11,[reading('EnemyTwo')]);assert.equal(t.events.length,2);});
test('no cuenta señales de espectador ni reutiliza una lectura aislada antigua',()=>{const t=new EliminationTracker();for(let i=0;i<4;i++)t.observe(i,[reading()],{spectator:true});assert.equal(t.events.length,0);t.observe(5,[reading()]);t.observe(20,[reading()]);assert.equal(t.events.length,0);});
test('agrupa kills próximas, guarda contexto y respeta extremos del video',()=>{
 const clips=buildEliminationClips([{...reading(),time:2},{...reading('EnemyTwo'),time:5},{...reading('EnemyThree'),time:58}],60,{lead:12,tail:5,maxClips:100});assert.equal(clips.length,2);assert.equal(clips[0].start,0);assert.equal(clips[0].end,10);assert.equal(clips[0].killEvents.length,2);assert.equal(clips[1].end,60);assert.equal(clips[1].peak,58);
});
test('contexto de clips y eventos se conserva en proyectos guardados',()=>{const clips=buildEliminationClips([{...reading(),time:25}],60);const restored=restoreClips(clips,60);assert.equal(restored[0].detection,'fortnite-kill');assert.equal(restored[0].killEvents[0].time,25);assert.equal(restored[0].killEvents[0].target,'EnemyOne');});
test('normaliza opciones y separa texto claro del fondo',()=>{const s=detectorSettings({lead:999,tail:-2,playerName:' FelipeDMC '});assert.equal(s.lead,60);assert.equal(s.tail,2);assert.equal(s.playerName,'FelipeDMC');const pixels=new Uint8ClampedArray([245,245,245,255,245,60,70,255,25,55,80,255]);assert.equal(prepareTextPixels(pixels),2);assert.deepEqual([...pixels],[0,0,0,255,0,0,0,255,255,255,255,255]);});

test('nombres parecidos no fusionan enemigos distintos ni atribuyen otra cuenta',()=>{const t=new EliminationTracker();for(const time of [0,.5])t.observe(time,[reading('Enemy01'),reading('Enemy02')]);assert.equal(t.events.length,2);assert.equal(parseKillFeed('Felipe-DMC eliminated Rival23','Felipe_DMC'),null);});

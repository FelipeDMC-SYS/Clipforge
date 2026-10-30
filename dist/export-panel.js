import {fpsDescription} from './frame-rate.js?v=5';
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fpsLabel=fps=>Number.isFinite(fps)?`${Math.round(fps*10)/10} fps`:'fps originales';
const time=value=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;

// A regular, non-modal region: it never makes the studio inert or traps focus.
export class ExportPanel {
 constructor(queue,{notify=()=>{}}={}){
  this.queue=queue;this.notify=notify;this.nodes=new Map();
  this.panel=document.getElementById('exportsPanel');this.list=document.getElementById('exportsList');this.toggle=document.getElementById('exportQueueToggle');
  this.toggle.addEventListener('click',()=>this.open());
  document.getElementById('minimizeExports').addEventListener('click',()=>this.close());
  document.getElementById('clearExports').addEventListener('click',()=>queue.clearFinished());
  this.list.addEventListener('click',event=>{
   const action=event.target.closest('[data-export-action]'),row=action?.closest('[data-export-id]');if(!row)return;
   const id=row.dataset.exportId;
   if(action.dataset.exportAction==='cancel')queue.cancel(id);
   else if(action.dataset.exportAction==='retry')queue.retry(id);
   else if(action.dataset.exportAction==='remove')queue.remove(id);
   else if(action.dataset.exportAction==='download')queue.markDownloadRequested(id);
  });
  queue.subscribe(event=>{
   this.render();
   if(event.type==='ready'){
    const item=event.item;
    if(item.autoDownload&&!item.result.saved){
     const link=document.createElement('a');
     try{link.href=item.result.url;link.download=item.result.filename;link.hidden=true;document.body.append(link);link.click();queue.markDownloadRequested(item.id);}catch{}finally{link.remove();}
    }
    this.announce(item.result.saved?`«${item.clip.title}» se guardó en el archivo que elegiste.`:`«${item.clip.title}» está listo. La descarga está disponible en Exportaciones.`);
   }else if(event.type==='failed')this.announce(`No se pudo exportar «${event.item.clip.title}». Puedes reintentarlo en Exportaciones.`,true);
   else if(event.type==='cancelled')this.announce(`Exportación de «${event.item.clip.title}» cancelada.`);
  });
  this.render();
 }
 announce(message,error=false){document.getElementById('exportQueueAnnounce').textContent=message;this.notify(message,error?10000:6000);}
 open(){this.panel.hidden=false;this.toggle.hidden=true;this.toggle.setAttribute('aria-expanded','true');document.getElementById('navExports').setAttribute('aria-expanded','true');document.getElementById('minimizeExports').focus();}
 close(){this.panel.hidden=true;this.toggle.hidden=!this.queue.items.length;this.toggle.setAttribute('aria-expanded','false');document.getElementById('navExports').setAttribute('aria-expanded','false');(this.queue.items.length?this.toggle:document.getElementById('navExports')).focus();}
 render(){
  const items=this.queue.items,active=this.queue.active?.item,waiting=items.filter(item=>item.status==='queued').sort((a,b)=>a.order-b.order),ready=items.filter(item=>item.status==='ready'),failed=items.filter(item=>item.status==='failed');
  const summary=[waiting.length?`${waiting.length} en cola`:'',ready.length?`${ready.length} ${ready.length===1?'listo':'listos'}`:'',failed.length?`${failed.length} con error`:''].filter(Boolean).join(' · ');
  document.getElementById('exportCount').textContent=items.filter(item=>item.status!=='cancelled').length;
  document.getElementById('exportQueueHeading').textContent=active?`Exportando · ${active.progress}%`:ready.length?'Tus clips están listos':waiting.length?'Clips en cola':failed.length?'Revisa tus exportaciones':'Exportaciones';
  document.getElementById('exportQueueSummary').textContent=summary||'Puedes seguir editando';
  document.getElementById('exportQueueMeter').style.width=active?`${active.progress}%`:'100%';
  this.toggle.classList.toggle('is-processing',!!active);this.toggle.classList.toggle('has-error',!active&&!!failed.length);
  this.toggle.hidden=!items.length||!this.panel.hidden;
  document.getElementById('exportPanelSummary').textContent=active?`${active.clip.title} · ${active.progress}%${summary?' · '+summary:''}`:summary||'Exporta un clip para empezar.';
  document.getElementById('clearExports').disabled=!items.some(item=>!['queued','processing'].includes(item.status));
  document.getElementById('exportsEmpty').hidden=!!items.length;
  const order=[...(active?[active]:[]),...waiting,...items.filter(item=>!['queued','processing'].includes(item.status)).reverse()];
  for(const [id,record] of this.nodes){if(!items.some(item=>item.id===id)){record.node.remove();this.nodes.delete(id);}}
  order.forEach((item,index)=>{
   let record=this.nodes.get(item.id);
   if(!record){const node=document.createElement('article');node.className='export-job';node.dataset.exportId=item.id;node.setAttribute('role','listitem');record={node,status:null};this.nodes.set(item.id,record);}
   const node=record.node;
   if(record.status!==item.status){
    const title=escapeHTML(item.clip.title);
    node.innerHTML=`<div class="export-job-heading"><b>${title}</b><span class="export-job-status"></span></div><p class="export-job-source"></p><p class="export-job-spec"></p><div class="export-job-progress"><div><span class="export-job-phase"></span><b class="export-job-percent"></b></div><progress max="100" value="0" aria-label="Progreso de ${title}"></progress></div><p class="export-job-error" hidden></p><div class="export-job-actions">${['queued','processing'].includes(item.status)?`<button type="button" class="text-button" data-export-action="cancel" aria-label="Cancelar exportación de ${title}">Cancelar</button>`:item.status==='ready'?`<a class="button primary small" data-export-action="download" aria-label="Descargar ${title}">Descargar</a>`:item.status==='failed'?`<button type="button" class="button secondary small" data-export-action="retry" aria-label="Reintentar exportación de ${title}">Reintentar</button>`:''}${!['queued','processing'].includes(item.status)?`<button type="button" class="text-button export-job-remove" data-export-action="remove" aria-label="Quitar exportación de ${title}">Quitar</button>`:''}</div>`;
    record.status=item.status;node.dataset.status=item.status;
   }
   node.querySelector('.export-job-status').textContent=item.status==='processing'?'Exportando':item.status==='queued'?`En cola · ${waiting.indexOf(item)+1}`:item.status==='ready'?'Listo':item.status==='failed'?'Error':'Cancelada';
   node.querySelector('.export-job-source').textContent=`${item.sourceName} · ${time(item.clip.start)} — ${time(item.clip.end)}`;
   const encoding=item.encoding;
   node.querySelector('.export-job-spec').textContent=item.result?`${item.result.width} × ${item.result.height} · ${fpsLabel(item.result.fps)} · ${(item.result.size/1048576).toFixed(1)} MB`:`${item.options.resolution}p · ${item.options.format.toUpperCase()} · ${encoding?fpsLabel(encoding.fps):fpsDescription(item.options.fps)}`;
   let storage=node.querySelector('.export-job-storage');
   if(!storage){storage=document.createElement('p');storage.className='export-job-storage';node.querySelector('.export-job-spec').after(storage);}
   storage.textContent=item.result?.saved?`Guardado en tu equipo · ${item.result.filename}`:item.storage==='disk'?'Archivo temporal en disco':item.storage==='file'?'Guardando directamente en tu equipo':item.storage==='memory'?'Este navegador guarda la salida en memoria. Para videos grandes, usa un navegador con guardado en disco.':'';
   storage.hidden=!storage.textContent;
   node.querySelector('.export-job-progress').hidden=item.status!=='processing';
   node.querySelector('.export-job-phase').textContent=item.phase;node.querySelector('.export-job-percent').textContent=item.progress+'%';node.querySelector('progress').value=item.progress;
   const error=node.querySelector('.export-job-error');error.hidden=!item.error;error.textContent=item.error||'';
   const download=node.querySelector('[data-export-action="download"]');if(download&&item.result){if(item.result.saved)download.remove();else{download.href=item.result.url;download.download=item.result.filename;}}
   // Progress must not recreate controls or move their keyboard focus.
   if(this.list.children[index]!==node)this.list.insertBefore(node,this.list.children[index]||null);
  });
 }
}

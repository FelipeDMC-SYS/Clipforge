import {blendFraction} from './core.js?v=5';

// Two decoded source frames are retained at a time. The output clock is supplied
// by the encoder, so interpolation adds neither latency nor an audio offset.
export class FrameMixer {
 constructor(iterator,measureDifference=()=>0){this.iterator=iterator;this.measureDifference=measureDifference;this.current=null;this.next=null;this.initialized=false;this.difference=0;}
 async take(){const item=await this.iterator.next();return item.done?null:item.value;}
 async frameAt(time){
  if(!this.initialized){this.current=await this.take();this.next=await this.take();this.initialized=true;this.measure();}
  while(this.next&&this.next.timestamp<=time+1e-7){this.current?.close();this.current=this.next;this.next=await this.take();this.measure();}
  if(!this.current)throw new Error('No hay fotogramas disponibles para suavizar este recorte.');
  return {current:this.current,next:this.next,alpha:this.next?blendFraction(time,this.current.timestamp,this.next.timestamp,this.difference):0};
 }
 measure(){this.difference=this.current&&this.next?this.measureDifference(this.current,this.next):0;}
 async close(){this.current?.close();this.next?.close();this.current=null;this.next=null;await this.iterator.return?.();}
}

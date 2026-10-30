// Image controls shared by preview and export. Sharpening enhances existing
// local contrast; it neither reconstructs missing detail nor generates frames.
export const IMAGE_PRESETS = Object.freeze({
 natural: {brightness:100,contrast:100,saturation:100,sharpness:0},
 balanced: {brightness:103,contrast:110,saturation:108,sharpness:18},
 fortnite: {brightness:102,contrast:112,saturation:122,sharpness:42}
});
export const matchesImagePreset=(settings,name)=>!!IMAGE_PRESETS[name]&&Object.entries(IMAGE_PRESETS[name]).every(([key,value])=>(settings[key]??0)===value);
const strengthOf=amount=>Math.max(0,Math.min(100,Number(amount)||0))/100;

// Four-neighbor luma sharpening. A noise threshold and bounded correction
// reduce ringing; a common RGB delta avoids unnecessary color shifts.
export function sharpenPixels(source,width,height,amount,target=new Uint8ClampedArray(source.length)){
 if(source.length!==width*height*4||target.length!==source.length)throw new Error('Invalid sharpening image dimensions');
 const strength=strengthOf(amount),input=target.buffer===source.buffer?source.slice():source;
 if(!strength){target.set(input);return target;}
 const stride=width*4,limit=24*strength,gain=1.5*strength;
 for(let y=0;y<height;y++){
  const row=y*stride,top=Math.max(0,y-1)*stride,bottom=Math.min(height-1,y+1)*stride;
  for(let x=0;x<width;x++){
   const col=x*4,p=row+col,n=top+col,s=bottom+col,e=row+Math.min(width-1,x+1)*4,w=row+Math.max(0,x-1)*4;
   const dr=input[p]-(input[n]+input[s]+input[e]+input[w])*.25;
   const dg=input[p+1]-(input[n+1]+input[s+1]+input[e+1]+input[w+1])*.25;
   const db=input[p+2]-(input[n+2]+input[s+2]+input[e+2]+input[w+2])*.25;
   const edge=dr*.2126+dg*.7152+db*.0722;
   const delta=Math.max(-limit,Math.min(limit,Math.sign(edge)*Math.max(0,Math.abs(edge)-1.25)*gain));
   target[p]=input[p]+delta;target[p+1]=input[p+1]+delta;target[p+2]=input[p+2]+delta;target[p+3]=input[p+3];
  }
 }
 return target;
}

const vertex=`attribute vec2 position;varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.0,1.0);}`;
const fragment=`precision highp float;varying vec2 uv;
uniform sampler2D source;uniform vec2 texel;uniform float strength;
void main(){
 vec4 center=texture2D(source,uv);
 vec3 mean=(texture2D(source,uv+vec2(texel.x,0.0)).rgb+
 texture2D(source,uv-vec2(texel.x,0.0)).rgb+
 texture2D(source,uv+vec2(0.0,texel.y)).rgb+
 texture2D(source,uv-vec2(0.0,texel.y)).rgb)*.25;
 float edge=dot(center.rgb-mean,vec3(.2126,.7152,.0722));
 float delta=clamp(sign(edge)*max(0.0,abs(edge)-1.25/255.0)*1.5*strength,-24.0/255.0*strength,24.0/255.0*strength);
 gl_FragColor=vec4(clamp(center.rgb+delta,0.0,1.0),center.a);
}`;

export class ImageQualityProcessor {
 constructor({createCanvas}={}){
  this.createCanvas=createCanvas||(()=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1,1):document.createElement('canvas'));
  this.mode='uninitialized';this.gl=null;this.canvas=null;this.output=null;
 }
 init(){
  if(this.mode!=='uninitialized')return;
  this.mode='cpu';
  try{
   this.canvas=this.createCanvas();
   const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
   if(!gl)return;this.gl=gl;
   const shader=(type,source)=>{const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)){gl.deleteShader(result);throw new Error('Sharpen shader unavailable');}return result;};
   const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
   gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);this.program=program;
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Sharpen program unavailable');
   this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   this.position=gl.getAttribLocation(program,'position');this.texel=gl.getUniformLocation(program,'texel');this.strength=gl.getUniformLocation(program,'strength');
   this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
   for(const [key,value] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);
   gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'source'),0);gl.disable(gl.DITHER);
   this.mode='gpu';
  }catch{this.releaseGPU();}
 }
 apply(ctx,amount){
  const strength=strengthOf(amount);if(!strength)return;
  this.init();const width=ctx.canvas.width,height=ctx.canvas.height,gl=this.gl;
  if(this.mode==='gpu'){
   try{
    if(gl.isContextLost())throw new Error('Sharpen context lost');
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
    gl.viewport(0,0,width,height);gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,ctx.canvas);
    gl.uniform2f(this.texel,1/width,1/height);gl.uniform1f(this.strength,strength);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    if(gl.getError()!==gl.NO_ERROR||gl.isContextLost())throw new Error('Sharpen GPU unavailable');
    // Copy synchronously, before the WebGL drawing buffer can be cleared.
    ctx.save();ctx.filter='none';ctx.globalAlpha=1;ctx.globalCompositeOperation='copy';ctx.drawImage(this.canvas,0,0);ctx.restore();return;
   }catch{this.releaseGPU();}
  }
  const source=ctx.getImageData(0,0,width,height);
  if(!this.output||this.output.width!==width||this.output.height!==height)this.output=ctx.createImageData(width,height);
  sharpenPixels(source.data,width,height,amount,this.output.data);ctx.putImageData(this.output,0,0);
 }
 releaseGPU(){const gl=this.gl;if(gl){if(this.texture)gl.deleteTexture(this.texture);if(this.buffer)gl.deleteBuffer(this.buffer);if(this.program)gl.deleteProgram(this.program);gl.getExtension('WEBGL_lose_context')?.loseContext();}this.gl=null;this.canvas=null;this.mode='cpu';}
 dispose(){this.releaseGPU();this.output=null;}
}

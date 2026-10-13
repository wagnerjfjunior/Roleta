/* Simulacao visual de bolinhas: nao participa da escolha do numero sorteado. */
(function(root){
'use strict';
const TAU=Math.PI*2;
const reduce=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function create(arena){
 let canvas=null,ctx=null,balls=[],raf=0,observer=null,last=0,width=0,height=0,radius=12,active=true,fast=false;
 function resize(){
  if(!canvas)return;
  const rect=arena.getBoundingClientRect();
  width=Math.max(240,Math.round(rect.width));height=Math.max(180,Math.round(rect.height));
  const ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  canvas.style.width='100%';canvas.style.height='100%';
  ctx.setTransform(ratio,0,0,ratio,0,0);
  radius=Math.max(7,Math.min(17,Math.sqrt(width*height/Math.max(1,balls.length))*0.27));
  for(const b of balls){
   b.x=Math.max(radius,Math.min(width-radius,b.x));
   b.y=Math.max(radius,Math.min(height-radius,b.y));
  }
 }
 function makeBall(n,index,count){
  // Coordenadas e velocidades apenas visuais; escolha real ocorre no engine separado.
  const a=((index*137.508+19)%360)*Math.PI/180;
  const ring=Math.sqrt((index+.6)/(count+.5));
  const speed=(125+(index%9)*12)*1.5; // 50% mais rápido durante toda a movimentação.
  return {n,x:width/2+Math.cos(a)*ring*(width/2-radius-4)*.86,
   y:height/2+Math.sin(a)*ring*(height/2-radius-4)*.86,
   vx:Math.cos(a+1.4)*speed,vy:Math.sin(a+1.4)*speed};
 }
 function draw(){
  ctx.clearRect(0,0,width,height);
  for(const b of balls){
   const g=ctx.createRadialGradient(b.x-radius*.36,b.y-radius*.42,radius*.1,b.x,b.y,radius);
   g.addColorStop(0,'#f7fdff');g.addColorStop(.35,'#a3e8fe');g.addColorStop(.74,'#45abd7');g.addColorStop(1,'#126b9d');
   ctx.beginPath();ctx.arc(b.x,b.y,radius,0,TAU);
   ctx.fillStyle=g;ctx.fill();ctx.lineWidth=.8;ctx.strokeStyle='#ffffff66';ctx.stroke();
   // As bolinhas permanecem sem numeros na urna; somente a revelacao mostra o resultado.
  }
 }
 function step(dt){
  const boost=fast?3.9375:1; // mais 50% na aceleracao ao clicar.
  // Integracao de pequeno passo previne atravessar paredes com velocidades altas.
  const steps=Math.min(4,Math.max(1,Math.ceil(dt/.012)));
  const h=dt/steps;
  for(let sub=0;sub<steps;sub++){
   for(const b of balls){
    b.x+=b.vx*h*boost;b.y+=b.vy*h*boost;
    if(b.x<radius){b.x=radius;b.vx=Math.abs(b.vx);}
    else if(b.x>width-radius){b.x=width-radius;b.vx=-Math.abs(b.vx);}
    if(b.y<radius){b.y=radius;b.vy=Math.abs(b.vy);}
    else if(b.y>height-radius){b.y=height-radius;b.vy=-Math.abs(b.vy);}
   }
   // Grid espacial: checa apenas bolinhas em celulas proximas.
   const cell=Math.max(radius*2.1,18),grid=new Map();
   for(let i=0;i<balls.length;i++){
    const b=balls[i],cx=Math.floor(b.x/cell),cy=Math.floor(b.y/cell);
    const key=cx+','+cy;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);
   }
   const minDist=radius*2,minDistSq=minDist*minDist;
   for(let i=0;i<balls.length;i++){
    const a=balls[i],cx=Math.floor(a.x/cell),cy=Math.floor(a.y/cell);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
     const near=grid.get((cx+dx)+','+(cy+dy));if(!near)continue;
     for(const j of near){
      if(j<=i)continue;
      const b=balls[j],xx=b.x-a.x,yy=b.y-a.y,dsq=xx*xx+yy*yy;
      if(dsq>=minDistSq)continue;
      const dist=Math.sqrt(dsq)||.0001;
      const nx=dsq?xx/dist:1,ny=dsq?yy/dist:0;
      const overlap=(minDist-dist)/2;
      a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
      // Colisao elastica de massas iguais: intercambio do componente normal.
      const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(relative<0){
       const impulse=-relative;
       a.vx-=impulse*nx;a.vy-=impulse*ny;
       b.vx+=impulse*nx;b.vy+=impulse*ny;
      }
     }
    }
   }
  }
 }
 function frame(now){
  if(!active)return;
  if(!last)last=now;
  const elapsed=Math.min(.045,(now-last)/1000);last=now;
  if(!document.hidden&&width>0&&height>0){
   if(!reduce())step(elapsed);
   draw();
  }
  raf=requestAnimationFrame(frame);
 }
 function update(numbers){
  if(!active)return;
  const ids=new Set(numbers);
  const existing=new Map(balls.filter(b=>ids.has(b.n)).map(b=>[b.n,b]));
  balls=numbers.map((n,i)=>existing.get(n)||makeBall(n,i,numbers.length));
  resize();draw();
 }
 function setFast(value){fast=!!value;}
 function destroy(){
  active=false;cancelAnimationFrame(raf);if(observer)observer.disconnect();
  if(canvas)canvas.remove();canvas=null;ctx=null;balls=[];
 }
 try{
  canvas=document.createElement('canvas');canvas.className='balls-canvas';
  canvas.setAttribute('aria-hidden','true');arena.appendChild(canvas);
  ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)throw Error('Canvas nao suportado');
  resize();
  if(typeof ResizeObserver==='function'){observer=new ResizeObserver(resize);observer.observe(arena);}
  raf=requestAnimationFrame(frame);
  return {update,setFast,destroy};
 }catch(e){
  destroy();return null;
 }
}
root.RoletaBingoBalls={create};
})(typeof window==='object'?window:globalThis);

// Baked art: everything detailed is drawn ONCE into offscreen canvases, then blitted each frame.
// This gives painterly depth (soft shading, texture, blur) at almost no per-frame cost on a Mali-G52.
let seed=11; const rnd=()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
const mk=(w,h)=>{ const c=document.createElement('canvas'); c.width=Math.ceil(w); c.height=Math.ceil(h); return [c,c.getContext('2d')]; };
const circ=(g,x,y,r)=>{ g.beginPath(); g.arc(x,y,r,0,Math.PI*2); };

/* ---------- textures (tile, world-aligned at draw time) ---------- */
export function grassTexture(){ const [c,g]=mk(256,256);
  for(let i=0;i<1400;i++){ const x=rnd()*256, y=rnd()*256, l=3+rnd()*7, a=-1.2+rnd()*0.5; const light=rnd()<0.5;
    g.strokeStyle= light?`rgba(214,240,160,${0.10+rnd()*0.18})`:`rgba(40,92,52,${0.10+rnd()*0.16})`; g.lineWidth=1+rnd()*1.2; g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*l*0.4,y+Math.sin(a)*l); g.stroke(); }
  for(let i=0;i<90;i++){ g.fillStyle=`rgba(255,255,255,${0.05+rnd()*0.08})`; circ(g,rnd()*256,rnd()*256,1+rnd()*2.5); g.fill(); }
  for(let i=0;i<26;i++){ g.fillStyle=`rgba(40,90,50,${0.05+rnd()*0.05})`; g.beginPath(); g.ellipse(rnd()*256,rnd()*256,10+rnd()*22,4+rnd()*8,0,0,Math.PI*2); g.fill(); }
  return c; }
export function rockTexture(){ const [c,g]=mk(256,256);
  for(let i=0;i<60;i++){ const x=rnd()*256,y=rnd()*256,w=14+rnd()*40,h=6+rnd()*16; g.fillStyle=`rgba(${rnd()<0.5?'255,255,255':'40,30,60'},${0.05+rnd()*0.08})`; g.beginPath(); g.ellipse(x,y,w,h,(rnd()-0.5)*0.4,0,Math.PI*2); g.fill(); }
  for(let i=0;i<500;i++){ g.fillStyle=`rgba(30,24,50,${0.06+rnd()*0.1})`; g.fillRect(rnd()*256,rnd()*256,1.5,1.5); }
  g.strokeStyle='rgba(40,30,60,0.12)'; g.lineWidth=1.5; for(let i=0;i<14;i++){ const y=rnd()*256; g.beginPath(); g.moveTo(0,y); for(let x=0;x<=256;x+=32) g.lineTo(x,y+(rnd()-0.5)*10); g.stroke(); }
  return c; }

/* ---------- sprites ---------- */
function leafBlob(g,x,y,r,base,mid,hi){ g.fillStyle=base; circ(g,x,y,r); g.fill(); g.fillStyle=mid; circ(g,x-r*0.18,y-r*0.2,r*0.78); g.fill(); g.fillStyle=hi; circ(g,x-r*0.36,y-r*0.42,r*0.38); g.fill(); }
export function treeSprite(kind,v=0){ const W=220,H=280; const [c,g]=mk(W,H); const cx=W/2, base=H-6;
  const pal=[['#2F6E4E','#3F8A62','#68B07F'],['#356F3E','#4C8F4A','#7DBA62'],['#2C6650','#3A8466','#5FA88A']][v%3];
  if(kind==='pine'){ g.fillStyle='#6E4C3A'; g.fillRect(cx-7,base-46,14,46);
    for(let k=0;k<4;k++){ const y=base-40-k*48, w=92-k*18; g.fillStyle=pal[0]; g.beginPath(); g.moveTo(cx-w,y); g.quadraticCurveTo(cx,y-110+k*6,cx+w,y); g.closePath(); g.fill();
      g.fillStyle=pal[1]; g.beginPath(); g.moveTo(cx-w*0.95,y-4); g.quadraticCurveTo(cx-w*0.1,y-100+k*6,cx+w*0.1,y-78+k*5); g.lineTo(cx-w*0.1,y-4); g.closePath(); g.fill();
      g.fillStyle='rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(cx-w*0.7,y-8); g.quadraticCurveTo(cx-w*0.3,y-60,cx-w*0.05,y-70+k*5); g.lineTo(cx-w*0.25,y-10); g.fill(); }
    return c; }
  if(kind==='bush'){ [[cx-40,base-34,36],[cx+30,base-36,40],[cx-4,base-58,46]].forEach(([x,y,r])=>leafBlob(g,x,y,r,pal[0],pal[1],pal[2])); return c; }
  // round deciduous
  const tg=g.createLinearGradient(cx-9,0,cx+9,0); tg.addColorStop(0,'#8A6450'); tg.addColorStop(1,'#5E4234'); g.fillStyle=tg; g.beginPath(); g.moveTo(cx-10,base); g.lineTo(cx-6,base-120); g.lineTo(cx+6,base-120); g.lineTo(cx+10,base); g.fill();
  g.strokeStyle='#6E4C3A'; g.lineWidth=6; g.beginPath(); g.moveTo(cx,base-90); g.lineTo(cx+34,base-130); g.moveTo(cx,base-100); g.lineTo(cx-30,base-140); g.stroke();
  const blobs=[[cx,base-170,62],[cx-52,base-130,46],[cx+54,base-128,48],[cx-20,base-118,44],[cx+22,base-112,42],[cx-38,base-188,38],[cx+34,base-192,40]];
  blobs.forEach(([x,y,r])=>{ g.fillStyle=pal[0]; circ(g,x,y,r); g.fill(); });
  blobs.forEach(([x,y,r])=>{ g.fillStyle=pal[1]; circ(g,x-r*0.15,y-r*0.18,r*0.8); g.fill(); });
  blobs.slice(0,6).forEach(([x,y,r])=>{ g.fillStyle=pal[2]; circ(g,x-r*0.38,y-r*0.42,r*0.36); g.fill(); });
  for(let i=0;i<120;i++){ const [x,y,r]=blobs[Math.floor(rnd()*blobs.length)]; const a=rnd()*Math.PI*2, d=rnd()*r; g.fillStyle=rnd()<0.5?'rgba(255,255,255,0.10)':'rgba(20,60,40,0.14)'; circ(g,x+Math.cos(a)*d,y+Math.sin(a)*d,2+rnd()*3); g.fill(); }
  g.fillStyle='rgba(20,50,35,0.18)'; g.beginPath(); g.ellipse(cx+30,base-120,60,40,0.4,0,Math.PI*2); g.fill();
  return c; }
export function rockSprite(v=0){ const [c,g]=mk(200,130); const pts=v?[[10,124],[30,60],[80,30],[140,40],[188,90],[192,124]]:[[8,124],[40,48],[100,18],[160,50],[190,124]];
  g.beginPath(); pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y)); g.closePath(); const gr=g.createLinearGradient(0,20,0,124); gr.addColorStop(0,'#BDB8CC'); gr.addColorStop(1,'#827C98'); g.fillStyle=gr; g.fill();
  g.fillStyle='rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(pts[1][0]+6,pts[1][1]+6); g.lineTo(pts[2][0],pts[2][1]+8); g.lineTo(pts[2][0]-6,pts[2][1]+40); g.closePath(); g.fill();
  g.fillStyle='rgba(40,30,60,0.22)'; g.beginPath(); g.moveTo(pts[pts.length-2][0],pts[pts.length-2][1]); g.lineTo(pts[pts.length-1][0],124); g.lineTo(pts[2][0]+10,124); g.closePath(); g.fill();
  g.fillStyle='rgba(110,170,90,0.55)'; for(let i=0;i<10;i++){ circ(g,20+rnd()*160,118+rnd()*6,4+rnd()*5); g.fill(); }
  return c; }

/* ---------- distant layers, baked in layer space with blur (depth of field) ---------- */
export function bakeLayer(p, x0,x1,y0,y1, ppu, blur, draw){ const [c,g]=mk((x1-x0)*ppu,(y1-y0)*ppu);
  const T=(x,y)=>[(x-x0)*ppu,(y1-y)*ppu]; if(blur) g.filter=`blur(${blur}px)`; draw(g,T,ppu); g.filter='none'; return {c,p,x0,x1,y0,y1}; }
function ridge(g,T,pts,baseY,fill){ g.beginPath(); pts.forEach(([x,y],i)=>{ const [a,b]=T(x,y); i?g.lineTo(a,b):g.moveTo(a,b); }); const [ex]=T(pts[pts.length-1][0],0), [bx]=T(pts[0][0],0), [,by]=T(0,baseY); g.lineTo(ex,by); g.lineTo(bx,by); g.closePath(); g.fillStyle=fill; g.fill(); }
function jag(x0,x1,step,base,amp,seedv){ seed=seedv; const pts=[]; for(let x=x0;x<=x1;x+=step*(0.6+rnd()*0.8)) pts.push([x,base+amp*(0.25+rnd()*0.75)*(0.6+0.4*Math.sin(x*0.07))]); return pts; }
export function farLayers(){ const L=[];
  // 1. far snowy range
  L.push(bakeLayer(0.12,-120,160,-30,40,7,2.2,(g,T)=>{ const pts=jag(-120,160,9,6,22,3);
    const [,t0]=T(0,30),[,t1]=T(0,-10); let gr=g.createLinearGradient(0,t0,0,t1); gr.addColorStop(0,'#B9C3E8'); gr.addColorStop(1,'#D9D2E6'); ridge(g,T,pts,-30,gr);
    pts.forEach(([x,y],i)=>{ if(i===0||y<18) return; const [px,py]=T(x,y); g.fillStyle='rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(px,py); g.lineTo(px-22,py+20); g.lineTo(px-6,py+16); g.lineTo(px+4,py+24); g.lineTo(px+20,py+18); g.closePath(); g.fill(); });
    for(let i=1;i<pts.length;i++){ const [ax,ay]=T(...pts[i-1]),[bx,by]=T(...pts[i]); if(by<ay){ g.fillStyle='rgba(120,130,190,0.18)'; g.beginPath(); g.moveTo(bx,by); g.lineTo(ax,ay); g.lineTo(ax+30,t1); g.lineTo(bx+40,t1); g.closePath(); g.fill(); } }
    gr=g.createLinearGradient(0,T(0,4)[1],0,T(0,-30)[1]); gr.addColorStop(0,'rgba(232,225,240,0)'); gr.addColorStop(1,'rgba(232,225,240,0.9)'); g.fillStyle=gr; g.fillRect(0,T(0,4)[1],99999,9999); }));
  // 2. mid range
  L.push(bakeLayer(0.28,-90,140,-30,30,8,1.4,(g,T)=>{ const pts=jag(-90,140,6,0,15,9); const gr=g.createLinearGradient(0,T(0,16)[1],0,T(0,-12)[1]); gr.addColorStop(0,'#8D9BCB'); gr.addColorStop(1,'#B8B5D2'); ridge(g,T,pts,-30,gr);
    for(let i=1;i<pts.length;i++){ const [ax,ay]=T(...pts[i-1]),[bx,by]=T(...pts[i]); if(by<ay){ g.fillStyle='rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(ax,ay); g.lineTo(bx,by); g.lineTo(bx-10,by+70); g.closePath(); g.fill(); } }
    const gr2=g.createLinearGradient(0,T(0,2)[1],0,T(0,-25)[1]); gr2.addColorStop(0,'rgba(220,214,236,0)'); gr2.addColorStop(1,'rgba(220,214,236,0.95)'); g.fillStyle=gr2; g.fillRect(0,T(0,2)[1],99999,9999); }));
  // 3. near forested hills
  L.push(bakeLayer(0.5,-70,120,-30,24,10,0.9,(g,T,ppu)=>{ seed=21; const pts=[]; for(let x=-70;x<=120;x+=3) pts.push([x,-3+6*Math.sin(x*0.09)+3*Math.sin(x*0.23+1)+rnd()*0.6]);
    const gr=g.createLinearGradient(0,T(0,6)[1],0,T(0,-14)[1]); gr.addColorStop(0,'#6E93A0'); gr.addColorStop(1,'#A7AFC8'); ridge(g,T,pts,-30,gr);
    g.fillStyle='rgba(78,112,124,0.9)'; pts.forEach(([x,y],i)=>{ if(i%1) return; for(let k=0;k<2;k++){ const tx=x+rnd()*3, ty=y-0.2; const [a,b]=T(tx,ty); const h=(0.9+rnd()*0.8)*ppu; g.beginPath(); g.moveTo(a-h*0.35,b+2); g.lineTo(a,b-h); g.lineTo(a+h*0.35,b+2); g.fill(); } });
    const gr2=g.createLinearGradient(0,T(0,0)[1],0,T(0,-20)[1]); gr2.addColorStop(0,'rgba(210,214,232,0)'); gr2.addColorStop(1,'rgba(210,214,232,0.95)'); g.fillStyle=gr2; g.fillRect(0,T(0,0)[1],99999,9999); }));
  return L; }
export function cloudSea(){ return bakeLayer(0.72,-70,120,-26,-2,9,3,(g,T,ppu)=>{ seed=5;
  for(let k=0;k<3;k++){ for(let x=-70;x<120;x+=2.2+rnd()*2.5){ const y=-9-k*3.2+rnd()*1.2; const [a,b]=T(x,y); const r=(2+rnd()*2.6)*ppu;
    const gr=g.createRadialGradient(a,b-r*0.3,r*0.1,a,b,r); const tone=k===0?'255,250,246':k===1?'240,236,248':'226,224,242'; gr.addColorStop(0,`rgba(${tone},0.95)`); gr.addColorStop(1,`rgba(${tone},0)`); g.fillStyle=gr; circ(g,a,b,r); g.fill(); } }
  const [,top]=T(0,-12); g.fillStyle='rgba(236,232,246,0.85)'; g.fillRect(0,top,99999,9999); }); }
export function islets(treeImgs){ return bakeLayer(0.42,-40,90,-12,40,14,1.6,(g,T,ppu)=>{ [[-24,18,2.2],[70,26,3],[78,8,1.5],[-8,30,1.2]].forEach(([x,y,s])=>{ const [a,b]=T(x,y); const w=s*2.4*ppu, h=s*0.5*ppu;
    const gr=g.createLinearGradient(0,b,0,b+s*2.2*ppu); gr.addColorStop(0,'#A28C8A'); gr.addColorStop(1,'rgba(140,130,160,0)'); g.fillStyle=gr; g.beginPath(); g.moveTo(a-w,b); g.quadraticCurveTo(a-w*0.2,b+s*2.4*ppu,a+w*0.1,b+s*2.6*ppu); g.quadraticCurveTo(a+w*0.5,b+s*1.2*ppu,a+w,b); g.closePath(); g.fill();
    g.fillStyle='#8DB37E'; g.beginPath(); g.ellipse(a,b,w,h,0,Math.PI,0); g.lineTo(a+w,b+h*0.3); g.lineTo(a-w,b+h*0.3); g.fill();
    for(let k=0;k<Math.round(s*2);k++){ const im=treeImgs[k%treeImgs.length]; const th=s*1.3*ppu, tw=th*im.width/im.height; g.drawImage(im,a-w*0.6+k*w*0.5-tw/2,b-th+h*0.2,tw,th); } }); }); }

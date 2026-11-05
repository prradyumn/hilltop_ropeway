// The only 3D in the game: a small close-up "lens" for the grooved pulley and the wheel-on-rope contact.
// Renders on demand while visible. Camera always sits on the viewer's side, so clockwise matches the 2D world.
import { WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, Group, Mesh,
  MeshStandardMaterial, LatheGeometry, CylinderGeometry, CircleGeometry, TorusGeometry, BoxGeometry,
  Vector2, Vector3, CanvasTexture, RepeatWrapping, SRGBColorSpace, ACESFilmicToneMapping, TubeGeometry, CatmullRomCurve3,
  PlaneGeometry, MeshBasicMaterial, DoubleSide, PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const R10=0.55, R15=0.825; // lens units: 10 cm wheel radius, 15 cm wheel radius
function ropeTexture(alongV){ // twisted 3-strand look; slope and period chosen so the texture tiles seamlessly
  const N=128, P=32, c=document.createElement('canvas'); c.width=c.height=N; const g=c.getContext('2d'); if(!alongV) g.setTransform(0,1,1,0,0,0);
  g.fillStyle='#2E3246'; g.fillRect(0,0,N,N); const th=Math.atan2(N/2,N), nx=-Math.sin(th), ny=Math.cos(th), w=P*Math.cos(th);
  for(let k=-N;k<2*N;k+=P){ const gr=g.createLinearGradient(0,k,nx*w,k+ny*w); gr.addColorStop(0,'#262A3C'); gr.addColorStop(0.18,'#4C5272'); gr.addColorStop(0.5,'#7A80A2'); gr.addColorStop(0.7,'#565C7E'); gr.addColorStop(0.95,'#2A2E42');
    g.fillStyle=gr; g.beginPath(); g.moveTo(0,k); g.lineTo(N,k+N/2); g.lineTo(N,k+N/2+P-2); g.lineTo(0,k+P-2); g.closePath(); g.fill(); }
  g.strokeStyle='rgba(255,255,255,0.08)'; g.lineWidth=1; for(let k=-N;k<2*N;k+=P/4){ g.beginPath(); g.moveTo(0,k); g.lineTo(N,k+N/2); g.stroke(); } // fibres
  const t=new CanvasTexture(c); t.wrapS=t.wrapT=RepeatWrapping; t.colorSpace=SRGBColorSpace; return t; }
function faceTexture(spokes=5, band=false){ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d');
  g.fillStyle='#4A5072'; g.beginPath(); g.arc(128,128,128,0,Math.PI*2); g.fill();
  g.strokeStyle='#E9E6DE'; g.lineWidth=16; g.lineCap='round';
  for(let i=0;i<spokes;i++){ const a=i*Math.PI*2/spokes; g.beginPath(); g.moveTo(128+Math.cos(a)*30,128+Math.sin(a)*30); g.lineTo(128+Math.cos(a)*92,128+Math.sin(a)*92); g.stroke(); }
  g.fillStyle='#F4F1EA'; g.beginPath(); g.arc(128,128,34,0,Math.PI*2); g.fill(); g.fillStyle='#23284A'; g.beginPath(); g.arc(128,128,13,0,Math.PI*2); g.fill();
  g.fillStyle='#FFC83D'; g.beginPath(); g.arc(128+100,128,13,0,Math.PI*2); g.fill();
  const t=new CanvasTexture(c); t.colorSpace=SRGBColorSpace; return t; }

function wheelGeo(R, grooved){ const w=R*0.42, pts=[];
  if(!grooved){ pts.push(new Vector2(0.001,-w),new Vector2(R*0.96,-w),new Vector2(R,-w*0.8),new Vector2(R,w*0.8),new Vector2(R*0.96,w),new Vector2(0.001,w)); }
  else { pts.push(new Vector2(0.001,-w),new Vector2(R*0.97,-w),new Vector2(R,-w*0.82),new Vector2(R,-w*0.42),new Vector2(R*0.72,-w*0.06),new Vector2(R*0.72,w*0.06),new Vector2(R,w*0.42),new Vector2(R,w*0.82),new Vector2(R*0.97,w),new Vector2(0.001,w)); }
  const g=new LatheGeometry(pts,96); g.rotateX(Math.PI/2); return {g,w}; } // axis along Z (toward camera)

export function createLens(canvas){
  let renderer;
  try{ renderer=new WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'low-power'}); }catch(e){ return null; }
  renderer.toneMapping=ACESFilmicToneMapping; renderer.toneMappingExposure=1.05; renderer.outputColorSpace=SRGBColorSpace;
  const scene=new Scene(); const cam=new PerspectiveCamera(30,16/10,0.1,100);
  try{ const pm=new PMREMGenerator(renderer); scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture; pm.dispose(); }catch(e){}
  scene.add(new HemisphereLight(0xFFF4E0,0x6D6880,0.6));
  const key=new DirectionalLight(0xFFF1DC,1.6); key.position.set(-3,6,7); scene.add(key);
  const rim=new DirectionalLight(0x9FD8FF,0.8); rim.position.set(4,2,-5); scene.add(rim);

  const slate=new MeshStandardMaterial({color:0x4A5172,roughness:0.24,metalness:0.55,envMapIntensity:1.35}); // glossier metal (was rough .38 / metal .35)
  const coral=new MeshStandardMaterial({color:0xF0644A,roughness:0.82,envMapIntensity:0.4});
  const yellow=new MeshStandardMaterial({color:0xFFC83D,roughness:0.32,envMapIntensity:0.8});
  const ropeTex=ropeTexture(true); const ropeMat=new MeshStandardMaterial({color:0xffffff,map:ropeTex,roughness:0.55,metalness:0.08,envMapIntensity:0.9});
  const faceTex=faceTexture(5), faceMat=new MeshStandardMaterial({map:faceTex,roughness:0.55});

  // ---------- contact rig: rope + wheel + arm + body top ----------
  const contact=new Group(); scene.add(contact);
  const ropeLen=14; const rope=new Mesh(new CylinderGeometry(0.16,0.16,ropeLen,32,1,true), ropeMat); rope.rotation.z=Math.PI/2; contact.add(rope);
  ropeTex.repeat.set(2,ropeLen/0.55);
  const wheelHolder=new Group(); contact.add(wheelHolder);
  const wheels={};
  function buildWheel(key){ const big=key.startsWith('big'); const R=big?R15:R10; const grooved=key==='grooved'||key.includes('band');
    const grp=new Group(); const {g,w}=wheelGeo(R,grooved); grp.add(new Mesh(g,slate));
    const f1=new Mesh(new CircleGeometry(R*(grooved?0.66:0.9),40),faceMat); f1.position.z=w+0.002; grp.add(f1);
    const f2=f1.clone(); f2.position.z=-w-0.002; f2.rotation.y=Math.PI; grp.add(f2);
    if(key.includes('band')){ const t=new Mesh(new TorusGeometry(R*0.80,R*0.085,20,96),coral); grp.add(t); }
    grp.userData={R,grooved,w}; return grp; }
  ['smooth','big_smooth','grooved','band','big_band'].forEach(k=>{ wheels[k]=buildWheel(k); wheels[k].visible=false; wheelHolder.add(wheels[k]); });
  const arm=new Mesh(new BoxGeometry(0.12,1.4,0.12),slate); contact.add(arm);
  const axle=new Mesh(new CylinderGeometry(0.09,0.09,1.1,16),slate); axle.rotation.x=Math.PI/2; contact.add(axle);
  const body=new Mesh(new BoxGeometry(1.7,0.7,0.9,1,1,1),yellow); contact.add(body);
  // slip streaks
  const streakMat=new MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:DoubleSide});
  const streaks=[...Array(5)].map(()=>{ const m=new Mesh(new PlaneGeometry(0.34,0.04),streakMat.clone()); contact.add(m); return m; });

  // ---------- pulley rig ----------
  const pulley=new Group(); scene.add(pulley); pulley.visible=false;
  const PR=1.5; const pg=wheelGeo(PR,true); const pw=new Group(); pw.add(new Mesh(pg.g,slate));
  const pf=new Mesh(new CircleGeometry(PR*0.66,48),new MeshStandardMaterial({map:faceTexture(6),roughness:0.55})); pf.position.z=pg.w+0.002; pw.add(pf);
  const pf2=pf.clone(); pf2.position.z=-pg.w-0.002; pf2.rotation.y=Math.PI; pw.add(pf2); pulley.add(pw);
  const stand=new Mesh(new BoxGeometry(0.5,2.2,0.5),slate); stand.position.set(0,-1.2,-0.55); pulley.add(stand);
  const base=new Mesh(new BoxGeometry(2.2,0.3,1.2),slate); base.position.set(0,-2.3,-0.2); pulley.add(base);
  const rr=PR*0.72+0.15; const pts=[]; pts.push(new Vector3(-rr,-3.2,0)); for(let a=Math.PI;a>=0;a-=Math.PI/24) pts.push(new Vector3(Math.cos(a)*rr,Math.sin(a)*rr,0)); pts.push(new Vector3(rr+3.5,0.6,0));
  const pRopeTex=ropeTexture(false); pRopeTex.repeat.set(22,1); const pRope=new Mesh(new TubeGeometry(new CatmullRomCurve3(pts),120,0.15,12,false), new MeshStandardMaterial({map:pRopeTex,roughness:0.85})); pulley.add(pRope);

  const S={ mode:'off', wheel:'smooth', slope:0.2, angle:0, dist:0, slip:0, orbit:0, t:0, pulleyAngle:0, visible:false, ropeSign:1, pulleySign:1, macro:0 }; // macro 0..1: dolly down to the wheel-rope contact (S4 zoom)
  let w=0,h=0,dpr=0;
  function size(W,H,pr){ if(W===w&&H===h&&pr===dpr) return; w=W; h=H; dpr=pr; renderer.setPixelRatio(pr); renderer.setSize(W,H,false); cam.aspect=W/H; cam.updateProjectionMatrix(); }
  function setWheel(k){ Object.entries(wheels).forEach(([n,m])=>m.visible=(n===k)); S.wheel=k; }
  setWheel('smooth');

  function layoutContact(){ const W=wheels[S.wheel], R=W.userData.R;
    contact.rotation.z=S.slope; // tilt whole rig so the rope rises to the right
    wheelHolder.position.set(0,0.16+R*(W.userData.grooved?0.72:1),0);
    const wy=wheelHolder.position.y; axle.position.set(0,wy,0); arm.position.set(0,wy-0.7,0.5); body.position.set(0,wy-1.55,0.5);
    // counter the tilt for arm/body (they hang with gravity)
    arm.rotation.z=-S.slope; body.rotation.z=-S.slope; arm.position.x=Math.sin(S.slope)*0.7; body.position.x=Math.sin(S.slope)*1.55;
    wheelHolder.rotation.z=-S.angle; // angle passed in already as world wheel angle
  }
  function frameCamera(){ if(S.mode==='pulley'){ cam.position.set(2.2,1.6,7.2); cam.lookAt(0.6,0.1,0); return; }
    const R=wheels[S.wheel].userData.R; const o=S.orbit, m=S.macro*S.macro*(3-2*S.macro); const d=(2.5+R*1.6)*(1-m)+(1.25+R*0.35)*m; const cy=(0.16+R*0.8)*(1-m)+0.2*m;
    // at macro the camera swings to the front-left (angle ≈ -0.85) so the arm (z≈0.5) never sits between it and the contact
    const ang=0.62+o-1.47*m; cam.position.set(Math.sin(ang)*d, cy+(0.75+R*0.4)*(1-m)+0.17*m, Math.cos(ang)*d); cam.lookAt(0,cy-0.1*(1-m),0); }

  function render(dt){ if(!S.visible) return; S.t+=dt;
    if(S.mode==='pulley'){ contact.visible=false; pulley.visible=true; S.pulleyAngle-=dt*1.6; pw.rotation.z=S.pulleyAngle; pRopeTex.offset.x = S.pulleyAngle*rr/ (12.5/22)*S.pulleySign; }
    else { contact.visible=true; pulley.visible=false; layoutContact();
      ropeTex.offset.y = S.dist*(R10/0.159)/(ropeLen/ropeTex.repeat.y)*S.ropeSign;
      streaks.forEach((m,i)=>{ const ph=(S.t*3+i/5)%1; m.material.opacity=S.slip*(1-ph)*0.9; m.position.set(-0.15-ph*1.2, 0.2+ (i%2)*0.08, 0.35-(i*0.15)); m.rotation.z=0; }); }
    if(S.mode==='idle'){ S.orbit=Math.sin(S.t*0.5)*0.45; } else S.orbit*=0.92;
    frameCamera(); renderer.render(scene,cam); }

  return { size, render, setWheel,
    show(mode){ S.mode=mode; S.visible=true; },
    hide(){ S.visible=false; S.macro=0; },
    set macro(v){ S.macro=Math.max(0,Math.min(1,v)); }, get macro(){ return S.macro; },
    sync(o){ if(o.wheel&&o.wheel!==S.wheel) setWheel(o.wheel); if(o.angle!==undefined) S.angle=o.angle; if(o.dist!==undefined) S.dist=o.dist; if(o.slope!==undefined) S.slope=o.slope; if(o.slip!==undefined) S.slip=o.slip; },
    get visible(){ return S.visible; }, _S:S };
}

/* Brain Lab: the 3D bedroom. Loaded only when My Room is opened. Everything is built from code (no downloaded models):
   physically based materials, real shadows, image-based light, bloom and film tone mapping, so it renders like a modern game.
   index.html hands over plain data (colours and choices); this file never touches saved data. */
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const C=h=>new THREE.Color(h);
const shade=(h,k)=>{const c=C(h);c.multiplyScalar(k);return c};

/* ----- procedural textures ----- */
function canvasTex(w,h,draw,opt={}){
  const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=opt.linear?THREE.NoColorSpace:THREE.SRGBColorSpace;t.anisotropy=8;
  if(opt.repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(opt.repeat[0],opt.repeat[1])}
  return t;
}
function rnd(seed){let s=seed>>>0||1;return()=>(s=(s*1664525+1013904223)>>>0)/4294967296}
function woodTex(base,planks,seed){
  return canvasTex(1024,1024,(g,w,h)=>{
    const r=rnd(seed||7),bc=C(base);
    const pw=w/planks;
    for(let p=0;p<planks;p++){
      const k=.88+r()*.22,col=bc.clone().multiplyScalar(k);
      g.fillStyle='#'+col.getHexString();g.fillRect(p*pw,0,pw,h);
      for(let i=0;i<46;i++){const x=p*pw+r()*pw,a=.05+r()*.1;g.strokeStyle=`rgba(${r()>.5?'60,30,10':'255,235,200'},${a})`;g.lineWidth=.6+r()*1.6;g.beginPath();g.moveTo(x,0);
        for(let y=0;y<=h;y+=64)g.lineTo(x+Math.sin(y*.012+i)*3+(r()-.5)*2,y);g.stroke()}
      for(let n=0;n<2;n++){const y=r()*h,x=p*pw+r()*pw;g.fillStyle='rgba(70,35,12,.35)';g.beginPath();g.ellipse(x,y,4+r()*5,9+r()*8,0,0,6.3);g.fill()}
      g.fillStyle='rgba(0,0,0,.55)';g.fillRect(p*pw,0,1.6,h);
      g.fillStyle='rgba(255,255,255,.14)';g.fillRect(p*pw+1.6,0,1.2,h);
    }
  },{repeat:[1,1]});
}
function noiseTex(base,amp,size,repeat,seed){
  return canvasTex(size,size,(g,w,h)=>{
    const r=rnd(seed||3),bc=C(base);g.fillStyle='#'+bc.getHexString();g.fillRect(0,0,w,h);
    for(let i=0;i<w*h/6;i++){const v=(r()-.5)*amp;g.fillStyle=v>0?`rgba(255,255,255,${v})`:`rgba(0,0,0,${-v})`;g.fillRect(r()*w,r()*h,1.4,1.4)}
  },{repeat});
}
function weaveTex(base){
  return canvasTex(256,256,(g,w,h)=>{
    g.fillStyle='#'+C(base).getHexString();g.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=4){g.fillStyle=`rgba(0,0,0,${y%8?0.07:0.0})`;g.fillRect(0,y,w,2)}
    for(let x=0;x<w;x+=4){g.fillStyle=`rgba(255,255,255,${x%8?0.05:0})`;g.fillRect(x,0,2,h)}
  },{repeat:[6,6]});
}
function svgTex(svg,w,h){
  const c=document.createElement('canvas');c.width=w;c.height=h;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  const im=new Image();im.onload=()=>{c.getContext('2d').drawImage(im,0,0,w,h);t.needsUpdate=true};im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  return t;
}
function gradTex(stops){
  return canvasTex(8,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);stops.forEach(([o,c])=>gr.addColorStop(o,c));g.fillStyle=gr;g.fillRect(0,0,w,h)});
}

/* ----- small builders ----- */
/* a texture already carries its colour, so a textured material is tinted white (otherwise the colour would be applied twice) */
const std=(col,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:o.map?C('#fff'):C(col),roughness:.6,metalness:0},o));
const phys=(col,o={})=>new THREE.MeshPhysicalMaterial(Object.assign({color:o.map?C('#fff'):C(col),roughness:.5,metalness:0},o));
function box(w,h,d,mat,r=.012,seg=3){const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,seg,Math.min(r,w/2-.001,h/2-.001,d/2-.001)),mat);m.castShadow=m.receiveShadow=true;return m}
function cyl(rt,rb,h,mat,seg=32){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);m.castShadow=m.receiveShadow=true;return m}
function sph(r,mat,ws=32,hs=20){const m=new THREE.Mesh(new THREE.SphereGeometry(r,ws,hs),mat);m.castShadow=m.receiveShadow=true;return m}
function at(o,x,y,z){o.position.set(x,y,z);return o}
function grp(...kids){const g=new THREE.Group();kids.forEach(k=>g.add(k));return g}

/* ================= the room ================= */
const RW=7.8,RD=4.4,RH=2.6,BZ=-RD/2;/* width, depth, wall height, z of the back wall */

function buildRoom(d,mats){
  const R=d.room,S=new THREE.Group(),clickables=[];
  const wallMat=std(d.wall,{roughness:.92,map:noiseTex(d.wall,.05,512,[5,3],11)});
  const trim=std('#F4F1EA',{roughness:.45});
  const night=d.view==='night'||d.view==='space';

  /* floor */
  const fl=d.floor;let floorMat;
  if(fl==='carpet')floorMat=std(d.floorC[0],{roughness:.97,map:noiseTex(d.floorC[0],.28,512,[6,4],5),bumpMap:noiseTex('#808080',.5,512,[6,4],6),bumpScale:.8});
  else if(fl==='turf')floorMat=std(d.floorC[0],{roughness:.9,map:noiseTex(d.floorC[0],.4,512,[8,5],9),bumpMap:noiseTex('#808080',.8,512,[8,5],8),bumpScale:1.2});
  else{const t=woodTex(d.floorC[0],9,4);t.repeat.set(RW/2.4,RD/2.4);t.wrapS=t.wrapT=THREE.RepeatWrapping;floorMat=phys(d.floorC[0],{map:t,roughness:.38,clearcoat:.35,clearcoatRoughness:.35,envMapIntensity:.9})}
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(RW,RD),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;S.add(floor);

  /* back wall with a window opening */
  const wx0=1.02,wx1=1.88,wy0=.86,wy1=1.96,t=.14;
  const wb=(x0,x1,y0,y1)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,y1-y0,t),wallMat);m.position.set((x0+x1)/2,(y0+y1)/2,BZ-t/2);m.castShadow=m.receiveShadow=true;S.add(m)};
  wb(-RW/2,wx0,0,RH);wb(wx1,RW/2,0,RH);wb(wx0,wx1,0,wy0);wb(wx0,wx1,wy1,RH);
  /* left wall */
  const lw=new THREE.Mesh(new THREE.BoxGeometry(t,RH,RD+t),wallMat);lw.position.set(-RW/2-t/2,RH/2,-t/2);lw.castShadow=lw.receiveShadow=true;S.add(lw);
  /* baseboards and crown */
  S.add(at(box(RW,.1,.025,trim,.006),0,.05,BZ+.0125),at(box(.025,.1,RD,trim,.006),-RW/2+.0125,.05,0),at(box(RW,.06,.03,trim,.006),0,RH-.03,BZ+.015));

  /* window: frame, cross bars, sill, view */
  const frame=std('#FFFFFF',{roughness:.35}),wcx=(wx0+wx1)/2,wcy=(wy0+wy1)/2,ww=wx1-wx0,wh=wy1-wy0;
  S.add(at(box(ww+.08,.05,.07,frame,.01),wcx,wy1+.02,BZ+.02),at(box(ww+.08,.05,.07,frame,.01),wcx,wy0-.02,BZ+.02),at(box(.05,wh,.07,frame,.01),wx0-.01,wcy,BZ+.02),at(box(.05,wh,.07,frame,.01),wx1+.01,wcy,BZ+.02),at(box(.025,wh,.04,frame,.006),wcx,wcy,BZ+.015),at(box(ww,.025,.04,frame,.006),wcx,wcy,BZ+.015),at(box(ww+.2,.04,.2,frame,.01),wcx,wy0-.05,BZ+.08));
  const viewTex={day:[[0,'#5FB0EE'],[1,'#CFEAFB']],sunset:[[0,'#4B3F8F'],[.55,'#F08A55'],[1,'#FFD98A']],night:[[0,'#070B26'],[1,'#26336B']],beach:[[0,'#5FB0EE'],[.62,'#CFEAFB'],[.64,'#2F9CC4'],[.78,'#2F9CC4'],[.8,'#F2E2B0'],[1,'#F2E2B0']],stadium:[[0,'#27346B'],[.6,'#7A8BB8'],[.62,'#2E8B4E'],[1,'#2E8B4E']],space:[[0,'#04061A'],[1,'#1B1654']]}[d.view]||[[0,'#5FB0EE'],[1,'#CFEAFB']];
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.9),new THREE.MeshBasicMaterial({map:gradTex(viewTex),toneMapped:false}));sky.position.set(wcx,wcy,BZ-1.2);S.add(sky);
  if(night||d.view==='space'){const g=new THREE.Group();const r=rnd(4);for(let i=0;i<70;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.012+r()*.012,6,6),new THREE.MeshBasicMaterial({color:'#fff',toneMapped:false}));s.position.set(wcx+(r()-.5)*1.5,wcy+(r()-.5)*1.1,BZ-1.15);g.add(s)}S.add(g);
    const moon=new THREE.Mesh(new THREE.SphereGeometry(.16,24,24),new THREE.MeshBasicMaterial({color:d.view==='space'?'#E5674A':'#FFF3C0',toneMapped:false}));moon.position.set(wcx+.3,wcy+.25,BZ-1.1);S.add(moon)}
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(ww,wh),new THREE.MeshPhysicalMaterial({color:'#fff',roughness:0,metalness:0,transmission:0,transparent:true,opacity:.1,envMapIntensity:1.4}));glass.position.set(wcx,wcy,BZ+.005);S.add(glass);

  /* curtains */
  const cur=(x)=>{const g=new THREE.PlaneGeometry(.42,1.4,36,2),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*38)*.035);g.computeVertexNormals();
    const m=new THREE.Mesh(g,phys(d.curtains,{roughness:.85,sheen:1,sheenColor:C(d.curtains).lerp(C('#fff'),.4),side:THREE.DoubleSide,map:weaveTex(d.curtains)}));m.castShadow=true;m.position.set(x,1.38,BZ+.1);return m};
  S.add(cur(wx0-.15),cur(wx1+.15),at(cyl(.014,.014,1.3,std('#8A8F96',{metalness:.8,roughness:.3})),wcx,2.12,BZ+.1));S.children[S.children.length-1].rotation.z=Math.PI/2;

  /* posters */
  d.posters.forEach((p,i)=>{if(!p.svg)return;const m=new THREE.Mesh(new THREE.PlaneGeometry(.44,.56),new THREE.MeshStandardMaterial({map:svgTex(p.svg,352,448),roughness:.5}));const x=[-1.26,-.74,-.22,.3][i];m.position.set(x,1.72,BZ+.032);m.receiveShadow=true;
    S.add(m,at(box(.47,.59,.02,std('#FFFFFF',{roughness:.4}),.004),x,1.72,BZ+.006))});

  /* wardrobe (tap = closet) */
  const wardrobe=grp();
  const wood=(c,seed)=>phys(c,{map:woodTex(c,5,seed),roughness:.45,clearcoat:.25});
  wardrobe.add(at(box(.95,2.05,.6,wood('#'+shade(d.door,.82).getHexString(),2),.02),0,1.025,0));
  [-.225,.225].forEach(x=>{wardrobe.add(at(box(.4,1.9,.03,wood(d.door,3),.015),x,1.04,.3),at(cyl(.014,.014,.2,std('#D9B25A',{metalness:1,roughness:.25}),12),x+(x<0?.15:-.15),1.0,.335))});
  wardrobe.position.set(-3.38,0,BZ+.32);S.add(wardrobe);clickables.push(wardrobe);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(.5,.13),new THREE.MeshStandardMaterial({map:canvasTex(256,64,(g,w,h)=>{g.fillStyle='#6B4423';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='800 34px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('CLOSET',w/2,h/2+2)}),roughness:.5}));sign.position.set(-3.38,2.2,BZ+.64);S.add(sign);

  /* bookshelf */
  const shelfW=wood(d.rack,8),bs=grp();
  bs.add(at(box(.04,1.55,.3,shelfW),-.33,.775,0),at(box(.04,1.55,.3,shelfW),.33,.775,0),at(box(.7,1.55,.02,shelfW),0,.775,-.14));
  for(let i=0;i<=4;i++)bs.add(at(box(.66,.03,.3,shelfW),0,.03+i*.38,0));
  const bc=['#C8102E','#F2B500','#2F7FD0','#3CB878','#8A4FD0','#FF7A00','#E9EEF3'],br=rnd(21);
  for(let s=0;s<2;s++){let x=-.3;for(let i=0;i<7;i++){const w=.025+br()*.03,h=.2+br()*.1;bs.add(at(box(w,h,.2,std(bc[(i+s*3)%7],{roughness:.6}),.003,2),x+w/2,.04+.38*(s+1)-.015+h/2-.015*0,0));x+=w+.012}}
  bs.position.set(-2.55,0,BZ+.2);S.add(bs);

  /* bed */
  const sheets=d.sheets,bed=grp(),fm=wood(d.bedframe,12);
  bed.add(at(box(1.78,.28,2.05,fm,.03),0,.28,.12));
  bed.add(at(box(1.8,1.25,.08,fm,.03),0,.78,-.9),at(box(1.8,.55,.08,fm,.03),0,.48,1.14));
  const matr=phys('#F4F1EA',{roughness:.8,sheen:.6});bed.add(at(box(1.66,.2,1.95,matr,.07,5),0,.52,.14));
  const sheetT=weaveTex(sheets),sheetM=phys(sheets,{roughness:.78,sheen:1,sheenRoughness:.5,sheenColor:C(sheets).lerp(C('#fff'),.35),map:sheetT});
  const dv=box(1.72,.12,1.45,sheetM,.06,6);dv.position.set(0,.66,.38);bed.add(dv);
  const fold=box(1.72,.15,.34,sheetM,.07,6);fold.position.set(0,.68,-.28);fold.material=phys('#'+shade(sheets,1.12).getHexString(),{roughness:.8,sheen:1,map:sheetT});bed.add(fold);
  const pc=d.pillow;[-.42,.42].forEach(x=>{const p=box(.66,.16,.42,phys(pc,{roughness:.85,sheen:1,sheenColor:C('#fff'),map:weaveTex(pc)}),.075,6);p.position.set(x,.76,-.66);p.rotation.x=-.18;bed.add(p)});
  bed.position.set(.0,0,BZ+1.1);S.add(bed);

  /* rug */
  const rug=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.018,64),std(d.rug,{roughness:1,map:noiseTex(d.rug,.35,256,[3,3],14),bumpMap:noiseTex('#808080',.8,256,[3,3],15),bumpScale:1.5}));rug.scale.z=.56;rug.position.set(0,.01,.15);rug.receiveShadow=true;S.add(rug);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.8,.012,8,64),std('#F4F7FA',{roughness:.9}));ring.rotation.x=Math.PI/2;ring.scale.y=.56;ring.position.set(0,.022,.15);S.add(ring);

  /* dresser + globe */
  const dr=grp(),dm=wood(d.dresser,17);
  dr.add(at(box(.88,.62,.46,dm,.015),0,.31+.04,0));dr.add(at(box(.94,.035,.5,dm,.012),0,.68,0));
  for(let i=0;i<3;i++){dr.add(at(box(.78,.16,.012,wood(d.dresser,18+i),.008),0,.14+i*.19+.04,.235),at(sph(.016,std('#D9B25A',{metalness:1,roughness:.25}),12,8),-.0,.14+i*.19+.04,.25),);}
  [[-.38,-.2],[.38,-.2],[-.38,.2],[.38,.2]].forEach(([x,z])=>dr.add(at(cyl(.025,.018,.05,wood('#'+shade(d.dresser,.7).getHexString(),19),12),x,.025,z)));
  if(d.globe){const gc=d.globe,sea=gc==='gold'?'#D9B77A':gc==='glow'?'#12306B':'#3E86D6',land=gc==='gold'?'#8A5A33':gc==='glow'?'#2FD0C5':'#6DBF5B';
    const gm=canvasTex(512,256,(g,w,h)=>{g.fillStyle=sea;g.fillRect(0,0,w,h);g.fillStyle=land;const r=rnd(9);for(let i=0;i<14;i++){g.beginPath();g.ellipse(r()*w,40+r()*(h-80),20+r()*40,12+r()*22,r()*3,0,6.3);g.fill()}});
    const gl=sph(.13,phys('#fff',{map:gm,roughness:.3,clearcoat:1,emissive:gc==='glow'?C('#2FD0C5'):C('#000'),emissiveIntensity:gc==='glow'?.35:0}),40,28);gl.position.y=.9;gl.rotation.z=.4;dr.add(gl,at(cyl(.012,.012,.1,std('#B9854F',{metalness:.6,roughness:.4}),10),0,.74,0),at(cyl(.07,.08,.02,std('#555',{metalness:.7,roughness:.35}),24),0,.7,0))}
  dr.position.set(1.45,0,BZ+.27);S.add(dr);

  /* desk + lamp + items */
  const desk=grp(),dk=wood(d.desk,23);
  desk.add(at(box(1.05,.045,.58,dk,.015),0,.7,0));
  [[-.5,-.26],[-.5,.26]].forEach(([x,z])=>desk.add(at(box(.045,.68,.045,dk,.01),x,.34,z)));
  desk.add(at(box(.34,.68,.54,dk,.015),.36,.34,0));
  for(let i=0;i<3;i++)desk.add(at(box(.28,.16,.012,wood(d.desk,24+i),.008),.36,.12+i*.2,.275),at(box(.1,.014,.014,std('#D9B25A',{metalness:1,roughness:.25}),.004),.36,.14+i*.2,.285));
  desk.position.set(2.82,0,BZ+.33);S.add(desk);
  const lampC=d.lamp,ly=.725;const lamp=grp(at(cyl(.07,.08,.02,std('#222B33',{metalness:.5}),20),0,0,0),at(cyl(.012,.012,.3,std('#222B33',{metalness:.5}),8),0,.15,0));
  const shadeM=new THREE.Mesh(new THREE.ConeGeometry(.12,.14,24,1,true),phys(lampC,{roughness:.5,side:THREE.DoubleSide,emissive:C(lampC),emissiveIntensity:.35}));shadeM.position.y=.34;shadeM.castShadow=true;lamp.add(shadeM);
  const bulb=sph(.03,new THREE.MeshBasicMaterial({color:'#FFE9B0'}),12,10);bulb.position.y=.31;lamp.add(bulb);
  lamp.position.set(2.5,ly,BZ+.3);S.add(lamp);
  const lampLight=new THREE.PointLight('#FFD79A',night?5:1.4,3.2,2);lampLight.position.set(2.5,ly+.3,BZ+.38);lampLight.castShadow=false;S.add(lampLight);
  /* things on the desk */
  const dA=d.deskA,ax=2.82-.3;
  if(dA==='books'){const cs=['#C8102E','#2F7FD0','#F2B500'];cs.forEach((c,i)=>{const b=box(.2-i*.015,.035,.15,std(c,{roughness:.55}),.004,2);b.position.set(ax+.02,.7225+.0175+i*.035,BZ+.3);b.rotation.y=(i-1)*.15;S.add(b)})}
  else if(dA==='pencils'){S.add(at(cyl(.04,.035,.1,std('#FFB400'),20),ax,.77,BZ+.3));['#C8102E','#2F7FD0','#3CB878'].forEach((c,i)=>{const p=cyl(.006,.006,.16,std(c),6);p.position.set(ax+(i-1)*.018,.86,BZ+.3);p.rotation.z=(i-1)*.18;S.add(p)})}
  else if(dA==='helmet'){const h=sph(.07,phys('#D7A22A',{metalness:.4,roughness:.25,clearcoat:1}),24,16);h.scale.set(1.1,.95,1.2);h.position.set(ax,.8,BZ+.3);S.add(h)}
  else if(dA==='clock'){S.add(at(cyl(.07,.07,.03,phys('#F4F7FA',{roughness:.3}),32),ax,.8,BZ+.3));S.children[S.children.length-1].rotation.x=Math.PI/2}
  else if(dA==='plant'){S.add(at(cyl(.05,.04,.08,std('#C86B3C',{roughness:.8}),20),ax,.765,BZ+.3),at(sph(.05,std('#3CB878',{roughness:.7}),16,12),ax,.84,BZ+.3))}
  const dB=d.deskB,bx=2.82+.3;
  if(dB==='dino'){S.add(at(sph(.06,phys('#3CB878',{roughness:.45}),20,14),bx,.8,BZ+.3),at(sph(.035,phys('#3CB878',{roughness:.45}),16,12),bx+.07,.86,BZ+.3))}
  else if(dB==='rocket'){S.add(at(cyl(.035,.04,.2,phys('#F4F7FA',{metalness:.3,roughness:.25}),24),bx,.83,BZ+.3),at(new THREE.Mesh(new THREE.ConeGeometry(.035,.07,24),std('#C8102E')),bx,.965,BZ+.3))}
  else if(dB==='tee'){const f=sph(.06,phys('#9A5B33',{roughness:.5}),24,16);f.scale.set(1.5,1,1);f.position.set(bx,.82,BZ+.3);S.add(f)}
  else if(dB==='trophy'){S.add(at(cyl(.055,.04,.1,phys('#E8B923',{metalness:1,roughness:.18}),24),bx,.81,BZ+.3),at(cyl(.02,.02,.06,phys('#E8B923',{metalness:1,roughness:.18}),12),bx,.74,BZ+.3),at(box(.1,.03,.1,std('#2A3138'),.005),bx,.73,BZ+.3))}
  else if(dB==='cube'){S.add(at(box(.1,.1,.1,phys('#2F7FD0',{roughness:.3,clearcoat:.8}),.012),bx,.775,BZ+.3))}
  if(d.shelf){S.add(at(box(.9,.03,.18,wood(d.rack,30)),2.82,1.5,BZ+.09));[-.25,.0,.25].forEach((x,i)=>S.add(at(cyl(.035,.04,.14,phys('#E8B923',{metalness:1,roughness:.2}),20),2.82+x,1.595,BZ+.1)))}

  /* laundry bin, backpack, bean bag, telescope, hoop, string lights, hook rack */
  const lb=cyl(.22,.19,.5,std(d.laundry,{roughness:.8,map:weaveTex(d.laundry)}),32);lb.position.set(-2.2,.25,BZ+.4);S.add(lb);
  S.add(at(cyl(.225,.225,.025,std('#'+shade(d.laundry,.85).getHexString()),32),-2.2,.51,BZ+.4));
  S.add(at(box(.5,.045,.1,wood(d.rack,31)),-1.88,1.36,BZ+.07));
  if(d.pack){const pk=box(.26,.38,.12,phys(d.pack,{roughness:.55,sheen:.4}),.04,4);pk.position.set(-1.88,1.1,BZ+.14);S.add(pk);
  S.add(at(box(.18,.1,.04,std('#'+shade(d.pack,.8).getHexString()),.015),-1.88,1.05,BZ+.215))}
  if(d.beanbag){const bb=sph(.5,phys(d.beanbag,{roughness:.9,sheen:1,sheenColor:C('#fff')}),40,24);bb.scale.set(1,.7,1);bb.position.set(-2.9,.33,.8);bb.castShadow=true;S.add(bb)}
  if(d.telescope){const tg=grp(at(cyl(.015,.015,.8,std('#222'),8),0,.4,0));tg.children[0].rotation.z=.18;const tube=cyl(.045,.045,.6,phys(d.telescope==='brass'?'#C9A227':d.telescope==='black'?'#2A3138':'#E9EEF3',{metalness:.8,roughness:.25}),28);tube.position.set(0,.95,0);tube.rotation.z=.9;tg.add(tube);tg.position.set(.7,0,BZ+.62);S.add(tg)}
  if(d.hoop){const hc=d.hoop==='blue'?'#2F7FD0':'#C8102E';const hg=grp(at(box(.5,.34,.02,phys('#fff',{roughness:.3}),.01),0,0,0),at(new THREE.Mesh(new THREE.TorusGeometry(.12,.01,8,28),std(hc,{roughness:.4})),0,-.2,.12));hg.children[1].rotation.x=Math.PI/2;hg.rotation.y=Math.PI/2;hg.position.set(-RW/2+.02,1.65,-.5);S.add(hg)}
  if(d.lights){const pal=d.lights==='warm'?['#FFF3B0','#FFE08A']:d.lights==='tealgold'?['#2FD0C5','#E8B923']:['#FFD84D','#FF7A00','#2FD0C5','#FFF3B0'];
    for(let i=0;i<19;i++){const x=-3.7+i*.41,y=2.42-Math.sin(i%3/3*Math.PI)*.08;const b=sph(.035,new THREE.MeshBasicMaterial({color:pal[i%pal.length]}),10,8);b.position.set(x,y,BZ+.04);S.add(b);if(i%3===0){const l=new THREE.PointLight(pal[i%pal.length],.35,1.6,2);l.position.set(x,y-.05,BZ+.3);S.add(l)}}}
  return{group:S,clickables,lamp:lampLight,night};
}

/* ================= Emmett ================= */
function buildAvatar(a,pal){
  const G=new THREE.Group(),skin=pal.SKIN[a.skin]||pal.SKIN[2],hairC=pal.HAIR[a.hair]||pal.HAIR[1],shirt=a.topColor||pal.OUTFIT[a.outfit]||pal.OUTFIT[0],shoe=pal.OUTFIT[a.bandc]||pal.OUTFIT[2];
  const skinM=phys(skin,{roughness:.55,sheen:.6,sheenColor:C(skin).lerp(C('#ff9a80'),.5),sheenRoughness:.4,clearcoat:.05});
  const shirtM=phys(shirt,{roughness:.8,sheen:1,sheenRoughness:.6,sheenColor:C(shirt).lerp(C('#fff'),.35),map:weaveTex(shirt)});
  const pants=phys('#2A4778',{roughness:.82,sheen:.5,map:weaveTex('#2A4778')});
  const body=new THREE.Group();G.add(body);
  const legL=cyl(.07,.06,.62,pants,16),legR=legL.clone();legL.position.set(-.075,.46,0);legR.position.set(.075,.46,0);body.add(legL,legR);
  [-.075,.075].forEach(x=>{const s=box(.11,.07,.2,phys('#fff',{roughness:.4,clearcoat:.4}),.03,4);s.position.set(x,.04,.03);body.add(s);const st=box(.112,.02,.205,std(shoe,{roughness:.5}),.01,3);st.position.set(x,.075,.03);body.add(st)});
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.125,.3,8,20),shirtM);torso.scale.set(1.12,1,.72);torso.position.y=1.0;torso.castShadow=true;body.add(torso);
  const armGeo=new THREE.CapsuleGeometry(.048,.34,6,12),armL=new THREE.Mesh(armGeo,shirtM),armR=armL.clone();armL.position.set(-.18,.98,0);armR.position.set(.18,.98,0);armL.rotation.z=.12;armR.rotation.z=-.12;armL.castShadow=armR.castShadow=true;body.add(armL,armR);
  [-1,1].forEach(s=>{const h=sph(.04,skinM,14,10);h.position.set(s*.205,.76,0);body.add(h)});
  body.add(at(cyl(.045,.05,.08,skinM,16),0,1.27,0));
  /* head */
  const head=new THREE.Group();head.position.y=1.43;body.add(head);
  head.scale.setScalar(1.16);const sk=sph(.15,skinM,40,28);sk.scale.set(1,1.08,1.02);head.add(sk);
  [-1,1].forEach(s=>{const e=sph(.032,skinM,12,10);e.scale.set(.6,1,.8);e.position.set(s*.148,-.005,-.005);head.add(e)});
  const eyeW=std('#fff',{roughness:.2}),eyeD=std('#1A1410',{roughness:.12}),face=grp();
  [-1,1].forEach(s=>{const w=sph(.026,eyeW,14,10);w.scale.set(1,1.1,.5);w.position.set(s*.055,.015,.14);const p=sph(.0155,eyeD,12,10);p.position.set(s*.055,.012,.158);const hl=sph(.0045,new THREE.MeshBasicMaterial({color:'#fff'}),6,6);hl.position.set(s*.055+.005,.02,.171);
    const br=box(.05,.011,.014,std(hairC,{roughness:.6}),.004,2);br.position.set(s*.055,.056,.148);br.rotation.z=-s*.1;face.add(w,p,hl,br)});
  face.add(at(sph(.016,skinM,10,8),0,-.018,.158));
  const mouth=new THREE.Mesh(new THREE.TorusGeometry(.04,.006,8,20,Math.PI),std('#8A3A2A',{roughness:.4}));mouth.rotation.z=Math.PI;mouth.position.set(0,-.052,.145);face.add(mouth);
  [-1,1].forEach(s=>{const ch=sph(.022,std('#E88A7A',{roughness:.8,transparent:true,opacity:.35}),10,8);ch.scale.set(1,.7,.3);ch.position.set(s*.085,-.04,.14);face.add(ch)});
  head.add(face);
  /* hair */
  const hm=phys(hairC,{roughness:.7,sheen:.25,sheenColor:C(hairC).lerp(C('#fff'),.15)}),st=a.style||'waves';
  const cap=(r,sc,ph)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,36,24,0,Math.PI*2,0,ph),hm);m.scale.set(sc[0],sc[1],sc[2]);m.castShadow=true;return m};
  if(st==='afro'){const m=sph(.21,hm,36,24);m.position.set(0,.045,-.025);head.add(m)}
  else if(st==='curly'){const r=rnd(6);for(let i=0;i<46;i++){const th=Math.acos(r()*.9+.1),ph=r()*Math.PI*2,R=.158;const m=sph(.038,hm,10,8);m.position.set(R*Math.sin(th)*Math.cos(ph),R*Math.cos(th)*1.05+.01,R*Math.sin(th)*Math.sin(ph)-.005);if(m.position.z>.09&&m.position.y<.1)continue;head.add(m)}}
  else if(st==='twists'){const r=rnd(8);for(let i=0;i<22;i++){const ph=r()*Math.PI*2,th=.25+r()*.9;const t=cyl(.017,.012,.1+r()*.05,hm,8);t.position.set(.16*Math.sin(th)*Math.cos(ph),.16*Math.cos(th)+.03,.16*Math.sin(th)*Math.sin(ph));if(t.position.z>.08&&t.position.y<.12)continue;t.lookAt(t.position.x*3,t.position.y*3+.2,t.position.z*3);t.rotateX(Math.PI/2);head.add(t)}head.add(at(cap(.162,[1,1.06,1.03],1.25),0,.005,-.002))}
  else if(st==='buzz'||st==='fade'){head.add(at(cap(.1565,[1,1.085,1.03],st==='buzz'?1.02:1.1),0,0,-.004))}
  else{const h1=cap(.162,[1,1.1,1.05],1.28);h1.position.set(0,.01,-.012);head.add(h1);[-.07,0,.07].forEach((x,i)=>{const w=sph(.05,hm,12,10);w.scale.set(1.1,.7,.8);w.position.set(x,.13-Math.abs(x)*.3,.075);head.add(w)})}
  G.userData={head,armL,armR,body,torso};
  return G;
}

/* ================= the viewer ================= */
export function createRoom3D(host0,opts){
  let host=host0;
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:false})}catch(e){return null}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=THREE.SRGBColorSpace;
  const canvas=renderer.domElement;canvas.className='r3d';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',"Emmett's bedroom in 3D. Tap the closet or Emmett to change your look.");
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(36,1.6,.1,40);
  const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;
  const hemi=new THREE.HemisphereLight('#DDEBFF','#B89A78',.28);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#FFE7BF',2.6);sun.position.set(2.4,3.4,-6);sun.target.position.set(.6,.3,0.4);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-4.5,right:4.5,top:4,bottom:-3,near:1,far:16});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;sun.shadow.radius=5;
  scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#BFD6FF',.7);fill.position.set(-2,3,5);scene.add(fill);
  const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,samples:4}));
  composer.addPass(new RenderPass(scene,cam));
  const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.18,.6,.92);composer.addPass(bloom);composer.addPass(new OutputPass());
  let built=null,av=null,orbit={yaw:0,pitch:0,ty:0,tp:0},t0=performance.now(),running=false,key='',last=0,raf=0,drag=null;
  const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();

  function size(){
    const w=host.clientWidth||600,h=Math.round(w*.58);
    renderer.setSize(w,h,false);canvas.style.width='100%';canvas.style.height='100%';
    composer.setSize(w,h);bloom.resolution.set(w/2,h/2);cam.aspect=w/h;cam.updateProjectionMatrix();
  }
  function frame(){
    const t=(performance.now()-t0)/1000;
    orbit.yaw+=(orbit.ty-orbit.yaw)*.08;orbit.pitch+=(orbit.tp-orbit.pitch)*.08;
    const sway=Math.sin(t*.3)*.012+orbit.yaw,dist=5.7;
    cam.position.set(Math.sin(sway*3)*dist*.9+.2,1.45+orbit.pitch*2.2,Math.cos(sway*3)*dist);
    cam.lookAt(-.1,.95+orbit.pitch*.4,-.3);
    if(av){const u=av.userData;u.torso.scale.y=1+Math.sin(t*1.9)*.012;u.head.rotation.y=Math.sin(t*.55)*.22;u.head.rotation.x=Math.sin(t*.4)*.03;u.armL.rotation.z=.12+Math.sin(t*1.9)*.015;u.armR.rotation.z=-.12-Math.sin(t*1.9)*.015}
    composer.render();
  }
  function loop(){if(!running)return;raf=requestAnimationFrame(loop);const n=performance.now();if(n-last<30)return;last=n;if(!canvas.isConnected||document.hidden)return;frame()}
  function start(){if(running)return;running=true;loop()}
  function stop(){running=false;cancelAnimationFrame(raf)}

  function update(d){
    const k=JSON.stringify(d.keyData);if(k===key)return;key=k;
    if(built){scene.remove(built.group);built.group.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
    if(av)scene.remove(av);
    built=buildRoom(d,{});scene.add(built.group);
    av=buildAvatar(d.avatar,d.pal);av.position.set(-1.0,0,1.0);av.rotation.y=.35;av.scale.setScalar(.92);scene.add(av);
    const night=built.night;
    scene.environmentIntensity=night?.2:.42;hemi.intensity=night?.1:.28;sun.intensity=night?.6:2.6;sun.color.set(night?'#7FA2FF':d.view==='sunset'?'#FF9A5A':'#FFE7BF');fill.intensity=night?.25:.7;renderer.toneMappingExposure=night?1.2:.92;bloom.strength=night?.55:.22;
    scene.background=C(night?'#06091C':'#0B1626');
    d.posters.forEach(p=>{});
    frame();
  }
  function resize(){size();frame()}
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>6)drag.moved=true;if(drag.moved){orbit.ty=Math.max(-.2,Math.min(.2,orbit.ty+dx/1400));orbit.tp=Math.max(-.08,Math.min(.14,orbit.tp-dy/2400));drag.x=e.clientX;drag.y=e.clientY}});
  canvas.addEventListener('pointerup',e=>{
    const was=drag;drag=null;if(!was||was.moved){orbit.ty*=1;return}
    const r=canvas.getBoundingClientRect();ptr.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ptr,cam);
    const targets=[...(built?built.clickables:[]),av].filter(Boolean);
    if(ray.intersectObjects(targets,true).length&&opts.onTap)opts.onTap('closet');
  });
  canvas.addEventListener('pointerleave',()=>{orbit.ty*=.0;orbit.tp=0});
  size();
  return{canvas,update,resize,start,stop,setHost(h){host=h},dispose(){stop();renderer.dispose()}};
}

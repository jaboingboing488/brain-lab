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
function svgTex(svg,w,h,bg){
  const c=document.createElement('canvas');c.width=w;c.height=h;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  const im=new Image();im.onload=()=>{const g=c.getContext('2d');if(bg){g.fillStyle=bg;g.fillRect(0,0,w,h)}g.drawImage(im,0,0,w,h);t.needsUpdate=true};im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  return t;
}
/* project a flat drawing onto a head-sized shape as seen from the front (art units: head centre 60,58; 0.005 per unit) */
function planarUV(geo,vb){const p=geo.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){let u=(60+p.getX(i)/.005-vb[0])/vb[2],v=1-(58-p.getY(i)/.005-vb[1])/vb[3];if(p.getZ(i)<-.01){u=v=-2}uv[i*2]=u;uv[i*2+1]=v}geo.setAttribute('uv',new THREE.BufferAttribute(uv,2))}
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



/* ----- patterns for sheets, pillows, rugs, curtains, bin and bean bag (same designs as the flat room) ----- */
function patTex(id,base,rep){
  const K={stars:'stars',star:'star',field:'field',dino:'dino',camo:'camo',bricks:'bricks',brick:'bricks',plate:'bricks',jungle:'jungle',ninja:'ninja',stripe:'stripe',striped:'hbands',stripes:'rings',ball:'ball',palm:'palm',space:'space',compass:'compass',track:'track',dojo:'dojo',turtle:'turtle'}[id];
  if(!K)return null;
  return canvasTex(512,512,(g,w,h)=>{
    const r=rnd(11),bc=C(base),dk='#'+shade(base,.55).getHexString(),lt='#'+shade(base,1.35).getHexString();
    g.fillStyle='#'+bc.getHexString();g.fillRect(0,0,w,h);
    const star=(x,y,R,c)=>{g.fillStyle=c;g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?R*.42:R;g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.closePath();g.fill()};
    if(K==='stars'||K==='space'){for(let i=0;i<(K==='space'?60:34);i++)star(r()*w,r()*h,K==='space'?3+r()*5:8+r()*12,'rgba(255,255,255,.9)');
      if(K==='space')[['#E8CB86',90,110,34],['#4DA3FF',380,150,22],['#E5674A',250,330,28],['#F2B705',130,400,40]].forEach(([c,x,y,R])=>{g.fillStyle=c;g.beginPath();g.arc(x,y,R,0,6.3);g.fill()})}
    else if(K==='star'){for(let i=0;i<8;i++)star(64+(i%3)*190+(i>>1&1)*30,70+Math.floor(i/3)*170,34,'#E5A400')}
    else if(K==='field'){for(let i=0;i<8;i++){g.fillStyle=i%2?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)';g.fillRect(0,i*64,w,64)}g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=5;for(let i=1;i<8;i++){g.beginPath();g.moveTo(0,i*64);g.lineTo(w,i*64);g.stroke()}g.fillStyle='rgba(255,255,255,.75)';g.font='800 40px system-ui';g.textAlign='center';[1,2,3,4,3,2,1].forEach((n,i)=>{g.fillText(n+'0',90,(i+1)*64+14);g.fillText(n+'0',w-90,(i+1)*64+14)})}
    else if(K==='dino'){g.fillStyle=lt;for(let i=0;i<9;i++){const x=70+(i%3)*190+(Math.floor(i/3)%2)*60,y=70+Math.floor(i/3)*170;g.beginPath();g.ellipse(x,y+14,22,16,0,0,6.3);g.fill();[-24,0,24].forEach(dx=>{g.beginPath();g.ellipse(x+dx,y-16,8,13,dx/60,0,6.3);g.fill()})}}
    else if(K==='camo'){[[dk,.9],['#B3A272',.5],['#4A3A22',.35]].forEach(([c,a])=>{g.fillStyle=c;for(let i=0;i<14;i++){g.beginPath();g.ellipse(r()*w,r()*h,30+r()*50,18+r()*30,r()*3,0,6.3);g.fill()}})}
    else if(K==='bricks'){for(let i=0;i<8;i++)for(let j=0;j<8;j++){const x=32+i*64,y=32+j*64;g.fillStyle=lt;g.beginPath();g.arc(x,y,20,0,6.3);g.fill();g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=3;g.stroke()}}
    else if(K==='jungle'){g.fillStyle=dk;for(let i=0;i<16;i++){const x=(i%4)*140+40+(Math.floor(i/4)%2)*60,y=Math.floor(i/4)*130+60;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+40,y-70,x+80,y);g.quadraticCurveTo(x+40,y+30,x,y);g.fill()}}
    else if(K==='ninja'){g.fillStyle='#47505A';for(let i=0;i<9;i++){const x=70+(i%3)*190,y=90+Math.floor(i/3)*150,R=26;g.beginPath();for(let k=0;k<8;k++){const a=k*Math.PI/4,q=k%2?R*.4:R;g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.closePath();g.fill()}g.fillStyle='#3CB878';g.fillRect(0,h-40,w,14)}
    else if(K==='stripe'){g.fillStyle=dk;for(let i=0;i<w;i+=64)g.fillRect(i+20,0,24,h)}
    else if(K==='hbands'){g.fillStyle=dk;[.2,.5,.8].forEach(f=>g.fillRect(0,f*h-32,w,64))}
    else if(K==='rings'){g.fillStyle='#232B33';g.beginPath();g.arc(256,256,210,0,6.3);g.fill();g.fillStyle=bc.getStyle();g.beginPath();g.arc(256,256,160,0,6.3);g.fill();g.fillStyle='#232B33';g.beginPath();g.arc(256,256,110,0,6.3);g.fill()}
    else if(K==='ball'){g.fillStyle='#fff';g.fillRect(w/2-9,40,18,h-80);for(let i=0;i<9;i++)g.fillRect(w/2-44,70+i*45,88,12);g.fillStyle=lt;g.fillRect(0,h*.2,w,10);g.fillRect(0,h*.8,w,10)}
    else if(K==='palm'){for(let i=0;i<3;i++){const x=90+i*170,y=300+(i%2)*60;g.strokeStyle='#8A5A33';g.lineWidth=14;g.beginPath();g.moveTo(x,y+150);g.quadraticCurveTo(x+16,y+60,x,y);g.stroke();g.strokeStyle='#2E8B4E';g.lineWidth=12;g.lineCap='round';[-1,-.5,0,.5,1].forEach(k=>{g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+k*60,y-50,x+k*90,y+20);g.stroke()})}}
    else if(K==='compass'){g.strokeStyle='#8A6A12';g.lineWidth=6;g.beginPath();g.arc(256,256,190,0,6.3);g.stroke();g.beginPath();g.arc(256,256,150,0,6.3);g.stroke();g.fillStyle='#C8102E';g.beginPath();g.moveTo(256,50);g.lineTo(290,256);g.lineTo(222,256);g.fill();g.fillStyle='#8A6A12';g.beginPath();g.moveTo(256,462);g.lineTo(290,256);g.lineTo(222,256);g.fill();g.beginPath();g.moveTo(50,256);g.lineTo(256,222);g.lineTo(256,290);g.fill();g.beginPath();g.moveTo(462,256);g.lineTo(256,222);g.lineTo(256,290);g.fill();g.fillStyle='#fff';g.font='800 44px system-ui';g.textAlign='center';g.fillText('N',256,44)}
    else if(K==='track'){g.fillStyle='#2E8B4E';g.beginPath();g.ellipse(256,256,170,110,0,0,6.3);g.fill();g.strokeStyle='#FFD84D';g.lineWidth=6;g.setLineDash([26,20]);g.beginPath();g.ellipse(256,256,215,145,0,0,6.3);g.stroke()}
    else if(K==='dojo'){g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=4;for(let i=1;i<5;i++){g.beginPath();g.moveTo(i*102,0);g.lineTo(i*102,h);g.stroke()}g.beginPath();g.moveTo(0,256);g.lineTo(w,256);g.stroke();g.fillStyle='#C8102E';g.beginPath();g.arc(256,256,40,0,6.3);g.fill()}
    else if(K==='turtle'){g.strokeStyle=dk;g.lineWidth=7;for(let i=0;i<5;i++)for(let j=0;j<4;j++){const x=i*112+(j%2)*56,y=j*128+64;g.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;g.lineTo(x+Math.cos(a)*52,y+Math.sin(a)*52)}g.closePath();g.stroke()}}
  },{repeat:rep});
}



/* pillows are shaped, like the flat room: dino, football, star, turtle shell, brick */
function pillowShape(id,pc){
  const g=new THREE.Group(),fab=(c,o={})=>phys(c,Object.assign({roughness:.85,sheen:1,sheenColor:C('#fff')},o)),dk=std('#0B2233',{roughness:.3});
  if(id==='ball'){const f=football(.66);f.scale.set(1,.85,1.45);f.position.y=.1;g.add(f)}
  else if(id==='star'){const sh=new THREE.Shape();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?.12:.3;(i?sh.lineTo:sh.moveTo).call(sh,Math.cos(a)*q,Math.sin(a)*q)}sh.closePath();
    const ge=new THREE.ExtrudeGeometry(sh,{depth:.06,bevelEnabled:true,bevelThickness:.05,bevelSize:.04,bevelSegments:4,curveSegments:6});ge.rotateX(-Math.PI/2);const m=new THREE.Mesh(ge,fab('#FFD84D',{roughness:.6}));m.position.y=.04;m.castShadow=true;g.add(m)}
  else if(id==='dino'){const gr='#3CB878';g.add(box(.66,.17,.42,fab(gr),.075,6));[-.2,0,.2].forEach(x=>{const c=new THREE.Mesh(new THREE.ConeGeometry(.04,.09,12),fab('#2A9560'));c.position.set(x,.2,-.17);c.castShadow=true;g.add(c)});
    [-.1,.1].forEach(x=>g.add(at(sph(.022,dk,10,8),x,.1,.04)));const sm=new THREE.Mesh(new THREE.TorusGeometry(.08,.008,6,16,Math.PI),dk);sm.rotation.x=Math.PI/2;sm.rotation.z=Math.PI;sm.position.set(0,.088,.1);g.add(sm)}
  else if(id==='turtle'){const sh=sph(1,fab('#3CB878',{map:patTex('turtle','#3CB878')}),32,20);sh.scale.set(.33,.12,.22);sh.position.y=.1;g.add(sh);g.add(at(sph(.07,fab('#7BD389'),14,10),.36,.1,0));[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]].forEach(([x,z])=>g.add(at(sph(.05,fab('#7BD389'),10,8),x,.06,z)))}
  else if(id==='brick'){g.add(box(.66,.17,.42,fab('#C8102E',{roughness:.45,sheen:.3}),.025,4));[-.2,.2].forEach(x=>[-.1,.1].forEach(z=>g.add(at(cyl(.06,.06,.04,fab('#C8102E',{roughness:.45}),20),x,.2,z))))}
  else g.add(box(.66,.16,.42,fab(pc,{map:weaveTex(pc)}),.075,6));
  return g}

/* ----- shared prize models ----- */
function football(len){const r=len/2,g=new THREE.Group(),leather=phys('#9A5B33',{roughness:.5,clearcoat:.25,map:noiseTex('#9A5B33',.18,128,[2,2],2)}),white=std('#ffffff',{roughness:.6});
  const b=sph(1,leather,36,24);b.scale.set(r,r*.6,r*.6);g.add(b);
  [-1,1].forEach(k=>{const t=new THREE.Mesh(new THREE.TorusGeometry(r*.6*.83*1.01,r*.035,8,32),white);t.rotation.y=Math.PI/2;t.position.x=k*r*.56;g.add(t)});
  g.add(at(box(r*.5,r*.03,r*.07,white,.003,2),0,r*.6,0));for(let i=-2;i<=2;i++)g.add(at(box(r*.025,r*.03,r*.2,white,.002,2),i*r*.1,r*.6,0));
  return g}
function cone(){const g=new THREE.Group(),o=phys('#FF7A00',{roughness:.45,clearcoat:.3});
  g.add(at(box(.24,.025,.24,o,.008,2),0,.0125,0));
  const c=new THREE.Mesh(new THREE.ConeGeometry(.09,.3,32),o);c.position.y=.175;c.castShadow=true;g.add(c);
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.0455,.0615,.055,32,1,true),std('#ffffff',{roughness:.5,side:THREE.DoubleSide})),0,.15,0));return g}
function trainer(){const g=new THREE.Group(),up=phys('#F4F7FA',{roughness:.45,clearcoat:.2}),red=std('#C8102E',{roughness:.5});
  g.add(at(box(.29,.035,.11,std('#0A7E8C',{roughness:.5}),.012,3),0,.0175,0),at(box(.1,.09,.09,up,.03,4),-.085,.08,0),at(box(.13,.06,.095,up,.025,4),.02,.065,0));
  const toe=sph(.05,up,16,12);toe.scale.set(1.5,.7,1.0);toe.position.set(.1,.06,0);g.add(toe);
  const tg=box(.05,.07,.07,up,.02,3);tg.position.set(-.01,.105,0);tg.rotation.z=-.3;g.add(tg);
  [-1,1].forEach(k=>{const sw=box(.11,.012,.004,red,.002,2);sw.position.set(.0,.065,k*.049);sw.rotation.z=.3;g.add(sw)});
  for(let i=0;i<3;i++)g.add(at(box(.012,.006,.07,std('#9AA3AB'),.002,2),.01+i*.032,.095-i*.012,0));
  return g}

/* ================= the room ================= */
const RX0=-3.9,RX1=4.5,RW=RX1-RX0,RCX=(RX0+RX1)/2,RD=4.4,RH=2.6,BZ=-RD/2,CAM={x:.5,y:1.38,z:6.0};/* room spans x -3.9 to 4.5, depth, wall height, z of the back wall */

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
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(RW,RD+4),floorMat);floor.rotation.x=-Math.PI/2;floor.position.set(RCX,0,2);floor.receiveShadow=true;S.add(floor);

  /* back wall with a window opening */
  const wx0=1.02,wx1=1.88,wy0=.86,wy1=1.96,t=.14;
  const wb=(x0,x1,y0,y1)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,y1-y0,t),wallMat);m.position.set((x0+x1)/2,(y0+y1)/2,BZ-t/2);m.castShadow=m.receiveShadow=true;S.add(m)};
  wb(RX0,wx0,0,RH);wb(wx1,RX1,0,RH);wb(wx0,wx1,0,wy0);wb(wx0,wx1,wy1,RH);
  /* left wall */
  const lw=new THREE.Mesh(new THREE.BoxGeometry(t,RH,RD+4+t),wallMat);lw.position.set(RX0-t/2,RH/2,2-t/2);lw.castShadow=lw.receiveShadow=true;S.add(lw);
  const rw=new THREE.Mesh(new THREE.BoxGeometry(t,RH,RD+4+t),wallMat);rw.position.set(RX1+t/2,RH/2,2-t/2);rw.castShadow=rw.receiveShadow=true;S.add(rw);
  /* baseboards and crown */
  S.add(at(box(RW,.1,.025,trim,.006),RCX,.05,BZ+.0125),at(box(.025,.1,RD+4,trim,.006),RX0+.0125,.05,2),at(box(.025,.1,RD+4,trim,.006),RX1-.0125,.05,2),at(box(RW,.06,.03,trim,.006),RCX,RH-.03,BZ+.015));

  /* window: frame, cross bars, sill, view */
  const frame=std('#FFFFFF',{roughness:.35}),wcx=(wx0+wx1)/2,wcy=(wy0+wy1)/2,ww=wx1-wx0,wh=wy1-wy0;
  S.add(at(box(ww+.08,.05,.07,frame,.01),wcx,wy1+.02,BZ+.02),at(box(ww+.08,.05,.07,frame,.01),wcx,wy0-.02,BZ+.02),at(box(.05,wh,.07,frame,.01),wx0-.01,wcy,BZ+.02),at(box(.05,wh,.07,frame,.01),wx1+.01,wcy,BZ+.02),at(box(.025,wh,.04,frame,.006),wcx,wcy,BZ+.015),at(box(ww,.025,.04,frame,.006),wcx,wcy,BZ+.015),at(box(ww+.14,.035,.16,frame,.01),wcx,wy0-.055,BZ+.07));
  const viewTex={day:[[0,'#5FB0EE'],[1,'#CFEAFB']],sunset:[[0,'#4B3F8F'],[.55,'#F08A55'],[1,'#FFD98A']],night:[[0,'#070B26'],[1,'#26336B']],beach:[[0,'#5FB0EE'],[.62,'#CFEAFB'],[.64,'#2F9CC4'],[.78,'#2F9CC4'],[.8,'#F2E2B0'],[1,'#F2E2B0']],stadium:[[0,'#27346B'],[.6,'#7A8BB8'],[.62,'#2E8B4E'],[1,'#2E8B4E']],space:[[0,'#04061A'],[1,'#1B1654']]}[d.view]||[[0,'#5FB0EE'],[1,'#CFEAFB']];
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.9),new THREE.MeshBasicMaterial({map:gradTex(viewTex),toneMapped:false}));sky.position.set(wcx,wcy,BZ-1.2);S.add(sky);
  if(night||d.view==='space'){const g=new THREE.Group();const r=rnd(4);for(let i=0;i<70;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.012+r()*.012,6,6),new THREE.MeshBasicMaterial({color:'#fff',toneMapped:false}));s.position.set(wcx+(r()-.5)*1.5,wcy+(r()-.5)*1.1,BZ-1.15);g.add(s)}S.add(g);
    const moon=new THREE.Mesh(new THREE.SphereGeometry(.16,24,24),new THREE.MeshBasicMaterial({color:d.view==='space'?'#E5674A':'#FFF3C0',toneMapped:false}));moon.position.set(wcx+.3,wcy+.25,BZ-1.1);S.add(moon)}
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(ww,wh),new THREE.MeshPhysicalMaterial({color:'#fff',roughness:0,metalness:0,transmission:0,transparent:true,opacity:.1,envMapIntensity:1.4}));glass.position.set(wcx,wcy,BZ+.005);S.add(glass);

  /* curtains: two panels hung from a rod that is longer than both of them; they stop above the sill so nothing passes through them */
  const cw=.3,cTop=2.1,cBot=.92,cL=wx0-.09,cR=wx1+.09;
  const cur=(x)=>{const g=new THREE.PlaneGeometry(cw,cTop-cBot,28,2),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*44)*.022);g.computeVertexNormals();
    const m=new THREE.Mesh(g,phys(d.curtains,{roughness:.85,sheen:1,sheenColor:C(d.curtains).lerp(C('#fff'),.4),side:THREE.DoubleSide,map:patTex(d.curtainsId,d.curtains)||weaveTex(d.curtains)}));m.castShadow=true;m.position.set(x,(cTop+cBot)/2,BZ+.11);return m};
  const rodL=cR-cL+cw+.16,rodM=std('#8A8F96',{metalness:.8,roughness:.3}),rod=cyl(.014,.014,rodL,rodM);rod.rotation.z=Math.PI/2;rod.position.set((cL+cR)/2,cTop+.03,BZ+.11);
  S.add(cur(cL),cur(cR),rod);
  [-1,1].forEach(k=>S.add(at(sph(.026,rodM,14,10),(cL+cR)/2+k*(rodL/2+.02),cTop+.03,BZ+.11)));
  [cL,cR].forEach(x=>[-1,1].forEach(k=>S.add(at(box(.018,.05,.05,rodM,.004,2),x+k*cw*.3,cTop+.03,BZ+.07))));

  /* posters */
  d.posters.forEach((p,i)=>{if(!p.svg)return;const m=new THREE.Mesh(new THREE.PlaneGeometry(.42,.53),new THREE.MeshStandardMaterial({map:svgTex(p.svg,352,448),roughness:.5}));const x=[-1.0,-.5,0,.5][i];m.position.set(x,1.72,BZ+.032);m.receiveShadow=true;
    S.add(m,at(box(.45,.56,.02,std('#FFFFFF',{roughness:.4}),.004),x,1.72,BZ+.006))});

  /* wardrobe (tap = closet) */
  const wardrobe=grp();
  const wood=(c,seed)=>phys(c,{map:woodTex(c,5,seed),roughness:.45,clearcoat:.25});
  wardrobe.add(at(box(.66,1.75,.6,wood('#'+shade(d.door,.82).getHexString(),2),.02),0,.875,0));
  [-.16,.16].forEach(x=>{wardrobe.add(at(box(.3,1.6,.03,wood(d.door,3),.015),x,.9,.3),at(cyl(.014,.014,.2,std('#D9B25A',{metalness:1,roughness:.25}),12),x+(x<0?.1:-.1),.85,.335))});
  wardrobe.position.set(-3.5,0,BZ+.32);S.add(wardrobe);clickables.push(wardrobe);
  const stex=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#6B4423';g.fillRect(0,0,w,h);g.strokeStyle='#E8B923';g.lineWidth=6;g.strokeRect(8,8,w-16,h-16);g.fillStyle='#fff';g.font='800 68px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('CLOSET',w/2,h/2+4)});
  const sg=new THREE.BoxGeometry(.5,.12,.04),sm=[std('#6B4423'),std('#6B4423'),std('#6B4423'),std('#6B4423'),std('#fff',{map:stex,roughness:.5}),std('#6B4423')],sign=new THREE.Mesh(sg,sm);sign.castShadow=true;
  sign.position.set(-3.5,1.75+.06+.01,BZ+.32+.27);S.add(sign);S.add(at(box(.46,.02,.2,wood('#6B4423',5),.004,2),-3.5,1.75+.01,BZ+.32+.2));

  /* bookshelf */
  const shelfW=wood(d.rack,8),bs=grp();
  bs.add(at(box(.04,1.55,.3,shelfW),-.33,.775,0),at(box(.04,1.55,.3,shelfW),.33,.775,0),at(box(.7,1.55,.02,shelfW),0,.775,-.14));
  for(let i=0;i<=4;i++)bs.add(at(box(.66,.03,.3,shelfW),0,.03+i*.38,0));
  const bc=['#C8102E','#F2B500','#2F7FD0','#3CB878','#8A4FD0','#FF7A00','#E9EEF3'],br=rnd(21);
  for(let s=0;s<2;s++){let x=-.3;for(let i=0;i<7;i++){const w=.025+br()*.03,h=.2+br()*.1;bs.add(at(box(w,h,.2,std(bc[(i+s*3)%7],{roughness:.6}),.003,2),x+w/2,.04+.38*(s+1)-.015+h/2-.015*0,0));x+=w+.012}}
  bs.scale.set(.78,1,1);bs.position.set(-2.45,0,BZ+.2);S.add(bs);

  /* bed */
  const sheets=d.sheets,bed=grp(),fm=wood(d.bedframe,12);
  bed.add(at(box(1.78,.28,2.05,fm,.03),0,.28,.12));
  bed.add(at(box(1.8,1.25,.08,fm,.03),0,.78,-.9),at(box(1.8,.55,.08,fm,.03),0,.48,1.14));
  const matr=phys('#F4F1EA',{roughness:.8,sheen:.6});bed.add(at(box(1.66,.2,1.95,matr,.07,5),0,.52,.14));
  const sheetT=patTex(d.sheetsId,sheets)||weaveTex(sheets),sheetM=phys(sheets,{roughness:.78,sheen:1,sheenRoughness:.5,sheenColor:C(sheets).lerp(C('#fff'),.35),map:sheetT});
  const dv=box(1.72,.12,1.45,sheetM,.06,6);dv.position.set(0,.66,.38);bed.add(dv);
  const fold=box(1.72,.15,.34,sheetM,.07,6);fold.position.set(0,.68,-.28);fold.material=phys('#'+shade(sheets,1.12).getHexString(),{roughness:.8,sheen:1,map:sheetT});bed.add(fold);
  const pc=d.pillow;[-.42,.42].forEach(x=>{const p=pillowShape(d.pillowId,pc);p.position.set(x,.74,-.66);p.rotation.x=-.18;bed.add(p)});
  bed.position.set(.0,0,BZ+1.1);S.add(bed);

  /* rug */
  const rid=d.rugId,rpat=patTex(rid,d.rug),rectRug=rid==='dojo'||rid==='plate';
  const rugMat=std(d.rug,{roughness:1,map:rpat||noiseTex(d.rug,.35,256,[3,3],14),bumpMap:noiseTex('#808080',.8,256,[3,3],15),bumpScale:1.5});
  if(rectRug){const rug=box(2.0,.02,1.15,rugMat,.008,2);rug.position.set(0,.011,.15);S.add(rug)}
  else{const rug=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.018,64),rugMat);rug.scale.z=.56;rug.position.set(0,.01,.15);rug.receiveShadow=true;S.add(rug);
    if(!rpat){const ring=new THREE.Mesh(new THREE.TorusGeometry(.8,.012,8,64),std('#F4F7FA',{roughness:.9}));ring.rotation.x=Math.PI/2;ring.scale.y=.56;ring.position.set(0,.022,.15);S.add(ring)}}

  /* dresser + globe */
  const dr=grp(),dm=wood(d.dresser,17);
  dr.add(at(box(.88,.62,.46,dm,.015),0,.31+.04,0));dr.add(at(box(.94,.035,.5,dm,.012),0,.68,0));
  for(let i=0;i<3;i++){dr.add(at(box(.78,.16,.012,wood(d.dresser,18+i),.008),0,.14+i*.19+.04,.235),at(sph(.016,std('#D9B25A',{metalness:1,roughness:.25}),12,8),-.0,.14+i*.19+.04,.25),);}
  [[-.38,-.2],[.38,-.2],[-.38,.2],[.38,.2]].forEach(([x,z])=>dr.add(at(cyl(.025,.018,.05,wood('#'+shade(d.dresser,.7).getHexString(),19),12),x,.025,z)));
  if(d.globe){const gc=d.globe,sea=gc==='gold'?'#D9B77A':gc==='glow'?'#12306B':'#3E86D6',land=gc==='gold'?'#8A5A33':gc==='glow'?'#2FD0C5':'#6DBF5B';
    const gm=canvasTex(512,256,(g,w,h)=>{g.fillStyle=sea;g.fillRect(0,0,w,h);g.fillStyle=land;const r=rnd(9);for(let i=0;i<14;i++){g.beginPath();g.ellipse(r()*w,40+r()*(h-80),20+r()*40,12+r()*22,r()*3,0,6.3);g.fill()}});
    const gl=sph(.13,phys('#fff',{map:gm,roughness:.3,clearcoat:1,emissive:gc==='glow'?C('#2FD0C5'):C('#000'),emissiveIntensity:gc==='glow'?.35:0}),40,28);gl.position.y=.9;gl.rotation.z=.4;dr.add(gl,at(cyl(.012,.012,.1,std('#B9854F',{metalness:.6,roughness:.4}),10),0,.74,0),at(cyl(.07,.08,.02,std('#555',{metalness:.7,roughness:.35}),24),0,.7,0))}
  dr.position.set(1.45,0,BZ+.27);S.add(dr);

  /* desk + lamp + items. The calendar hangs on the wall behind the desk, so the lamp sits at the far right end, low and soft. */
  const desk=grp(),dk=wood(d.desk,23);
  desk.add(at(box(1.05,.045,.58,dk,.015),0,.7,0));
  [[-.5,-.26],[-.5,.26]].forEach(([x,z])=>desk.add(at(box(.045,.68,.045,dk,.01),x,.34,z)));
  desk.add(at(box(.34,.68,.54,dk,.015),.36,.34,0));
  for(let i=0;i<3;i++)desk.add(at(box(.28,.16,.012,wood(d.desk,24+i),.008),.36,.12+i*.2,.275),at(box(.1,.014,.014,std('#D9B25A',{metalness:1,roughness:.25}),.004),.36,.14+i*.2,.285));
  desk.position.set(2.82,0,BZ+.33);S.add(desk);
  const DT=.7225,lx=3.2,lz=BZ+.2,lampC=d.lamp,lid=d.lampId||'basic',metal=std('#222B33',{metalness:.5,roughness:.4}),lamp=grp(),glowM=(c,k)=>new THREE.MeshStandardMaterial({color:C(c),emissive:C(c),emissiveIntensity:k,roughness:.5});
  lamp.add(at(cyl(.07,.08,.02,metal,20),0,.01,0));
  let topY=.3;
  if(lid==='rocket'){
    lamp.add(at(cyl(.05,.06,.22,phys('#F4F7FA',{metalness:.3,roughness:.25}),28),0,.13,0),at(new THREE.Mesh(new THREE.ConeGeometry(.05,.1,28),std('#C8102E',{roughness:.4})),0,.29,0),at(sph(.026,glowM('#FFE9B0',.9),14,10),0,.16,.05));
    for(let k=0;k<3;k++){const f=box(.012,.07,.06,std('#C8102E'),.004,2);f.position.set(Math.sin(k*2.094)*.065,.06,Math.cos(k*2.094)*.065);f.rotation.y=k*2.094;lamp.add(f)}
    topY=.22;
  }else if(lid==='ball'){
    const fb=football(.2,.5);fb.position.set(0,.13,0);fb.rotation.z=Math.PI/2*0+.0;lamp.add(fb);lamp.add(at(sph(.03,glowM('#FFE9B0',.9),12,10),0,.27,0));topY=.27;
  }else if(lid==='block'){
    [['#5DAA3A',.0],['#3E8E2E',.07],['#5DAA3A',.14]].forEach(([c,y],i)=>{const b=box(.12,.07,.12,phys(c,{roughness:.35,clearcoat:.5}),.012,3);b.position.set(0,.055+y,0);lamp.add(b);[[-.03,-.03],[.03,-.03],[-.03,.03],[.03,.03]].forEach(([a,z])=>{const st=cyl(.016,.016,.014,std(c,{roughness:.4}),14);st.position.set(a,.097+y,z);lamp.add(st)})});
    lamp.add(at(box(.1,.012,.1,glowM('#FFF3C0',1.2),.004,2),0,.24,0));topY=.25;
  }else{
    lamp.add(at(cyl(.012,.012,.3,metal,8),0,.15,0));
    const sh=new THREE.Mesh(new THREE.ConeGeometry(.12,.14,24,1,true),phys(lampC,{roughness:.5,side:THREE.DoubleSide,emissive:C(lampC),emissiveIntensity:.18}));sh.position.y=.34;sh.castShadow=true;lamp.add(sh);
    lamp.add(at(sph(.026,new THREE.MeshBasicMaterial({color:'#D9B97A'}),12,10),0,.31,0));topY=.34;
  }
  lamp.position.set(lx,DT,lz);S.add(lamp);
  const lampLight=new THREE.PointLight('#FFD79A',night?3:.45,2.2,2);lampLight.position.set(lx,DT+topY+.04,lz+.1);lampLight.castShadow=false;S.add(lampLight);
  /* small things on the desk */
  const dA=d.deskA,dB=d.deskB,ax=2.5,bx=2.88,iz=BZ+.42;
  const put=(g,x)=>{g.position.set(x,DT,iz);S.add(g)};
  const cupG=(c)=>{const g=grp(at(cyl(.045,.04,.09,std(c,{roughness:.5}),24),0,.045,0));return g};
  if(dA==='books'){const g=grp();['#C8102E','#2F7FD0','#F2B500'].forEach((c,i)=>{const b=box(.2-i*.015,.035,.15,std(c,{roughness:.55}),.004,2);b.position.set(.02,.0175+i*.035,0);b.rotation.y=(i-1)*.15;g.add(b)});put(g,ax)}
  else if(dA==='pencils'){const g=cupG('#FFB400');['#C8102E','#2F7FD0','#3CB878'].forEach((c,i)=>{const p=cyl(.006,.006,.16,std(c),6);p.position.set((i-1)*.018,.14,0);p.rotation.z=(i-1)*.18;g.add(p)});put(g,ax)}
  else if(dA==='helmet'){const h=sph(.07,phys('#D7A22A',{metalness:.4,roughness:.25,clearcoat:1}),24,16);h.scale.set(1.1,.95,1.2);h.position.y=.07;const g=grp(h,at(box(.07,.04,.01,std('#C9D1D6',{metalness:.8,roughness:.3}),.004,2),0,.04,.085));put(g,ax)}
  else if(dA==='clock'){const ft=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#F4F7FA';g.fillRect(0,0,w,h);g.strokeStyle='#222';g.lineWidth=8;g.beginPath();g.arc(128,128,118,0,6.3);g.stroke();g.fillStyle='#222';g.font='800 36px system-ui';g.textAlign='center';g.textBaseline='middle';[12,3,6,9].forEach((n,i)=>g.fillText(n,128+Math.sin(i*1.571)*88,128-Math.cos(i*1.571)*88));g.lineWidth=10;g.lineCap='round';g.strokeStyle='#222';g.beginPath();g.moveTo(128,128);g.lineTo(128,60);g.stroke();g.beginPath();g.moveTo(128,128);g.lineTo(170,150);g.stroke();g.strokeStyle='#C8102E';g.lineWidth=4;g.beginPath();g.moveTo(128,140);g.lineTo(90,100);g.stroke()});
    const fc=cyl(.075,.075,.03,[std('#222B33'),std('#fff',{map:ft,roughness:.3}),std('#222B33')],32);fc.rotation.x=Math.PI/2;fc.position.y=.09;put(grp(fc,at(box(.1,.02,.06,std('#222B33'),.006,2),0,.01,-.01)),ax)}
  else if(dA==='plant'){const g=grp(at(cyl(.05,.04,.08,std('#C86B3C',{roughness:.8}),20),0,.04,0));const cg=std('#3CB878',{roughness:.7});g.add(at(new THREE.Mesh(new THREE.CapsuleGeometry(.03,.1,6,12),cg),0,.14,0));const a1=new THREE.Mesh(new THREE.CapsuleGeometry(.014,.05,4,8),cg);a1.position.set(-.04,.14,0);a1.rotation.z=.5;const a2=a1.clone();a2.position.set(.04,.16,0);a2.rotation.z=-.5;g.add(a1,a2,at(sph(.014,std('#F4A6B8'),8,6),0,.21,0));put(g,ax)}
  else if(dA==='bricks'){const g=grp();[['#C8102E',0,0],['#F2C300',.0,.04],['#2F7FD0',.01,.08]].forEach(([c,x,y],i)=>{const b=box(.16-i*.02,.04,.1,phys(c,{roughness:.3,clearcoat:.5}),.006,2);b.position.set(x,.02+y,0);g.add(b);for(let k=0;k<3-i;k++){const st=cyl(.014,.014,.012,std(c,{roughness:.35}),14);st.position.set(-.04*(2-i)/2*0+(k-(2-i)/2)*.04,.046+y,0);g.add(st)}});put(g,ax)}
  else if(dA==='comics'){const g=grp();['#FFD84D','#C8102E','#2F7FD0'].forEach((c,i)=>{const b=box(.13,.012,.18,std(c,{roughness:.5}),.002,2);b.position.set(0,.006+i*.013,0);b.rotation.y=(i-1)*.3;g.add(b)});g.add(at(box(.09,.004,.06,std('#fff'),.001,2),0,.04,0));put(g,ax)}
  else if(dA==='tablet'){const st=canvasTex(256,192,(g,w,h)=>{g.fillStyle='#0B1118';g.fillRect(0,0,w,h);const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#7B4FD6');gr.addColorStop(1,'#2FD0C5');g.fillStyle=gr;g.fillRect(14,14,w-28,h-28);g.strokeStyle='#fff';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(50,140);g.quadraticCurveTo(110,30,170,120);g.stroke()});
    const t=box(.22,.014,.16,[std('#0B1118'),std('#0B1118'),std('#fff',{map:st,emissive:C('#fff'),emissiveMap:st,emissiveIntensity:.5,roughness:.3}),std('#0B1118'),std('#0B1118'),std('#0B1118')],.006,2);t.position.y=.012;t.rotation.y=.2;const pen=cyl(.004,.004,.15,std('#C9D1D6',{metalness:.7}),8);pen.rotation.z=Math.PI/2;pen.position.set(.03,.024,.11);put(grp(t,pen),ax)}
  else if(dA==='controller'){const m=phys('#1A1F24',{roughness:.35,clearcoat:.4}),g=grp(at(box(.17,.04,.09,m,.02,4),0,.03,0));[-1,1].forEach(k=>{const gr=new THREE.Mesh(new THREE.CapsuleGeometry(.022,.05,6,10),m);gr.position.set(k*.07,.025,.04);gr.rotation.x=1.1;gr.rotation.z=k*-.3;g.add(gr);const sk=cyl(.014,.014,.014,std('#444'),14);sk.position.set(k*.035,.056,.015);g.add(sk)});
    g.add(at(box(.026,.008,.008,std('#C9D1D6'),.002,2),-.06,.054,-.012),at(box(.008,.008,.026,std('#C9D1D6'),.002,2),-.06,.054,-.012));[['#C8102E',.07,-.02],['#2F7FD0',.054,-.005],['#3CB878',.08,-.005],['#F2B500',.066,.012]].forEach(([c,x,z])=>g.add(at(cyl(.007,.007,.008,std(c),10),x,.054,z)));put(g,ax)}
  else if(dA==='handheld'){const sc=canvasTex(128,64,(g,w,h)=>{g.fillStyle='#0B1033';g.fillRect(0,0,w,h);g.fillStyle='#2FD0C5';g.fillRect(20,30,18,18);g.fillStyle='#FFD84D';g.fillRect(80,14,14,14);g.fillStyle='#E5671B';g.fillRect(56,40,12,12)});
    const g=grp(at(box(.2,.028,.1,phys('#C8102E',{roughness:.3,clearcoat:.6}),.012,3),0,.016,0),at(new THREE.Mesh(new THREE.PlaneGeometry(.09,.05),std('#fff',{map:sc,emissive:C('#fff'),emissiveMap:sc,emissiveIntensity:.5})),0,.0315,0));g.children[1].rotation.x=-Math.PI/2;[-1,1].forEach(k=>{g.add(at(cyl(.008,.008,.006,std('#222'),10),k*.075,.032,-.005));g.add(at(cyl(.006,.006,.006,std(k<0?'#C9D1D6':'#F2B500'),10),k*.07+(k<0?.0:.0),.032,.02))});put(g,ax)}
  if(dB==='dino'){put(grp(at(sph(.06,phys('#3CB878',{roughness:.45}),20,14),0,.07,0),at(sph(.035,phys('#3CB878',{roughness:.45}),16,12),.07,.13,0)),bx)}
  else if(dB==='rocket'){const g=grp(at(cyl(.032,.038,.16,phys('#F4F7FA',{metalness:.3,roughness:.25}),24),0,.1,0),at(new THREE.Mesh(new THREE.ConeGeometry(.032,.06,24),std('#C8102E')),0,.21,0));for(let k=0;k<3;k++){const f=box(.01,.05,.05,std('#C8102E'),.003,2);f.position.set(Math.sin(k*2.094)*.045,.045,Math.cos(k*2.094)*.045);f.rotation.y=k*2.094;g.add(f)}put(g,bx)}
  else if(dB==='tee'){const g=grp(at(cyl(.02,.03,.05,std('#E8E4DC'),16),0,.025,0));const f=football(.17,.7);f.position.set(0,.105,0);f.rotation.z=.7;g.add(f);put(g,bx)}
  else if(dB==='trophy'){const gm=phys('#E8B923',{metalness:1,roughness:.18});put(grp(at(box(.1,.03,.1,std('#2A3138'),.005),0,.015,0),at(cyl(.015,.02,.07,gm,16),0,.065,0),at(cyl(.055,.03,.1,gm,24),0,.15,0)),bx)}
  else if(dB==='cube'){const g=grp();const cs=['#C8102E','#2F7FD0','#F2B500','#3CB878','#fff','#FF7A00'];const cm=cs.map(c=>phys(c,{roughness:.3,clearcoat:.8}));const cu=box(.1,.1,.1,cm,.012,3);cu.position.y=.05;cu.rotation.y=.4;g.add(cu);put(g,bx)}
  else if(dB==='frisbee'){const g=grp();const dsc=cyl(.09,.085,.012,phys('#E5671B',{roughness:.35,clearcoat:.6}),40);dsc.position.y=.012;const rim=new THREE.Mesh(new THREE.TorusGeometry(.088,.007,8,40),phys('#E5671B',{roughness:.35}));rim.rotation.x=Math.PI/2;rim.position.y=.012;g.add(dsc,rim,at(cyl(.05,.05,.003,std('#FF8F4A'),30),0,.019,0));g.rotation.z=.18;put(g,bx)}
  else if(dB==='dumbbell'){const g=grp(),dm=std('#2A3138',{metalness:.7,roughness:.4}),bar=cyl(.01,.01,.14,dm,10);bar.rotation.z=Math.PI/2;bar.position.y=.035;g.add(bar);[-1,1].forEach(k=>{const p=cyl(.035,.035,.025,dm,6);p.rotation.z=Math.PI/2;p.position.set(k*.06,.035,0);g.add(p);const q=cyl(.026,.026,.02,std('#555',{metalness:.7}),6);q.rotation.z=Math.PI/2;q.position.set(k*.08,.035,0);g.add(q)});g.rotation.y=.4;put(g,bx)}
  else if(dB==='raptor'){const rm=phys('#C8651B',{roughness:.5}),g=grp(at(sph(.045,rm,16,12),0,.085,0),at(sph(.028,rm,14,10),.055,.135,0),at(new THREE.Mesh(new THREE.ConeGeometry(.02,.1,12),rm),-.08,.085,0)),dk2=std('#3A1B08');g.children[2].rotation.z=Math.PI/2*1.0+.2;[-.012,.012].forEach(z=>{const l=cyl(.01,.008,.06,rm,8);l.position.set(.0,.03,z*2);g.add(l)});g.add(at(sph(.006,dk2,6,6),.075,.145,.015),at(sph(.006,dk2,6,6),.075,.145,-.015));put(g,bx)}
  else if(dB==='minifig'){const g=grp(at(box(.045,.05,.03,phys('#1B2A55',{roughness:.3,clearcoat:.5}),.004,2),0,.025,0),at(box(.055,.055,.035,phys('#2F7FD0',{roughness:.3,clearcoat:.5}),.006,3),0,.0775,0),at(cyl(.026,.026,.05,phys('#F2C300',{roughness:.3,clearcoat:.5}),20),0,.13,0),at(cyl(.011,.011,.012,phys('#F2C300',{roughness:.3}),12),0,.161,0));[-1,1].forEach(k=>g.add(at(box(.016,.05,.02,phys('#2F7FD0',{roughness:.3}),.004,2),k*.04,.075,0)));g.scale.setScalar(1.5);put(g,bx)}
  else if(dB==='skull'){const bm=phys('#EFE6D2',{roughness:.7}),g=grp(at(sph(.05,bm,16,12),-.015,.065,0),at(box(.09,.04,.05,bm,.015,3),.06,.05,0));g.children[0].scale.set(1.1,.9,.9);[-.02,.0,.02,.04].forEach((x,i)=>g.add(at(new THREE.Mesh(new THREE.ConeGeometry(.005,.014,6),std('#fff')),.04+x,.028,.019)));[-.02,.02].forEach(z=>g.add(at(sph(.011,std('#3A3226'),8,6),.005,.075,z*2)));g.rotation.y=-.5;put(g,bx)}
  /* wall shelf, drawn where the flat room draws it, above the calendar */
  if(d.shelf){
    const shx=2.64,shy=1.78;S.add(at(box(.8,.03,.16,wood(d.rack,30)),shx,shy,BZ+.08));[-.32,.32].forEach(k=>S.add(at(box(.02,.1,.12,wood(d.rack,31),.004,2),shx+k,shy-.06,BZ+.07)));
    const sx=i=>shx+[-.27,-.09,.09,.27][i],gold=()=>phys('#E8B923',{metalness:1,roughness:.2}),sid=d.shelf,pal=['#C8102E','#2F7FD0','#F2B500','#3CB878'],sy=shy+.015,sz=BZ+.09;
    for(let i=0;i<4;i++){let o;
      if(sid==='books'||sid==='comics'){const bk=sid==='books';o=box(bk?.045:.1,bk?.16+i*.02:.015+i*.003,.11,std(pal[i],{roughness:.6}),.004,2);o.position.set(sx(i),sy+(bk?.08+i*.01:.01+i*.003),sz);if(!bk)o.rotation.y=(i-1.5)*.15}
      else if(sid==='builds'){o=box(.12,.09+i*.02,.1,phys(pal[i],{roughness:.35,clearcoat:.5}),.012);o.position.set(sx(i),sy+.045+i*.01,sz);for(let k=0;k<2;k++){const st=cyl(.016,.016,.014,std(pal[i],{roughness:.4}),14);st.position.set((k-.5)*.05,.05+i*.01,0);o.add(st)}}
      else if(sid==='belts'){o=new THREE.Mesh(new THREE.TorusGeometry(.045,.014,8,20),std(['#fff','#F2B500','#3CB878','#101820'][i],{roughness:.7}));o.position.set(sx(i),sy+.06,sz);o.castShadow=true}
      else if(sid==='fossils'){o=sph(.04,phys(i%2?'#D9C9A3':'#EFE6D2',{roughness:.7}),14,10);o.scale.set(1,i%2?1:1.3,.8);o.position.set(sx(i),sy+.05,sz)}
      else{o=cyl(.03,.036,.12,gold(),20);o.position.set(sx(i),sy+.06+(i%2)*.02,sz);const cp=cyl(.04,.04,.01,gold(),20);cp.position.y=-.06-(i%2)*0;o.add(cp)}
      S.add(o)}}

  /* laundry bin, backpack, bean bag, telescope, hoop, string lights, hook rack */
  const lb=cyl(.2,.17,.5,std(d.laundry,{roughness:.8,map:patTex(d.laundryId,d.laundry)||weaveTex(d.laundry)}),32);lb.position.set(-2.97,.25,BZ+.45);S.add(lb);
  S.add(at(cyl(.205,.205,.025,std('#'+shade(d.laundry,.85).getHexString()),32),-2.97,.51,BZ+.45));
  S.add(at(box(.4,.045,.1,wood(d.rack,31)),-2.94,1.36,BZ+.07));
  if(d.pack){const pk=box(.26,.38,.12,phys(d.pack,{roughness:.55,sheen:.4}),.04,4);pk.position.set(-2.94,1.1,BZ+.14);S.add(pk);
  S.add(at(box(.18,.1,.04,std('#'+shade(d.pack,.8).getHexString()),.015),-2.94,1.05,BZ+.215))}
  if(d.beanbag){const bb=sph(.5,phys(d.beanbag,{roughness:.9,sheen:1,sheenColor:C('#fff'),map:patTex(d.beanbagId,d.beanbag)}),40,24);bb.scale.set(1,.7,1);bb.position.set(-2.9,.33,.8);bb.castShadow=true;S.add(bb)}
  if(d.telescope){const tg=grp(at(cyl(.015,.015,.8,std('#222'),8),0,.4,0));tg.children[0].rotation.z=.18;const tube=cyl(.045,.045,.6,phys(d.telescope==='brass'?'#C9A227':d.telescope==='black'?'#2A3138':'#E9EEF3',{metalness:.8,roughness:.25}),28);tube.position.set(0,.95,0);tube.rotation.z=.9;tg.add(tube);tg.position.set(.7,0,BZ+.62);S.add(tg)}
  if(d.hoop){const hc=d.hoop==='blue'?'#2F7FD0':'#C8102E';const hg=grp(at(box(.5,.34,.02,phys('#fff',{roughness:.3}),.01),0,0,0),at(new THREE.Mesh(new THREE.TorusGeometry(.12,.01,8,28),std(hc,{roughness:.4})),0,-.2,.12));hg.children[1].rotation.x=Math.PI/2;hg.position.set(-3.5,1.15,BZ+.32+.3+.03);S.add(hg)}
  if(d.lights){const pal=d.lights==='warm'?['#FFF3B0','#FFE08A']:d.lights==='tealgold'?['#2FD0C5','#E8B923']:['#FFD84D','#FF7A00','#2FD0C5','#FFF3B0'];
    for(let i=0;i<21;i++){const x=-3.7+i*.4,y=2.42-Math.sin(i%3/3*Math.PI)*.08;const b=sph(.035,new THREE.MeshBasicMaterial({color:pal[i%pal.length]}),10,8);b.position.set(x,y,BZ+.04);S.add(b);if(i%3===0){const l=new THREE.PointLight(pal[i%pal.length],.35,1.6,2);l.position.set(x,y-.05,BZ+.3);S.add(l)}}}

  /* ---- prizes with real models: floor corner, sports TV, arcade, blaster rack ---- */
  const glowTex=(tex,k)=>new THREE.MeshStandardMaterial({color:C('#fff'),map:tex,emissive:C('#fff'),emissiveMap:tex,emissiveIntensity:k||.9,roughness:.25});
  if(d.floorA){
    const f=d.floorA,g=grp();g.position.set(2.1,0,1.2);
    if(f==='ball'){
      const fb=football(.34,1);fb.position.set(0,.105,.1);fb.rotation.y=.55;fb.rotation.z=.04;g.add(fb);
      [[-.5,-.12],[.55,.0]].forEach(([x,z])=>{const c=cone();c.position.set(x,0,z);g.add(c)});
    }else if(f==='shoes'){
      [0,1].forEach(i=>{const sh=trainer();sh.position.set(-.16+i*.34,0,i*.06);sh.rotation.y=i?.35:-.25;g.add(sh)});
    }else if(f==='disc'){
      const dsc=cyl(.2,.19,.025,phys('#E5671B',{roughness:.35,clearcoat:.6}),48);dsc.position.y=.02;const rim=new THREE.Mesh(new THREE.TorusGeometry(.195,.014,10,48),phys('#E5671B',{roughness:.35}));rim.rotation.x=Math.PI/2;rim.position.y=.02;
      g.add(dsc,rim,at(cyl(.12,.12,.004,std('#FF8F4A',{roughness:.5}),36),0,.034,0),at(cyl(.2,.2,.003,std('#FFFFFF',{roughness:.6}),48),0,.0015,0));g.rotation.y=.4;
    }else if(f==='weights'){
      const dm=phys('#2A3138',{metalness:.8,roughness:.35});
      [[0,.0,.0,'#2A3138'],[0,.0,.22,'#C8102E']].forEach(([x,y,z,c],i)=>{const db=grp(),bar=cyl(.022,.022,.5,phys('#9AA3AB',{metalness:1,roughness:.25}),16);bar.rotation.z=Math.PI/2;bar.position.y=.1;db.add(bar);
        [-1,1].forEach(k=>{const p=cyl(.1,.1,.06,dm,6);p.rotation.z=Math.PI/2;p.position.set(k*.2,.1,0);db.add(p);const q=cyl(.075,.075,.05,std(c,{metalness:.4,roughness:.4}),6);q.rotation.z=Math.PI/2;q.position.set(k*.255,.1,0);db.add(q)});
        db.position.set(x,y,z);db.rotation.y=i?-.08:.06;g.add(db)});
    }else if(f==='skee'){
      const wd=wood('#B9854F',40),lane=box(.7,.12,1.7,wd,.02);lane.position.set(0,.06,0);g.add(lane);
      const ramp=box(.62,.04,1.0,phys('#8A5A33',{roughness:.5,map:woodTex('#8A5A33',4,41)}),.01);ramp.position.set(0,.14,.28);ramp.rotation.x=-.12;g.add(ramp);
      const back=box(.7,.62,.06,wd,.012);back.position.set(0,.5,-.8);back.rotation.x=-.2;g.add(back);
      [['#C8102E',.2,.58],['#2F7FD0',.14,.45],['#FFB400',.08,.34]].forEach(([c,r,y],k)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.02,10,32),std(c,{roughness:.4}));ring.position.set(0,.3+y*.8,-.76-.0);ring.rotation.x=-.2;g.add(ring)});
      g.add(at(cyl(.06,.06,.01,std('#101820'),20),0,.74,-.84));
      [[.1,.25],[-.12,.4]].forEach(([x,z])=>g.add(at(sph(.05,phys('#9A5B33',{roughness:.5,clearcoat:.3}),16,12),x,.2,z)));
      g.position.set(2.1,0,.7);
    }
    S.add(g);
  }
  if(d.tv){
    const g=d.tv==='game',tx=canvasTex(512,320,(c,w,h)=>{
      if(!g){c.fillStyle='#2E8B4E';c.fillRect(0,0,w,h);for(let i=0;i<8;i++){c.fillStyle=i%2?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';c.fillRect(i*64,0,64,h)}c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=3;for(let i=1;i<8;i++){c.beginPath();c.moveTo(i*64,20);c.lineTo(i*64,h-60);c.stroke()}
        c.fillStyle='rgba(255,255,255,.7)';c.font='800 28px system-ui';c.textAlign='center';[1,2,3,4,3,2,1].forEach((n,i)=>c.fillText(n+'0',(i+1)*64,h-80));c.fillStyle='#FFD84D';c.fillRect(300,16,5,h-76);
        [[120,120],[160,150],[200,110],[330,140],[380,100]].forEach(([x,y],i)=>{c.fillStyle=i<3?'#2F7FD0':'#C8102E';c.beginPath();c.arc(x,y,13,0,6.3);c.fill()});c.fillStyle='#9A5B33';c.beginPath();c.ellipse(250,130,11,7,-.4,0,6.3);c.fill();
        c.fillStyle='#0B1118';c.fillRect(0,h-52,w,52);c.fillStyle='#C8102E';c.fillRect(10,h-44,92,36);c.fillStyle='#fff';c.font='800 24px system-ui';c.textAlign='left';c.fillText('LIVE',24,h-18);c.fillText('BRAIN LAB BOWL     21 - 14',130,h-18)}
      else{c.fillStyle='#0B1033';c.fillRect(0,0,w,h);const r=rnd(7);for(let i=0;i<70;i++){c.fillStyle='rgba(255,255,255,'+(.3+r()*.7)+')';c.fillRect(r()*w,r()*h,2,2)}
        c.fillStyle='#2FD0C5';c.beginPath();c.moveTo(256,270);c.lineTo(226,310);c.lineTo(286,310);c.fill();[[100,80],[170,80],[240,80],[310,80],[380,80],[135,125],[205,125],[275,125],[345,125]].forEach(([x,y],i)=>{c.fillStyle=i%2?'#E5671B':'#C86BFF';c.fillRect(x,y,36,24)});c.fillStyle='#FFD84D';c.fillRect(254,180,6,40);c.fillStyle='#fff';c.font='800 26px system-ui';c.textAlign='left';c.fillText('SCORE 4200',18,34)}}),
      body=std('#101820',{roughness:.35,metalness:.4}),tvg=grp();
    tvg.add(at(box(.74,.46,.05,body,.015,3),0,0,.025),at(new THREE.Mesh(new THREE.PlaneGeometry(.68,.4),glowTex(tx,.85)),0,.005,.054),at(box(.1,.02,.03,body,.006,2),0,-.245,.02));
    tvg.position.set(3.55,1.7,BZ);S.add(tvg);
  }
  if(d.arcade){
    const sh=d.arcade==='shooter',bc=sh?'#4A1B6B':'#232B6B',ac=sh?'#C86BFF':'#2FD0C5',bm=phys(bc,{roughness:.35,clearcoat:.5}),ag=grp();
    const mq=canvasTex(512,128,(c,w,h)=>{c.fillStyle='#101820';c.fillRect(0,0,w,h);c.fillStyle='#FFD84D';c.font='800 78px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(sh?'SPACE':'RACE',w/2,h/2+4);c.strokeStyle=ac;c.lineWidth=6;c.strokeRect(6,6,w-12,h-12)});
    const sc=canvasTex(320,220,(c,w,h)=>{if(sh){c.fillStyle='#0B1033';c.fillRect(0,0,w,h);const r=rnd(5);for(let i=0;i<40;i++){c.fillStyle='#fff';c.fillRect(r()*w,r()*h,2,2)}c.fillStyle='#2FD0C5';c.beginPath();c.moveTo(160,190);c.lineTo(138,214);c.lineTo(182,214);c.fill();[[70,40],[130,40],[190,40],[250,40],[100,80],[160,80],[220,80]].forEach(([x,y])=>{c.fillStyle='#C8102E';c.fillRect(x-14,y,28,18)})}
      else{c.fillStyle='#7CC4F0';c.fillRect(0,0,w,95);c.fillStyle='#3CB878';c.fillRect(0,95,w,h);c.fillStyle='#4A525A';c.beginPath();c.moveTo(130,95);c.lineTo(190,95);c.lineTo(310,h);c.lineTo(10,h);c.fill();c.fillStyle='#fff';for(let i=0;i<5;i++){const y=100+i*i*7+i*8;c.fillRect(158,y,4+i*2,8+i*3)}c.fillStyle='#C8102E';c.fillRect(135,165,50,30);c.fillStyle='#101820';c.fillRect(143,170,34,10)}});
    ag.add(at(box(.58,.82,.5,bm,.02,3),0,.41,0),at(box(.56,.4,.4,bm,.02,3),0,1.0,-.04),at(box(.6,.14,.44,[std('#101820'),std('#101820'),std('#101820'),std('#101820'),glowTex(mq,1),std('#101820')],.012,2),0,1.27,-.02));
    const scr=new THREE.Mesh(new THREE.PlaneGeometry(.44,.3),glowTex(sc,.85));scr.position.set(0,1.02,.161);scr.rotation.x=-.08;ag.add(scr);
    const deck=box(.58,.05,.24,std('#1A1F24',{roughness:.45}),.01,2);deck.position.set(0,.8,.2);deck.rotation.x=.18;ag.add(deck);
    if(sh){[-.1,.0,.1].forEach((x,i)=>ag.add(at(cyl(.022,.022,.02,std(['#C8102E','#2FD0C5','#FFD84D'][i],{roughness:.3}),16),x,.83,.21)));ag.add(at(cyl(.008,.008,.08,std('#C9D1D6',{metalness:.8}),8),-.2,.85,.2),at(sph(.026,std('#C8102E'),12,10),-.2,.9,.2))}
    else{const wheel=new THREE.Mesh(new THREE.TorusGeometry(.065,.011,10,28),std('#101820',{roughness:.4}));wheel.position.set(0,.88,.24);wheel.rotation.x=-.5;ag.add(wheel);ag.add(at(cyl(.007,.007,.07,std('#555'),8),0,.84,.22));ag.children[ag.children.length-1].rotation.x=-.5}
    ag.add(at(box(.34,.14,.012,std('#101820'),.004,2),0,.42,.255),at(box(.1,.02,.014,glowM('#FFD84D',1),.004,2),0,.45,.262),at(box(.54,.02,.012,glowM(ac,1.2),.004,2),0,.65,.256));
    [-1,1].forEach(k=>ag.add(at(box(.012,.8,.4,glowM(ac,.8),.004,2),k*.296,.42,.02)));
    ag.position.set(3.7,0,BZ+.28);S.add(ag);
  }
  if(d.rack2){
    const rg=grp(),fm=wood('#8A5A33',33),laser=d.rack2==='laser';
    rg.add(at(box(.05,.4,.78,fm,.01,2),0,0,0));
    const blaster=(y,body,acc,tip)=>{const b=grp(),bm2=phys(body,{roughness:.35,metalness:.3,clearcoat:.4});b.add(at(box(.07,.06,.4,bm2,.02,3),0,0,0),at(box(.05,.09,.07,bm2,.015,2),0,-.06,-.1),at(cyl(.018,.018,.18,std(acc,{metalness:.5,roughness:.3}),14),0,.01,.27),at(box(.05,.03,.12,std(acc,{roughness:.4}),.008,2),0,.05,.05));b.children[2].rotation.x=Math.PI/2;b.add(at(sph(.022,glowM(tip,1.2),10,8),0,.01,.37));b.position.set(.06,y,0);return b};
    rg.add(blaster(.1,laser?'#C9D1D6':'#FF7A00',laser?'#2FD0C5':'#2F7FD0',laser?'#2FD0C5':'#FFD84D'),blaster(-.08,laser?'#6B747C':'#2F7FD0',laser?'#E5671B':'#FFD84D',laser?'#FF5A5A':'#FF7A00'));
    [-.3,.3].forEach(z=>rg.add(at(cyl(.012,.012,.07,std('#C9D1D6',{metalness:.9,roughness:.3}),10),.04,0,z)));
    rg.position.set(-3.5,2.25,BZ+.03);rg.rotation.y=-Math.PI/2;rg.rotation.z=0;S.add(rg);
  }

  /* cards drawn from the flat artwork: tv, arcade, floor items, wall art, bed topper, chair */
  (d.sprites||[]).forEach(sp=>{
    const px=sp.kind?260:420,tex=svgTex(sp.svg,Math.max(64,Math.round(sp.w*px)),Math.max(64,Math.round(sp.h*px)));
    const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,alphaTest:.03,roughness:.7,side:THREE.DoubleSide,emissive:C('#ffffff'),emissiveMap:sp.glow?tex:null,emissiveIntensity:sp.glow?.55:0});
    if(!sp.glow)mat.emissive=C('#000000');
    const m=new THREE.Mesh(new THREE.PlaneGeometry(sp.w,sp.h),mat);m.receiveShadow=true;
    if(sp.kind==='wall'){m.position.set(0,sp.y,BZ+.04)}
    else if(sp.kind==='front'){const k=(CAM.z-(BZ+2.35))/(CAM.z-BZ);m.scale.set(k,k,1);m.position.set(CAM.x+(0-CAM.x)*k,CAM.y+(sp.y-CAM.y)*k,BZ+2.35)}
    else{m.position.set(sp.x,sp.y+sp.h/2,sp.ry||sp.face?sp.z:BZ+(sp.z||0)+.06);if(sp.ry)m.rotation.y=sp.ry}
    S.add(m)});
  return{group:S,clickables,lamp:lampLight,night};
}

/* ================= Emmett ================= */
/* Built to the same proportions as the closet figure (big head, short sturdy body), so every colour and item picked in the
   closet shows here: skin on face, neck, hands and bare arms or legs; shirt colour on torso and sleeves; accent colour on shoes; hats and extras. */
function buildAvatar(a,pal){
  const U=.0145,G=new THREE.Group();
  const skin=pal.SKIN[a.skin]||pal.SKIN[2],hairC=pal.HAIR[a.hair]||pal.HAIR[1],shirt=a.shirt||pal.OUTFIT[a.outfit]||pal.OUTFIT[0],accent=a.shoe||pal.OUTFIT[a.bandc]||pal.OUTFIT[2];
  const skinM=phys(skin,{roughness:.55,sheen:.6,sheenColor:C(skin).lerp(C('#ff9a80'),.5),sheenRoughness:.4,clearcoat:.05});
  const shirtM=phys(shirt,{roughness:.8,sheen:1,sheenRoughness:.6,sheenColor:C(shirt).lerp(C('#fff'),.35),map:weaveTex(shirt)});
  const pantsC=a.white?'#F4F7FA':'#2F4A6B',pantsM=phys(pantsC,{roughness:.82,sheen:.5,map:weaveTex(pantsC)}),cuffM=phys('#'+shade(pantsC,.72).getHexString(),{roughness:.85}),darkM=phys('#101820',{roughness:.8});
  const body=new THREE.Group();G.add(body);
  /* legs (bare skin below black shorts for the running singlet), cuffs, then shoes with the accent-colour sole */
  [-1,1].forEach(sx=>{
    const x=sx*8.3*U;
    if(a.bare){const sh=box(15.4*U,15*U,15*U,darkM,3*U,3);sh.position.set(x,33*U,0);body.add(sh);const lg=box(13*U,23*U,12.5*U,skinM,3*U,3);lg.position.set(x,18*U,0);body.add(lg)}
    else{const lg=box(15.4*U,33*U,15*U,pantsM,3*U,3);lg.position.set(x,23.5*U,0);body.add(lg);const cf=box(15.9*U,5*U,15.5*U,cuffM,2*U,2);cf.position.set(x,9.5*U,0);body.add(cf)}
    const shoeTop=box(15.4*U,7*U,22*U,phys('#F4F7FA',{roughness:.4,clearcoat:.4}),3*U,4);shoeTop.position.set(x,5*U,3*U);body.add(shoeTop);
    const sole=box(15.8*U,2.6*U,22.4*U,std(accent,{roughness:.5}),1*U,3);sole.position.set(x,1.3*U,3*U);body.add(sole);
    const lace=box(8*U,1.2*U,7*U,std('#C9D1D6',{roughness:.6}),.4*U,2);lace.position.set(x,8.8*U,5*U);body.add(lace);
  });
  body.add(at(box(34*U,14*U,16*U,a.bare?darkM:pantsM,3*U,3),0,43*U,0));
  /* torso (shirt colour) with the closet's shirt artwork laid on the front */
  const torso=box(39*U,36*U,22*U,shirtM,9*U,5);torso.position.set(0,55*U,0);body.add(torso);
  if(a.arts&&a.arts.top){
    const tt=svgTex(a.arts.top,736,640),m=new THREE.Mesh(new THREE.PlaneGeometry(92*.46*U,80*.46*U),new THREE.MeshStandardMaterial({map:tt,transparent:true,alphaTest:.04,roughness:.75}));
    m.position.set(0,56.1*U,11*U+.003);body.add(m);
  }
  body.add(at(cyl(7.4*U,8*U,9*U,skinM,20),0,74*U,0));
  /* arms: sleeve, forearm and hand follow the shirt type (long sleeves, short sleeves, bare for the singlet) */
  const limb=(p,q,r,mat)=>{const A=new THREE.Vector3(p[0]*U,-p[1]*U,0),B=new THREE.Vector3(q[0]*U,-q[1]*U,0),d=B.clone().sub(A),len=d.length(),m=new THREE.Mesh(new THREE.CapsuleGeometry(r*U,Math.max(.001,len-2*r*U),6,14),mat);
    m.position.copy(A.clone().add(B).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;return m};
  const ring=(p,q,r,c)=>{const A=new THREE.Vector3(p[0]*U,-p[1]*U,0),d=new THREE.Vector3(q[0]*U,-q[1]*U,0).sub(A).normalize(),m=new THREE.Mesh(new THREE.TorusGeometry(r*U,1.3*U,8,24),std(c,{roughness:.6}));m.position.copy(A);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),d);return m};
  const arms=[-1,1].map(sx=>{
    const S=[sx*16,-62.5],E=[sx*21.5,-47],W=[sx*23.8,-35],H=[sx*24.4,-31.2],sleeveR=(a.white?13:10.4)/2,foreR=(a.white?11.5:8)/2,ag=new THREE.Group(),sd='#'+shade(shirt,.7).getHexString();
    ag.position.set(S[0]*U,-S[1]*U,0);
    const rel=p=>[p[0]-S[0],p[1]-S[1]];
    const up=limb(rel(S),rel(E),sleeveR,a.bare?skinM:shirtM),lo=limb(rel(E),rel(W),foreR,a.long?shirtM:skinM);ag.add(up,lo);
    if(a.long)ag.add(ring(rel(W),rel(E),foreR,a.white?'#C9D1D6':sd));
    else if(!a.bare)ag.add(ring(rel(E),rel(S),sleeveR*.98,a.pro?accent:sd));
    const hand=sph(1,skinM,16,12);hand.scale.set(4.4*U,4.8*U,4.2*U);hand.position.set(rel(H)[0]*U,-rel(H)[1]*U,0);ag.add(hand);
    body.add(ag);return ag;
  });
  /* head */
  const head=new THREE.Group();head.position.y=88.3*U;body.add(head);
  head.scale.setScalar(13.8*U/.15);const sk=sph(.15,skinM,40,28);sk.scale.set(1,1.08,1.02);head.add(sk);
  const faceArt=!!(a.arts&&a.arts.face);
  if(faceArt){sk.geometry.scale(1,1.08,1.02);sk.scale.set(1,1,1);planarUV(sk.geometry,[20,20,80,80]);sk.material=phys('#fff',{map:svgTex(a.arts.face,640,640,skin),roughness:.55,sheen:.4,sheenColor:C(skin).lerp(C('#ff9a80'),.5),sheenRoughness:.4})}
  [-1,1].forEach(s=>{const e=sph(.032,skinM,12,10);e.scale.set(.6,1,.8);e.position.set(s*.148,-.005,-.005);head.add(e)});
  if(!faceArt){
  const eyeW=std('#fff',{roughness:.2}),eyeD=std('#1A1410',{roughness:.12}),face=grp();
  [-1,1].forEach(s=>{const w=sph(.026,eyeW,14,10);w.scale.set(1,1.1,.5);w.position.set(s*.055,.015,.14);const p=sph(.0155,eyeD,12,10);p.position.set(s*.055,.012,.158);const hl=sph(.0045,new THREE.MeshBasicMaterial({color:'#fff'}),6,6);hl.position.set(s*.055+.005,.02,.171);
    const br=box(.05,.011,.014,std(hairC,{roughness:.6}),.004,2);br.position.set(s*.055,.056,.148);br.rotation.z=-s*.1;face.add(w,p,hl,br)});
  face.add(at(sph(.016,skinM,10,8),0,-.018,.158));
  const mouth=new THREE.Mesh(new THREE.TorusGeometry(.04,.006,8,20,Math.PI),std('#8A3A2A',{roughness:.4}));mouth.rotation.z=Math.PI;mouth.position.set(0,-.052,.145);face.add(mouth);
  [-1,1].forEach(s=>{const ch=sph(.022,std('#E88A7A',{roughness:.8,transparent:true,opacity:.35}),10,8);ch.scale.set(1,.7,.3);ch.position.set(s*.085,-.04,.14);face.add(ch)});
  head.add(face);
  }
  /* hair: a cap tilted so the hairline sits high at the front and the hair covers the back and crown, like the closet art */
  const hairStart=head.children.length;
  if(a.arts&&a.arts.fringe){
    const hg=new THREE.SphereGeometry(1,48,32);hg.scale(.205,.26,.19);hg.translate(0,.04,-.01);planarUV(hg,[14,-4,92,96]);
    const hs=new THREE.Mesh(hg,new THREE.MeshStandardMaterial({map:svgTex(a.arts.fringe,736,768),alphaTest:.4,roughness:.7}));hs.castShadow=true;head.add(hs);
    if(a.arts.back){const bp=new THREE.Mesh(new THREE.PlaneGeometry(92*.005,96*.005),new THREE.MeshStandardMaterial({map:svgTex(a.arts.back,736,768),alphaTest:.4,roughness:.7}));bp.position.set(0,.07,-.06);head.add(bp)}
  }else{
  const hm=phys(hairC,{roughness:.7,sheen:.3,sheenColor:C(hairC).lerp(C('#fff'),.25)}),st=a.style||'waves';
  const capT=(r,th,tilt,sc,mat)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,44,30,0,Math.PI*2,0,th),mat||hm);m.scale.set(sc[0],sc[1],sc[2]);m.rotation.x=-tilt;m.castShadow=true;return m};
  if(st==='afro'){const m=sph(.215,hm,36,24);m.position.set(0,.05,-.03);head.add(m)}
  else if(st==='curly'){const r=rnd(6);for(let i=0;i<64;i++){const th=Math.acos(r()*.92+.08),ph=r()*Math.PI*2,R=.16;const m=sph(.04,hm,10,8);m.position.set(R*Math.sin(th)*Math.cos(ph),R*Math.cos(th)*1.06+.012,R*Math.sin(th)*Math.sin(ph)-.01);if(m.position.z>.07&&m.position.y<.1)continue;head.add(m)}head.add(at(capT(.158,1.45,.4,[1,1.07,1.03]),0,.008,-.01))}
  else if(st==='twists'){const r=rnd(8);for(let i=0;i<26;i++){const ph=r()*Math.PI*2,th=.25+r()*1.0;const t=cyl(.017,.012,.1+r()*.05,hm,8);t.position.set(.16*Math.sin(th)*Math.cos(ph),.16*Math.cos(th)+.03,.16*Math.sin(th)*Math.sin(ph));if(t.position.z>.07&&t.position.y<.12)continue;t.lookAt(t.position.x*3,t.position.y*3+.2,t.position.z*3);t.rotateX(Math.PI/2);head.add(t)}head.add(at(capT(.164,1.42,.45,[1.03,1.14,1.08]),0,.004,-.008))}
  else if(st==='buzz'){head.add(at(capT(.157,1.38,.45,[1,1.1,1.04],phys('#'+C(hairC).lerp(C(skin),.4).getHexString(),{roughness:.8})),0,0,-.004))}
  else if(st==='fade'){head.add(at(capT(.166,1.3,.45,[1.03,1.18,1.08]),0,.004,-.01));head.add(at(capT(.157,1.52,.38,[1,1.085,1.03],phys('#'+C(hairC).lerp(C(skin),.55).getHexString(),{roughness:.8})),0,0,-.004))}
  else{head.add(at(capT(.168,1.46,.46,[1.04,1.2,1.1]),0,.0,-.014));[-.07,0,.07].forEach(x=>{const w=sph(.048,hm,12,10);w.scale.set(1.1,.7,.8);w.position.set(x,.15-Math.abs(x)*.25,.085);head.add(w)})}
  }
  const hairBits=head.children.slice(hairStart);
  /* hats and extras. Common ones are modelled; every other hat, shirt and extra is laid on from its closet artwork. */
  const H=a.head,hatM=(c,o={})=>phys(c,Object.assign({roughness:.55},o)),bc=accent;
  if(['fbhelmet','helmet','beanie','paleo','cap','wizard','bdayhat'].includes(H)||(a.arts&&a.arts.hd))hairBits.forEach(o=>{o.visible=false});
  if(a.arts&&a.arts.hd&&['champ','crown'].includes(H))hairBits.forEach(o=>{o.visible=true});
  const dome=(r,c,ph,o)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,32,20,0,Math.PI*2,0,ph||Math.PI/2),hatM(c,o||{}));m.castShadow=true;return m};
  const band=(c,y)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(.152,.014,10,40),hatM(c));m.rotation.x=Math.PI/2;m.position.y=y;m.scale.set(1,1.04,1);return m};
  if(H==='band')head.add(band(bc,.06));
  else if(H==='ninja'){head.add(band(bc,.065));const pl=box(.1,.045,.01,std('#C9D1D6',{metalness:.8,roughness:.3}),.004,2);pl.position.set(0,.065,.155);head.add(pl)}
  else if(H==='cap'){const d=dome(.168,bc);d.position.y=.01;head.add(d);const b=box(.22,.012,.13,hatM('#'+shade(bc,.72).getHexString()),.005,2);b.position.set(0,.04,.18);b.rotation.x=.12;head.add(b)}
  else if(H==='visor'){const b=box(.22,.012,.13,hatM('#F4F7FA'),.005,2);b.position.set(0,.07,.17);head.add(b);head.add(band(bc,.075))}
  else if(H==='beanie'){const d=dome(.17,bc,1.6);d.position.y=.012;head.add(d);const p=sph(.036,hatM('#'+shade(bc,1.12).getHexString()),12,10);p.position.y=.19;head.add(p);head.add(band('#'+shade(bc,.78).getHexString(),.045))}
  else if(H==='fbhelmet'){const d=dome(.19,bc,1.95,{clearcoat:1,roughness:.2,metalness:.2});d.position.y=-.01;head.add(d);const m=new THREE.Mesh(new THREE.TorusGeometry(.1,.008,8,24,Math.PI),std('#C9D1D6',{metalness:.8,roughness:.3}));m.position.set(0,-.06,.16);m.rotation.z=Math.PI;head.add(m);[-1,1].forEach(k=>head.add(at(cyl(.035,.035,.02,std('#101820'),18),k*.18,-.01,0)));head.children[head.children.length-1].rotation.z=Math.PI/2;head.children[head.children.length-2].rotation.z=Math.PI/2}
  else if(H==='helmet'){const g=sph(.215,new THREE.MeshPhysicalMaterial({color:'#CFE8FF',transparent:true,opacity:.22,roughness:0,clearcoat:1,envMapIntensity:1.6}),32,20);g.position.y=.01;head.add(g);const r=new THREE.Mesh(new THREE.TorusGeometry(.185,.02,10,32),std('#E9EEF3',{roughness:.3,metalness:.6}));r.rotation.x=Math.PI/2;r.position.y=-.12;head.add(r)}
  else if(H==='paleo'){const b=cyl(.24,.24,.012,hatM('#B89A5C'),32);b.position.y=.1;head.add(b);const c2=cyl(.11,.14,.1,hatM('#B89A5C'),24);c2.position.y=.15;head.add(c2)}
  else if(H==='wizard'||H==='bdayhat'){const c2=new THREE.Mesh(new THREE.ConeGeometry(.11,.3,28),hatM(H==='wizard'?'#5B2A86':'#FF5FA2'));c2.position.y=.27;c2.castShadow=true;head.add(c2);if(H==='wizard'){const b=cyl(.2,.2,.01,hatM('#3C1A63'),32);b.position.y=.12;head.add(b)}}
  else if(H==='headset'){const r=new THREE.Mesh(new THREE.TorusGeometry(.16,.012,8,32,Math.PI),std('#1A1F24',{roughness:.4}));r.position.y=.01;head.add(r);[-1,1].forEach(x=>{const e=cyl(.045,.045,.04,std('#262C33',{roughness:.4}),20);e.rotation.z=Math.PI/2;e.position.set(x*.165,0,0);head.add(e)})}
  else if(a.arts&&a.arts.hd){const hd=new THREE.Mesh(new THREE.PlaneGeometry(.6,.56),new THREE.MeshStandardMaterial({map:svgTex(a.arts.hd,720,672),transparent:true,alphaTest:.04,roughness:.6}));hd.position.set(0,.07,.168);head.add(hd)}
  const X=a.extra||[];
  if(X.includes('shades')){const g=std('#101820',{roughness:.15,metalness:.3});[-1,1].forEach(x=>{const l=box(.075,.045,.012,g,.012,3);l.position.set(x*.058,.012,.163);head.add(l)});head.add(at(box(.04,.008,.01,g,.003,2),0,.022,.165))}
  if(X.includes('belt')){const b=box(40*U,3.4*U,24*U,phys(bc,{roughness:.5}),1*U,2);b.position.set(0,57.5*U,0);body.add(b);body.add(at(box(11*U,8*U,2*U,phys('#'+shade(bc,.78).getHexString(),{roughness:.5}),1*U,2),0,57.5*U,12*U+.003))}
  /* medal, chain and the rest of the extras come from the closet artwork, laid over the chest */
  if(a.arts&&a.arts.ex){const ex=new THREE.Mesh(new THREE.PlaneGeometry(120*.46*U,140*.46*U),new THREE.MeshStandardMaterial({map:svgTex(a.arts.ex,720,840),transparent:true,alphaTest:.04,roughness:.55}));ex.position.set(0,82.8*U,.215);body.add(ex)}
  if(a.arts&&a.arts.cape){const cp=new THREE.Mesh(new THREE.PlaneGeometry(120*.46*U,140*.46*U),new THREE.MeshStandardMaterial({map:svgTex(a.arts.cape,720,840),transparent:true,alphaTest:.04,roughness:.8,side:THREE.DoubleSide}));cp.position.set(0,82.8*U,-.18);body.add(cp)}
  G.userData={head,armL:arms[0],armR:arms[1],body,torso};
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
  const sun=new THREE.DirectionalLight('#FFE7BF',2.6);sun.position.set(2.8,3.4,-6);sun.target.position.set(1.0,.3,0.4);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5.4,right:5.4,top:4,bottom:-3,near:1,far:16});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;sun.shadow.radius=5;
  scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#BFD6FF',.7);fill.position.set(-2,3,5);scene.add(fill);
  const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,samples:4}));
  composer.addPass(new RenderPass(scene,cam));
  const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.18,.6,.92);composer.addPass(bloom);composer.addPass(new OutputPass());
  let built=null,av=null,orbit={yaw:0,pitch:0,ty:0,tp:0},t0=performance.now(),running=false,key='',last=0,raf=0,drag=null;
  const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();

  function size(){
    const w=host.clientWidth||600,h=Math.round(w*.56);
    renderer.setSize(w,h,false);canvas.style.width='100%';canvas.style.height='100%';
    composer.setSize(w,h);bloom.resolution.set(w/2,h/2);cam.aspect=w/h;cam.updateProjectionMatrix();
  }
  function frame(){
    const t=(performance.now()-t0)/1000;
    orbit.yaw+=(orbit.ty-orbit.yaw)*.08;orbit.pitch+=(orbit.tp-orbit.pitch)*.08;
    const sway=Math.sin(t*.3)*.012+orbit.yaw,dist=CAM.z;
    cam.position.set(Math.sin(sway*3)*dist*.9+CAM.x,CAM.y+orbit.pitch*2.2,Math.cos(sway*3)*dist);
    cam.lookAt(.3,.5+orbit.pitch*.4,-.3);
    const ov=window.__r3cam;if(ov){cam.position.set(ov[0],ov[1],ov[2]);cam.lookAt(ov[3],ov[4],ov[5]);if(ov[6]&&cam.fov!==ov[6]){cam.fov=ov[6];cam.updateProjectionMatrix()}}
    if(av){const u=av.userData;u.torso.scale.y=1+Math.sin(t*1.9)*.012;u.head.rotation.y=Math.sin(t*.55)*.12;u.head.rotation.x=Math.sin(t*.4)*.02;u.armL.rotation.z=Math.sin(t*1.9)*.015;u.armR.rotation.z=-Math.sin(t*1.9)*.015}
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
    av=buildAvatar(d.avatar,d.pal);av.position.set(-1.05,0,1.0);av.rotation.y=.3;av.scale.setScalar(.96);scene.add(av);
    const night=built.night;
    scene.environmentIntensity=night?.2:.42;hemi.intensity=night?.1:.28;sun.intensity=night?.6:2.6;sun.color.set(night?'#7FA2FF':d.view==='sunset'?'#FF9A5A':'#FFE7BF');fill.intensity=night?.25:.7;renderer.toneMappingExposure=night?1.2:.92;bloom.strength=night?.55:.22;
    scene.background=C(night?'#06091C':'#0B1626');
    d.posters.forEach(p=>{});
    frame();
  }
  function resize(){size();frame()}
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,moved:false};try{canvas.setPointerCapture(e.pointerId)}catch(_){}});
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

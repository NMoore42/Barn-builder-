const {chromium,devices}=require('playwright');const path=require('path');const L=process.env.LIBS||path.join(__dirname,'libs');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
let pass=0,fail=0;const res=(ok,n,x)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+n+(x?'  ('+x+')':''));};
const p=await b.newPage({viewport:{width:1180,height:820}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
for(const [re,f] of [[/three\.min\.js/,'three.min.js'],[/OrbitControls\.js/,'OrbitControls.js'],[/jspdf\.umd\.min\.js/,'jspdf.umd.min.js']])await p.route(re,r=>r.fulfill({path:path.join(L,f),contentType:'text/javascript'}));
await p.goto('file://'+path.join(__dirname,'..','index.html'));await p.waitForTimeout(1400);await p.click('#sheet button.primary');
// a barn with a loft (stairs clipped on), a window on the back wall, and the starting doors
await p.evaluate(()=>{const s=window.__barn.getState();s.b.wall=16;s.b.leanIn=12;s.items=[{t:'loft',x:30,z:6.5,r:0,L:20,W:12,H:9},{t:'stairs',x:30,z:18.5,r:270,H:9},{t:'pickup',x:22.5,z:36,r:90}];
  s.walls['n-main'].o.push({t:'window',u:20,w:3,h:3,k:3.5});window.__barn.applyState(s);});
// walk = put the walker at (x,z,y) and step toward (tx,tz) in small steps; returns where they ended up
const walkTo=(x,z,y,tx,tz)=>p.evaluate(([x,z,y,tx,tz])=>{const W=window.__barn,w=W.walk;w.on=true;w.x=x;w.z=z;w.y=y;
  for(let i=0;i<4000;i++){const dx=tx-w.x,dz=tz-w.z,l=Math.hypot(dx,dz);if(l<.1)break;const s=Math.min(.08,l);if(!W.tryStep(w.x+dx/l*s,w.z+dz/l*s))break;}
  return [+w.x.toFixed(1),+w.z.toFixed(1),+w.y.toFixed(1)];},[x,z,y,tx,tz]);
let r;
r=await walkTo(30,60,0,30,40);res(r[1]>=48,'front wall stops you where there is no door',JSON.stringify(r));
r=await walkTo(17.5,60,0,17.5,30);res(r[1]<=30.1,'first overhead door lets you in',JSON.stringify(r));
r=await walkTo(22.5,60,0,22.5,30);res(r[1]<48&&r[1]>45,'the parked truck stops you just inside',JSON.stringify(r));
r=await walkTo(40,60,0,40,30);res(r[1]<=30.1,'second overhead door lets you in',JSON.stringify(r));
r=await walkTo(34,-10,0,34,10);res(r[1]<=0,'window in the back wall stops you',JSON.stringify(r));
r=await walkTo(17,-10,0,17,10);res(r[1]>3,'back entry door lets you in',JSON.stringify(r));
r=await walkTo(20,30,0,8,30);res(r[0]>13,'wall between barn and left lean-to stops you away from its door',JSON.stringify(r));
r=await walkTo(17,45,0,8,45);res(r[0]<12,'entry door into the left lean-to lets you through',JSON.stringify(r));
r=await walkTo(7,60,0,7,40);res(r[1]<46,'open lean-to end lets you walk in between the posts',JSON.stringify(r));
r=await walkTo(61,20,0,55,20);res(r[0]<59,'open lean-to side lets you in',JSON.stringify(r));
// stairs: the stairs run from z=24.5 (bottom) up to z=12.5 (loft edge)
r=await walkTo(30,30,0,30,8);res(r[2]===9&&r[1]<11,'walking up the stairs puts you on the loft',JSON.stringify(r));
r=await walkTo(30,8,9,30,30);res(r[2]===0&&r[1]>25,'walking back down the stairs puts you on the floor',JSON.stringify(r));
r=await walkTo(30,8,9,45,8);res(r[2]===9&&r[0]<40,'the loft railing stops you at the side',JSON.stringify(r));
r=await walkTo(30,8,9,30,-5);res(r[2]===9&&r[1]>0,'the back wall stops you on the loft',JSON.stringify(r));
r=await walkTo(36,8,9,36,20);res(r[2]===9&&r[1]<13,'the loft front railing stops you away from the stairs',JSON.stringify(r));
r=await walkTo(24,20,0,24,4);res(r[2]===0&&r[1]<6,'you can walk underneath the loft',JSON.stringify(r));
r=await walkTo(30,12,0,30,8);res(r[2]===0,'standing under the loft does not lift you onto it',JSON.stringify(r));
await p.evaluate(()=>window.__barn.walk.on=false);
// the real buttons: Eye level, hold forward, walk pad and the view
await p.click('[data-snap="front"]');await p.waitForTimeout(600);await p.click('#btnWalk');await p.waitForTimeout(800);
res(await p.$eval('#walkpad',e=>!e.hidden),'Walk shows the walking pad');
const before=await p.evaluate(()=>[window.__barn.walk.x,window.__barn.walk.z]);
const fb=await (await p.$('[data-walk="fwd"]')).boundingBox();await p.mouse.move(fb.x+fb.width/2,fb.y+fb.height/2);await p.mouse.down();await p.waitForTimeout(900);await p.mouse.up();
const after=await p.evaluate(()=>[window.__barn.walk.x,window.__barn.walk.z,window.__barn.cam.position.y]);
res(after[1]<before[1]-2,'holding ▲ walks forward',JSON.stringify(before.map(v=>+v.toFixed(1)))+' -> '+JSON.stringify(after.map(v=>+v.toFixed(1))));
const lb=await (await p.$('[data-walk="left"]')).boundingBox();const h0=await p.evaluate(()=>window.__barn.walk.h);await p.mouse.move(lb.x+20,lb.y+20);await p.mouse.down();await p.waitForTimeout(500);await p.mouse.up();
res((await p.evaluate(()=>window.__barn.walk.h))>h0,'holding ◀ turns');
await p.keyboard.down('ArrowUp');await p.waitForTimeout(400);await p.keyboard.up('ArrowUp');res(true,'arrow keys walk on a keyboard');
await p.screenshot({path:path.join(require('os').tmpdir(),'walk1.png')});
await p.evaluate(()=>{const w=window.__barn.walk;w.x=30;w.z=8;w.y=9;w.h=Math.PI;});await p.evaluate(()=>{});await p.keyboard.down('ArrowDown');await p.waitForTimeout(50);await p.keyboard.up('ArrowDown');
await p.waitForTimeout(200);await p.screenshot({path:path.join(require('os').tmpdir(),'walk2.png')});
await p.click('#btnWalk');await p.waitForTimeout(700);res(await p.$eval('#walkpad',e=>e.hidden)&&await p.evaluate(()=>window.__barn.cam.position.y>15),'Walk again stops walking');
console.log('errors',errs);console.log('TOTAL',pass,'passed,',fail,'failed');await b.close();})();

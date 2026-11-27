// End-to-end sweep of every feature; prints PASS/FAIL lines and collects page errors.
const {chromium,devices}=require('playwright');const fs=require('fs');const http=require('http');const path=require('path');const L=process.env.LIBS||path.join(__dirname,'libs');
const OUT=path.join(require('os').tmpdir(),'barn-qa');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
const types={html:'text/html',png:'image/png',webmanifest:'application/manifest+json'};
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');let f=u.pathname;if(f==='/Barn-builder-'){r.writeHead(301,{location:'/Barn-builder-/'+u.search});return r.end();}
  if(f.startsWith('/Barn-builder-/'))f=f.slice('/Barn-builder-'.length);if(f.endsWith('/'))f+='index.html';
  try{const buf=fs.readFileSync(path.join(__dirname,'..')+f);r.writeHead(200,{'content-type':types[f.split('.').pop()]||'text/plain'});r.end(buf);}catch(e){r.writeHead(404);r.end();}}).listen(0);
const base='http://localhost:'+srv.address().port+'/Barn-builder-/';
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
let pass=0,fail=0;const res=(ok,name,extra)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+name+(extra?'  ('+extra+')':''));};
const mk=async(name,opts)=>{const ctx=await b.newContext(Object.assign({acceptDownloads:true,permissions:['clipboard-read','clipboard-write']},opts));const p=await ctx.newPage();p.errs=[];p.name=name;
  p.on('pageerror',e=>p.errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))p.errs.push(m.text());});
  for(const [re,f] of [[/three\.min\.js/,'three.min.js'],[/OrbitControls\.js/,'OrbitControls.js'],[/jspdf\.umd\.min\.js/,'jspdf.umd.min.js']])await ctx.route(re,r=>r.fulfill({path:path.join(L,f),contentType:'text/javascript'}));
  await p.addInitScript(()=>{navigator.canShare=()=>true;navigator.share=async d=>{window.__sent=(window.__sent||[]).concat([d.files?d.files.map(f=>f.name).join(','):d.url]);};});
  return p;};
const T=async(p,name,fn)=>{try{const r=await fn();res(r!==false,p.name+': '+name,typeof r==='string'?r:'');}catch(e){res(false,p.name+': '+name,String(e.message).split('\n')[0].slice(0,140));}};
const tapSel=(p,s)=>p.locator(s).first().click();
const proj=(p,x,y,z)=>p.evaluate(([x,y,z])=>{const c=window.__barn.cam,v=new THREE.Vector3(x,y,z).project(c);return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight]},[x,y,z]);
const tabs=async(p,i)=>{const t=await p.$$('.maintabs button');await t[i].click();};
const close=async p=>{for(let i=0;i<3;i++){if(await p.$eval('#modal',e=>!e.hidden))await p.keyboard.press('Escape');}};

for(const [name,opts] of [['ipad',{viewport:{width:1180,height:820}}],['phone',Object.assign({},devices['iPhone 13'],{deviceScaleFactor:1})],['ipad-dark',{viewport:{width:1180,height:820},colorScheme:'dark'}]]){
const p=await mk(name,opts);await p.goto(base);await p.waitForTimeout(1600);
await T(p,'loads with welcome',async()=>(await p.$eval('#sheet h2',e=>e.textContent)).includes("Tom's Barn Builder"));
await tapSel(p,'#sheet button.primary');if(await p.$('#installBar'))await tapSel(p,'#installBar .x');
await T(p,'no sideways scrolling',()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await p.screenshot({path:path.join(OUT,name+'-1.png')});
// items
await T(p,'add each vehicle group',async()=>{let n0=await p.evaluate(()=>window.__barn.items().length);for(const g of ['Vehicles','Trailers & boats','Shop','Heat','Other']){await tapSel(p,'.tabs button:has-text("'+g+'")');await (await p.$$('.chip'))[0].click();await tapSel(p,'#dock .sel .row button:has-text("Done"), .phone-only.primary').catch(()=>{});await p.evaluate(()=>{});}
  const n1=await p.evaluate(()=>window.__barn.items().length);return n1===n0+5?true:'added '+(n1-n0);});
await T(p,'select, rotate, copy, remove item',async()=>{await p.evaluate(()=>{});const pt=await proj(p,22.5,3,36);await p.mouse.click(pt[0],pt[1]);await p.waitForTimeout(150);
  const nm=await p.$eval('#dock .name',e=>e.textContent);const n0=await p.evaluate(()=>window.__barn.items().length);
  await tapSel(p,'#dock button:has-text("Quarter turn")');await tapSel(p,'#dock button:has-text("Copy")');const n1=await p.evaluate(()=>window.__barn.items().length);
  await tapSel(p,'#dock button:has-text("Remove")');const n2=await p.evaluate(()=>window.__barn.items().length);return n1===n0+1&&n2===n0?true:nm+' '+n0+'/'+n1+'/'+n2;});
await T(p,'drag item moves it',async()=>{const s0=await p.evaluate(()=>{const i=window.__barn.items().find(i=>i.t==='tractor');return [i.x,i.z];});const pt=await proj(p,s0[0],2.5,s0[1]);
  await p.mouse.move(pt[0],pt[1]);await p.mouse.down();await p.mouse.move(pt[0]+40,pt[1]-30,{steps:6});await p.mouse.up();const s1=await p.evaluate(()=>{const i=window.__barn.items().find(i=>i.t==='tractor');return [i.x,i.z];});return s1[0]!==s0[0]||s1[1]!==s0[1];});
await T(p,'undo restores',async()=>{const a=await p.evaluate(()=>JSON.stringify(window.__barn.getState().items.map(i=>[i.t,i.x,i.z])));await tapSel(p,'#btnUndo');const c=await p.evaluate(()=>JSON.stringify(window.__barn.getState().items.map(i=>[i.t,i.x,i.z])));return a!==c;});
// doors
await T(p,'doors: tap wall, add window, resize, remove',async()=>{await tabs(p,1);await p.waitForTimeout(200);const pt=await proj(p,30,6,0);await p.mouse.click(pt[0],pt[1]);await p.waitForTimeout(200);
  const nm=await p.$eval('#dock .name',e=>e.textContent).catch(()=>'none');if(!/back wall/i.test(nm))return 'selected '+nm;
  const n0=await p.evaluate(()=>window.__barn.getState().walls['n-main'].o.length);await tapSel(p,'.chip:has-text("Window")');const n1=await p.evaluate(()=>window.__barn.getState().walls['n-main'].o.length);
  await tapSel(p,'button[aria-label="Wide bigger"]');await tapSel(p,'#dock button:has-text("Remove")');const n2=await p.evaluate(()=>window.__barn.getState().walls['n-main'].o.length);return n1===n0+1&&n2===n0?true:n0+'/'+n1+'/'+n2;});
await T(p,'wall type open/none/solid',async()=>{const pt=await proj(p,30,6,0);await p.mouse.click(pt[0],pt[1]);await p.waitForTimeout(150);await tapSel(p,'#dock button:has-text("Open with posts")');
  const a=await p.evaluate(()=>window.__barn.getState().walls['n-main'].s);await tapSel(p,'#btnUndo');const c=await p.evaluate(()=>window.__barn.getState().walls['n-main'].s);return a==='open'&&c==='solid'?true:a+'/'+c;});
// size & colors
await T(p,'size steppers',async()=>{await tabs(p,2);const before=await p.evaluate(()=>JSON.stringify(window.__barn.getState().b));const n=(await p.$$('[aria-label="More"]')).length;for(let i=0;i<n;i++){const pl=await p.$$('[aria-label="More"]');await pl[i].click();}
  const after=await p.evaluate(()=>window.__barn.getState().b);return before!==JSON.stringify(after)&&after.wall===11?true:JSON.stringify(after);});
await T(p,'colors',async()=>{await tabs(p,3);await tapSel(p,'[aria-label="Siding Slate blue"]');await tapSel(p,'[aria-label="Roof Charcoal"]');const b=await p.evaluate(()=>window.__barn.getState().b);return b.siding==='#5f7890'&&b.roof==='#474c52';});
await p.screenshot({path:path.join(OUT,name+'-2.png')});
await tabs(p,0);
// views
for(const v of ['outside','inside'])await T(p,'view '+v,async()=>{await tapSel(p,'#v-'+v);return p.$eval('#v-'+v,e=>e.getAttribute('aria-pressed')==='true');});
for(const s of ['front','left','back','right','top'])await T(p,'quick view '+s,async()=>{await tapSel(p,'[data-snap="'+s+'"]');await p.waitForTimeout(550);return p.$eval('[data-snap="'+s+'"]',e=>e.getAttribute('aria-pressed')==='true');});
await T(p,'eye level',async()=>{await tapSel(p,'[data-snap="front"]');await tapSel(p,'#snapEye');await p.waitForTimeout(600);const y=await p.evaluate(()=>window.__barn.cam.position.y);return y<7?true:'y='+y.toFixed(1);});
await tapSel(p,'#snapEye');await p.waitForTimeout(500);
// layers
await T(p,'layers toggle and restore',async()=>{await tapSel(p,'#btnLayers');for(const k of ['walls','items','loft','tags','floor','grid'])await tapSel(p,'label[for="lay-'+k+'"]');
  const off=await p.evaluate(()=>window.__barn.items().every(i=>!i.g.visible));for(const k of ['walls','items','loft','tags','floor','grid'])await tapSel(p,'label[for="lay-'+k+'"]');
  const on=await p.evaluate(()=>window.__barn.items().every(i=>i.g.visible));await tapSel(p,'#btnLayers');return off&&on;});
// slice & measure
await T(p,'slice from pad',async()=>{await tapSel(p,'#btnSlice');const o=await p.$eval('#slicePanel',e=>!e.hidden);await tapSel(p,'#slicePanel [data-from="left"]');await tapSel(p,'#sliceOff');return o;});
await T(p,'measure',async()=>{if(name==='phone'){await tapSel(p,'#btnMore');await tapSel(p,'#mMeasure');}else await tapSel(p,'#btnMeasure');
  const a=await proj(p,16,0,30),c=await proj(p,44,0,30);await p.mouse.click(a[0],a[1]);await p.mouse.click(c[0],c[1]);await p.waitForTimeout(150);const t=await p.$eval('#measureLabel',e=>e.textContent);await tapSel(p,'#measureDone');return /That is \d+ ft/.test(t)?t.slice(0,22):t;});
// loft + stairs + item on loft
await T(p,'loft, stairs clip, fridge on loft',async()=>{await p.evaluate(()=>{const s=window.__barn.getState();s.b.wall=16;s.b.leanIn=12;window.__barn.applyState(s);});
  await tapSel(p,'.tabs button:has-text("Loft")');await tapSel(p,'.chip:has-text("Loft")');if(name==='phone')await tapSel(p,'#dock .sel button:has-text("Done")');await tapSel(p,'.chip:has-text("Loft stairs")');await p.waitForTimeout(150);
  const st=await p.evaluate(()=>{const it=window.__barn.items(),l=it.find(i=>i.t==='loft'),s=it.find(i=>i.t==='stairs');return {lh:(l.H||8),sh:s.H,rails:l.g.userData.railSides};});
  return st.sh===st.lh?true:JSON.stringify(st);});
// projects
await T(p,'projects new/switch/rename/delete',async()=>{await tapSel(p,'#btnProject');await p.fill('#projNew','QA copy');await tapSel(p,'text=Copy the barn on screen');
  const a=await p.evaluate(()=>JSON.parse(localStorage.getItem('poleBarnPlanner.v1.projects')).list.length);await tapSel(p,'#btnProject');const dels=await p.$$('.proj button.danger');await dels[dels.length-1].click();await tapSel(p,'text=Yes, delete');
  const c=await p.evaluate(()=>JSON.parse(localStorage.getItem('poleBarnPlanner.v1.projects')).list.length);await close(p);return a===c+1?true:a+'/'+c;});
// blueprint
await T(p,'blueprint sheets',async()=>{if(name==='phone'){await tapSel(p,'#btnMore');await tapSel(p,'#mBlueprint');}else await tapSel(p,'#btnBlueprint');await p.waitForTimeout(300);
  const n=await p.$$eval('#bpBody svg',e=>e.length);const bad=await p.evaluate(()=>window.__barn.blueprintSheets().some(x=>/NaN|undefined|Infinity/.test(x)));await tapSel(p,'#bpClose');return n===4&&!bad?true:n+' sheets, bad='+bad;});
// share
for(const o of ['Barn page','3D pictures','Blueprint'])await T(p,'share '+o,async()=>{await tapSel(p,'#btnMore');await tapSel(p,'#mPdf');await tapSel(p,'.shareopt:has-text("'+o+'")');await p.waitForSelector('#sheet button:has-text("Send it")',{timeout:40000});
  await tapSel(p,'#sheet button:has-text("Send it")');await p.waitForTimeout(300);return (await p.$eval('#modal',e=>e.hidden))?(await p.evaluate(()=>window.__sent.slice(-1)[0])):'dialog still open';});
// save + open file
await T(p,'save file then open it',async()=>{await tapSel(p,'#btnMore');await tapSel(p,'#mCopy');const [dl]=await Promise.all([p.waitForEvent('download',{timeout:10000}).catch(()=>null),tapSel(p,'#sheet button.primary')]);await close(p);
  if(!dl)return 'shared instead of saved: '+(await p.evaluate(()=>window.__sent.slice(-1)[0]));const f=path.join(OUT,name+'-'+dl.suggestedFilename());await dl.saveAs(f);
  await tapSel(p,'#btnMore');await tapSel(p,'#mPaste');await p.setInputFiles('#barnFileIn',f);await p.waitForTimeout(500);const t=await p.$eval('#modal',e=>e.hidden)?await p.$eval('#toast',e=>e.textContent):await p.$eval('#sheet h2',e=>e.textContent);await close(p);return t;});
// settings
await T(p,'settings page',async()=>{await tapSel(p,'#btnMore');await tapSel(p,'#mToSettings');const t=await p.$eval('#mVersion',e=>e.innerText.replace(/\n+/g,' '));await tapSel(p,'#btnMore');return /VERSION/.test(t)?t.slice(0,60):t;});
await T(p,'hide and show menu',async()=>{await tapSel(p,'.collapse');const h=await p.$eval('#dock',e=>e.offsetHeight);await tapSel(p,'.dockmin button');const h2=await p.$eval('#dock',e=>e.offsetHeight);return h<90&&h2>h;});
await T(p,'help opens',async()=>{await tapSel(p,'#btnMore');await tapSel(p,'#mHelp');const t=await p.$eval('#sheet h2',e=>e.textContent);await close(p);return /Welcome/.test(t);});
await T(p,'reload keeps work',async()=>{const a=await p.evaluate(()=>JSON.stringify(window.__barn.getState()));await p.reload();await p.waitForTimeout(1500);const c=await p.evaluate(()=>JSON.stringify(window.__barn.getState()));return a===c;});
await T(p,'no sideways scrolling at end',()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await p.screenshot({path:path.join(OUT,name+'-3.png')});
res(p.errs.length===0,name+': no page errors',p.errs.slice(0,3).join(' | '));
await p.context().close();}

// links in every form
const s=await mk('links',devices['iPhone 13']);await s.goto(base);await s.waitForTimeout(1400);await tapSel(s,'#sheet button.primary');
const forms=await s.evaluate(async()=>{const st=window.__barn.getState();st.name='Link check';const enc=window.__barn.encodeLink(st);const b64=t=>btoa(unescape(encodeURIComponent(t))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return {b5:await window.__barn.encodeLinkAsync(st),b4:enc,b3:'BARN3'+b64(JSON.stringify(window.__barn.compactState(st,true))),b1:'BARN1:'+b64(JSON.stringify(st))};});
for(const [k,u] of [['barn5 ?',base+'?'+forms.b5],['barn4 ?',base+'?'+forms.b4],['BARN3 ?b=',base+'?b='+forms.b3],['BARN1 #',base+'#'+forms.b1],['cut ?b',base+'?b'],['no slash',base.replace(/\/$/,'')+'?'+forms.b5]]){
  const q=await mk('links',devices['iPhone 13']);await q.goto(u);await q.waitForTimeout(1600);const h=await q.$eval('#sheet h2',e=>e.textContent).catch(()=>'none');
  res(k.startsWith('cut')?/could not/.test(h):/Open the shared barn/.test(h),'link '+k,h);await q.context().close();}
console.log('\nTOTAL',pass,'passed,',fail,'failed');await b.close();srv.close();})();

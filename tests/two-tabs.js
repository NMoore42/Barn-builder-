// Two copies of the app open on the same barn: work done in one must not be wiped out by the other.
const {chromium}=require('playwright');const path=require('path');const L=process.env.LIBS||path.join(__dirname,'libs');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx=await b.newContext({viewport:{width:1180,height:820}});for(const [re,f] of [[/three\.min\.js/,'three.min.js'],[/OrbitControls\.js/,'OrbitControls.js'],[/jspdf\.umd\.min\.js/,'jspdf.umd.min.js']])await ctx.route(re,r=>r.fulfill({path:path.join(L,f),contentType:'text/javascript'}));
const errs=[];const open=async()=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+path.join(__dirname,'..','index.html'));await p.waitForTimeout(1400);return p;};
const A=await open();await A.click('#sheet button.primary');
const B=await open();
// B (the newer tab) makes changes: green siding and a golf cart
await B.bringToFront();await (await B.$$('.maintabs button'))[3].click();await B.click('[aria-label="Siding Forest green"]');await (await B.$$('.maintabs button'))[0].click();
await B.click('.tabs button:has-text("Vehicles")');await B.click('.chip:has-text("Club Car")');await B.waitForTimeout(300);
// back to A (the old tab): it should now show B's work; then A makes its own change
await A.bringToFront();await A.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});await A.waitForTimeout(300);
const seen=await A.evaluate(()=>{const s=window.__barn.getState();return {siding:s.b.siding,cart:s.items.some(i=>i.t==='golfcart')};});
console.log('old tab shows the newer work when you return to it:',JSON.stringify(seen));
await (await A.$$('.maintabs button'))[3].click();await A.click('[aria-label="Roof Black"]');await A.waitForTimeout(200);
const saved=await A.evaluate(()=>{const l=JSON.parse(localStorage.getItem('poleBarnPlanner.v1.projects'));const s=JSON.parse(localStorage.getItem('poleBarnPlanner.v1.p.'+l.cur));return {siding:s.b.siding,roof:s.b.roof,cart:s.items.some(i=>i.t==='golfcart')};});
console.log('after a change in the old tab, saved barn keeps both:',JSON.stringify(saved),saved.siding==='#3f5a44'&&saved.cart&&saved.roof==='#26282b'?'PASS':'FAIL');
console.log('errors',errs);await b.close();})();

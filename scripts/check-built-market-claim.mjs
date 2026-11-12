import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist/nobrainer/browser');
const base = '/pj-nobrainer/';
const saveKey = 'nobrainer_save_v1';
assert.ok(existsSync(join(root,'index.html')));
const browser = ['google-chrome','google-chrome-stable','chromium','chromium-browser'].find(name =>
  spawnSync('which',[name],{encoding:'utf8'}).status===0);
assert.ok(browser,'Chromium fehlt.');
const now=Date.now();
const fixture=JSON.stringify({
  saveVersion:21,savedAt:now,
  state:{
    gold:500,
    marketJobs:[
      {type:'material',materialId:1,quantity:1,valueNickel:123,seconds:1,
        startedAt:now-3000,finishesAt:now-2000},
      {type:'weapon',name:'Testklinge',weaponId:912,
        weaponSnapshot:{id:912,name:'Testklinge',valueNickel:231},
        valueNickel:231,seconds:1,startedAt:now-3000,finishesAt:now-2000}
    ],
    marketQueue:[]
  }
});
const seed=`<script>
window.__claimErrors=[];
window.addEventListener('error',e=>window.__claimErrors.push(String(e.error?.stack||e.message||e.error)));
window.addEventListener('unhandledrejection',e=>window.__claimErrors.push(String(e.reason?.stack||e.reason)));
localStorage.setItem(${JSON.stringify(saveKey)},${JSON.stringify(fixture)});
</script>`;
const probe=`<script>
(() => {
 const finish = value => {
   if(document.getElementById('marketClaimE2EResult'))return;
   const node=document.createElement('pre');
   node.id='marketClaimE2EResult';
   node.textContent=JSON.stringify({
     ...value, errors:window.__claimErrors,
     runtimeError:document.querySelector('.legacy-host')?.getAttribute('data-runtime-error')||''
   });
   document.body.appendChild(node);
 };
 const read=()=>{try{return JSON.parse(localStorage.getItem(${JSON.stringify(saveKey)}))?.state||{}}catch{return {}}};
 const start=Date.now();
 const timer=setInterval(()=>{
   const ready=document.getElementById('marketReadyCard');
   const singles=ready?.querySelectorAll('button[data-market-claim-id]');
   if(singles?.length===2){
     clearInterval(timer);
     const before=read();
     const id=singles[0].dataset.marketClaimId;
     singles[0].click();
     const afterSingle=read();
     const firstAfter=ready.querySelector('button[data-market-claim-id]');
     // A second click on a spent ID must not credit Nickel again.
     const remaining=Array.from(ready.querySelectorAll('button[data-market-claim-id]')).map(x=>x.dataset.marketClaimId);
     const all=ready.querySelector('button[data-market-claim-all]');
     all?.click();
     const afterAll=read();
     finish({status:'tested',id,remaining,hasAll:!!all,
       before:{gold:before.gold,ready:before.marketReadyJobs?.length||0,active:before.marketJobs?.length||0},
       afterSingle:{gold:afterSingle.gold,ready:afterSingle.marketReadyJobs?.length||0},
       afterAll:{gold:afterAll.gold,ready:afterAll.marketReadyJobs?.length||0},
       stillOnScreen:document.querySelectorAll('#marketReadyCard button[data-market-claim-id]').length});
     return;
   }
   if(Date.now()-start>4500){
     clearInterval(timer);
     finish({status:'missing-ready',buttons:singles?.length||0,market:!!document.getElementById('marketJobCard'),snapshot:read()});
   }
 },50);
})();
</script>`;
const types=new Map([['.html','text/html; charset=utf-8'],['.js','application/javascript; charset=utf-8'],
 ['.css','text/css; charset=utf-8'],['.json','application/json'],['.png','image/png'],
 ['.svg','image/svg+xml'],['.ico','image/x-icon']]);
const server=createServer((request,response)=>{
 const url=new URL(request.url??'/','http://127.0.0.1');
 if(!url.pathname.startsWith(base)){response.writeHead(404).end('Not found');return;}
 let relative=decodeURIComponent(url.pathname.slice(base.length));
 if(!relative)relative='index.html';
 const safe=normalize(relative).replace(/^(\.\.(\/|\\|$))+/,'');
 const file=join(root,safe);
 if(!existsSync(file)){response.writeHead(404).end('Not found');return;}
 let buffer=readFileSync(file);
 if(safe==='index.html')buffer=Buffer.from(buffer.toString('utf8').replace('</head>',seed+'</head>').replace('</body>',probe+'</body>'));
 response.writeHead(200,{'content-type':types.get(extname(file))??'application/octet-stream','cache-control':'no-store'}).end(buffer);
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const folder=mkdtempSync(join(tmpdir(),'eldravar-market-claim-'));
let child=null;
try{
 const addr=server.address();assert.ok(addr&&typeof addr==='object');
 child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--no-first-run','--no-default-browser-check',`--user-data-dir=${folder}`,
  '--virtual-time-budget=6500','--dump-dom',`http://127.0.0.1:${addr.port}${base}`],
  {stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
 child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 assert.equal(code,0,stderr.slice(-3000));
 const match=stdout.match(/<pre id="marketClaimE2EResult">([^<]+)<\/pre>/);
 assert.ok(match,`Market-Claim-Ergebnis fehlt: ${stderr.slice(-1200)} ${stdout.slice(-4000)}`);
 const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
 assert.equal(result.status,'tested',JSON.stringify(result).slice(0,2500));
 assert.deepEqual(result.errors,[],JSON.stringify(result));
 assert.equal(result.runtimeError,'',JSON.stringify(result));
 assert.deepEqual(result.before,{gold:500,ready:2,active:0});
 assert.deepEqual(result.afterSingle,{gold:623,ready:1});
 assert.deepEqual(result.afterAll,{gold:854,ready:0});
 assert.equal(result.remaining.includes(result.id),false);
 assert.equal(result.stillOnScreen,0);
 console.log('S15 Markt-Browserclaim: Save21-Altjobs, Ready-Anzeige, einmalige Einzel- und Sammelauszahlung als Save22 geprüft.');
}finally{
 if(child&&child.exitCode===null){child.kill('SIGTERM');await Promise.race([
   new Promise(resolve=>child.once('close',resolve)),
   new Promise(resolve=>setTimeout(resolve,1500))
 ]);if(child.exitCode===null)child.kill('SIGKILL');}
 rmSync(folder,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 await new Promise(resolve=>server.close(resolve));
}

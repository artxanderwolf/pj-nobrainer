import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {extname,join,normalize,resolve} from 'node:path';

const root=resolve('dist/nobrainer/browser'),base='/pj-nobrainer/';
assert.ok(existsSync(join(root,'index.html')),'Angular-Index fehlt');
const browser=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
assert.ok(browser,'Browser fehlt');
const probe=`<script>
(()=>{
 let done=false;
 const finish=result=>{
  if(done)return;done=true;
  const p=document.createElement('pre');p.id='cityWorkerE2EResult';
  p.textContent=JSON.stringify({...result,errors:window.__workerErrors||[],
    runtimeError:document.querySelector('.legacy-host')?.getAttribute('data-runtime-error')||''});
  document.body.appendChild(p);
 };
 const timer=setInterval(()=>{
  const city=document.getElementById('cityOverview');
  const controls=Array.from(city?.querySelectorAll('select[data-city-worker-select]')||[]);
  if(controls.length>=2){
   clearInterval(timer);
   try{
    const forge=controls.find(c=>c.dataset.cityWorkerSelect==='building-3');
    const market=controls.find(c=>c.dataset.cityWorkerSelect==='building-4');
    if(!forge||!market)throw Error('Stammbetriebe nicht mit Helferzuweisung verbunden');
    const candidate=Array.from(forge.options).find(o=>o.value);
    if(!candidate){
      // The starter hero belongs to the idle starter team in a brand-new game.
      // Release the idle selection in this *test fixture* and reload, as a player
      // would do from their team screen before making them a city helper.
      if(sessionStorage.getItem('__s16_unassigned_team'))throw Error('Trotz freigegebener Teamplätze kein Helfer verfügbar');
      const previous=JSON.parse(localStorage.getItem('nobrainer_save_v1')||'{}');
      if(!previous.state?.characters?.length)throw Error('Frischer Spielstand hat keinen Kaderhelden');
      for(const team of Object.values(previous.state.teams||{})){
        if(team.expeditionActive||team.dungeonRun)throw Error('Test darf keinen laufenden Dungeonlauf abziehen');
        team.dungeonTeamSlots=[null,null,null,null];
        team.dungeonCycleOriginalIds=[];team.dungeonCycleActiveIds=[];
      }
      previous.savedAt=Date.now();
      // Bootstrap script restores the prepared fixture before Angular starts;
      // the previous runtime may otherwise overwrite localStorage on unload.
      sessionStorage.setItem('__s16_pending_seed',JSON.stringify(previous));
      sessionStorage.setItem('__s16_unassigned_team','true');
      location.reload();
      return;
    }
    const id=Number(candidate.value);
    forge.value=candidate.value;
    forge.dispatchEvent(new Event('change',{bubbles:true}));
    const first=JSON.parse(localStorage.getItem('nobrainer_save_v1')||'{}');
    const assigned=first.state?.cityLayout?.buildings.find(b=>b.buildingInstanceId==='building-3');
    const marketAfter=document.querySelector('select[data-city-worker-select="building-4"]');
    const noDuplicate=!Array.from(marketAfter?.options||[]).some(o=>o.value===String(id));
    const forgeAfter=document.querySelector('select[data-city-worker-select="building-3"]');
    forgeAfter.value='';
    forgeAfter.dispatchEvent(new Event('change',{bubbles:true}));
    const second=JSON.parse(localStorage.getItem('nobrainer_save_v1')||'{}');
    const unassigned=second.state?.cityLayout?.buildings.find(b=>b.buildingInstanceId==='building-3');
    const restored=document.querySelector('select[data-city-worker-select="building-4"]');
    finish({status:'tested',candidateId:id,assignedId:assigned?.workerCharacterId,
     assignedSpeedNote:!!document.querySelector('.city-placement-notice')?.textContent?.includes('Grundarbeiter'),
     noDuplicate,unassignedId:unassigned?.workerCharacterId,
     candidateRestored:Array.from(restored?.options||[]).some(o=>o.value===String(id)),
     saveVersion:first.saveVersion,finalVersion:second.saveVersion});
   }catch(e){finish({status:'error',error:String(e?.stack||e)});}
   return;
  }
 },50);
 setTimeout(()=>{clearInterval(timer);finish({status:'timeout',controls:document.querySelectorAll('select[data-city-worker-select]').length});},4800);
})();
</script>`;
const seedScript=`<script>
const prepared = sessionStorage.getItem('__s16_pending_seed');
if (prepared) { localStorage.setItem('nobrainer_save_v1',prepared); sessionStorage.removeItem('__s16_pending_seed'); }
</script>`;
const catchScript=`<script>
window.__workerErrors=[];
window.addEventListener('error',e=>window.__workerErrors.push(String(e.error?.stack||e.message||e.error)));
window.addEventListener('unhandledrejection',e=>window.__workerErrors.push(String(e.reason?.stack||e.reason)));
</script>`;
const types=new Map([['.html','text/html; charset=utf-8'],['.js','application/javascript; charset=utf-8'],
 ['.css','text/css; charset=utf-8'],['.json','application/json'],['.svg','image/svg+xml'],['.png','image/png'],['.ico','image/x-icon']]);
const server=createServer((request,response)=>{
 const url=new URL(request.url??'/','http://127.0.0.1');
 if(!url.pathname.startsWith(base)){response.writeHead(404).end('Not found');return;}
 let relative=decodeURIComponent(url.pathname.slice(base.length));
 if(!relative)relative='index.html';
 const safe=normalize(relative).replace(/^(\.\.(\/|\\|$))+/,'');
 const file=join(root,safe);
 if(!existsSync(file)){response.writeHead(404).end('Not found');return;}
 let data=readFileSync(file);
 if(safe==='index.html')data=Buffer.from(data.toString('utf8').replace('</head>',seedScript+catchScript+'</head>').replace('</body>',probe+'</body>'));
 response.writeHead(200,{'content-type':types.get(extname(file))??'application/octet-stream','cache-control':'no-store'}).end(data);
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const profile=mkdtempSync(join(tmpdir(),'eldravar-workers-'));
let child=null;
try{
 const a=server.address();assert.ok(a&&typeof a==='object');
 child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run',
  '--no-default-browser-check',`--user-data-dir=${profile}`,'--virtual-time-budget=7000',
  '--dump-dom',`http://127.0.0.1:${a.port}${base}`],{stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
 child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 assert.equal(code,0,stderr.slice(-1800));
 const match=stdout.match(/<pre id="cityWorkerE2EResult">([^<]+)<\/pre>/);
 assert.ok(match,`S16 Browserergebnis fehlt: ${stdout.slice(-3500)}`);
 const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
 assert.equal(result.status,'tested',JSON.stringify(result));
 assert.deepEqual(result.errors,[],JSON.stringify(result));
 assert.equal(result.runtimeError,'',JSON.stringify(result));
 assert.equal(result.assignedId,result.candidateId);
 assert.equal(result.noDuplicate,true);
 assert.equal(result.unassignedId,null);
 assert.equal(result.candidateRestored,true);
 assert.equal(result.saveVersion,23);
 assert.equal(result.finalVersion,23);
 console.log('S16 Browser: Grundarbeiter, Kaderhelfer-Zuweisung, Doppelreservierung und Save23 erfolgreich.');
}finally{
 if(child&&child.exitCode===null){child.kill('SIGTERM');
 await Promise.race([new Promise(resolve=>child.once('close',resolve)),
   new Promise(resolve=>setTimeout(resolve,1500))]);
 if(child.exitCode===null)child.kill('SIGKILL');}
 rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 await new Promise(resolve=>server.close(resolve));
}

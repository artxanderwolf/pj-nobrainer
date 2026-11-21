import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const dist = resolve('dist/nobrainer/browser');
const base = '/pj-nobrainer/';
const browser = process.env.CHROME_BIN || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(candidate => spawnSync('which', [candidate]).status === 0);
assert.ok(browser, 'Chrome/Chromium fehlt (optional CHROME_BIN setzen).');
assert.ok(existsSync(join(dist, 'index.html')));
const early = `<script>
const pending=sessionStorage.getItem('quality_next');if(pending){localStorage.setItem('nobrainer_save_v1',pending);sessionStorage.removeItem('quality_next');}
window.__qualityErrors=[];window.addEventListener('error',e=>window.__qualityErrors.push(String(e.error?.stack||e.message)));window.addEventListener('unhandledrejection',e=>window.__qualityErrors.push(String(e.reason?.stack||e.reason)));window.confirm=()=>true;window.alert=message=>{throw Error(message)};
</script>`;
const probe = String.raw`<script>
(()=>{
 const key='nobrainer_save_v1',phaseKey='quality_phase',proofKey='quality_proof';
 const check=(ok,message)=>{if(!ok)throw Error(message)};
 const read=()=>JSON.parse(localStorage.getItem(key));
 const click=selector=>{const node=document.querySelector(selector);check(node,'Missing '+selector);node.click();return node;};
 const save=()=>{click('#saveTransferSaveBtn');return read();};
 const seed=(data,phase)=>{sessionStorage.setItem('quality_next',JSON.stringify(data));localStorage.setItem(phaseKey,phase);location.reload();};
 const finish=result=>{const node=document.createElement('pre');node.id='qualityE2EResult';node.textContent=JSON.stringify({...result,errors:window.__qualityErrors,runtimeError:document.querySelector('[data-runtime-error]')?.getAttribute('data-runtime-error')||''});document.body.append(node);};
 const select=(id,value)=>{const node=document.getElementById(id);node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));check(node.value===value,'Selection lost '+id+' '+value);};
 const timer=setInterval(()=>{
  if(!document.getElementById('saveTransferSaveBtn')||!localStorage.getItem(key))return;
  clearInterval(timer);
  try{
   const phase=localStorage.getItem(phaseKey)||'fresh';
   if(phase==='fresh'){
    const data=save(),s=data.state;delete s.materialQualitySchema;data.saveVersion=27;
    s.inventory={'3':{materialId:3,qty:9},'4':{materialId:4,qty:5}};
    const stats=structuredClone(s.weaponInventory[0].stats);
    const slots=[{slot:'workingPart',materialId:3},{slot:'back',materialId:3},{slot:'gripCore',materialId:3},{slot:'gripWrap',materialId:8}];
    s.weaponInventory.push({id:7,name:'Altbestand',weaponForm:'dagger',slots,stats,valueNickel:123,craftedSeconds:97,raritySnapshot:2,runeSockets:[null],runeMigrationVersion:1});s.nextWeaponId=8;
    s.forgeReadyJobs=[{jobId:'forge-job-1',status:'ready',weaponName:'Alter Auftrag',weaponForm:'dagger',slots,stats,valueNickel:127,performance:1,totalSeconds:97}];s.nextForgeJobNumber=2;
    localStorage.setItem(proofKey,JSON.stringify({oldStats:stats}));seed(data,'migrated');return;
   }
   const proof=JSON.parse(localStorage.getItem(proofKey));
   if(phase==='migrated'){
    const data=save(),s=data.state;
    check(data.saveVersion===28&&s.materialQualitySchema===1,'Save28 marker');check(s.inventory['3:2'].qty===9,'Old quantity/quality');
    const old=s.weaponInventory.find(w=>w.id===7);check(JSON.stringify(old.stats)===JSON.stringify(proof.oldStats)&&old.valueNickel===123,'Old weapon changed');
    const job=s.forgeReadyJobs[0];check(job.totalSeconds===97&&job.valueNickel===127&&JSON.stringify(job.stats)===JSON.stringify(proof.oldStats),'Old reservation changed');
    click('[data-forge-claim-id="forge-job-1"]');const claimed=save().state.weaponInventory.find(w=>w.name==='Alter Auftrag');check(JSON.stringify(claimed.stats)===JSON.stringify(proof.oldStats)&&claimed.valueNickel===127,'Old claim changed');
    const next=save();next.state.inventory['4:6']={materialId:4,quality:6,category:'Metall',qty:3};next.state.inventory['2:4']={materialId:2,quality:4,category:'Holz',qty:1};next.state.inventory['9:5']={materialId:9,quality:5,category:'Leder',qty:1};
    proof.migrated=true;proof.oldClaim=true;localStorage.setItem(proofKey,JSON.stringify(proof));seed(next,'craft');return;
   }
   if(phase==='craft'){
    window.go('forge-form');select('weaponForm','dagger');
    click('[data-forge-material-slot="workingPart"]');check(document.querySelector('[data-forge-material-id="4"][data-quality="1"]')&&document.querySelector('[data-forge-material-id="4"][data-quality="6"]'),'Distinct quality choices');click('[data-forge-material-id="4"][data-quality="6"]');
    select('slotBack','4:1');select('slotGripCore','2:4');select('slotGripWrap','9:5');click('#forgePreviewNextBtn');check(!document.getElementById('forgeStartBtn').disabled,'Cannot craft');click('#forgeStartBtn');
    let data=save(),s=data.state,job=s.forgeJobs[0];check(job&&JSON.stringify(job.slots.map(x=>x.quality))==='[6,1,4,5]','Craft quality lost');check(s.inventory['4:1'].qty===4&&s.inventory['4:6'].qty===2,'Craft mixed stock');
    proof.newStats=job.stats;proof.newSlots=job.slots;
    window.go('market-materials');const input=document.querySelector('input[data-material-id="4"][data-quality="6"]');check(input,'No S6 sale');input.closest('.sell-row').querySelector('button.primary').click();
    data=save();check(data.state.marketJobs[0].quality===6&&data.state.inventory['4:6'].qty===1,'Sale wrong quality');click('[data-market-cancel="active"]');data=save();check(data.state.inventory['4:6'].qty===2&&data.state.inventory['4:1'].qty===4,'Cancel returned wrong quality');proof.marketCancel=true;
    const quality=document.getElementById('materialIndexQuality');quality.value='6';quality.dispatchEvent(new Event('change'));check(document.querySelectorAll('#materialIndexRows tr[data-quality="6"]').length===77,'S6 index incomplete');
    job=data.state.forgeJobs.shift();job.status='ready';job.remainingWorkSeconds=0;data.state.forgeReadyJobs.push(job);localStorage.setItem(proofKey,JSON.stringify(proof));seed(data,'claim');return;
   }
   if(phase==='claim'){
    const before=save().state.weaponInventory.length;click('[data-forge-claim-id]');const data=save(),weapon=data.state.weaponInventory[0];
    check(data.state.weaponInventory.length===before+1&&weapon.raritySnapshot===1,'Claim rarity');check(JSON.stringify(weapon.slots)===JSON.stringify(proof.newSlots),'Claim material qualities');check(JSON.stringify(weapon.stats)===JSON.stringify(proof.newStats),'Claim stats');check(weapon.runeSockets.length===0,'Runes changed');
    check(document.querySelector('#weaponInventory').textContent.includes('S6'),'Weapon parts lack quality');
    finish({status:'passed',oldMigration:proof.migrated,oldClaim:proof.oldClaim,craftQualities:weapon.slots.map(x=>x.quality),marketCancel:proof.marketCancel,indexCombinations:462,reloadedClaim:true});
   }
  }catch(error){finish({status:'failed',message:String(error.stack||error),phase:localStorage.getItem(phaseKey),inventory:read()?.state?.inventory,marker:read()?.state?.materialQualitySchema});}
 },50);
})();
</script>`;
const types = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
const server = createServer((req,res) => {
 const url=new URL(req.url,'http://127.0.0.1');
 const file=resolve(dist,decodeURIComponent(url.pathname.slice(base.length))||'index.html');
 if(!url.pathname.startsWith(base)||!file.startsWith(dist+'/')&&!file.startsWith(dist+'\\')||!existsSync(file)){res.writeHead(404).end();return;}
 let data=readFileSync(file);
 if(file===join(dist,'index.html'))data=Buffer.from(data.toString().replace('</head>',early+'</head>').replace('</body>',probe+'</body>'));
 res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(data);
});
await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
const profile=mkdtempSync(join(tmpdir(),'eldravar-quality-'));
let child;
try {
 child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--virtual-time-budget=18000','--dump-dom',`http://127.0.0.1:${server.address().port}${base}`]);
 let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
 const watchdog=setTimeout(()=>child.kill(),60000);
 const code=await new Promise((done,fail)=>{child.once('error',fail);child.once('close',done);});clearTimeout(watchdog);
 assert.equal(code,0,stderr.slice(-2000));
 const match=stdout.match(/<pre id="qualityE2EResult">([^<]+)<\/pre>/);
 assert.ok(match,`Kein Testergebnis: ${stdout.slice(-4000)}\n${stderr.slice(-1000)}`);
 const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&').replaceAll('&gt;','>').replaceAll('&lt;','<'));
 assert.equal(result.status,'passed',JSON.stringify(result));assert.deepEqual(result.errors,[]);assert.equal(result.runtimeError,'');
 console.log('Materialqualitaet-Browserregression: '+JSON.stringify(result));
} finally {
 if(child?.exitCode===null)child.kill();
 await new Promise(done=>server.close(done));
 rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}

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
window.__equipmentErrors=[]; window.__equipmentAlerts=[];
window.addEventListener('error',e=>window.__equipmentErrors.push(String(e.error?.stack||e.message)));
window.addEventListener('unhandledrejection',e=>window.__equipmentErrors.push(String(e.reason?.stack||e.reason)));
window.alert=message=>window.__equipmentAlerts.push(String(message)); window.confirm=()=>true;
</script>`;
const probe = String.raw`<script>
(() => {
 const key='nobrainer_save_v1', phaseKey='__equipment_phase', reportKey='__equipment_report';
 const read=()=>JSON.parse(localStorage.getItem(key));
 const save=()=>{document.getElementById('saveTransferSaveBtn').click();return read();};
 const check=(condition,message)=>{if(!condition)throw new Error(message);};
 const click=selector=>{const node=document.querySelector(selector);check(node,'Fehlendes Element: '+selector);node.click();return node;};
 const finish=result=>{const node=document.createElement('pre');node.id='equipmentE2EResult';node.textContent=JSON.stringify({...result,errors:window.__equipmentErrors,runtimeError:document.querySelector('[data-runtime-error]')?.getAttribute('data-runtime-error')||''});document.body.appendChild(node);};
 const open=id=>{document.querySelector('[data-character-modal="roster"] .character-modal-close')?.click();click('#rosterCard [data-roster-action="select-character"][data-character-id="'+id+'"]');};
 const picker=hand=>click('.roster-equipment-slot[data-hand="'+hand+'"]');
 const equip=(id,hand)=>click('[data-roster-action="equip-weapon"][data-hand="'+hand+'"][data-weapon-id="'+id+'"]');
 const clear=hand=>{picker(hand);click('[data-roster-action="clear-hand"][data-hand="'+hand+'"]');};
 const factor=()=>Number(document.querySelector('[data-equipment-factor]').dataset.equipmentFactor);
 const forms=['dagger','sword','sword2h','axe1h','axe2h','bow','staff'];
 const allowed={recruit:[1,1,1,1,1,0,1],fighter:[0,1,1,1,1,0,0],archer:[1,1,0,1,0,1,0],scholar:[1,0,0,0,0,0,1]};
 const started=Date.now();
 const timer=setInterval(()=>{
  if(!document.querySelector('#rosterCard [data-roster-action="select-character"]')||!document.getElementById('saveTransferSaveBtn')){
   if(Date.now()-started>8000){clearInterval(timer);finish({status:'not-ready'});} return;
  }
  clearInterval(timer);
  try {
   const phase=localStorage.getItem(phaseKey)||'fresh';
   if(phase==='fresh'){
    const initial=save();
    check(initial.saveVersion===16,'Save-Version verändert');
    const starter=initial.state.weaponInventory.find(w=>w.id===0);
    check(starter?.weaponForm==='sword','Startschwert ohne stabile Waffenform');
    check(initial.state.characters[0].equipment.rightHand===0,'Startschwert abgelegt');
    const fixture=structuredClone(initial), model=fixture.state.characters[0];
    fixture.savedAt=Date.now();
    fixture.state.characters=Object.keys(allowed).map((classId,i)=>({...structuredClone(model),id:i+1,name:classId,classId,hp:7,energy:3,equipment:{leftHand:null,rightHand:null}}));
    fixture.state.weaponInventory=[starter,...forms.map((weaponForm,i)=>({...structuredClone(starter),id:101+i,starter:false,weaponType:'sword',weaponForm,name:'Test '+weaponForm,slots:[],marker:'item-'+(101+i)}))];
    localStorage.setItem('__equipment_model',JSON.stringify(fixture));
    localStorage.setItem(phaseKey,'matrix');
    const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(fixture)],'Klassen.json',{type:'application/json'}));
    const input=document.getElementById('saveTransferImportInput');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));return;
   }
   if(phase==='matrix'){
    let combinations=0;
    for(const [classId,entries] of Object.entries(allowed)){
     const id=Object.keys(allowed).indexOf(classId)+1;open(id);picker('leftHand');
     entries.forEach((permitted,i)=>{
      const button=document.querySelector('[data-roster-action="equip-weapon"][data-weapon-id="'+(101+i)+'"]');
      check(button&&button.disabled===!permitted,classId+'/'+forms[i]+' Freigabe falsch: '+(button?.outerHTML||'missing')+' '+JSON.stringify(read().state.weaponInventory.map(w=>w.id)));
      const preview=document.querySelector('[data-equipment-preview="'+(101+i)+'"]');
      check(Boolean(preview)===Boolean(permitted),'Vorschau für verbotene Waffe oder fehlende Vorschau');combinations++;
      const options=[...document.querySelectorAll('select[data-weapon-inventory-select="'+(101+i)+'"] option')].filter(o=>o.value.startsWith(id+':'));
      check(Boolean(options.length)===Boolean(permitted),'Lagerziel widerspricht Kader: '+classId+'/'+forms[i]);
     });
     picker('leftHand');
    }
    open(1);picker('leftHand');equip(102,'leftHand');picker('rightHand');
    check(document.querySelector('[data-equipment-preview="101"]').textContent.includes('82,5'),'Schwert-Dolch-Vorschau fehlt');
    equip(101,'rightHand');check(Math.abs(factor()-.825)<1e-12,'Schwert+Dolch nicht 82,5 %');
    clear('rightHand');picker('rightHand');equip(104,'rightHand');check(factor()===.75,'Zwei Einhänder nicht 75 %');
    clear('rightHand');clear('leftHand');
    for(const [id,weaponId] of [[2,103],[3,106],[4,107]]){open(id);picker('leftHand');equip(weaponId,'leftHand');check(factor()===1.1,'Klassenpräferenz fehlt');clear('leftHand');}
    open(2);picker('leftHand');equip(102,'leftHand');picker('rightHand');
    check(document.querySelector('[data-roster-action="equip-weapon"][data-weapon-id="104"]').disabled,'Kämpfer kann zwei Einhänder tragen');
    const after=save();check(after.state.characters[1].equipment.rightHand===null,'Verbotene Kombination wurde geschrieben');
    const fixture=JSON.parse(localStorage.getItem('__equipment_model')), model=fixture.state.weaponInventory[1];
    const extra=(id,weaponForm)=>({...structuredClone(model),id,weaponForm,name:'Alt '+id,marker:'preserve-'+id});
    fixture.state.weaponInventory.push(extra(201,'sword'),extra(202,'axe1h'),extra(203,'staff'),extra(204,'dagger'),extra(205,'staff'));
    fixture.state.characters[0].equipment={leftHand:106,rightHand:102};
    fixture.state.characters[1].equipment={leftHand:201,rightHand:202};
    fixture.state.characters[2].equipment={leftHand:203,rightHand:204};
    fixture.state.characters[3].equipment={leftHand:null,rightHand:205};
    fixture.savedAt=Date.now();
    delete fixture.state.dungeons;
    fixture.state.dungeonAuto=true;fixture.state.expeditionActive=true;fixture.state.dungeonTeamSlots=[2,null,null,null];
    fixture.state.dungeonCycleOriginalIds=[2];fixture.state.dungeonCycleActiveIds=[2];fixture.state.dungeonSessionEndsAt=Date.now()+100000;
    fixture.state.dungeonRun={dungeonId:1,startedAt:Date.now(),participantIds:[2],energyShare:0,totalEnergyCost:0,enemies:[{id:'e1',name:'G Test',classId:'recruit',hp:1000000,maxHp:1000000,alive:true,armor:0,dodge:0,strengthFactor:1,precision:1,distance:1,damage:1,speed:1,hitChance:.5,penetration:0,lootMaterialIds:[1],xpDrop:10}],attackPoints:[{side:'player',ownerId:2,kind:'weapon',weaponId:201,label:'Alt',nextAt:Date.now()+60000},{side:'player',ownerId:2,kind:'weapon',weaponId:202,label:'Alt',nextAt:Date.now()+60000},{side:'enemy',ownerId:'e1',kind:'enemy',nextAt:Date.now()+60000}]};
    const identity=weapons=>weapons.filter(w=>w.id!==0).map(w=>({id:w.id,name:w.name,weaponForm:w.weaponForm,marker:w.marker,materials:(w.slots||[]).filter(s=>s.materialId!=null).map(s=>s.materialId)}));
    localStorage.setItem(reportKey,JSON.stringify({combinations,dual:.75,pair:.825,preferences:1.1,inventory:identity(fixture.state.weaponInventory)}));
    localStorage.setItem(phaseKey,'imported');
    const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(fixture)],'Altstand.json',{type:'application/json'}));
    const input=document.getElementById('saveTransferImportInput');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));return;
   }
   if(phase==='imported'){
    setTimeout(()=>{
     try{
      const result=save(), chars=result.state.characters, report=JSON.parse(localStorage.getItem(reportKey));
      check(JSON.stringify(chars.map(c=>c.equipment))===JSON.stringify([{leftHand:null,rightHand:102},{leftHand:null,rightHand:null},{leftHand:null,rightHand:204},{leftHand:205,rightHand:205}]),'Geladene Ausrüstung falsch bereinigt');
      const identity=result.state.weaponInventory.filter(w=>w.id!==0).map(w=>({id:w.id,name:w.name,weaponForm:w.weaponForm,marker:w.marker,materials:(w.slots||[]).filter(s=>s.materialId!=null).map(s=>s.materialId)}));
      check(JSON.stringify(identity)===JSON.stringify(report.inventory),'Inventargegenstände beim Import verändert');
      check(result.state.dungeons[1].dungeonRun?.attackPoints.some(p=>p.ownerId===2&&p.kind==='fist'),'Aktiver Dungeon ohne neuen Faustangriff');
      check(!result.state.dungeons[1].dungeonRun.attackPoints.some(p=>p.weaponId===201||p.weaponId===202),'Dungeon verwendet abgelegte Waffen weiter');
      check(chars.every(c=>c.hp<=7.01&&c.energy<=3.1),'Bereinigung hat geheilt');
      check(window.__equipmentAlerts.filter(m=>m.startsWith('Ausrüstung an')).length===1,'Keine gesammelte einmalige Meldung');
      report.cleaned=chars.map(c=>c.equipment);report.notice=true;localStorage.setItem(reportKey,JSON.stringify(report));localStorage.setItem(phaseKey,'reloaded');location.reload();
     }catch(error){finish({status:'failed',message:String(error.stack||error)});}
    },300);return;
   }
   setTimeout(()=>{
    try{
     const result=save(),report=JSON.parse(localStorage.getItem(reportKey));
     check(JSON.stringify(result.state.characters.map(c=>c.equipment))===JSON.stringify(report.cleaned),'Bereinigung nicht idempotent');
     check(!window.__equipmentAlerts.some(m=>m.startsWith('Ausrüstung an')),'Meldung beim nächsten Start wiederholt');
     finish({status:'passed',combinations:report.combinations,dual:report.dual,pair:report.pair,preferences:report.preferences,inventoryPreserved:true,importRepair:true,activeDungeonRepair:true,idempotent:true});
    }catch(error){finish({status:'failed',message:String(error.stack||error)});}
   },300);
  }catch(error){finish({status:'failed',message:String(error.stack||error)});}
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
const profile=mkdtempSync(join(tmpdir(),'eldravar-equipment-'));
let child;
try {
 child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--virtual-time-budget=18000','--dump-dom',`http://127.0.0.1:${server.address().port}${base}`]);
 let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
 const watchdog=setTimeout(()=>child.kill(),60000);
 const code=await new Promise((done,fail)=>{child.once('error',fail);child.once('close',done);});clearTimeout(watchdog);
 assert.equal(code,0,stderr.slice(-2000));
 const match=stdout.match(/<pre id="equipmentE2EResult">([^<]+)<\/pre>/);
 assert.ok(match,`Kein Testergebnis: ${stdout.slice(-4000)}\n${stderr.slice(-1000)}`);
 const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&').replaceAll('&gt;','>').replaceAll('&lt;','<'));
 assert.equal(result.status,'passed',JSON.stringify(result));assert.deepEqual(result.errors,[]);assert.equal(result.runtimeError,'');
 console.log('Waffenregeln-Browserregression: '+JSON.stringify(result));
} finally {
 if(child?.exitCode===null)child.kill();
 await new Promise(done=>server.close(done));
 rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}

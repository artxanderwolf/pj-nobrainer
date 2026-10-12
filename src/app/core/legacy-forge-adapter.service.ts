import { Injectable } from '@angular/core';
import { FORGE_CORE_BRIDGE, type ForgeCoreBridge } from '../game/forge-core';

declare global {
  interface Window { NoBrainerForgeCore?: ForgeCoreBridge; }
}

const FORGE_REQUIREMENTS = `function requirements(slots){
  return window.NoBrainerForgeCore.forgeRequirements(slots);
}

function hasMaterials(required){
  return window.NoBrainerForgeCore.hasForgeMaterials(state.inventory,required);
}`;

const FORGE_PREVIEW = `function forgePreview(){
  const selection=getForgeSelection(),form=CONFIG.forge.weaponForms[selection.weaponForm];
  const complete=selection.slots.every(slot=>slot.material);
  if(!complete){
    return {...selection,form,factor:1,valueNickel:100,seconds:Math.round(CONFIG.forge.baseSeconds*form.timeFactor),stats:{baseDamage:0,baseSpeed:0,bladeMultiplier:1,gripMultiplier:1,reinforcementSpeedFactor:1,reinforcementHitChanceAdd:0,reinforcementPenetrationAdd:0,hitChance:0,penetration:0,damagePerHit:0,attackSpeed:0,expectedRaw:0}};
  }
  const job=window.NoBrainerForgeCore.createForgeJob(selection.weaponForm,"",selection.slots);
  return {...selection,form,factor:rarityFactor(selection.slots),valueNickel:job.valueNickel,seconds:job.totalSeconds,stats:job.stats};
}`;

const FORGE_START = `function startForgeJob(){
  const activeSlots=state.upgrades.forgeSlots,queueSlots=state.upgrades.forgeQueue;
  if(!window.NoBrainerForgeCore.hasForgeCapacity(state,activeSlots,queueSlots)){alert("Alle Herstellungs- und Warteschlangenplätze sind belegt.");return;}
  const preview=forgePreview();if(!preview.slots.every(slot=>slot.material)){alert("Bitte für alle sechs Slots ein Material auswählen.");return;}
  const required=window.NoBrainerForgeCore.forgeRequirements(preview.slots),invalid=Object.entries(required).find(([name,qty])=>(state.inventory[name]?.qty||0)<qty);
  if(invalid){const [name,qty]=invalid;alert(\`Nicht genügend \${name} vorhanden. Benötigt: \${qty}, Lager: \${state.inventory[name]?.qty||0}.\`);return;}
  const finalName=(document.getElementById("forgeWeaponName")?.value||"").trim()||preview.form.name;
  const job=window.NoBrainerForgeCore.createForgeJob(preview.weaponForm,finalName,preview.slots);
  if(!window.NoBrainerForgeCore.reserveForgeMaterials(state.inventory,required))return;
  const result=window.NoBrainerForgeCore.enqueueForgeJob(state,job,activeSlots,queueSlots,Date.now());
  addLog(result==="started"?\`Schmiedeauftrag gestartet: \${finalName}.\`: \`Schmiedeauftrag eingereiht: \${finalName}.\`,"good");
  const nameInput=document.getElementById("forgeWeaponName");if(nameInput)nameInput.value="";render();
}`;

const FORGE_TIMELINE = `function startForgeQueuedJob(job,at=Date.now()){window.NoBrainerForgeCore.startForgeQueuedJob(job,at);state.forgeJobs.push(job);}
function fillForgeSlots(at=Date.now()){return window.NoBrainerForgeCore.fillForgeSlots(state,state.upgrades.forgeSlots,at);}`;

const FORGE_UPDATE = `function updateForgeJob(){
  const completed=window.NoBrainerForgeCore.advanceForgeJobs(state,state.upgrades.forgeSlots,Date.now(),job=>finishForgeJob(job));
  return completed>0;
}`;

@Injectable({ providedIn: 'root' })
export class LegacyForgeAdapterService {
  adapt(source: string): string {
    window.NoBrainerForgeCore = FORGE_CORE_BRIDGE;
    let adapted = this.replaceRange(source, 'function requirements(slots){', 'function formatCurrencyNickel(', FORGE_REQUIREMENTS + '\n\n', 'Materialbedarf');
    adapted = this.replaceRange(adapted, 'function forgePreview(){', 'function renderForgePreview(){', FORGE_PREVIEW + '\n\n', 'Schmiedevorschau');
    adapted = this.replaceRange(adapted, 'function startForgeQueuedJob(', 'function startForgeJob(){', FORGE_TIMELINE + '\n\n', 'Schmiede-Slots');
    adapted = this.replaceRange(adapted, 'function startForgeJob(){', 'function finishForgeJob(', FORGE_START + '\n', 'Schmiedeauftrag');
    adapted = this.replaceRange(adapted, 'function updateForgeJob(){', 'function renderForgeJob(){', FORGE_UPDATE + '\n', 'Schmiede-Fortschritt');
    return adapted;
  }

  private replaceRange(source: string, startMarker: string, endMarker: string, replacement: string, label: string): string {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (start < 0 || end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    return source.slice(0, start) + replacement + source.slice(end);
  }
}

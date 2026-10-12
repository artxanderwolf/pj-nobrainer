import { Injectable } from '@angular/core';
import { MARKET_CORE_BRIDGE, type MarketCoreBridge } from '../game/market-core';

declare global {
  interface Window {
    NoBrainerMarketCore?: MarketCoreBridge;
  }
}

const START_BLOCK = `function startMarketQueuedJob(job,at=Date.now()){job.startedAt=at;job.finishesAt=at+job.seconds*1000;state.marketJobs.push(job);}
function fillMarketSlots(at=Date.now()){while(state.marketJobs.length<state.upgrades.marketSlots&&state.marketQueue.length)startMarketQueuedJob(state.marketQueue.shift(),at);}`;

const START_BRIDGE = `function startMarketQueuedJob(job,at=Date.now()){
  window.NoBrainerMarketCore.startMarketQueuedJob(job,at);state.marketJobs.push(job);
}
function fillMarketSlots(at=Date.now()){
  window.NoBrainerMarketCore.fillMarketSlots(state,state.upgrades.marketSlots,at);
}`;

const ENQUEUE_BLOCK = `function enqueueMarketJob(job){
  if(state.marketJobs.length+state.marketQueue.length>=state.upgrades.marketSlots+state.upgrades.marketQueue){alert("Alle Verkaufs- und Warteschlangenplätze sind belegt.");return false;}
  if(state.marketJobs.length<state.upgrades.marketSlots)startMarketQueuedJob(job);else state.marketQueue.push(job);return true;
}`;

const ENQUEUE_BRIDGE = `function enqueueMarketJob(job){
  const result=window.NoBrainerMarketCore.enqueueMarketJob(state,job,state.upgrades.marketSlots,state.upgrades.marketQueue,Date.now());
  if(result==="full"){alert("Alle Verkaufs- und Warteschlangenplätze sind belegt.");return false;}
  return true;
}`;

const CANCEL_BLOCK = `function cancelMarketSale(kind,index){const a=kind==="queue"?state.marketQueue:state.marketJobs,j=a[index];if(!j)return;returnMarketJob(j);a.splice(index,1);if(kind!=="queue")fillMarketSlots();addLog(\`Verkauf abgebrochen: \${j.name} wurde zurückgegeben.\`,"muted");render();}`;

const CANCEL_BRIDGE = `function cancelMarketSale(kind,index){
  const j=window.NoBrainerMarketCore.cancelMarketJob(state,kind,index,state.upgrades.marketSlots,Date.now());
  if(!j)return;
  returnMarketJob(j);addLog(\`Verkauf abgebrochen: \${j.name} wurde zurückgegeben.\`,"muted");render();
}`;

const UPDATE_BLOCK = `function updateMarketJob(){
  const now=Date.now();let completed=0,guard=0;
  while(guard++<10000){
    const next=state.marketJobs.filter(j=>Number.isFinite(j.finishesAt)&&j.finishesAt<=now).sort((a,b)=>a.finishesAt-b.finishesAt)[0];
    if(!next)break;
    const at=next.finishesAt;
    const done=state.marketJobs.filter(j=>j.finishesAt<=at);
    done.forEach(j=>{state.gold+=j.valueNickel;addLog(\`Verkauf abgeschlossen: \${j.name} → \${formatCurrencyNickel(j.valueNickel)}.\`,"good");});completed+=done.length;
    state.marketJobs=state.marketJobs.filter(j=>j.finishesAt>at);
    fillMarketSlots(at);
  }
  fillMarketSlots(now);
  return completed>0;
}`;

const UPDATE_BRIDGE = `function updateMarketJob(){
  const completed=window.NoBrainerMarketCore.advanceMarketJobs(state,state.upgrades.marketSlots,Date.now(),j=>{
    state.gold+=j.valueNickel;addLog(\`Verkauf abgeschlossen: \${j.name} → \${formatCurrencyNickel(j.valueNickel)}.\`,"good");
  });
  return completed>0;
}`;

@Injectable({ providedIn: 'root' })
export class LegacyMarketAdapterService {
  adapt(source: string): string {
    window.NoBrainerMarketCore = MARKET_CORE_BRIDGE;
    let adapted = this.replaceOnce(source, START_BLOCK, START_BRIDGE, 'Markt-Slotstart');
    adapted = this.replaceOnce(adapted, ENQUEUE_BLOCK, ENQUEUE_BRIDGE, 'Markt-Warteschlange');
    adapted = this.replaceOnce(adapted, CANCEL_BLOCK, CANCEL_BRIDGE, 'Markt-Abbruch');
    adapted = this.replaceOnce(adapted, UPDATE_BLOCK, UPDATE_BRIDGE, 'Markt-Offlinefortschritt');
    return adapted;
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(search, first + search.length) >= 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }
}

import { Injectable } from '@angular/core';
import {
  MARKET_PRESENTATION_CORE_BRIDGE,
  type MarketPresentationCoreBridge
} from '../game/market-presentation-core';

declare global {
  interface Window {
    NoBrainerMarketPresentationCore?: MarketPresentationCoreBridge;
  }
}

const ADAPTED_MARKET_PRESENTATION = `function renderMarketJob(){
  const b=document.getElementById("marketJobCard"),q=document.getElementById("marketQueueCard"),now=Date.now();
  if(b){
    b.className=state.marketJobs.length?"":"empty";
    b.innerHTML=state.marketJobs.length?state.marketJobs.map((j,i)=>{
      const presentation=window.NoBrainerMarketPresentationCore.getActiveMarketJobPresentation(j,i,now,formatCurrencyNickel,formatDuration);
      return \`<div class="sell-row"><div style="width:100%"><strong>\${presentation.title}</strong><div class="bar energy"><i style="width:\${presentation.progressPercent}%"></i></div><p>\${presentation.remainingText} · Ertrag <b>\${presentation.revenueValueText}</b></p></div><button class="btn smallbtn" onclick="cancelMarketSale('active',\${i})">Abbrechen</button></div>\`;
    }).join(""):"Kein aktiver Verkauf.";
  }
  if(q){
    q.className=state.marketQueue.length?"":"empty";
    q.innerHTML=state.marketQueue.length?state.marketQueue.map((j,i)=>{
      const presentation=window.NoBrainerMarketPresentationCore.getQueuedMarketJobPresentation(j,i,formatCurrencyNickel,formatDuration);
      return \`<div class="sell-row"><div><strong>\${presentation.title}</strong><div class="sell-meta">\${presentation.metaText}</div></div><button class="btn smallbtn" onclick="cancelMarketSale('queue',\${i})">Entfernen</button></div>\`;
    }).join(""):"Warteschlange leer.";
  }
  renderUpgradeCards();
}

function setMarketQty(inputId,delta,max){
  const input=document.getElementById(inputId);
  if(!input)return;
  const current=Math.floor(Number(input.value)||1);
  input.value=Math.max(1,Math.min(max,current+delta));
  updateMarketMaterialPreview(inputId);
}

function updateMarketMaterialPreview(inputId){
  const input=document.getElementById(inputId);
  if(!input)return;
  const name=input.dataset.material;
  const max=Number(input.max)||1;
  const qty=Math.max(1,Math.min(max,Math.floor(Number(input.value)||1)));
  input.value=qty;
  const d=materialSellData(name);
  const presentation=window.NoBrainerMarketPresentationCore.getMarketMaterialPresentation(name,max,qty,d.valueNickel,d.seconds,true,formatCurrencyNickel,formatDuration);
  const preview=document.getElementById(inputId+"Preview");
  if(preview)preview.textContent=presentation.previewText;
}

function renderMarketMaterials(){
  const box=document.getElementById("marketMaterials");
  const empty=document.getElementById("marketMaterialsEmpty");
  if(!box||!empty)return;
  const entries=Object.entries(state.inventory).filter(([name,x])=>x.qty>0).sort((a,b)=>a[0].localeCompare(b[0]));
  const hasCapacity=window.NoBrainerMarketCompatibility.hasCapacity();
  box.innerHTML="";
  empty.style.display=entries.length?"none":"block";
  entries.forEach(([name,x],index)=>{
    const d=materialSellData(name);
    const inputId=\`marketQty_\${index}\`;
    const presentation=window.NoBrainerMarketPresentationCore.getMarketMaterialPresentation(name,x.qty,1,d.valueNickel,d.seconds,hasCapacity,formatCurrencyNickel,formatDuration);
    const row=document.createElement("div");
    row.className="sell-row";
    row.title=presentation.title;
    row.innerHTML=\`
      <div>
        <strong>\${name}</strong>
        <div class="sell-meta">\${presentation.stockText}</div>
        <div class="sell-meta" id="\${inputId}Preview">\${presentation.previewText}</div>
      </div>
      <div class="market-qty">
        <button class="btn smallbtn" type="button">−</button>
        <input id="\${inputId}" class="number-input" type="number" min="1" max="\${x.qty}" value="1" data-material="\${name}">
        <button class="btn smallbtn" type="button">+</button>
        <button class="btn smallbtn primary" type="button" \${presentation.sellDisabled?"disabled":""}>Verkaufen</button>
      </div>\`;
    const buttons=row.querySelectorAll("button");
    const input=row.querySelector("input");
    buttons[0].addEventListener("click",()=>setMarketQty(inputId,-1,x.qty));
    buttons[1].addEventListener("click",()=>setMarketQty(inputId,1,x.qty));
    buttons[2].addEventListener("click",()=>startMaterialSale(name,input.value));
    input.addEventListener("input",()=>updateMarketMaterialPreview(inputId));
    box.appendChild(row);
  });
}

function renderMarketWeapons(){
  const box=document.getElementById("marketWeapons");
  const empty=document.getElementById("marketWeaponsEmpty");
  if(!box||!empty)return;
  const weapons=state.weaponInventory.filter(w=>!w.starter&&!getEquippedHandForWeapon(w.id));
  const hasCapacity=window.NoBrainerMarketCompatibility.hasCapacity();
  box.innerHTML="";
  empty.style.display=weapons.length?"none":"block";
  weapons.forEach(w=>{
    const d=weaponSellData(w);
    const presentation=window.NoBrainerMarketPresentationCore.getMarketWeaponPresentation(w.name,w.id,d.valueNickel,d.seconds,hasCapacity,formatCurrencyNickel);
    const row=document.createElement("div");
    row.className="sell-row";
    row.title=presentation.tooltip;
    row.innerHTML=\`<div><strong>\${presentation.title}</strong></div><button class="btn smallbtn" \${presentation.sellDisabled?"disabled":""}>Verkaufen</button>\`;
    row.querySelector("button").addEventListener("click",()=>startWeaponSale(w.id));
    box.appendChild(row);
  });
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyMarketPresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerMarketPresentationCore = MARKET_PRESENTATION_CORE_BRIDGE;
    return this.replaceRangeOnce(
      source,
      'function renderMarketJob(){',
      'function render(){',
      ADAPTED_MARKET_PRESENTATION,
      'Markt-Präsentation'
    );
  }

  private replaceRangeOnce(source: string, startMarker: string, endMarker: string, replacement: string, label: string): string {
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} ist nicht eindeutig.`);
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(endMarker, end + endMarker.length) >= 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} ist nicht eindeutig.`);
    return source.slice(0, start) + replacement + source.slice(end);
  }
}

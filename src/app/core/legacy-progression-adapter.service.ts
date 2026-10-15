import { Injectable } from '@angular/core';

const RECRUIT_BLOCK = `function recruitCharacter(classId="recruit"){
  if(state.characters.length>=state.upgrades.innCapacity){alert("Das Inn ist voll. Bitte zuerst einen weiteren Kaderplatz ausbauen.");return;}
  const cls=CHARACTER_CLASSES[classId];if(!cls)return;
  const cost=recruitCost();if(state.gold<cost){alert(\`Nicht genügend Geld. Benötigt: \${formatCurrencyNickel(cost)}.\`);return;}
  state.gold-=cost;const id=state.nextCharacterId++;
  const number=state.characters.filter(c=>c.classId===classId).length+1;
  const c=createCharacter(id,\`${'${cls.name}'} \${String(number).padStart(2,"0")}\`,classId,false);state.characters.push(c);
  addLog(\`${'${c.name}'} wurde für \${formatCurrencyNickel(cost)} angeworben.\`,"good");render();
}`;

const RECRUIT_BRIDGE = `function recruitCharacter(classId="recruit"){
  const progressionCompatibility=window.NoBrainerProgressionCompatibility;
  if(!progressionCompatibility)throw new Error("NoBrainer-Progression-Kompatibilitätsbrücke fehlt.");
  const result=progressionCompatibility.recruit(classId);
  if(!result.ok){
    if(result.reason==="inn-full")alert("Das Inn ist voll. Bitte zuerst einen weiteren Kaderplatz ausbauen.");
    else if(result.reason==="insufficient-funds")alert(\`Nicht genügend Geld. Benötigt: \${formatCurrencyNickel(result.costNickel)}.\`);
    return;
  }
  addLog(\`${'${result.character.name}'} wurde für \${formatCurrencyNickel(result.costNickel)} angeworben.\`,"good");render();
}`;

const UPGRADE_BLOCK = `function buyUpgrade(kind){
  const map={
    inn:["innCapacity","inn","Kaderplatz"],forgeSlots:["forgeSlots","forgeSlots","Herstellungsplatz"],
    forgeQueue:["forgeQueue","forgeQueue","Schmiede-Warteschlangenplatz"],marketSlots:["marketSlots","marketSlots","Verkaufsplatz"],
    marketQueue:["marketQueue","marketQueue","Markt-Warteschlangenplatz"]
  },x=map[kind]; if(!x)return;
  const [stateKey,cfgKey,label]=x,cfg=CONFIG.upgrades[cfgKey],current=state.upgrades[stateKey],max=cfg.maxCapacity??cfg.max;
  if(current>=max)return;
  const cost=upgradeCost(cfgKey,current);
  if(state.gold<cost){alert(\`Nicht genügend Geld. Benötigt: \${formatCurrencyNickel(cost)}.\`);return;}
  state.gold-=cost;state.upgrades[stateKey]++;
  addLog(\`${'${label}'} gekauft: jetzt \${state.upgrades[stateKey]} Plätze.\`,"good");render();
}`;

const UPGRADE_BRIDGE = `function buyUpgrade(kind){
  const progressionCompatibility=window.NoBrainerProgressionCompatibility;
  if(!progressionCompatibility)throw new Error("NoBrainer-Progression-Kompatibilitätsbrücke fehlt.");
  const result=progressionCompatibility.buyUpgrade(kind);
  if(!result.ok){
    if(result.reason==="insufficient-funds")alert(\`Nicht genügend Geld. Benötigt: \${formatCurrencyNickel(result.costNickel)}.\`);
    return;
  }
  addLog(\`${'${result.label}'} gekauft: jetzt \${result.newValue} Plätze.\`,"good");render();
}`;

@Injectable({ providedIn: 'root' })
export class LegacyProgressionAdapterService {
  adapt(source: string): string {
    let adapted = this.replaceOnce(source, RECRUIT_BLOCK, RECRUIT_BRIDGE, 'Rekrutierungsablauf');
    adapted = this.replaceOnce(adapted, UPGRADE_BLOCK, UPGRADE_BRIDGE, 'Ausbaukauf');
    return adapted;
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(search, first + search.length) >= 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }
}

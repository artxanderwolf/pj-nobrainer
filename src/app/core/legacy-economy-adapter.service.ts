import { Injectable } from '@angular/core';
import { ECONOMY_CORE_BRIDGE, type EconomyCoreBridge } from '../game/economy-core';

declare global {
  interface Window {
    NoBrainerEconomyCore?: EconomyCoreBridge;
  }
}

const FORMAT_CURRENCY_BLOCK = `function formatCurrencyNickel(v){
  let n=Math.max(0,Math.round(v)), g=Math.floor(n/1000000);
  n%=1000000;
  let s=Math.floor(n/10000);
  n%=10000;
  let b=Math.floor(n/100);
  n%=100;
  const p=[];
  if(g)p.push(\`${'${g}'} Gold\`);
  if(s)p.push(\`${'${s}'} Silber\`);
  if(b)p.push(\`${'${b}'} Bronze\`);
  if(n||!p.length)p.push(\`${'${n}'} Nickel\`);
  return p.join(" ");
}`;

const FORMAT_CURRENCY_BRIDGE = `function formatCurrencyNickel(v){
  return window.NoBrainerEconomyCore.formatCurrencyNickel(v);
}`;

const FORMAT_HIGHEST_BLOCK = `function formatHighestCurrency(v){
  const n=Math.max(0,Math.round(v));
  if(n>=1000000) return \`${'${(n/1000000).toLocaleString("de-DE",{maximumFractionDigits:2})}'} Gold\`;
  if(n>=10000) return \`${'${(n/10000).toLocaleString("de-DE",{maximumFractionDigits:2})}'} Silber\`;
  if(n>=100) return \`${'${(n/100).toLocaleString("de-DE",{maximumFractionDigits:2})}'} Bronze\`;
  return \`${'${n}'} Nickel\`;
}`;

const FORMAT_HIGHEST_BRIDGE = `function formatHighestCurrency(v){
  return window.NoBrainerEconomyCore.formatHighestCurrency(v);
}`;

const FORMAT_DURATION_BLOCK = `function formatDuration(seconds){
  const total=Math.max(0,Math.ceil(Number(seconds)||0));
  const hours=Math.floor(total/3600);
  const minutes=Math.floor((total%3600)/60);
  const secs=total%60;
  const parts=[];
  if(hours>0)parts.push(\`${'${hours}'} Std.\`);
  if(minutes>0 || hours>0)parts.push(\`${'${minutes}'} Min.\`);
  parts.push(\`${'${secs}'} Sek.\`);
  return parts.join(" ");
}`;

const FORMAT_DURATION_BRIDGE = `function formatDuration(seconds){
  return window.NoBrainerEconomyCore.formatDuration(seconds);
}`;

const RECRUIT_COST_BLOCK = `function recruitCost(){
  const additional=Math.max(0,state.characters.length-1);
  return Math.round(CONFIG.tavern.recruitBaseNickel*Math.pow(CONFIG.tavern.recruitGrowth,additional));
}`;

const RECRUIT_COST_BRIDGE = `function recruitCost(){
  return window.NoBrainerEconomyCore.calculateRecruitCost(state.characters.length);
}`;

const UPGRADE_COST_BLOCK = `function upgradeCost(kind,current){
  const cfg=CONFIG.upgrades[kind],start=cfg.startCapacity??cfg.start;
  return Math.round(cfg.baseCostNickel*Math.pow(cfg.growth,Math.max(0,current-start)));
}`;

const UPGRADE_COST_BRIDGE = `function upgradeCost(kind,current){
  return window.NoBrainerEconomyCore.calculateUpgradeCost(kind,current);
}`;

const RARITY_FACTOR_BLOCK = `function rarityFactorFromRarity(rarity){
  return 1+(MATERIAL_SALE_RARITY_BONUS[rarity]||0);
}`;

const RARITY_FACTOR_BRIDGE = `function rarityFactorFromRarity(rarity){
  return window.NoBrainerEconomyCore.rarityFactorFromRarity(rarity);
}`;

const MATERIAL_SELL_BLOCK = `function materialSellData(name){
  const m=MATERIALS[name];
  if(!m)return null;
  const factor=rarityFactorFromRarity(m.rarity);
  return {
    type:"material", name, rarity:m.rarity, factor,
    valueNickel:Math.round(CONFIG.market.materialBaseNickel*factor),
    seconds:Math.round(CONFIG.market.baseSeconds*factor)
  };
}`;

const MATERIAL_SELL_BRIDGE = `function materialSellData(name){
  return window.NoBrainerEconomyCore.materialSellData(name);
}`;

const WEAPON_SELL_BLOCK = `function weaponSellData(weapon){
  if(!weapon)return null;
  const factor=rarityFactor(weapon.slots||[]);
  return {
    type:"weapon", weaponId:weapon.id, name:weapon.name, factor,
    valueNickel:weapon.valueNickel,
    seconds:Math.round(CONFIG.market.baseSeconds*factor)
  };
}`;

const WEAPON_SELL_BRIDGE = `function weaponSellData(weapon){
  return window.NoBrainerEconomyCore.weaponSellData(weapon);
}`;

@Injectable({ providedIn: 'root' })
export class LegacyEconomyAdapterService {
  adapt(source: string): string {
    window.NoBrainerEconomyCore = ECONOMY_CORE_BRIDGE;

    let adapted = this.replaceOnce(source, FORMAT_CURRENCY_BLOCK, FORMAT_CURRENCY_BRIDGE, 'Währungsformatierung');
    adapted = this.replaceOnce(adapted, FORMAT_HIGHEST_BLOCK, FORMAT_HIGHEST_BRIDGE, 'Kurzformat der Währung');
    adapted = this.replaceOnce(adapted, FORMAT_DURATION_BLOCK, FORMAT_DURATION_BRIDGE, 'Zeitformatierung');
    adapted = this.replaceOnce(adapted, RECRUIT_COST_BLOCK, RECRUIT_COST_BRIDGE, 'Rekrutierungskosten');
    adapted = this.replaceOnce(adapted, UPGRADE_COST_BLOCK, UPGRADE_COST_BRIDGE, 'Ausbaukosten');
    adapted = this.replaceOnce(adapted, RARITY_FACTOR_BLOCK, RARITY_FACTOR_BRIDGE, 'Material-Verkaufsfaktor');
    adapted = this.replaceOnce(adapted, MATERIAL_SELL_BLOCK, MATERIAL_SELL_BRIDGE, 'Material-Verkaufsdaten');
    adapted = this.replaceOnce(adapted, WEAPON_SELL_BLOCK, WEAPON_SELL_BRIDGE, 'Waffen-Verkaufsdaten');
    return adapted;
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    }
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }
}

import {
  CONFIG,
  MATERIALS,
  MATERIAL_SALE_RARITY_BONUS,
  WeaponSlot,
  rarityFactor
} from './game-core';

export interface MaterialSellData {
  type: 'material';
  name: string;
  rarity: number;
  factor: number;
  valueNickel: number;
  seconds: number;
}

export interface WeaponSaleLike {
  id: number;
  name: string;
  valueNickel: number;
  slots?: readonly WeaponSlot[] | null;
}

export interface WeaponSellData {
  type: 'weapon';
  weaponId: number;
  name: string;
  factor: number;
  valueNickel: number;
  seconds: number;
}

type UpgradeKey = keyof typeof CONFIG.upgrades;
type UpgradeConfig = {
  baseCostNickel: number;
  growth: number;
  startCapacity?: number;
  start?: number;
};

export function formatCurrencyNickel(value: number): string {
  let remaining = Math.max(0, Math.round(Number(value) || 0));
  const gold = Math.floor(remaining / 1_000_000);
  remaining %= 1_000_000;
  const silver = Math.floor(remaining / 10_000);
  remaining %= 10_000;
  const bronze = Math.floor(remaining / 100);
  remaining %= 100;

  const parts: string[] = [];
  if (gold) parts.push(`${gold} Gold`);
  if (silver) parts.push(`${silver} Silber`);
  if (bronze) parts.push(`${bronze} Bronze`);
  if (remaining || !parts.length) parts.push(`${remaining} Nickel`);
  return parts.join(' ');
}

export function formatHighestCurrency(value: number): string {
  const nickel = Math.max(0, Math.round(Number(value) || 0));
  if (nickel >= 1_000_000) {
    return `${(nickel / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Gold`;
  }
  if (nickel >= 10_000) {
    return `${(nickel / 10_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Silber`;
  }
  if (nickel >= 100) {
    return `${(nickel / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Bronze`;
  }
  return `${nickel} Nickel`;
}

export function calculateRecruitCost(characterCount: number): number {
  const additional = Math.max(0, Math.floor(Number(characterCount) || 0) - 1);
  return Math.round(CONFIG.tavern.recruitBaseNickel * Math.pow(CONFIG.tavern.recruitGrowth, additional));
}

export function calculateUpgradeCost(kind: UpgradeKey, current: number): number {
  const config = CONFIG.upgrades[kind] as UpgradeConfig;
  const start = config.startCapacity ?? config.start ?? 0;
  return Math.round(
    config.baseCostNickel * Math.pow(config.growth, Math.max(0, Number(current) - start))
  );
}

export function rarityFactorFromRarity(rarity: number): number {
  return 1 + (MATERIAL_SALE_RARITY_BONUS[Number(rarity)] || 0);
}

export function materialSellData(name: string): MaterialSellData | null {
  const material = MATERIALS[name];
  if (!material) return null;

  const factor = rarityFactorFromRarity(material.rarity);
  return {
    type: 'material',
    name,
    rarity: material.rarity,
    factor,
    valueNickel: Math.round(CONFIG.market.materialBaseNickel * factor),
    seconds: Math.round(CONFIG.market.baseSeconds * factor)
  };
}

export function weaponSellData(weapon: WeaponSaleLike | null | undefined): WeaponSellData | null {
  if (!weapon) return null;

  const factor = rarityFactor(weapon.slots ?? []);
  return {
    type: 'weapon',
    weaponId: weapon.id,
    name: weapon.name,
    factor,
    valueNickel: weapon.valueNickel,
    seconds: Math.round(CONFIG.market.baseSeconds * factor)
  };
}

export const ECONOMY_CORE_BRIDGE = {
  formatCurrencyNickel,
  formatHighestCurrency,
  calculateRecruitCost,
  calculateUpgradeCost,
  rarityFactorFromRarity,
  materialSellData,
  weaponSellData
};

export type EconomyCoreBridge = typeof ECONOMY_CORE_BRIDGE;

import { resolveArmor } from './armor-core';
import {
  CONFIG,
  MATERIALS,
  MATERIAL_SALE_RARITY_BONUS,
  rarityFactor,
  type WeaponSlot,
  type WeaponStats
} from './game-core';

export const CURRENCY_DENOMINATIONS = [
  { name: 'Netherit', valueNickel: 1_000_000_000_000_000_000 },
  { name: 'Platin', valueNickel: 1_000_000_000_000_000 },
  { name: 'Gold', valueNickel: 1_000_000_000_000 },
  { name: 'Silber', valueNickel: 1_000_000_000 },
  { name: 'Kupfer', valueNickel: 1_000_000 },
  { name: 'Bronze', valueNickel: 1_000 },
  { name: 'Nickel', valueNickel: 1 }
] as const;

export const ECONOMY_BALANCE = {
  progressionCostMultiplier: 10,
  positiveSpecialMaterialValueFactor: 1.10,
  materialSaleBaseSeconds: 15,
  materialSaleSecondsPerNickel: 1.5,
  weaponArmorBenchmarks: [0, 40, 80] as const,
  weaponBaseValueNickel: 40,
  weaponValuePerPerformance: 6,
  weaponValueRoundStepNickel: 5,
  weaponForgeBaseSeconds: 30,
  weaponForgeSecondsPerNickel: 0.7,
  weaponSaleBaseSeconds: 15,
  weaponSaleSecondsPerNickel: 0.5,
  timeRoundStepSeconds: 5
} as const;

export interface MaterialSellData {
  type: 'material';
  name: string;
  rarity: number;
  factor: number;
  valueNickel: number;
  seconds: number;
}

export type WeaponEconomyStatsLike = Pick<WeaponStats, 'expectedRaw' | 'penetration'>;

export interface WeaponSaleLike {
  id: number;
  name: string;
  valueNickel: number;
  slots?: readonly WeaponSlot[] | null;
  stats?: Partial<WeaponEconomyStatsLike> | null;
}

export interface WeaponSellData {
  type: 'weapon';
  weaponId: number;
  name: string;
  factor: number;
  valueNickel: number;
  seconds: number;
}

export interface WeaponEconomyData {
  performance: number;
  benchmarkDamage: readonly number[];
  valueNickel: number;
  forgeSeconds: number;
  saleSeconds: number;
}

type UpgradeKey = keyof typeof CONFIG.upgrades;
type UpgradeConfig = {
  baseCostNickel: number;
  growth: number;
  startCapacity?: number;
  start?: number;
};

export function formatCurrencyNickel(value: number): string {
  let remaining = Math.max(0, Math.round(value));
  const parts: string[] = [];

  for (const denomination of CURRENCY_DENOMINATIONS) {
    const amount = Math.floor(remaining / denomination.valueNickel);
    if (amount > 0) {
      parts.push(`${amount} ${denomination.name}`);
      remaining %= denomination.valueNickel;
    }
  }

  return parts.length ? parts.join(' ') : '0 Nickel';
}

export function formatHighestCurrency(value: number): string {
  const nickel = Math.max(0, Math.round(value));
  const denomination = CURRENCY_DENOMINATIONS.find(item => nickel >= item.valueNickel) ?? CURRENCY_DENOMINATIONS.at(-1)!;
  if (denomination.valueNickel === 1) return `${nickel} Nickel`;
  return `${(nickel / denomination.valueNickel).toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${denomination.name}`;
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} Std.`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes} Min.`);
  parts.push(`${secs} Sek.`);
  return parts.join(' ');
}

export function calculateRecruitCost(characterCount: number): number {
  const additional = Math.max(0, characterCount - 1);
  const baseCostNickel = CONFIG.tavern.recruitBaseNickel * ECONOMY_BALANCE.progressionCostMultiplier;
  return Math.round(baseCostNickel * Math.pow(CONFIG.tavern.recruitGrowth, additional));
}

export function calculateUpgradeCost(kind: UpgradeKey, current: number): number {
  const config = CONFIG.upgrades[kind] as UpgradeConfig;
  const start = config.startCapacity ?? config.start;
  if (start === undefined) throw new Error(`Unbekannter Ausbau-Startwert: ${kind}`);
  const baseCostNickel = config.baseCostNickel * ECONOMY_BALANCE.progressionCostMultiplier;
  return Math.round(baseCostNickel * Math.pow(config.growth, Math.max(0, current - start)));
}

/** Legacy-Kompatibilität für noch nicht ausgeschnittene Runtime-Stellen. */
export function rarityFactorFromRarity(rarity: number): number {
  return 1 + (MATERIAL_SALE_RARITY_BONUS[rarity] || 0);
}

export function roundToNearestStep(value: number, step: number): number {
  const safeStep = Math.max(1, Number(step) || 1);
  return Math.round((Number(value) || 0) / safeStep) * safeStep;
}

export function roundUpToStep(value: number, step: number): number {
  const safeStep = Math.max(1, Number(step) || 1);
  return Math.ceil(Math.max(0, Number(value) || 0) / safeStep) * safeStep;
}

export function materialSellData(name: string): MaterialSellData | null {
  const material = MATERIALS[name];
  if (!material) return null;

  const hasPositiveSpecial = Boolean(material.specialEffect && material.specialEffect.amount > 0);
  const specialFactor = hasPositiveSpecial ? ECONOMY_BALANCE.positiveSpecialMaterialValueFactor : 1;
  const factor = material.rarity * specialFactor;
  const valueNickel = Math.round(CONFIG.market.materialBaseNickel * factor);
  const seconds = roundUpToStep(
    ECONOMY_BALANCE.materialSaleBaseSeconds + ECONOMY_BALANCE.materialSaleSecondsPerNickel * valueNickel,
    ECONOMY_BALANCE.timeRoundStepSeconds
  );

  return {
    type: 'material',
    name,
    rarity: material.rarity,
    factor,
    valueNickel,
    seconds
  };
}

export function calculateWeaponPerformance(stats: Partial<WeaponEconomyStatsLike> | null | undefined): number {
  const raw = Math.max(0, Number(stats?.expectedRaw) || 0);
  const penetration = Math.max(0, Math.min(1, Number(stats?.penetration) || 0));
  const benchmarkDamage = ECONOMY_BALANCE.weaponArmorBenchmarks.map(armor => {
    const reduction = resolveArmor(armor, penetration).reduction;
    return raw * (1 - reduction);
  });
  return benchmarkDamage.reduce((sum, value) => sum + value, 0) / benchmarkDamage.length;
}

export function calculateWeaponValueNickel(stats: Partial<WeaponEconomyStatsLike> | null | undefined): number {
  const rawValue = ECONOMY_BALANCE.weaponBaseValueNickel
    + ECONOMY_BALANCE.weaponValuePerPerformance * calculateWeaponPerformance(stats);
  return Math.max(
    ECONOMY_BALANCE.weaponValueRoundStepNickel,
    roundToNearestStep(rawValue, ECONOMY_BALANCE.weaponValueRoundStepNickel)
  );
}

export function calculateWeaponForgeSeconds(valueNickel: number): number {
  return roundUpToStep(
    ECONOMY_BALANCE.weaponForgeBaseSeconds + ECONOMY_BALANCE.weaponForgeSecondsPerNickel * Math.max(0, valueNickel),
    ECONOMY_BALANCE.timeRoundStepSeconds
  );
}

export function calculateWeaponSaleSeconds(valueNickel: number): number {
  return roundUpToStep(
    ECONOMY_BALANCE.weaponSaleBaseSeconds + ECONOMY_BALANCE.weaponSaleSecondsPerNickel * Math.max(0, valueNickel),
    ECONOMY_BALANCE.timeRoundStepSeconds
  );
}

export function calculateWeaponEconomy(stats: Partial<WeaponEconomyStatsLike> | null | undefined): WeaponEconomyData {
  const raw = Math.max(0, Number(stats?.expectedRaw) || 0);
  const penetration = Math.max(0, Math.min(1, Number(stats?.penetration) || 0));
  const benchmarkDamage = ECONOMY_BALANCE.weaponArmorBenchmarks.map(armor => {
    const reduction = resolveArmor(armor, penetration).reduction;
    return raw * (1 - reduction);
  });
  const performance = benchmarkDamage.reduce((sum, value) => sum + value, 0) / benchmarkDamage.length;
  const valueNickel = Math.max(
    ECONOMY_BALANCE.weaponValueRoundStepNickel,
    roundToNearestStep(
      ECONOMY_BALANCE.weaponBaseValueNickel + ECONOMY_BALANCE.weaponValuePerPerformance * performance,
      ECONOMY_BALANCE.weaponValueRoundStepNickel
    )
  );
  return {
    performance,
    benchmarkDamage,
    valueNickel,
    forgeSeconds: calculateWeaponForgeSeconds(valueNickel),
    saleSeconds: calculateWeaponSaleSeconds(valueNickel)
  };
}

export function weaponSellData(weapon: WeaponSaleLike | null | undefined): WeaponSellData | null {
  if (!weapon) return null;

  const economy = weapon.stats ? calculateWeaponEconomy(weapon.stats) : null;
  const valueNickel = economy?.valueNickel ?? Math.max(0, Math.round(weapon.valueNickel));
  return {
    type: 'weapon',
    weaponId: weapon.id,
    name: weapon.name,
    factor: rarityFactor(weapon.slots ?? []),
    valueNickel,
    seconds: calculateWeaponSaleSeconds(valueNickel)
  };
}

export const ECONOMY_CORE_BRIDGE = {
  formatCurrencyNickel,
  formatHighestCurrency,
  formatDuration,
  calculateRecruitCost,
  calculateUpgradeCost,
  rarityFactorFromRarity,
  roundToNearestStep,
  roundUpToStep,
  materialSellData,
  calculateWeaponPerformance,
  calculateWeaponValueNickel,
  calculateWeaponForgeSeconds,
  calculateWeaponSaleSeconds,
  calculateWeaponEconomy,
  weaponSellData
};

export type EconomyCoreBridge = typeof ECONOMY_CORE_BRIDGE;

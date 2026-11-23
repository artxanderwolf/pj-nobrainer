import * as baseline from './economy-core-v01310-baseline.ts';
import {
  CONFIG, calculateWeaponStats, getMaterialIdByName, getMaterialReferenceById,
  getWeaponCraftingSlots, getWeaponSelectionQuantity, normalizeWeaponSlots, rarityFactor, type WeaponSlot
} from './game-core.ts';
import { resolveMaterialQuality, type MaterialQuality } from './material-quality-core.ts';
import { GENERATED_ECONOMY_BALANCE } from './data/generated/economy-balance.generated.ts';

function replaceData(target: object, source: object): void {
  const mutable = target as Record<string, unknown>;
  for (const key of Object.keys(mutable)) delete mutable[key];
  Object.assign(mutable, JSON.parse(JSON.stringify(source)) as Record<string, unknown>);
}

replaceData(baseline.ECONOMY_BALANCE, GENERATED_ECONOMY_BALANCE);

const MATERIAL_TIER_PERCENT = [100, 150, 220, 320, 460] as const;
const MATERIAL_QUALITY_PERCENT = [100, 160, 250, 400, 700, 1500] as const;

export type MaterialSellDataById = baseline.MaterialSellData & { materialId: number; quality: MaterialQuality };

/** Kanonischer Economy-Zugriff: Berechnung erfolgt direkt über materialId. */
export function materialSellDataById(materialId: number | null | undefined, requestedQuality?: MaterialQuality): MaterialSellDataById | null {
  const reference = getMaterialReferenceById(materialId);
  if (!reference) return null;
  const material = reference.definition;
  const quality = resolveMaterialQuality(requestedQuality, material.rarity);
  const factorProduct = MATERIAL_TIER_PERCENT[material.rarity - 1] * MATERIAL_QUALITY_PERCENT[quality - 1];
  const factor = factorProduct / 10_000;
  const valueNickel = Math.round(CONFIG.market.materialBaseNickel * factorProduct / 10_000);
  const seconds = baseline.roundUpToStep(
    baseline.ECONOMY_BALANCE.materialSaleBaseSeconds + baseline.ECONOMY_BALANCE.materialSaleSecondsPerNickel * valueNickel,
    baseline.ECONOMY_BALANCE.timeRoundStepSeconds
  );
  return {
    type: 'material',
    materialId: reference.materialId,
    quality,
    name: reference.displayName,
    rarity: material.rarity,
    factor,
    valueNickel,
    seconds
  };
}

/** Legacy-Grenze für alte Runtime-Aufrufe; intern wird sofort auf ID aufgelöst. */
export function materialSellData(name: string): baseline.MaterialSellData | null {
  const sale = materialSellDataById(getMaterialIdByName(name));
  if (!sale) return null;
  const { materialId: _materialId, quality: _quality, ...legacy } = sale;
  return legacy;
}

export interface CraftedWeaponEconomy {
  materialValueNickel: number;
  valueNickel: number;
  forgeSeconds: number;
}

/** S13: Each consumed unit contributes at its actual quality; the performance premium uses S1. */
export function calculateCraftedWeaponEconomy(
  weaponForm: string, slots: readonly WeaponSlot[] | null | undefined
): CraftedWeaponEconomy | null {
  if (!Object.hasOwn(CONFIG.forge.weaponForms, weaponForm)) return null;
  const selected = new Map(normalizeWeaponSlots(slots).map(slot => [slot.slot, slot]));
  const referenceSlots: WeaponSlot[] = [];
  let materialValueNickel = 0;
  for (const slot of getWeaponCraftingSlots(weaponForm)) {
    const selection = selected.get(slot);
    const sale = materialSellDataById(selection?.materialId, selection?.quality ?? undefined);
    if (!sale) return null;
    materialValueNickel += sale.valueNickel * getWeaponSelectionQuantity(weaponForm, slot);
    referenceSlots.push({ slot, materialId: sale.materialId, quality: 1 });
  }
  const referenceStats = calculateWeaponStats(referenceSlots, weaponForm);
  const referenceEconomy = baseline.calculateWeaponEconomy(referenceStats);
  const step = baseline.ECONOMY_BALANCE.weaponValueRoundStepNickel;
  const materialAndProcessing = step * Math.ceil((1.5 * materialValueNickel + 20) / step);
  const performancePremium = step * Math.ceil((referenceEconomy.performance * baseline.ECONOMY_BALANCE.weaponValuePerPerformance) / step);
  return { materialValueNickel, valueNickel: materialAndProcessing + performancePremium, forgeSeconds: referenceEconomy.forgeSeconds };
}

export type SellableWeapon = baseline.WeaponSaleLike & {
  weaponForm?: string | null;
  preservedMaterialBaseStats?: unknown;
};

export function weaponSellData(weapon: SellableWeapon | null | undefined): baseline.WeaponSellData | null {
  if (!weapon) return null;
  const quote = weapon.weaponForm && !weapon.preservedMaterialBaseStats
    ? calculateCraftedWeaponEconomy(weapon.weaponForm, weapon.slots) : null;
  const storedValue = Math.max(0, Math.round(weapon.valueNickel));
  const valueNickel = quote?.valueNickel ?? (weapon.stats && !weapon.preservedMaterialBaseStats
    ? baseline.calculateWeaponValueNickel(weapon.stats) : storedValue);
  return {
    type: 'weapon',
    weaponId: weapon.id,
    name: weapon.name,
    factor: rarityFactor(weapon.slots),
    valueNickel,
    seconds: baseline.calculateWeaponSaleSeconds(valueNickel)
  };
}

/** Etappe A S04: Ein zusätzlicher Unterkunftsplatz; Preis in Nickel, ohne allgemeinen Gebäudefaktor. */
export function calculateUpgradeCost(kind: keyof typeof CONFIG.upgrades, current: number): number {
  if (kind === 'inn') {
    if (!Number.isSafeInteger(current) || current < 2 || current > 48) {
      throw new Error('Unterkunftskapazität außerhalb des Ausbauintervalls 2–47.');
    }
    if (current === 48) return 0; // Bei erreichtem Maximum nur noch die Schaltfläche deaktivieren.
    return current <= 11
      ? 1000 + 250 * (current - 2)
      : 3500 + 350 * (current - 12);
  }
  return baseline.calculateUpgradeCost(kind, current);
}

export const ECONOMY_CORE_BRIDGE = {
  ...baseline.ECONOMY_CORE_BRIDGE,
  calculateUpgradeCost,
  materialSellData,
  weaponSellData
};

export * from './economy-core-v01310-baseline.ts';

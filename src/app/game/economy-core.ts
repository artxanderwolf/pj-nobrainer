import * as baseline from './economy-core-v01310-baseline.ts';
import { CONFIG, getMaterialIdByName, getMaterialReferenceById } from './game-core.ts';
import { GENERATED_ECONOMY_BALANCE } from './data/generated/economy-balance.generated.ts';

function replaceData(target: object, source: object): void {
  const mutable = target as Record<string, unknown>;
  for (const key of Object.keys(mutable)) delete mutable[key];
  Object.assign(mutable, JSON.parse(JSON.stringify(source)) as Record<string, unknown>);
}

replaceData(baseline.ECONOMY_BALANCE, GENERATED_ECONOMY_BALANCE);

export type MaterialSellDataById = baseline.MaterialSellData & { materialId: number };

/** Kanonischer Economy-Zugriff: Berechnung erfolgt direkt über materialId. */
export function materialSellDataById(materialId: number | null | undefined): MaterialSellDataById | null {
  const reference = getMaterialReferenceById(materialId);
  if (!reference) return null;
  const material = reference.definition;
  const hasPositiveSpecial = Boolean(material.specialEffect && material.specialEffect.amount > 0);
  const specialFactor = hasPositiveSpecial ? baseline.ECONOMY_BALANCE.positiveSpecialMaterialValueFactor : 1;
  const factor = material.rarity * specialFactor;
  const valueNickel = Math.round(CONFIG.market.materialBaseNickel * factor);
  const seconds = baseline.roundUpToStep(
    baseline.ECONOMY_BALANCE.materialSaleBaseSeconds + baseline.ECONOMY_BALANCE.materialSaleSecondsPerNickel * valueNickel,
    baseline.ECONOMY_BALANCE.timeRoundStepSeconds
  );
  return {
    type: 'material',
    materialId: reference.materialId,
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
  const { materialId: _materialId, ...legacy } = sale;
  return legacy;
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
  materialSellData
};

export * from './economy-core-v01310-baseline.ts';

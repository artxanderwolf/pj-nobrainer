import * as baseline from './economy-core-v01310-baseline.ts';
import { getMaterialReferenceById } from './game-core.ts';
import { GENERATED_ECONOMY_BALANCE } from './data/generated/economy-balance.generated.ts';

function replaceData(target: object, source: object): void {
  const mutable = target as Record<string, unknown>;
  for (const key of Object.keys(mutable)) delete mutable[key];
  Object.assign(mutable, JSON.parse(JSON.stringify(source)) as Record<string, unknown>);
}

replaceData(baseline.ECONOMY_BALANCE, GENERATED_ECONOMY_BALANCE);

export type MaterialSellDataById = baseline.MaterialSellData & { materialId: number };

/** Kanonischer Economy-Zugriff für Materialien; Namen bleiben nur Ausgabewerte. */
export function materialSellDataById(materialId: number | null | undefined): MaterialSellDataById | null {
  const reference = getMaterialReferenceById(materialId);
  if (!reference) return null;
  const sale = baseline.materialSellData(reference.displayName);
  return sale ? { ...sale, materialId: reference.materialId } : null;
}

export * from './economy-core-v01310-baseline.ts';

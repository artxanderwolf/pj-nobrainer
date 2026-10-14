export type MaterialValueKind = 'number' | 'percent';

export interface MaterialPresentationDefinitionLike {
  category: string;
  rarity: number;
  baseDamage: number | null;
  baseSpeed: number | null;
  blade: number | null;
  penetration: number | null;
  gripSpeed: number | null;
  hitChance: number | null;
}

export interface MaterialIndexRowPresentation {
  category: string;
  name: string;
  rarityText: string;
  baseDamageText: string;
  baseSpeedText: string;
  bladeText: string;
  penetrationText: string;
  gripSpeedText: string;
  hitChanceText: string;
  reinforcementText: string;
  dungeonChanceText: string;
}

export interface MaterialStorageEntryLike {
  category: string;
  qty: number;
}

export interface MaterialStorageRowPresentation {
  name: string;
  category: string;
  quantityText: string;
  valueText: string;
  tooltip: string;
}

export type MaterialCurrencyFormatter = (valueNickel: number) => string;

export function formatMaterialValue(value: number | null | undefined, kind: MaterialValueKind = 'number'): string {
  if (value === null || value === undefined) return '–';
  if (kind === 'percent') return `${Math.round(Number(value) * 100)} %`;
  return Number(value).toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

export function getMaterialIndexRowPresentation(
  name: string,
  material: MaterialPresentationDefinitionLike,
  reinforcementText: string,
  dungeonChance: number | null | undefined
): MaterialIndexRowPresentation {
  return {
    category: material.category,
    name,
    rarityText: `S${material.rarity}`,
    baseDamageText: formatMaterialValue(material.baseDamage),
    baseSpeedText: formatMaterialValue(material.baseSpeed),
    bladeText: formatMaterialValue(material.blade),
    penetrationText: formatMaterialValue(material.penetration, 'percent'),
    gripSpeedText: formatMaterialValue(material.gripSpeed),
    hitChanceText: formatMaterialValue(material.hitChance, 'percent'),
    reinforcementText,
    dungeonChanceText: `${formatMaterialValue(dungeonChance)} %`
  };
}

export function sortMaterialStorageEntries(
  entries: readonly (readonly [string, MaterialStorageEntryLike])[]
): [string, MaterialStorageEntryLike][] {
  return entries
    .map(([name, entry]) => [name, entry] as [string, MaterialStorageEntryLike])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

export function getMaterialStorageRowPresentation(
  name: string,
  entry: MaterialStorageEntryLike,
  unitValueNickel: number,
  formatCurrency: MaterialCurrencyFormatter
): MaterialStorageRowPresentation {
  const valueText = formatCurrency(unitValueNickel);
  return {
    name,
    category: entry.category,
    quantityText: String(entry.qty),
    valueText,
    tooltip: `Verkaufswert: ${valueText}`
  };
}

export const MATERIAL_PRESENTATION_CORE_BRIDGE = {
  formatMaterialValue,
  getMaterialIndexRowPresentation,
  sortMaterialStorageEntries,
  getMaterialStorageRowPresentation
};

export type MaterialPresentationCoreBridge = typeof MATERIAL_PRESENTATION_CORE_BRIDGE;

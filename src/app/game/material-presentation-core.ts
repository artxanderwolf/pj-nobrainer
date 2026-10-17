export type MaterialValueKind = 'number' | 'percent' | 'factor';

export interface MaterialStatsPresentationLike {
  hp: number;
  energy: number;
  armor: number;
  dodge: number;
  strengthFactor: number;
  precision: number;
  threat: number;
  critChance: number;
  critDamage: number;
  hpRegenPerMinute: number;
  energyRegenPerMinute: number;
  experienceFactor: number;
  lifeSteal: number;
  penetration: number;
}

export interface MaterialPresentationDefinitionLike {
  category: string;
  rarity: number;
  stats: MaterialStatsPresentationLike;
  specialEffect: { stat: string; amount: number } | null;
}

export interface MaterialIndexRowPresentation {
  category: string;
  name: string;
  rarityText: string;
  hpText: string;
  energyText: string;
  armorText: string;
  dodgeText: string;
  strengthFactorText: string;
  precisionText: string;
  threatText: string;
  critChanceText: string;
  critDamageText: string;
  hpRegenText: string;
  energyRegenText: string;
  experienceText: string;
  lifeStealText: string;
  penetrationText: string;
  specialStatText: string;
  specialPercentText: string;
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
  if (kind === 'factor') return Number(value).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return Number(value).toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

export function getMaterialIndexRowPresentation(
  name: string,
  material: MaterialPresentationDefinitionLike,
  _specialEffectText: string,
  dungeonChance: number | null | undefined
): MaterialIndexRowPresentation {
  const stats = material.stats;
  return {
    category: material.category,
    name,
    rarityText: `S${material.rarity}`,
    hpText: formatMaterialValue(stats.hp),
    energyText: formatMaterialValue(stats.energy),
    armorText: `${formatMaterialValue(stats.armor)} %`,
    dodgeText: formatMaterialValue(stats.dodge, 'percent'),
    strengthFactorText: formatMaterialValue(stats.strengthFactor, 'factor'),
    precisionText: formatMaterialValue(stats.precision, 'factor'),
    threatText: formatMaterialValue(stats.threat),
    critChanceText: formatMaterialValue(stats.critChance, 'percent'),
    critDamageText: formatMaterialValue(stats.critDamage, 'percent'),
    hpRegenText: formatMaterialValue(stats.hpRegenPerMinute),
    energyRegenText: formatMaterialValue(stats.energyRegenPerMinute),
    experienceText: formatMaterialValue(stats.experienceFactor, 'percent'),
    lifeStealText: formatMaterialValue(stats.lifeSteal, 'percent'),
    penetrationText: formatMaterialValue(stats.penetration, 'percent'),
    specialStatText: material.specialEffect?.stat ?? '–',
    specialPercentText: material.specialEffect ? `${Math.round(material.specialEffect.amount * 100)} %` : '–',
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
  sortMaterialStorageEntries
};

export type MaterialPresentationCoreBridge = ReturnType<typeof createMaterialPresentationCore>;

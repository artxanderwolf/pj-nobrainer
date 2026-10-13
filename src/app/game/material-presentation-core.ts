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

export const MATERIAL_PRESENTATION_CORE_BRIDGE = {
  formatMaterialValue,
  getMaterialIndexRowPresentation
};

export type MaterialPresentationCoreBridge = typeof MATERIAL_PRESENTATION_CORE_BRIDGE;

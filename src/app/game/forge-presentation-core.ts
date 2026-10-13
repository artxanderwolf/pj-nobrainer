export interface ForgePreviewStatsLike {
  damagePerHit: number;
  materialBaseDamage: number;
  formDamageFactor: number;
  attackSpeed: number;
  materialBaseSpeed: number;
  formSpeedFactor: number;
  hitChance: number;
  expectedRaw: number;
  penetration: number;
}

export interface ForgePreviewPresentationInput {
  complete: boolean;
  hasMaterials: boolean;
  hasCapacity: boolean;
  seconds: number;
  valueNickel: number;
  factor: number;
  stats: ForgePreviewStatsLike;
  reinforcementMaterial: string | null;
}

export interface ForgePreviewPresentation {
  timeText: string;
  valueText: string;
  damageText: string;
  damageBaseInfo: string;
  speedText: string;
  speedBaseInfo: string;
  hitText: string;
  rawText: string;
  penetrationText: string;
  rarityText: string;
  reinforcementText: string;
  startDisabled: boolean;
}

export type ForgeCurrencyFormatter = (valueNickel: number) => string;
export type ForgeReinforcementFormatter = (materialName: string | null) => string;

export function getForgePreviewPresentation(
  input: ForgePreviewPresentationInput,
  formatCurrency: ForgeCurrencyFormatter,
  formatReinforcement: ForgeReinforcementFormatter
): ForgePreviewPresentation {
  if (!input.complete) {
    return {
      timeText: '–',
      valueText: '–',
      damageText: '–',
      damageBaseInfo: '',
      speedText: '–',
      speedBaseInfo: '',
      hitText: '–',
      rawText: '–',
      penetrationText: '–',
      rarityText: '–',
      reinforcementText: 'Verstärkungseffekt: –',
      startDisabled: true
    };
  }

  const stats = input.stats;
  return {
    timeText: `${input.seconds} s`,
    valueText: formatCurrency(input.valueNickel),
    damageText: stats.damagePerHit.toFixed(2),
    damageBaseInfo: `Materialbasis ${stats.materialBaseDamage.toFixed(2)} × Waffenform ${stats.formDamageFactor.toFixed(1)}`,
    speedText: stats.attackSpeed.toFixed(2),
    speedBaseInfo: `Materialbasis ${stats.materialBaseSpeed.toFixed(2)} × Waffenform ${stats.formSpeedFactor.toFixed(1)}`,
    hitText: `${Math.round(stats.hitChance * 100)} %`,
    rawText: stats.expectedRaw.toFixed(2),
    penetrationText: `${Math.round(stats.penetration * 100)} %`,
    rarityText: `× ${input.factor}`,
    reinforcementText: `Verstärkungseffekt: ${formatReinforcement(input.reinforcementMaterial)}`,
    startDisabled: !input.hasCapacity || !input.hasMaterials
  };
}

export const FORGE_PRESENTATION_CORE_BRIDGE = {
  getForgePreviewPresentation
};

export type ForgePresentationCoreBridge = typeof FORGE_PRESENTATION_CORE_BRIDGE;

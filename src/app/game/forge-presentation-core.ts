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
  reinforcementMaterialId: number | null;
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

export interface ForgeJobPresentationLike {
  weaponName: string;
  totalSeconds: number;
  finishesAt?: number;
  valueNickel: number;
  stats?: {
    expectedRaw?: number;
  };
}

export interface ActiveForgeJobPresentation {
  title: string;
  remainingText: string;
  progressPercent: number;
  rawText: string;
  valueText: string;
}

export interface QueuedForgeJobPresentation {
  title: string;
  metaText: string;
}

export type ForgeCurrencyFormatter = (valueNickel: number) => string;
export type ForgeDurationFormatter = (seconds: number) => string;
export type ForgeReinforcementFormatter = (materialId: number | null) => string;

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
      reinforcementText: 'Spezialeffekt: –',
      startDisabled: true
    };
  }

  const stats = input.stats;
  return {
    timeText: `${input.seconds} s`,
    valueText: formatCurrency(input.valueNickel),
    damageText: stats.damagePerHit.toFixed(2),
    damageBaseInfo: `Waffenbasis ${stats.materialBaseDamage.toFixed(2)}`,
    speedText: stats.attackSpeed.toFixed(2),
    speedBaseInfo: `Waffenbasis ${stats.materialBaseSpeed.toFixed(2)}`,
    hitText: `${Math.round(stats.hitChance * 100)} %`,
    rawText: stats.expectedRaw.toFixed(2),
    penetrationText: `${Math.round(stats.penetration * 100)} %`,
    rarityText: input.factor.toFixed(2),
    reinforcementText: `Spezialeffekt: ${formatReinforcement(input.reinforcementMaterialId)}`,
    startDisabled: !input.hasCapacity || !input.hasMaterials
  };
}

export function getActiveForgeJobPresentation(
  job: ForgeJobPresentationLike,
  index: number,
  now: number,
  formatCurrency: ForgeCurrencyFormatter,
  formatDuration: ForgeDurationFormatter
): ActiveForgeJobPresentation {
  const remainingSeconds = Math.ceil(Math.max(0, Number(job.finishesAt ?? now) - now) / 1000);
  const totalSeconds = Math.max(1, Number(job.totalSeconds) || 1);
  const progressPercent = Math.max(0, Math.min(100, 100 * (totalSeconds - remainingSeconds) / totalSeconds));
  return {
    title: `Platz ${index + 1}: ${job.weaponName}`,
    remainingText: `${formatDuration(remainingSeconds)} verbleibend`,
    progressPercent,
    rawText: Number(job.stats?.expectedRaw ?? 0).toFixed(2),
    valueText: formatCurrency(job.valueNickel)
  };
}

export function getQueuedForgeJobPresentation(
  job: ForgeJobPresentationLike,
  index: number,
  formatDuration: ForgeDurationFormatter
): QueuedForgeJobPresentation {
  return {
    title: `${index + 1}. ${job.weaponName}`,
    metaText: `${formatDuration(job.totalSeconds)} Herstellungszeit`
  };
}

export const FORGE_PRESENTATION_CORE_BRIDGE = {
  getForgePreviewPresentation,
  getActiveForgeJobPresentation,
  getQueuedForgeJobPresentation
};

export type ForgePresentationCoreBridge = typeof FORGE_PRESENTATION_CORE_BRIDGE;

export interface MarketPresentationJobLike {
  type: 'material' | 'weapon';
  name: string;
  valueNickel: number;
  seconds: number;
  quantity?: number;
  finishesAt?: number;
}

export interface ActiveMarketJobPresentation {
  title: string;
  remainingText: string;
  revenueValueText: string;
  progressPercent: number;
}

export interface QueuedMarketJobPresentation {
  title: string;
  metaText: string;
}

export interface MarketMaterialPresentation {
  title: string;
  stockText: string;
  previewText: string;
  sellDisabled: boolean;
}

export interface MarketWeaponPresentation {
  title: string;
  tooltip: string;
  sellDisabled: boolean;
}

export type MarketCurrencyFormatter = (valueNickel: number) => string;
export type MarketDurationFormatter = (seconds: number) => string;

function getMarketJobDisplayName(job: MarketPresentationJobLike): string {
  const quantity = job.quantity ?? 1;
  return job.type === 'material' && quantity > 1 ? `${quantity}× ${job.name}` : job.name;
}

export function getActiveMarketJobPresentation(
  job: MarketPresentationJobLike,
  index: number,
  now: number,
  formatCurrency: MarketCurrencyFormatter,
  formatDuration: MarketDurationFormatter
): ActiveMarketJobPresentation {
  const remainingSeconds = Math.ceil(Math.max(0, Number(job.finishesAt ?? now) - now) / 1000);
  const totalSeconds = Math.max(1, Number(job.seconds) || 1);
  const progressPercent = Math.max(0, Math.min(100, 100 * (totalSeconds - remainingSeconds) / totalSeconds));
  return {
    title: `Platz ${index + 1}: ${getMarketJobDisplayName(job)}`,
    remainingText: formatDuration(remainingSeconds),
    revenueValueText: formatCurrency(job.valueNickel),
    progressPercent
  };
}

export function getQueuedMarketJobPresentation(
  job: MarketPresentationJobLike,
  index: number,
  formatCurrency: MarketCurrencyFormatter,
  formatDuration: MarketDurationFormatter
): QueuedMarketJobPresentation {
  return {
    title: `${index + 1}. ${getMarketJobDisplayName(job)}`,
    metaText: `${formatDuration(job.seconds)} · ${formatCurrency(job.valueNickel)}`
  };
}

export function getMarketMaterialPresentation(
  name: string,
  stock: number,
  quantity: number,
  unitValueNickel: number,
  unitSeconds: number,
  hasCapacity: boolean,
  formatCurrency: MarketCurrencyFormatter,
  formatDuration: MarketDurationFormatter
): MarketMaterialPresentation {
  const safeQuantity = Math.max(1, Math.min(Math.max(1, Math.floor(stock)), Math.floor(quantity) || 1));
  return {
    title: `Pro Stück: ${formatCurrency(unitValueNickel)} · ${formatDuration(unitSeconds)}`,
    stockText: `Bestand ${stock}`,
    previewText: `${formatCurrency(unitValueNickel * safeQuantity)} · ${formatDuration(unitSeconds * safeQuantity)}`,
    sellDisabled: !hasCapacity
  };
}

export function getMarketWeaponPresentation(
  name: string,
  weaponId: number,
  valueNickel: number,
  seconds: number,
  hasCapacity: boolean,
  formatCurrency: MarketCurrencyFormatter
): MarketWeaponPresentation {
  return {
    title: `${name} #${weaponId}`,
    tooltip: `Verkaufswert: ${formatCurrency(valueNickel)} · Verkaufsdauer: ${seconds}s`,
    sellDisabled: !hasCapacity
  };
}

export const MARKET_PRESENTATION_CORE_BRIDGE = {
  getActiveMarketJobPresentation,
  getQueuedMarketJobPresentation,
  getMarketMaterialPresentation,
  getMarketWeaponPresentation
};

export type MarketPresentationCoreBridge = typeof MARKET_PRESENTATION_CORE_BRIDGE;

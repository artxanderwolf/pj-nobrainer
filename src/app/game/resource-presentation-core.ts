export interface ResourcePresentationInventoryEntryLike {
  qty: number;
}

export type CityCurrencyName = 'Nickel' | 'Bronze' | 'Silber' | 'Gold' | 'Netherit';

export interface CityCurrencyPresentation {
  text: string;
  iconSrc: string;
  denomination: CityCurrencyName;
}

export interface ResourceHeaderPresentation {
  goldText: string;
  goldIconSrc: string;
  goldDenomination: CityCurrencyName;
  materialCountText: string;
}

const CITY_CURRENCY_DENOMINATIONS = [
  { name: 'Netherit', valueNickel: 1_000_000_000_000, iconSrc: 'ui/coin_5net_32.png' },
  { name: 'Gold', valueNickel: 1_000_000_000, iconSrc: 'ui/coin_4gol_32.png' },
  { name: 'Silber', valueNickel: 1_000_000, iconSrc: 'ui/coin_3sil_32.png' },
  { name: 'Bronze', valueNickel: 1_000, iconSrc: 'ui/coin_2bro_32.png' },
  { name: 'Nickel', valueNickel: 1, iconSrc: 'ui/coin_1nic_32.png' }
] as const;

function numeric(value: number): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function formatCurrencyAmount(nickel: number, valueNickel: number): string {
  if (valueNickel === 1) return String(nickel);
  const amount = nickel / valueNickel;
  const truncated = Math.floor((amount + Number.EPSILON) * 100) / 100;
  return truncated.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

export function getCityCurrencyPresentation(value: number): CityCurrencyPresentation {
  const nickel = Math.max(0, Math.round(numeric(value)));
  const denomination = CITY_CURRENCY_DENOMINATIONS.find(item => nickel >= item.valueNickel)
    ?? CITY_CURRENCY_DENOMINATIONS.at(-1)!;
  return {
    text: `${formatCurrencyAmount(nickel, denomination.valueNickel)} ${denomination.name}`,
    iconSrc: denomination.iconSrc,
    denomination: denomination.name
  };
}

export function getResourceHeaderPresentation(
  gold: number,
  inventory: Record<string, ResourcePresentationInventoryEntryLike | null | undefined>
): ResourceHeaderPresentation {
  const materialCount = Object.values(inventory ?? {}).reduce(
    (sum, entry) => sum + Math.max(0, numeric(entry?.qty ?? 0)),
    0
  );
  const currency = getCityCurrencyPresentation(gold);

  return {
    goldText: currency.text,
    goldIconSrc: currency.iconSrc,
    goldDenomination: currency.denomination,
    materialCountText: String(materialCount)
  };
}

export const RESOURCE_PRESENTATION_CORE_BRIDGE = {
  getCityCurrencyPresentation,
  getResourceHeaderPresentation
};

export type ResourcePresentationCoreBridge = typeof RESOURCE_PRESENTATION_CORE_BRIDGE;

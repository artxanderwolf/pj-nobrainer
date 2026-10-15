export type UpgradePresentationKind = 'inn' | 'forgeSlots' | 'forgeQueue' | 'marketSlots' | 'marketQueue';

export type UpgradePresentationReason = 'ready' | 'max' | 'insufficient-funds';

export interface UpgradeOfferPresentationLike {
  reason: UpgradePresentationReason;
  current: number;
  max: number;
  costNickel: number;
  label: string;
}

export interface UpgradeStatPresentation {
  label: string;
  value: string;
}

export interface UpgradeButtonPresentation {
  kind: UpgradePresentationKind;
  text: string;
  disabled: boolean;
  primary: boolean;
}

export interface UpgradeCardPresentation {
  stats: UpgradeStatPresentation[];
  buttons: UpgradeButtonPresentation[];
  note: string;
}

export interface UpgradeCardsPresentation {
  inn: UpgradeCardPresentation;
  forge: UpgradeCardPresentation;
  market: UpgradeCardPresentation;
}

export interface UpgradeCardsPresentationInput {
  characterCount: number;
  innCapacity: number;
  forgeJobCount: number;
  forgeSlotCapacity: number;
  forgeQueueCount: number;
  forgeQueueCapacity: number;
  marketJobCount: number;
  marketSlotCapacity: number;
  marketQueueCount: number;
  marketQueueCapacity: number;
  offers: Record<UpgradePresentationKind, UpgradeOfferPresentationLike>;
}

export type UpgradeCurrencyFormatter = (valueNickel: number) => string;

export function getUpgradeButtonPresentation(
  kind: UpgradePresentationKind,
  offer: UpgradeOfferPresentationLike,
  formatCurrency: UpgradeCurrencyFormatter
): UpgradeButtonPresentation {
  if (offer.reason === 'max') {
    return {
      kind,
      text: `${offer.label}: Maximum erreicht`,
      disabled: true,
      primary: false
    };
  }

  return {
    kind,
    text: `+1 ${offer.label} · ${formatCurrency(offer.costNickel)}`,
    disabled: offer.reason === 'insufficient-funds',
    primary: true
  };
}

export function getUpgradeCardsPresentation(
  input: UpgradeCardsPresentationInput,
  formatCurrency: UpgradeCurrencyFormatter
): UpgradeCardsPresentation {
  const button = (kind: UpgradePresentationKind) =>
    getUpgradeButtonPresentation(kind, input.offers[kind], formatCurrency);

  return {
    inn: {
      stats: [
        {
          label: 'Belegt / Kapazität',
          value: `${input.characterCount} / ${input.innCapacity}`
        }
      ],
      buttons: [button('inn')],
      note: `+1 Platz je Upgrade · Maximum ${input.offers.inn.max}`
    },
    forge: {
      stats: [
        {
          label: 'Herstellungsplätze',
          value: `${input.forgeJobCount} / ${input.forgeSlotCapacity}`
        },
        {
          label: 'Warteschlange',
          value: `${input.forgeQueueCount} / ${input.forgeQueueCapacity}`
        }
      ],
      buttons: [button('forgeSlots'), button('forgeQueue')],
      note: ''
    },
    market: {
      stats: [
        {
          label: 'Verkaufsplätze',
          value: `${input.marketJobCount} / ${input.marketSlotCapacity}`
        },
        {
          label: 'Warteschlange',
          value: `${input.marketQueueCount} / ${input.marketQueueCapacity}`
        }
      ],
      buttons: [button('marketSlots'), button('marketQueue')],
      note: ''
    }
  };
}

export const PROGRESSION_PRESENTATION_CORE_BRIDGE = {
  getUpgradeButtonPresentation,
  getUpgradeCardsPresentation
};

export type ProgressionPresentationCoreBridge = typeof PROGRESSION_PRESENTATION_CORE_BRIDGE;

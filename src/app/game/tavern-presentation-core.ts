export interface TavernCharacterClassLike {
  id: string;
  name: string;
  role: string;
  maxHp: number;
  maxEnergy: number;
  armor: number;
  dodge: number;
  strengthFactor: number;
  precision: number;
}

export interface TavernStatPresentation {
  label: string;
  value: string;
}

export interface TavernOfferPresentation {
  classId: string;
  name: string;
  roleTag: string;
  stats: TavernStatPresentation[];
  recruitLabel: string;
  disabled: boolean;
}

export interface TavernPresentation {
  full: boolean;
  canPay: boolean;
  summaryStats: TavernStatPresentation[];
  capacityStats: TavernStatPresentation[];
  offers: TavernOfferPresentation[];
  statusText: string;
  openInnLabel: 'Inn-Ausbau öffnen';
}

export function getTavernPresentation(
  characterClasses: readonly TavernCharacterClassLike[],
  characterCount: number,
  innCapacity: number,
  gold: number,
  recruitCost: number,
  formattedRecruitCost: string
): TavernPresentation {
  const full = characterCount >= innCapacity;
  const canPay = gold >= recruitCost;
  const disabled = full || !canPay;

  const summaryStats: TavernStatPresentation[] = [
    { label: 'Kader', value: `${characterCount} / ${innCapacity}` },
    { label: 'Nächste Anwerbung', value: formattedRecruitCost }
  ];

  const capacityStats: TavernStatPresentation[] = [
    { label: 'Belegt', value: String(characterCount) },
    { label: 'Kapazität', value: String(innCapacity) },
    { label: 'Nächste Kosten', value: formattedRecruitCost }
  ];

  const offers = characterClasses.map((characterClass): TavernOfferPresentation => ({
    classId: characterClass.id,
    name: characterClass.name,
    roleTag: characterClass.role.toUpperCase(),
    stats: [
      { label: 'HP', value: String(characterClass.maxHp) },
      { label: 'EN', value: String(characterClass.maxEnergy) },
      { label: 'RÜS', value: String(characterClass.armor) },
      { label: 'AUS', value: `${Math.round(characterClass.dodge * 100)} %` },
      { label: 'STÄ', value: characterClass.strengthFactor.toFixed(2) },
      { label: 'PRÄ', value: characterClass.precision.toFixed(2) }
    ],
    recruitLabel: `${characterClass.name} anwerben · ${formattedRecruitCost}`,
    disabled
  }));

  return {
    full,
    canPay,
    summaryStats,
    capacityStats,
    offers,
    statusText: full
      ? 'Inn voll – zuerst einen weiteren Kaderplatz kaufen.'
      : (!canPay ? 'Nicht genügend Geld für die Rekrutierung.' : ''),
    openInnLabel: 'Inn-Ausbau öffnen'
  };
}

export const TAVERN_PRESENTATION_CORE_BRIDGE = { getTavernPresentation };
export type TavernPresentationCoreBridge = typeof TAVERN_PRESENTATION_CORE_BRIDGE;

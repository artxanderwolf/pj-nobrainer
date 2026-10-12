import { CONFIG, CHARACTER_CLASSES } from './game-core';
import { calculateRecruitCost, calculateUpgradeCost } from './economy-core';

export type UpgradeKind = 'inn' | 'forgeSlots' | 'forgeQueue' | 'marketSlots' | 'marketQueue';

export interface ProgressionCharacterLike {
  classId?: string;
}

export interface ProgressionStateLike {
  gold: number;
  characters: ProgressionCharacterLike[];
  upgrades: {
    innCapacity: number;
    forgeSlots: number;
    forgeQueue: number;
    marketSlots: number;
    marketQueue: number;
  };
}

const UPGRADE_MAP = {
  inn: { stateKey: 'innCapacity', configKey: 'inn', label: 'Kaderplatz' },
  forgeSlots: { stateKey: 'forgeSlots', configKey: 'forgeSlots', label: 'Herstellungsplatz' },
  forgeQueue: { stateKey: 'forgeQueue', configKey: 'forgeQueue', label: 'Schmiede-Warteschlangenplatz' },
  marketSlots: { stateKey: 'marketSlots', configKey: 'marketSlots', label: 'Verkaufsplatz' },
  marketQueue: { stateKey: 'marketQueue', configKey: 'marketQueue', label: 'Markt-Warteschlangenplatz' }
} as const;

export function getRecruitOffer(state: ProgressionStateLike, classId = 'recruit') {
  const characterClass = CHARACTER_CLASSES[classId];
  if (!characterClass) return { ok: false as const, reason: 'unknown-class' as const, costNickel: 0, number: 0 };
  const costNickel = calculateRecruitCost(state.characters.length);
  const number = state.characters.filter((character) => character.classId === classId).length + 1;
  if (state.characters.length >= state.upgrades.innCapacity) return { ok: false as const, reason: 'inn-full' as const, costNickel, number, characterClass };
  if (state.gold < costNickel) return { ok: false as const, reason: 'insufficient-funds' as const, costNickel, number, characterClass };
  return { ok: true as const, reason: 'ready' as const, costNickel, number, characterClass };
}

export function spendRecruitCost(state: ProgressionStateLike, classId = 'recruit') {
  const offer = getRecruitOffer(state, classId);
  if (!offer.ok) return offer;
  state.gold -= offer.costNickel;
  return offer;
}

export function getUpgradeOffer(state: ProgressionStateLike, kind: UpgradeKind) {
  const mapping = UPGRADE_MAP[kind];
  const config = CONFIG.upgrades[mapping.configKey];
  const current = state.upgrades[mapping.stateKey];
  const max = 'maxCapacity' in config ? config.maxCapacity : config.max;
  const costNickel = calculateUpgradeCost(mapping.configKey, current);
  if (current >= max) return { ok: false as const, reason: 'max' as const, current, max, costNickel, label: mapping.label };
  if (state.gold < costNickel) return { ok: false as const, reason: 'insufficient-funds' as const, current, max, costNickel, label: mapping.label };
  return { ok: true as const, reason: 'ready' as const, current, max, costNickel, label: mapping.label };
}

export function buyUpgrade(state: ProgressionStateLike, kind: UpgradeKind) {
  const offer = getUpgradeOffer(state, kind);
  if (!offer.ok) return offer;
  const mapping = UPGRADE_MAP[kind];
  state.gold -= offer.costNickel;
  state.upgrades[mapping.stateKey] += 1;
  return { ...offer, newValue: state.upgrades[mapping.stateKey] };
}

export const PROGRESSION_CORE_BRIDGE = {
  getRecruitOffer,
  spendRecruitCost,
  getUpgradeOffer,
  buyUpgrade
};

export type ProgressionCoreBridge = typeof PROGRESSION_CORE_BRIDGE;

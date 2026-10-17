import type { EquipmentHand } from './equipment-core';
import { clampArmorPercent } from './armor-core';
import { getCharacterProgression } from './character-progression-core';
import type { ResolvedCharacterStats } from './game-core';

export interface CharacterPresentationCharacterLike {
  id: number;
  name: string;
  level?: number | null;
  xp?: number | null;
  hp: number;
  energy: number;
  equipment: Record<EquipmentHand, number | null>;
}

export interface CharacterPresentationClassLike {
  name: string;
}

export interface CharacterStatPresentation {
  label: 'LVL' | 'XP' | 'HP' | 'EN' | 'RÜS' | 'AUS' | 'SF' | 'PRÄ' | 'BED' | 'K-C' | 'K-S' | 'HP-Reg.' | 'EN-Reg.' | 'ERF' | 'LR' | 'DS' | 'Offensive gg. Dungeon 1';
  value: string;
}

export interface CharacterHandPresentation {
  hand: EquipmentHand;
  label: 'Linke Hand' | 'Rechte Hand';
  weaponId: number | null;
  pickerKey: string;
  pickerOpen: boolean;
  toggleLabel: 'Auswahl schließen' | 'Waffe wechseln';
  equippedStatus: 'AUSGERÜSTET';
  emptyText: 'Hand ist leer.';
}

export interface CharacterCardPresentation {
  name: string;
  classTag: string;
  stats: CharacterStatPresentation[];
  hands: CharacterHandPresentation[];
}

export interface DungeonTeamPresentationCharacterLike {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  className: string;
}

export interface DungeonTeamCandidatePresentation {
  id: number;
  name: string;
  meta: string;
  assignLabel: 'Zuweisen';
}

export interface DungeonTeamPickerPresentation {
  open: boolean;
  emptyText: 'Keine weiteren Charaktere verfügbar.';
  candidates: DungeonTeamCandidatePresentation[];
}

export interface DungeonTeamSlotPresentation {
  slotIndex: number;
  occupied: boolean;
  characterId: number | null;
  title: string;
  fallen: boolean;
  fallenLabel: 'GEFALLEN';
  hpValue: string;
  energyValue: string;
  emptyText: 'Nicht belegt';
  addLabel: '+ Charakter hinzufügen';
  removeLabel: 'Entfernen';
  switchLabel: 'Wechseln';
}

export interface DungeonTeamPresentation {
  locked: boolean;
  lockedText: 'Teamzuweisung ist während einer laufenden Automatik gesperrt.';
  slots: DungeonTeamSlotPresentation[];
}

const HANDS: ReadonlyArray<{ hand: EquipmentHand; label: CharacterHandPresentation['label'] }> = [
  { hand: 'leftHand', label: 'Linke Hand' },
  { hand: 'rightHand', label: 'Rechte Hand' }
];

const DUNGEON_TEAM_SLOT_COUNT = 4;

function formatResourceValue(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

function formatArmorPercent(value: number): string {
  return `${clampArmorPercent(value).toFixed(1).replace(/\.0$/, '')} %`;
}

export function getWeaponPickerKey(characterId: number, hand: EquipmentHand): string {
  return `${characterId}:${hand}`;
}

export function getCharacterCardPresentation(
  character: CharacterPresentationCharacterLike,
  characterClass: CharacterPresentationClassLike,
  effectiveStats: ResolvedCharacterStats,
  effectiveOffense: number,
  openWeaponPickerHand: string | null
): CharacterCardPresentation {
  const progression = getCharacterProgression(character);
  const stats: CharacterStatPresentation[] = [
    { label: 'LVL', value: `${progression.level} / ${progression.maxLevel}` },
    { label: 'XP', value: progression.atMaxLevel ? 'MAX' : `${progression.xp} / ${progression.xpToNext}` },
    { label: 'HP', value: `${formatResourceValue(character.hp)} / ${formatResourceValue(effectiveStats.maxHp)}` },
    { label: 'EN', value: `${formatResourceValue(character.energy)} / ${formatResourceValue(effectiveStats.maxEnergy)}` },
    { label: 'RÜS', value: formatArmorPercent(effectiveStats.armor) },
    { label: 'AUS', value: `${Math.round(effectiveStats.dodge * 100)} %` },
    { label: 'SF', value: effectiveStats.strengthFactor.toFixed(2) },
    { label: 'K-C', value: `${Math.round(effectiveStats.critChance * 100)} %` },
    { label: 'PRÄ', value: effectiveStats.precision.toFixed(2) },
    { label: 'K-S', value: `${Math.round(effectiveStats.critDamage * 100)} %` },
    { label: 'BED', value: Math.round(effectiveStats.threat).toString() },
    { label: 'DS', value: `${Math.round(effectiveStats.penetration * 100)} %` },
    { label: 'HP-Reg.', value: `${effectiveStats.hpRegenPerMinute.toFixed(1).replace(/\.0$/, '')}/Min.` },
    { label: 'EN-Reg.', value: `${effectiveStats.energyRegenPerMinute.toFixed(1).replace(/\.0$/, '')}/Min.` },
    { label: 'LR', value: `${Math.round(effectiveStats.lifeSteal * 100)} %` },
    { label: 'ERF', value: `${Math.round(effectiveStats.experienceFactor * 100)} %` },
    { label: 'Offensive gg. Dungeon 1', value: effectiveOffense.toFixed(2) }
  ];

  const hands = HANDS.map(({ hand, label }): CharacterHandPresentation => {
    const pickerKey = getWeaponPickerKey(character.id, hand);
    const pickerOpen = openWeaponPickerHand === pickerKey;
    return {
      hand,
      label,
      weaponId: character.equipment[hand],
      pickerKey,
      pickerOpen,
      toggleLabel: pickerOpen ? 'Auswahl schließen' : 'Waffe wechseln',
      equippedStatus: 'AUSGERÜSTET',
      emptyText: 'Hand ist leer.'
    };
  });

  return {
    name: character.name,
    classTag: `Klasse: ${characterClass.name}`,
    stats,
    hands
  };
}

export function getDungeonTeamPickerPresentation(
  teamSlots: readonly (number | null | undefined)[],
  characters: readonly DungeonTeamPresentationCharacterLike[],
  slot: number,
  openPickerSlot: number | null
): DungeonTeamPickerPresentation {
  const open = openPickerSlot === slot;
  if (!open) {
    return { open: false, emptyText: 'Keine weiteren Charaktere verfügbar.', candidates: [] };
  }

  const used = new Set<number>();
  teamSlots.forEach((id, index) => {
    if (index !== slot && typeof id === 'number' && Boolean(id)) used.add(id);
  });

  const candidates = characters
    .filter(character => !used.has(character.id))
    .map((character): DungeonTeamCandidatePresentation => ({
      id: character.id,
      name: character.name,
      meta: `${character.className} · HP ${formatResourceValue(character.hp)} · EN ${formatResourceValue(character.energy)}`,
      assignLabel: 'Zuweisen'
    }));

  return {
    open: true,
    emptyText: 'Keine weiteren Charaktere verfügbar.',
    candidates
  };
}

export function getDungeonTeamPresentation(
  teamSlots: readonly (number | null | undefined)[],
  characters: readonly DungeonTeamPresentationCharacterLike[],
  locked: boolean,
  activeIds: readonly number[],
  cycleActive: boolean
): DungeonTeamPresentation {
  const slots = Array.from({ length: DUNGEON_TEAM_SLOT_COUNT }, (_, slotIndex): DungeonTeamSlotPresentation => {
    const id = teamSlots[slotIndex];
    const character = typeof id === 'number' ? characters.find(entry => entry.id === id) : undefined;
    if (!character) {
      return {
        slotIndex,
        occupied: false,
        characterId: null,
        title: `Platz ${slotIndex + 1}`,
        fallen: false,
        fallenLabel: 'GEFALLEN',
        hpValue: '',
        energyValue: '',
        emptyText: 'Nicht belegt',
        addLabel: '+ Charakter hinzufügen',
        removeLabel: 'Entfernen',
        switchLabel: 'Wechseln'
      };
    }

    return {
      slotIndex,
      occupied: true,
      characterId: character.id,
      title: `Platz ${slotIndex + 1}: ${character.name}`,
      fallen: cycleActive && !activeIds.includes(character.id),
      fallenLabel: 'GEFALLEN',
      hpValue: `${formatResourceValue(character.hp)} / ${formatResourceValue(character.maxHp)}`,
      energyValue: `${formatResourceValue(character.energy)} / ${formatResourceValue(character.maxEnergy)}`,
      emptyText: 'Nicht belegt',
      addLabel: '+ Charakter hinzufügen',
      removeLabel: 'Entfernen',
      switchLabel: 'Wechseln'
    };
  });

  return {
    locked,
    lockedText: 'Teamzuweisung ist während einer laufenden Automatik gesperrt.',
    slots
  };
}

export const CHARACTER_PRESENTATION_CORE_BRIDGE = {
  getWeaponPickerKey,
  getCharacterCardPresentation,
  getDungeonTeamPickerPresentation,
  getDungeonTeamPresentation
};

export type CharacterPresentationCoreBridge = typeof CHARACTER_PRESENTATION_CORE_BRIDGE;

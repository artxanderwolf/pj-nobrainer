import type { EquipmentHand } from './equipment-core';

export interface CharacterPresentationCharacterLike {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  armor: number;
  dodge: number;
  strengthFactor: number;
  precision: number;
  equipment: Record<EquipmentHand, number | null>;
}

export interface CharacterPresentationClassLike {
  name: string;
  energyRegenPerMinute: number;
}

export interface CharacterStatPresentation {
  label: 'HP' | 'EN' | 'RÜS' | 'AUS' | 'STÄ' | 'PRÄ' | 'EN-Reg.' | 'Offensive gg. Dungeon 1';
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

export function getWeaponPickerKey(characterId: number, hand: EquipmentHand): string {
  return `${characterId}:${hand}`;
}

export function getCharacterCardPresentation(
  character: CharacterPresentationCharacterLike,
  characterClass: CharacterPresentationClassLike,
  effectiveOffense: number,
  openWeaponPickerHand: string | null
): CharacterCardPresentation {
  const stats: CharacterStatPresentation[] = [
    { label: 'HP', value: `${character.hp.toFixed(1)} / ${character.maxHp}` },
    { label: 'EN', value: `${character.energy.toFixed(1)} / ${character.maxEnergy}` },
    { label: 'RÜS', value: String(character.armor) },
    { label: 'AUS', value: `${Math.round(character.dodge * 100)} %` },
    { label: 'STÄ', value: character.strengthFactor.toFixed(2) },
    { label: 'PRÄ', value: character.precision.toFixed(2) },
    { label: 'EN-Reg.', value: `${characterClass.energyRegenPerMinute}/Min.` },
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
      meta: `${character.className} · HP ${character.hp.toFixed(1)} · EN ${character.energy.toFixed(1)}`,
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
      hpValue: `${character.hp.toFixed(1)} / ${character.maxHp}`,
      energyValue: `${character.energy.toFixed(1)} / ${character.maxEnergy}`,
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

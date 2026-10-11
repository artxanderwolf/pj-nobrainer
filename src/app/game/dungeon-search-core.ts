export interface SearchParticipantLike {
  hp: number;
  maxHp: number;
  alive: boolean;
}

export type DungeonSearchResult = 'encounter' | 'miss';

export function resolveDungeonSearch(encounterChance: number, roll: number): DungeonSearchResult {
  const chance = Math.max(0, Math.min(1, Number(encounterChance) || 0));
  return roll < chance ? 'encounter' : 'miss';
}

export function healParticipantsAfterSearchMiss<TParticipant extends SearchParticipantLike>(
  participants: readonly TParticipant[],
  healAmount = 1
): number {
  const amount = Math.max(0, Number(healAmount) || 0);
  let healed = 0;

  participants.forEach(participant => {
    if (!participant.alive || participant.hp <= 0 || participant.hp >= participant.maxHp) return;
    const before = participant.hp;
    participant.hp = Math.min(participant.maxHp, participant.hp + amount);
    healed += participant.hp - before;
  });

  return healed;
}

export const DUNGEON_SEARCH_CORE_BRIDGE = {
  resolveDungeonSearch,
  healParticipantsAfterSearchMiss
};

export type DungeonSearchCoreBridge = typeof DUNGEON_SEARCH_CORE_BRIDGE;

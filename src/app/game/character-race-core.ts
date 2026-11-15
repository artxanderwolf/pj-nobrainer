/** S17: stable technical IDs, independent of classes and without stat or worker bonuses. */
export const CHARACTER_RACES = {
  human: { id: 'human', name: 'Mensch', color: '#8954B5' },
  dwarf: { id: 'dwarf', name: 'Zwerg', color: '#B96F38' },
  'wood-elf': { id: 'wood-elf', name: 'Waldelf', color: '#38834E' },
  'high-elf': { id: 'high-elf', name: 'Hochelf', color: '#8BCFE9' },
  halfling: { id: 'halfling', name: 'Halbling', color: '#BC912B' }
} as const;
export type CharacterRaceId = keyof typeof CHARACTER_RACES;
export const DEFAULT_CHARACTER_RACE_ID: CharacterRaceId = 'human';
export function resolveCharacterRaceId(value: unknown): CharacterRaceId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CHARACTER_RACES, value)
    ? value as CharacterRaceId : DEFAULT_CHARACTER_RACE_ID;
}
export function characterRaceName(value: unknown): string {
  return CHARACTER_RACES[resolveCharacterRaceId(value)].name;
}
/** Applies in place, preserving all non-race fields (including class, XP and equipment). */
export function migrateCharacterRaces(state: Record<string, unknown>): boolean {
  if (!Array.isArray(state['characters'])) return false;
  let changed = false;
  for (const character of state['characters'] as Array<{raceId?: unknown}>) {
    if (!character || typeof character !== 'object') continue;
    const raceId = resolveCharacterRaceId(character.raceId);
    if (character.raceId !== raceId) { character.raceId = raceId; changed = true; }
  }
  return changed;
}

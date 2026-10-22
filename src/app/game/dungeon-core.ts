import { CHARACTER_CLASSES, CONFIG, getDungeonEnemyDefinition, type CharacterClassId } from './game-core';
import { enforceGlobalActionCooldown, type CombatActionPointLike } from './combat-core';
import { healParticipantsAfterSearchMiss, resolveDungeonSearch, type SearchParticipantLike } from './dungeon-search-core';

export interface DungeonCharacterLike extends SearchParticipantLike {
  id: number;
  energy: number;
  name?: string;
}

export interface DungeonEnemy {
  id: string;
  name: string;
  classId: CharacterClassId;
  maxHp: number;
  hp: number;
  armor: number;
  dodge: number;
  strengthFactor: number;
  precision: number;
  distance: number;
  alive: boolean;
  damage: number;
  speed: number;
  hitChance: number;
  penetration: number;
  lootMaterialIds: number[];
  xpDrop: number;
}

export interface DungeonAttackPoint extends CombatActionPointLike {
  side: 'player' | 'enemy';
  ownerId: number | string;
  kind: string;
  weaponId?: number | null;
  label?: string;
}

export interface CharacterAttackPointSource {
  kind: string;
  speed: number;
  weaponId?: number | null;
  label?: string;
}

export interface DungeonRunLike {
  dungeonId: number;
  startedAt: number;
  participantIds: number[];
  /** Kompatibilitätsfelder für bestehende Laufzeit-/Save-Strukturen; Dungeon 1 verbraucht keine Energie mehr. */
  energyShare: number;
  totalEnergyCost: number;
  enemies: DungeonEnemy[];
  attackPoints: DungeonAttackPoint[];
}

export type DungeonPhase = 'loot' | 'combat' | 'search' | 'idle';

export interface DungeonStartCheck<TCharacter extends DungeonCharacterLike> {
  ok: boolean;
  reason: string;
  participants: TCharacter[];
  /** Bleibt aus Kompatibilitätsgründen erhalten und ist für Dungeon 1 immer 0. */
  share: number;
  /** Bleibt aus Kompatibilitätsgründen erhalten und ist für Dungeon 1 immer 0. */
  totalCost: number;
}

/** Dungeon 1 verwendet Energie nicht mehr als Kosten- oder Abbruchsystem. */
export function getEnergyCostPerCharacter(_count: number): number {
  return 0;
}

export function checkDungeonStart<TCharacter extends DungeonCharacterLike>(participants: readonly TCharacter[]): DungeonStartCheck<TCharacter> {
  const alive = participants.filter(character => character.alive && character.hp > 0);
  if (!alive.length) return { ok: false, reason: 'Kein Charakter im aktiven Dungeon-Team verfügbar.', participants: [], share: 0, totalCost: 0 };
  return { ok: true, reason: 'Bereit', participants: alive, share: 0, totalCost: 0 };
}

/** Kompatibilitätsfunktion: Dungeon 1 zieht keine Charakterenergie mehr ab. */
export function payDungeonEnergy<TCharacter extends DungeonCharacterLike>(_participants: readonly TCharacter[], _share: number): void {}

export function resetDungeonCycle<TCharacter extends SearchParticipantLike>(characters: readonly TCharacter[]): void {
  characters.forEach(character => { character.hp = character.maxHp; character.alive = true; });
}

export function rollWeightedIndex(weights: readonly number[], roll: number): number {
  const normalized = weights.map(weight => Math.max(0, Number(weight) || 0));
  const total = normalized.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return Math.max(0, normalized.length - 1);
  let cursor = Math.max(0, Math.min(0.999999999999, Number(roll) || 0)) * total;
  for (let index = 0; index < normalized.length; index += 1) {
    cursor -= normalized[index];
    if (cursor <= 0) return index;
  }
  return normalized.length - 1;
}

export function rollEnemyCount(teamSize: number, roll: number): number {
  const size = Math.max(1, Math.min(4, Math.floor(Number(teamSize) || 1))) as 1 | 2 | 3 | 4;
  return rollWeightedIndex(CONFIG.dungeon.enemyCountWeights[size], roll) + 1;
}

export function rollEnemyClass(roll: number): CharacterClassId {
  const entries = Object.entries(CONFIG.dungeon.enemyClassWeights) as [CharacterClassId, number][];
  return entries[rollWeightedIndex(entries.map(([, weight]) => weight), roll)][0];
}

export function createDungeonEnemy(index: number, classId: CharacterClassId): DungeonEnemy {
  const cls = CHARACTER_CLASSES[classId];
  const multipliers = CONFIG.dungeon.enemyMultipliers;
  const base = CONFIG.dungeon.enemyBase;
  const definition = getDungeonEnemyDefinition(CONFIG.dungeon.id, classId);
  return {
    id: `e${index}`,
    name: `${definition?.name ?? cls.name} ${index}`,
    classId,
    maxHp: cls.maxHp * multipliers.hp,
    hp: cls.maxHp * multipliers.hp,
    armor: cls.armor * multipliers.armor,
    dodge: Math.min(0.95, cls.dodge * multipliers.dodge),
    strengthFactor: cls.strengthFactor,
    precision: cls.precision,
    distance: cls.distance ?? 1,
    alive: true,
    damage: base.damage * multipliers.damage,
    speed: base.speed * multipliers.speed,
    hitChance: Math.min(1, base.hitChance * multipliers.hitChance),
    penetration: Math.max(0, Math.min(1, base.penetration * multipliers.penetration)),
    lootMaterialIds: [...(definition?.lootMaterialIds ?? [])],
    xpDrop: Math.max(0, Number(definition?.xpDrop) || 0)
  };
}

export function createDungeonEnemies(count: number, classRoll: () => number): DungeonEnemy[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => createDungeonEnemy(index + 1, rollEnemyClass(classRoll())));
}

function uniqueCharacterAttackPointSources(
  sources: readonly CharacterAttackPointSource[]
): CharacterAttackPointSource[] {
  const seenWeaponIds = new Set<number>();
  return sources.filter(source => {
    if (typeof source.weaponId !== 'number') return true;
    if (seenWeaponIds.has(source.weaponId)) return false;
    seenWeaponIds.add(source.weaponId);
    return true;
  });
}

export function createDungeonAttackPoints<TCharacter extends DungeonCharacterLike>(
  participants: readonly TCharacter[],
  enemies: readonly DungeonEnemy[],
  at: number,
  getAttackPoints: (character: TCharacter) => readonly CharacterAttackPointSource[]
): DungeonAttackPoint[] {
  const result: DungeonAttackPoint[] = [];
  participants.forEach(character => {
    for (const point of uniqueCharacterAttackPointSources(getAttackPoints(character))) {
      result.push({
        side: 'player', ownerId: character.id, kind: point.kind, weaponId: point.weaponId ?? null, label: point.label,
        nextAt: at + 1000 / Math.max(0.01, Number(point.speed) || 0)
      });
    }
  });
  enemies.forEach(enemy => result.push({ side: 'enemy', ownerId: enemy.id, kind: 'enemy', nextAt: at + 1000 / Math.max(0.01, enemy.speed) }));
  return result;
}

export function refreshCharacterAttackPoints(
  points: readonly DungeonAttackPoint[],
  characterId: number,
  sources: readonly CharacterAttackPointSource[],
  at: number
): DungeonAttackPoint[] {
  const existing = points
    .filter(point => point.side === 'player' && point.ownerId === characterId)
    .sort((left, right) => left.nextAt - right.nextAt);
  const untouched = points.filter(point => !(point.side === 'player' && point.ownerId === characterId));
  const unusedExisting = [...existing];

  const refreshed = uniqueCharacterAttackPointSources(sources).map(source => {
    const exactMatch = unusedExisting.findIndex(point => {
      if (typeof source.weaponId === 'number') return point.weaponId === source.weaponId;
      return point.kind === source.kind && (point.weaponId ?? null) === (source.weaponId ?? null);
    });
    const matchIndex = exactMatch >= 0 ? exactMatch : (unusedExisting.length ? 0 : -1);
    const previous = matchIndex >= 0 ? unusedExisting.splice(matchIndex, 1)[0] : undefined;
    return {
      side: 'player' as const,
      ownerId: characterId,
      kind: source.kind,
      weaponId: source.weaponId ?? null,
      label: source.label,
      nextAt: previous?.nextAt ?? at + 1000 / Math.max(0.01, Number(source.speed) || 0)
    };
  });

  return [...untouched, ...refreshed];
}

export function createDungeonRun<TCharacter extends DungeonCharacterLike>(
  participants: readonly TCharacter[], enemies: DungeonEnemy[], at: number,
  getAttackPoints: (character: TCharacter) => readonly CharacterAttackPointSource[]
): DungeonRunLike {
  const check = checkDungeonStart(participants);
  if (!check.ok) throw new Error(check.reason);
  return {
    dungeonId: CONFIG.dungeon.id, startedAt: at, participantIds: check.participants.map(character => character.id),
    energyShare: 0, totalEnergyCost: 0, enemies,
    attackPoints: createDungeonAttackPoints(check.participants, enemies, at, getAttackPoints)
  };
}

export function getNextDueAttack<TPoint extends DungeonAttackPoint>(points: readonly TPoint[], now: number): TPoint | null {
  return points.filter(point => point.nextAt <= now).reduce<TPoint | null>((best, point) => !best || point.nextAt < best.nextAt ? point : best, null);
}

export function filterActiveDungeonAttackPoints<TPoint extends DungeonAttackPoint>(
  points: readonly TPoint[],
  activePlayerIds: readonly number[],
  activeEnemyIds: readonly string[]
): TPoint[] {
  const players = new Set(activePlayerIds);
  const enemies = new Set(activeEnemyIds);
  return points.filter(point => {
    if (point.side === 'player') return typeof point.ownerId === 'number' && players.has(point.ownerId);
    return typeof point.ownerId === 'string' && enemies.has(point.ownerId);
  });
}

export function rescheduleDungeonAttack(point: DungeonAttackPoint, speed: number, allPoints: readonly DungeonAttackPoint[]): void {
  point.nextAt += 1000 / Math.max(0.01, Number(speed) || 0);
  enforceGlobalActionCooldown(allPoints, point.nextAt - 1000 / Math.max(0.01, Number(speed) || 0), 1000);
}

export function getDungeonPhase(state: { dungeonLootCollect?: unknown; dungeonRun?: unknown; dungeonAuto?: boolean; dungeonSearch?: unknown }): DungeonPhase {
  if (state.dungeonLootCollect) return 'loot';
  if (state.dungeonRun) return 'combat';
  if (state.dungeonAuto) return 'search';
  return 'idle';
}

export function isDungeonCatchup(firstEventAt: number, now: number, thresholdMs = 2000): boolean {
  return Number.isFinite(firstEventAt) && now - firstEventAt > thresholdMs;
}

export function resolveSearchStep<TCharacter extends SearchParticipantLike>(participants: readonly TCharacter[], encounterRoll: number): 'encounter' | 'miss' {
  const result = resolveDungeonSearch(CONFIG.dungeon.encounterChance, encounterRoll);
  if (result === 'miss') healParticipantsAfterSearchMiss(participants, 1);
  return result;
}

export const DUNGEON_CORE_BRIDGE = {
  getEnergyCostPerCharacter,
  checkDungeonStart,
  payDungeonEnergy,
  resetDungeonCycle,
  rollEnemyCount,
  rollEnemyClass,
  createDungeonEnemy,
  createDungeonEnemies,
  createDungeonAttackPoints,
  refreshCharacterAttackPoints,
  createDungeonRun,
  getNextDueAttack,
  filterActiveDungeonAttackPoints,
  rescheduleDungeonAttack,
  getDungeonPhase,
  isDungeonCatchup,
  resolveSearchStep
};

export type DungeonCoreBridge = typeof DUNGEON_CORE_BRIDGE;

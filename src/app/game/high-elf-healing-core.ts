/** S18: deterministic High Elf healing. No resurrection or overheal. */
export interface HighElfHealingCharacter {
  id: number;
  classId?: string | null;
  raceId?: string | null;
  hp: number;
  maxHp: number;
  alive: boolean;
}
export type HighElfHealTrigger = 'dodge' | 'periodic';
const HIGH_ELF_HEAL_HP = 10;
export const HIGH_ELF_MELEE_COOLDOWN_MS = 5000;
export const HIGH_ELF_PERIODIC_INTERVAL_MS = 10000;

export function highElfHealingAttackSource(character: Pick<HighElfHealingCharacter, 'classId' | 'raceId'>): {
  kind: 'race-heal'; speed: number; weaponId: null; label: string;
}[] {
  return character.raceId === 'high-elf' && (character.classId === 'archer' || character.classId === 'scholar')
    ? [{ kind: 'race-heal', speed: 0.1, weaponId: null, label: 'Hochelfen-Heilung' }] : [];
}

export function chooseHighElfHealingAlly<T extends HighElfHealingCharacter>(
  source: T, party: readonly T[], includeSource = false
): T | null {
  let best: T | null = null;
  for (const target of party) {
    if ((!includeSource && target.id === source.id) || !target.alive || target.hp <= 0 || target.maxHp <= 0 || target.hp >= target.maxHp) continue;
    // Compare missing HP fractions without rounding; a lower HP ratio has greater need.
    if (!best || target.hp * best.maxHp < best.hp * target.maxHp ||
        (target.hp * best.maxHp === best.hp * target.maxHp && target.id < best.id)) best = target;
  }
  return best;
}

export function applyHighElfHealing<T extends HighElfHealingCharacter>(
  source: T, party: readonly T[], trigger: HighElfHealTrigger
): { target: T; healed: number } | null {
  if (source.raceId !== 'high-elf' || !source.alive || source.hp <= 0) return null;
  const eligible = trigger === 'dodge' ? source.classId === 'recruit' || source.classId === 'fighter'
    : source.classId === 'archer' || source.classId === 'scholar';
  if (!eligible) return null;
  const target = source.classId === 'recruit' || source.classId === 'archer'
    ? source : chooseHighElfHealingAlly(source, party, source.classId === 'scholar');
  if (!target || !target.alive || target.hp <= 0 || target.maxHp <= 0 || target.hp >= target.maxHp) return null;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, before + HIGH_ELF_HEAL_HP);
  return { target, healed: target.hp - before };
}

export function highElfDodgeHealReady(
  cooldowns: Readonly<Record<number, number>> | undefined, characterId: number, at: number
): boolean {
  const previous = cooldowns?.[characterId];
  return !Number.isFinite(previous) || at >= Number(previous) + HIGH_ELF_MELEE_COOLDOWN_MS;
}

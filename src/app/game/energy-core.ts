export interface EnergyCharacterLike {
  energy: number;
  maxEnergy: number;
  classId?: string | null;
}

export interface EnergyClassLike {
  energyRegenPerMinute: number;
}

export interface EnergyStateLike<TCharacter extends EnergyCharacterLike = EnergyCharacterLike> {
  characters: TCharacter[];
  lastEnergyUpdate: number;
  dungeonAuto?: boolean;
  dungeonRun?: unknown;
  dungeonLootCollect?: unknown;
  dungeons?: Record<number,{dungeonAuto:boolean;dungeonRun:unknown;dungeonSearch:unknown;dungeonLootCollect:unknown}>;
}

export interface EnergyUpdateResult {
  now: number;
  elapsedMinutes: number;
  regenerated: boolean;
}

export function energyCostPerCharacter(totalEnergyCost: number, participantCount: number): number {
  return participantCount > 0 ? Math.ceil(totalEnergyCost / participantCount) : 0;
}

export function updateEnergyState<TCharacter extends EnergyCharacterLike>(
  state: EnergyStateLike<TCharacter>,
  getCharacterClass: (character: TCharacter) => EnergyClassLike,
  now = Date.now()
): EnergyUpdateResult {
  const previousUpdate = Number(state.lastEnergyUpdate);
  const elapsedMinutes = Number.isFinite(previousUpdate) ? (now - previousUpdate) / 60_000 : 0;
  state.lastEnergyUpdate = now;

  const canRegenerate =
    !state.dungeonAuto &&
    !state.dungeonRun &&
    !state.dungeonLootCollect &&
    !Object.values(state.dungeons??{}).some(d=>d.dungeonAuto||d.dungeonRun||d.dungeonSearch||d.dungeonLootCollect) &&
    elapsedMinutes > 0;

  if (!canRegenerate) {
    return { now, elapsedMinutes, regenerated: false };
  }

  let regenerated = false;
  state.characters.forEach(character => {
    if (character.energy >= character.maxEnergy) return;
    const regenPerMinute = Number(getCharacterClass(character).energyRegenPerMinute) || 0;
    const nextEnergy = Math.min(character.maxEnergy, character.energy + elapsedMinutes * regenPerMinute);
    regenerated ||= nextEnergy > character.energy;
    character.energy = nextEnergy;
  });

  return { now, elapsedMinutes, regenerated };
}

export const ENERGY_CORE_BRIDGE = {
  energyCostPerCharacter,
  updateEnergyState
};

export type EnergyCoreBridge = typeof ENERGY_CORE_BRIDGE;

import { Injectable } from '@angular/core';
import { CONFIG, calculateCharacterStats, type WeaponStats } from '../game/game-core';
import {
  energyCostPerCharacter,
  updateEnergyState,
  type EnergyCharacterLike,
  type EnergyStateLike,
  type EnergyUpdateResult
} from '../game/energy-core';
import { GameStateService, type MutableGameState } from './game-state.service';

interface LegacyEnergyCompatibilityBridge {
  update(): EnergyUpdateResult;
  costPerCharacter(participantCount: number): number;
}

declare global {
  interface Window {
    NoBrainerEnergyCompatibility?: LegacyEnergyCompatibilityBridge;
  }
}

interface RuntimeEnergyCharacter extends EnergyCharacterLike {
  id: number;
  classId?: string | null;
  equipment?: {
    leftHand?: number | null;
    rightHand?: number | null;
  } | null;
}

interface RuntimeEnergyWeapon {
  id: number;
  weaponForm?: string | null;
  stats?: Partial<WeaponStats> | null;
}

type RuntimeEnergyState = MutableGameState & EnergyStateLike<RuntimeEnergyCharacter> & {
  weaponInventory: RuntimeEnergyWeapon[];
};

@Injectable({ providedIn: 'root' })
export class GameEnergyService {
  constructor(private readonly gameState: GameStateService) {}

  update(now = Date.now()): EnergyUpdateResult {
    const state = this.gameState.getState<RuntimeEnergyState>();
    const effectiveByCharacter = new Map<number, ReturnType<typeof calculateCharacterStats>>();

    for (const character of state.characters) {
      const equippedIds = [...new Set([
        character.equipment?.leftHand ?? null,
        character.equipment?.rightHand ?? null
      ].filter((id): id is number => id !== null))];
      const weapons = equippedIds
        .map(id => state.weaponInventory.find(weapon => Number(weapon.id) === Number(id)))
        .filter((weapon): weapon is RuntimeEnergyWeapon => Boolean(weapon));
      const effective = calculateCharacterStats(character.classId, weapons);
      effectiveByCharacter.set(character.id, effective);
      character.maxEnergy = effective.maxEnergy;
      if (character.energy > effective.maxEnergy) character.energy = effective.maxEnergy;
    }

    return updateEnergyState(
      state,
      character => ({
        energyRegenPerMinute: effectiveByCharacter.get(character.id)?.energyRegenPerMinute ?? 0
      }),
      now
    );
  }

  costPerCharacter(participantCount: number): number {
    return energyCostPerCharacter(CONFIG.dungeon.energyCost, participantCount);
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerEnergyCompatibility) {
      throw new Error('NoBrainer-Energie-Kompatibilitätsbrücke ist bereits geöffnet.');
    }

    window.NoBrainerEnergyCompatibility = {
      update: () => this.update(),
      costPerCharacter: (participantCount: number) => this.costPerCharacter(participantCount)
    };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerEnergyCompatibility;
  }
}

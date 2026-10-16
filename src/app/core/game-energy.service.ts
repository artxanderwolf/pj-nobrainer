import { Injectable } from '@angular/core';
import { CHARACTER_CLASSES, CONFIG, type CharacterClassId } from '../game/game-core';
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

type RuntimeEnergyState = MutableGameState & EnergyStateLike<EnergyCharacterLike>;

@Injectable({ providedIn: 'root' })
export class GameEnergyService {
  constructor(private readonly gameState: GameStateService) {}

  update(now = Date.now()): EnergyUpdateResult {
    return updateEnergyState(
      this.gameState.getState<RuntimeEnergyState>(),
      character => CHARACTER_CLASSES[this.resolveClassId(character.classId)],
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

  private resolveClassId(classId: string | null | undefined): CharacterClassId {
    return classId && Object.prototype.hasOwnProperty.call(CHARACTER_CLASSES, classId)
      ? classId as CharacterClassId
      : 'recruit';
  }
}

import { Injectable } from '@angular/core';
import { createCharacter, type CharacterState } from '../game/character-core';
import {
  buyUpgrade,
  getRecruitOffer,
  getUpgradeOffer,
  spendRecruitCost,
  type ProgressionStateLike,
  type UpgradeKind
} from '../game/progression-core';
import { GameStateService, type MutableGameState } from './game-state.service';

type RuntimeProgressionState = MutableGameState & ProgressionStateLike & {
  characters: CharacterState[];
  nextCharacterId: number;
};

export type ProgressionRecruitResult = ReturnType<GameProgressionService['recruit']>;
export type ProgressionUpgradeResult = ReturnType<GameProgressionService['buyUpgrade']>;

interface ProgressionCompatibilityBridge {
  getRecruitOffer(classId?: string): ReturnType<typeof getRecruitOffer>;
  getUpgradeOffer(kind: UpgradeKind): ReturnType<typeof getUpgradeOffer>;
  recruit(classId?: string): ProgressionRecruitResult;
  buyUpgrade(kind: UpgradeKind): ProgressionUpgradeResult;
}

declare global {
  interface Window {
    NoBrainerProgressionCompatibility?: ProgressionCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameProgressionService {
  constructor(private readonly gameState: GameStateService) {}

  getRecruitOffer(classId = 'recruit'): ReturnType<typeof getRecruitOffer> {
    return getRecruitOffer(this.state(), classId);
  }

  getUpgradeOffer(kind: UpgradeKind): ReturnType<typeof getUpgradeOffer> {
    return getUpgradeOffer(this.state(), kind);
  }

  recruit(classId = 'recruit') {
    const state = this.state();
    const result = spendRecruitCost(state, classId);
    if (!result.ok) return result;

    const id = state.nextCharacterId++;
    const character = createCharacter(
      id,
      `${result.characterClass.name} ${String(result.number).padStart(2, '0')}`,
      classId,
      false
    );
    state.characters.push(character);
    return { ...result, character };
  }

  buyUpgrade(kind: UpgradeKind) {
    return buyUpgrade(this.state(), kind);
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerProgressionCompatibility) {
      throw new Error('NoBrainer-Progression-Kompatibilitätsbrücke ist bereits geöffnet.');
    }

    window.NoBrainerProgressionCompatibility = {
      getRecruitOffer: (classId = 'recruit') => this.getRecruitOffer(classId),
      getUpgradeOffer: (kind) => this.getUpgradeOffer(kind),
      recruit: (classId = 'recruit') => this.recruit(classId),
      buyUpgrade: (kind) => this.buyUpgrade(kind)
    };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerProgressionCompatibility;
  }

  private state(): RuntimeProgressionState {
    return this.gameState.getState<RuntimeProgressionState>();
  }
}

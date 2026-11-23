import { findTavernApplicant, consumeTavernApplicant, synchronizeTavernOffers, type TavernOfferWorldState } from '../game/tavern-offers-core.ts';
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
import { characterTeamReservation, type TeamWorldState } from '../game/team-core.ts';
import { isProductionWorkerReserved } from '../game/production-worker-core.ts';

type RuntimeProgressionState = MutableGameState & Omit<ProgressionStateLike, 'characters'> & TavernOfferWorldState & TeamWorldState & {
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
    const state = this.state();
    if (kind === 'forgeSlots' || kind === 'marketSlots') {
      const offer = getUpgradeOffer(state, kind);
      return { ...offer, ok: false as const, reason: 'max' as const };
    }
    return getUpgradeOffer(state, kind);
  }

  /** A legacy class request cannot create unlimited characters: it must match an actual applicant. */
  recruit(classId = 'recruit') {
    const state = this.state();
    synchronizeTavernOffers(state);
    const applicant = Object.values(state.tavernOffers?.byBuildingId ?? {})
      .flat().find(entry => entry.classId === classId);
    return this.recruitApplicant(applicant?.applicantId ?? '');
  }

  recruitApplicant(applicantId: string) {
    const state = this.state();
    synchronizeTavernOffers(state);
    const matched = findTavernApplicant(state, applicantId);
    if (!matched) return { ok: false as const, reason: 'applicant-unavailable' as const, costNickel: 0, number: 0 };
    const { applicant } = matched;
    const result = spendRecruitCost(state, applicant.classId);
    if (!result.ok) return result;

    const id = state.nextCharacterId++;
    const character = createCharacter(
      id,
      `${result.characterClass.name} ${String(result.number).padStart(2, '0')}`,
      applicant.classId,
      false,
      applicant.raceId
    );
    state.characters.push(character);
    if (!consumeTavernApplicant(state, applicantId)) throw new Error('Bewerber konnte nach dem Anwerben nicht entfernt werden.');
    return { ...result, character };
  }

  dismissalBlockReason(characterId: number): string | null {
    const state = this.state();
    if (!state.characters.some(character => character.id === characterId)) return 'Dieser Charakter ist nicht mehr im Kader.';
    if (state.characters.length <= 1) return 'Der letzte Charakter bleibt im Kader.';
    if (characterTeamReservation(state, characterId) !== null) return 'Beende zuerst den laufenden Teameinsatz.';
    if (isProductionWorkerReserved(state, characterId)) return 'Hebe zuerst die Arbeitszuweisung in Schmiede oder Markt auf.';
    return null;
  }

  dismissCharacter(characterId: number): boolean {
    if (this.dismissalBlockReason(characterId)) return false;
    const state = this.state();
    for (const team of Object.values(state.teams ?? {})) {
      team.dungeonTeamSlots = team.dungeonTeamSlots.map(id => id === characterId ? null : id);
      team.dungeonCycleOriginalIds = team.dungeonCycleOriginalIds.filter(id => id !== characterId);
      team.dungeonCycleActiveIds = team.dungeonCycleActiveIds.filter(id => id !== characterId);
    }
    // Equipped weapons already live in the inventory. Removing the holder releases them.
    state.characters.splice(state.characters.findIndex(character => character.id === characterId), 1);
    return true;
  }

  buyUpgrade(kind: UpgradeKind) {
    if (kind === 'forgeSlots' || kind === 'marketSlots') {
      return { ...this.getUpgradeOffer(kind), ok: false as const, reason: 'max' as const };
    }
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

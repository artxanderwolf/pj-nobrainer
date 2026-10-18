import { Injectable } from '@angular/core';
import { formatCurrencyNickel } from '../game/economy-core';
import { CHARACTER_CLASSES } from '../game/game-core';
import { getTavernPresentation } from '../game/tavern-presentation-core';
import { GameProgressionService } from './game-progression.service';
import { GameStateService, type MutableGameState } from './game-state.service';

type RuntimeTavernState = MutableGameState & {
  gold: number;
  characters: unknown[];
  upgrades: {
    innCapacity: number;
  };
};

interface TavernPresentationCompatibilityBridge {
  render(): void;
}

declare global {
  interface Window {
    NoBrainerTavernPresentationCompatibility?: TavernPresentationCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameTavernPresentationService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly gameProgression: GameProgressionService
  ) {}

  render(): void {
    const offer = document.getElementById('tavernOffer');
    const capacity = document.getElementById('tavernCapacity');
    const summary = document.getElementById('baseTavernSummary');
    if (!offer && !capacity && !summary) return;

    const state = this.state();
    const recruitCost = this.gameProgression.getRecruitOffer('recruit').costNickel;
    const presentation = getTavernPresentation(
      Object.values(CHARACTER_CLASSES),
      state.characters.length,
      state.upgrades.innCapacity,
      state.gold,
      recruitCost,
      formatCurrencyNickel(recruitCost)
    );

    if (summary) {
      summary.innerHTML = `<div class="statrow">${this.renderStats(presentation.summaryStats)}</div>`;
    }

    if (offer) {
      offer.dataset['tavernPresentationOwner'] = 'angular';
      offer.innerHTML = presentation.offers.map(entry =>
        `<div class="tavern-offer"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><strong>${entry.name}</strong><span class="tag fixed">${entry.roleTag}</span></div><div class="statrow">${this.renderStats(entry.stats)}</div><div class="actions"><button class="btn primary" onclick="recruitCharacter('${entry.classId}')" ${entry.disabled ? 'disabled' : ''}>${entry.recruitLabel}</button></div></div>`
      ).join('') + (presentation.statusText ? `<p class="status-line">${presentation.statusText}</p>` : '');
    }

    if (capacity) {
      capacity.innerHTML = `<div class="statrow">${this.renderStats(presentation.capacityStats)}</div>`;
    }
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerTavernPresentationCompatibility) {
      throw new Error('NoBrainer-Tavernen-Präsentationsbrücke ist bereits geöffnet.');
    }
    window.NoBrainerTavernPresentationCompatibility = { render: () => this.render() };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerTavernPresentationCompatibility;
  }

  private renderStats(stats: readonly { label: string; value: string }[]): string {
    return stats.map(stat => `<div class="stat"><span>${stat.label}</span><b>${stat.value}</b></div>`).join('');
  }

  private state(): RuntimeTavernState {
    return this.gameState.getState<RuntimeTavernState>();
  }
}

import { Injectable } from '@angular/core';
import { formatCurrencyNickel } from '../game/economy-core';
import {
  getUpgradeCardsPresentation,
  type UpgradeCardPresentation,
  type UpgradePresentationKind
} from '../game/progression-presentation-core';
import { GameProgressionService } from './game-progression.service';
import { GameStateService, type MutableGameState } from './game-state.service';

type RuntimeProgressionPresentationState = MutableGameState & {
  characters: unknown[];
  upgrades: {
    innCapacity: number;
    forgeSlots: number;
    forgeQueue: number;
    marketSlots: number;
    marketQueue: number;
  };
  forgeJobs: unknown[];
  forgeQueue: unknown[];
  marketJobs: unknown[];
  marketQueue: unknown[];
};

interface ProgressionPresentationCompatibilityBridge {
  render(): void;
}

declare global {
  interface Window {
    NoBrainerProgressionPresentationCompatibility?: ProgressionPresentationCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameProgressionPresentationService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly gameProgression: GameProgressionService
  ) {}

  render(): void {
    const inn = document.getElementById('innUpgradeCard');
    const forge = document.getElementById('forgeUpgradeCard');
    const market = document.getElementById('marketUpgradeCard');
    if (!inn && !forge && !market) return;

    const state = this.state();
    const offers = {
      inn: this.gameProgression.getUpgradeOffer('inn'),
      forgeSlots: this.gameProgression.getUpgradeOffer('forgeSlots'),
      forgeQueue: this.gameProgression.getUpgradeOffer('forgeQueue'),
      marketSlots: this.gameProgression.getUpgradeOffer('marketSlots'),
      marketQueue: this.gameProgression.getUpgradeOffer('marketQueue')
    } satisfies Record<UpgradePresentationKind, ReturnType<GameProgressionService['getUpgradeOffer']>>;

    const presentation = getUpgradeCardsPresentation({
      characterCount: state.characters.length,
      innCapacity: state.upgrades.innCapacity,
      forgeJobCount: state.forgeJobs.length,
      forgeSlotCapacity: state.upgrades.forgeSlots,
      forgeQueueCount: state.forgeQueue.length,
      forgeQueueCapacity: state.upgrades.forgeQueue,
      marketJobCount: state.marketJobs.length,
      marketSlotCapacity: state.upgrades.marketSlots,
      marketQueueCount: state.marketQueue.length,
      marketQueueCapacity: state.upgrades.marketQueue,
      offers
    }, formatCurrencyNickel);

    if (inn) {
      inn.dataset['progressionPresentationOwner'] = 'angular';
      inn.innerHTML = this.renderCard(presentation.inn);
    }
    if (forge) forge.innerHTML = this.renderCard(presentation.forge);
    if (market) market.innerHTML = this.renderCard(presentation.market);
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerProgressionPresentationCompatibility) {
      throw new Error('NoBrainer-Progressions-Präsentationsbrücke ist bereits geöffnet.');
    }
    window.NoBrainerProgressionPresentationCompatibility = { render: () => this.render() };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerProgressionPresentationCompatibility;
  }

  private renderCard(card: UpgradeCardPresentation): string {
    const stats = card.stats.map(stat =>
      `<div class="stat"><span>${stat.label}</span><b>${stat.value}</b></div>`
    ).join('');
    const buttons = card.buttons.map(button =>
      `<button class="${button.primary ? 'btn primary' : 'btn'}" onclick="buyUpgrade('${button.kind}')" ${button.disabled ? 'disabled' : ''}>${button.text}</button>`
    ).join('');
    const note = card.note ? `<p class="muted small">${card.note}</p>` : '';
    return `<div class="statrow">${stats}</div><div class="actions">${buttons}</div>${note}`;
  }

  private state(): RuntimeProgressionPresentationState {
    return this.gameState.getState<RuntimeProgressionPresentationState>();
  }
}

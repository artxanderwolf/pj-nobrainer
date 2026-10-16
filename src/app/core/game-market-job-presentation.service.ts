import { Injectable } from '@angular/core';
import { formatCurrencyNickel, formatDuration } from '../game/economy-core';
import { type MarketJob } from '../game/market-core';
import {
  getActiveMarketJobPresentation,
  getQueuedMarketJobPresentation
} from '../game/market-presentation-core';
import { GameProgressionPresentationService } from './game-progression-presentation.service';
import { GameStateService, type MutableGameState } from './game-state.service';

type RuntimeMarketJobPresentationState = MutableGameState & {
  marketJobs: MarketJob[];
  marketQueue: MarketJob[];
};

interface MarketJobPresentationCompatibilityBridge {
  render(): void;
}

declare global {
  interface Window {
    NoBrainerMarketJobPresentationCompatibility?: MarketJobPresentationCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameMarketJobPresentationService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly progressionPresentation: GameProgressionPresentationService
  ) {}

  render(now = Date.now()): void {
    const box = document.getElementById('marketJobCard');
    const queueBox = document.getElementById('marketQueueCard');
    if (!box && !queueBox) return;

    const state = this.state();
    if (box) {
      const jobs = state.marketJobs.map((job, index) =>
        getActiveMarketJobPresentation(job, index, now, formatCurrencyNickel, formatDuration)
      );
      box.dataset['marketJobPresentationOwner'] = 'angular';
      box.className = jobs.length ? '' : 'empty';
      box.innerHTML = jobs.length
        ? jobs.map((item, index) => `<div class="sell-row"><div style="width:100%"><strong>${item.title}</strong><div class="bar energy"><i style="width:${item.progressPercent}%"></i></div><p>${item.remainingText} · Ertrag <b>${item.revenueValueText}</b></p></div><button class="btn smallbtn" onclick="cancelMarketSale('active',${index})">Abbrechen</button></div>`).join('')
        : 'Kein aktiver Verkauf.';
    }

    if (queueBox) {
      const queue = state.marketQueue.map((job, index) =>
        getQueuedMarketJobPresentation(job, index, formatCurrencyNickel, formatDuration)
      );
      queueBox.className = queue.length ? '' : 'empty';
      queueBox.innerHTML = queue.length
        ? queue.map((item, index) => `<div class="sell-row"><div><strong>${item.title}</strong><div class="sell-meta">${item.metaText}</div></div><button class="btn smallbtn" onclick="cancelMarketSale('queue',${index})">Entfernen</button></div>`).join('')
        : 'Warteschlange leer.';
    }

    this.progressionPresentation.render();
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerMarketJobPresentationCompatibility) {
      throw new Error('NoBrainer-Marktauftrags-Präsentationsbrücke ist bereits geöffnet.');
    }
    window.NoBrainerMarketJobPresentationCompatibility = { render: () => this.render() };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerMarketJobPresentationCompatibility;
  }

  private state(): RuntimeMarketJobPresentationState {
    return this.gameState.getState<RuntimeMarketJobPresentationState>();
  }
}

import { Injectable } from '@angular/core';
import { formatCurrencyNickel, formatDuration } from '../game/economy-core';
import { type ForgeJob } from '../game/forge-core';
import {
  getActiveForgeJobPresentation,
  getQueuedForgeJobPresentation
} from '../game/forge-presentation-core';
import { GameProgressionPresentationService } from './game-progression-presentation.service';
import { GameStateService, type MutableGameState } from './game-state.service';

type RuntimeForgeJobPresentationState = MutableGameState & {
  forgeJobs: ForgeJob[];
  forgeQueue: ForgeJob[];
};

interface ForgeJobPresentationCompatibilityBridge {
  render(): void;
}

declare global {
  interface Window {
    NoBrainerForgeJobPresentationCompatibility?: ForgeJobPresentationCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameForgeJobPresentationService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly progressionPresentation: GameProgressionPresentationService
  ) {}

  render(now = Date.now()): void {
    const box = document.getElementById('forgeJobCard');
    const queueBox = document.getElementById('forgeQueueCard');
    if (!box && !queueBox) return;

    const state = this.state();
    if (box) {
      const jobs = state.forgeJobs.map((job, index) =>
        getActiveForgeJobPresentation(job, index, now, formatCurrencyNickel, formatDuration)
      );
      box.dataset['forgeJobPresentationOwner'] = 'angular';
      box.className = jobs.length ? '' : 'empty';
      box.innerHTML = jobs.length
        ? jobs.map(item => `<div class="sell-row"><div style="width:100%"><strong>${item.title}</strong><p class="muted">${item.remainingText}</p><div class="bar energy"><i style="width:${item.progressPercent}%"></i></div><p>ROH <b>${item.rawText}</b> · Wert <b>${item.valueText}</b></p></div></div>`).join('')
        : 'Kein aktiver Schmiedeauftrag.';
    }

    if (queueBox) {
      const queue = state.forgeQueue.map((job, index) =>
        getQueuedForgeJobPresentation(job, index, formatDuration)
      );
      queueBox.className = queue.length ? '' : 'empty';
      queueBox.innerHTML = queue.length
        ? queue.map(item => `<div class="sell-row"><div><strong>${item.title}</strong><div class="sell-meta">${item.metaText}</div></div></div>`).join('')
        : 'Warteschlange leer.';
    }

    this.progressionPresentation.render();
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerForgeJobPresentationCompatibility) {
      throw new Error('NoBrainer-Schmiedeauftrags-Präsentationsbrücke ist bereits geöffnet.');
    }
    window.NoBrainerForgeJobPresentationCompatibility = { render: () => this.render() };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerForgeJobPresentationCompatibility;
  }

  private state(): RuntimeForgeJobPresentationState {
    return this.gameState.getState<RuntimeForgeJobPresentationState>();
  }
}

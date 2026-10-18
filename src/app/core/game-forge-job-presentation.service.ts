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
  upgrades: {
    forgeSlots: number;
    forgeQueue: number;
  };
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
    const previewPage = document.getElementById('forge-preview');
    if (!box && !queueBox && !previewPage) return;

    const state = this.state();
    this.renderCapacityStatus(state, previewPage);

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

  private renderCapacityStatus(state: RuntimeForgeJobPresentationState, previewPage: HTMLElement | null): void {
    if (!previewPage) return;

    let status = document.getElementById('forgeCapacityStatus');
    if (!status) {
      status = document.createElement('p');
      status.id = 'forgeCapacityStatus';
      status.className = 'small muted';
      status.style.margin = '0 0 4px';
      status.style.textAlign = 'center';
      const card = previewPage.querySelector<HTMLElement>('.screen-card');
      if (card) card.insertAdjacentElement('afterend', status);
      else previewPage.appendChild(status);
    }

    const activeMax = Math.max(0, Number(state.upgrades?.forgeSlots) || 0);
    const queueMax = Math.max(0, Number(state.upgrades?.forgeQueue) || 0);
    status.textContent = `Schmiede ${state.forgeJobs.length}/${activeMax} · Warteschlange ${state.forgeQueue.length}/${queueMax}`;
  }

  private state(): RuntimeForgeJobPresentationState {
    return this.gameState.getState<RuntimeForgeJobPresentationState>();
  }
}

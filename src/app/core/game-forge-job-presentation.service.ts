import { Injectable } from '@angular/core';
import { renderProductionWorkerControls } from '../game/production-worker-presentation-core.ts';
import { GameProductionWorkerService } from './game-production-worker.service';
import { productionActiveSlots } from '../game/city-production-capacity-core.ts';
import { type CityLayoutWorldState } from '../game/city-layout-core.ts';
import { formatCurrencyNickel, formatDuration } from '../game/economy-core';
import { type ForgeJob } from '../game/forge-core';
import { type IdentifiedForgeJob } from '../game/forge-claim-core.ts';
import { GameForgeService } from './game-forge.service';
import {
  getActiveForgeJobPresentation,
  getQueuedForgeJobPresentation
} from '../game/forge-presentation-core';
import { GameProgressionPresentationService } from './game-progression-presentation.service';
import { GameStateService, type MutableGameState } from './game-state.service';
import { GameWeaponPresentationService } from './game-weapon-presentation.service';

type RuntimeForgeJobPresentationState = MutableGameState & CityLayoutWorldState & {
  forgeJobs: ForgeJob[];
  forgeQueue: ForgeJob[];
  forgeReadyJobs?: IdentifiedForgeJob[];
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
    private readonly progressionPresentation: GameProgressionPresentationService,
    private readonly weaponPresentation: GameWeaponPresentationService,
    private readonly gameForge: GameForgeService,
    private readonly workers: GameProductionWorkerService
  ) {}

  private bound = false;
  private onClaim: (() => void) | null = null;

  bindActions(onClaim: () => void): void {
    this.onClaim = onClaim;
    if (this.bound) return;
    document.addEventListener('change', event => {
      const element=event.target;
      if (!(element instanceof HTMLSelectElement) || element.dataset['productionHelperKind']!=='forge') return;
      const result=this.workers.assign('forge', element.dataset['productionHelperBuilding']??'', element.value===''?null:Number(element.value));
      if (result.status==='assigned') { document.dispatchEvent(new Event('production-worker-changed')); this.render(); }
      else if (result.status!=='unchanged') { alert('Helfer konnte nicht zugewiesen werden: Charakter ist belegt oder Betrieb ungültig.');this.render(); }
    });
    document.addEventListener('click',event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>('button[data-forge-claim-id],button[data-forge-claim-all]');
      if (!button || button.disabled) return;
      const changed = button.hasAttribute('data-forge-claim-all')
        ? this.gameForge.claimAll() > 0
        : this.gameForge.claim(button.dataset['forgeClaimId'] ?? '');
      if (changed) this.onClaim?.();
    });
    this.bound = true;
  }

  render(now = Date.now()): void {
    const box = document.getElementById('forgeJobCard');
    const queueBox = document.getElementById('forgeQueueCard');
    const previewPage = document.getElementById('forge-preview');
    if (!box && !queueBox && !previewPage) return;

    const state = this.state();
    this.renderCapacityStatus(state, previewPage);

    if (box) {
      const jobs = state.forgeJobs.map((job, index) => ({
        job,
        presentation: getActiveForgeJobPresentation(job, index, now, formatCurrencyNickel, formatDuration)
      }));
      box.dataset['forgeJobPresentationOwner'] = 'angular';
      box.className = jobs.length ? '' : 'empty';
      box.innerHTML = jobs.length
        ? jobs.map(({ job, presentation: item }) => {
            const imageHtml = this.weaponPresentation.renderImage(
              job,
              'forge-job-weapon-image',
              `Schmiedeauftrag ${job.weaponName || item.title}`
            );
            return `<div class="sell-row forge-job-row">${imageHtml}<div class="forge-job-copy"><strong>${item.title}</strong><p class="muted">${item.remainingText}</p><div class="bar energy"><i style="width:${item.progressPercent}%"></i></div><p>ROH <b>${item.rawText}</b> · Wert <b>${item.valueText}</b></p></div></div>`;
          }).join('')
        : 'Kein aktiver Schmiedeauftrag.';
    }

    if (queueBox) {
      const queue = state.forgeQueue.map((job, index) => ({
        job,
        presentation: getQueuedForgeJobPresentation(job, index, formatDuration)
      }));
      queueBox.dataset['forgeQueuePresentationOwner'] = 'angular';
      queueBox.className = queue.length ? '' : 'empty';
      queueBox.innerHTML = queue.length
        ? queue.map(({ job, presentation: item }) => {
            const imageHtml = this.weaponPresentation.renderImage(
              job,
              'forge-queue-weapon-image',
              `Wartender Schmiedeauftrag ${job.weaponName || item.title}`
            );
            return `<div class="sell-row forge-job-row forge-queue-row">${imageHtml}<div class="forge-job-copy"><strong>${item.title}</strong><div class="sell-meta">${item.metaText}</div></div></div>`;
          }).join('')
        : 'Warteschlange leer.';
    }

    if (queueBox) {
      const ready = state.forgeReadyJobs ?? [];
      let readyBox = document.getElementById('forgeReadyCard');
      if (!readyBox) {
        readyBox = document.createElement('div');
        readyBox.id = 'forgeReadyCard';
        readyBox.className = 'card';
        queueBox.insertAdjacentElement('afterend', readyBox);
      }
      readyBox.innerHTML = `<h3>Fertige Waffen zur Abholung (${ready.length})</h3>` +
        (ready.length ? `<button type="button" class="btn primary" data-forge-claim-all>Alle abholen</button>` : '') +
        ready.map(job => `<div class="sell-row forge-job-row"><div class="forge-job-copy"><strong>${this.escape(job.weaponName)}</strong><p class="muted">Fertig · wartet auf Abholung</p></div><button type="button" class="btn" data-forge-claim-id="${job.jobId}">Abholen</button></div>`).join('') +
        (!ready.length ? '<p>Keine fertigen Schmiedeaufträge.</p>' : '');
    }
    if (queueBox) this.renderWorkers(queueBox);
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

    const activeMax = productionActiveSlots(state, 'forge');
    const queueMax = Math.max(0, Number(state.upgrades?.forgeQueue) || 0);
    status.textContent = `Schmiede ${state.forgeJobs.length}/${activeMax} · Warteschlange ${state.forgeQueue.length}/${queueMax} · Abholbereit ${state.forgeReadyJobs?.length ?? 0} · Gesamt ${state.forgeJobs.length + state.forgeQueue.length + (state.forgeReadyJobs?.length ?? 0)}/${activeMax+queueMax}`;
  }

  private renderWorkers(anchor: HTMLElement): void {
    let box=document.getElementById('forgeWorkerCard');
    if (!box) {box=document.createElement('div');box.id='forgeWorkerCard';box.className='card';anchor.insertAdjacentElement('afterend',box);}
    const markup=renderProductionWorkerControls(this.workers.state(),'forge');
    if (box.dataset['workerMarkup']!==markup) {box.innerHTML=markup;box.dataset['workerMarkup']=markup;}
  }

  private escape(text: string): string { return text.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch] ?? ch)); }

  private state(): RuntimeForgeJobPresentationState {
    return this.gameState.getState<RuntimeForgeJobPresentationState>();
  }
}

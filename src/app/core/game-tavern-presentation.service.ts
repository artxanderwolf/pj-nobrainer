import { Injectable } from '@angular/core';
import { resolveCharacterAssetId } from '../game/character-class-asset-presentation';
import { formatCurrencyNickel } from '../game/economy-core';
import { CHARACTER_CLASSES } from '../game/game-core';
import { getTavernPresentation } from '../game/tavern-presentation-core';
import { GameCharacterPresentationService } from './game-character-presentation.service';
import { GameCombatLogService } from './game-combat-log.service';
import { GameProgressionService } from './game-progression.service';
import { GameResourcePresentationService } from './game-resource-presentation.service';
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
  private selectedClassId: string | null = null;
  private detailOpen = false;
  private boundRoot: HTMLElement | null = null;

  constructor(
    private readonly gameState: GameStateService,
    private readonly gameProgression: GameProgressionService,
    private readonly combatLog: GameCombatLogService,
    private readonly characterPresentation: GameCharacterPresentationService,
    private readonly resourcePresentation: GameResourcePresentationService
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
      this.ensureActionBinding(offer);
      const listScrollTop = offer.querySelector<HTMLElement>('.character-list-scroll')?.scrollTop ?? 0;
      const selectedOffer = this.selectedClassId === null
        ? null
        : presentation.offers.find(entry => entry.classId === this.selectedClassId) ?? null;
      if (this.detailOpen && !selectedOffer) this.closeDetailState();

      offer.dataset['tavernPresentationOwner'] = 'angular';
      offer.innerHTML = `<div class="character-selection-page recruitment-selection-page">
        ${this.renderRecruitList(presentation.offers, this.detailOpen ? this.selectedClassId : null)}
        ${presentation.statusText ? `<p class="status-line recruitment-status-line">${this.escapeHtml(presentation.statusText)}</p>` : ''}
      </div>
      ${this.detailOpen && selectedOffer ? this.renderRecruitModal(selectedOffer, presentation.statusText) : ''}`;

      const listScroll = offer.querySelector<HTMLElement>('.character-list-scroll');
      if (listScroll) listScroll.scrollTop = listScrollTop;
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

  private renderRecruitList(
    offers: readonly {
      classId: string;
      name: string;
      roleTag: string;
      recruitLabel: string;
      disabled: boolean;
    }[],
    selectedClassId: string | null
  ): string {
    const rows = offers.map(entry => {
      const selected = entry.classId === selectedClassId;
      const assetId = resolveCharacterAssetId(entry.classId);
      return `<button class="character-list-item recruitment-list-item${selected ? ' selected' : ''}" type="button" data-tavern-action="select-offer" data-class-id="${entry.classId}" aria-pressed="${selected}">
        <span class="class-emblem class-emblem-small" data-class-id="${assetId}" aria-hidden="true"></span>
        <span class="character-list-copy"><strong>${this.escapeHtml(entry.name)}</strong><span>${this.escapeHtml(entry.roleTag)}</span></span>
        <span class="character-list-meta">Details</span>
      </button>`;
    }).join('');

    return `<section class="character-list-panel" aria-label="Rekrutierungsauswahl">
      <div class="character-list-head"><span>Klasse / Rolle</span><span>Auswahl</span></div>
      <div class="character-list-scroll">${rows}</div>
    </section>`;
  }

  private renderRecruitModal(
    entry: {
      classId: string;
      name: string;
      roleTag: string;
      stats: readonly { label: string; value: string }[];
      recruitLabel: string;
      disabled: boolean;
    },
    statusText: string
  ): string {
    const assetId = resolveCharacterAssetId(entry.classId);
    return `<div class="character-modal recruitment-character-modal" data-character-modal="recruitment">
      <button class="character-modal-backdrop" type="button" data-tavern-action="close-detail" aria-label="Rekrutierungsdetails schließen"></button>
      <section class="character-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="recruitmentModalTitle">
        <header class="character-modal-header">
          <h2 id="recruitmentModalTitle">Rekrutieren</h2>
          <button class="character-modal-close" type="button" data-tavern-action="close-detail" aria-label="Rekrutierungsdetails schließen">×</button>
        </header>
        <div class="character-modal-body">
          <article class="recruitment-detail-card">
            <header class="recruitment-detail-head">
              <div><strong>${this.escapeHtml(entry.name)}</strong><span class="tag fixed">${this.escapeHtml(entry.roleTag)}</span></div>
            </header>
            <div class="recruitment-emblem-stage">
              <span class="class-emblem class-emblem-large" data-class-id="${assetId}" role="img" aria-label="Klassenemblem ${this.escapeHtml(entry.name)}"></span>
            </div>
            <div class="recruitment-stat-grid">${this.renderStats(entry.stats, 'recruitment-stat')}</div>
            ${statusText ? `<p class="status-line recruitment-modal-status">${this.escapeHtml(statusText)}</p>` : ''}
            <button class="btn primary recruitment-primary-action" type="button" data-tavern-action="recruit" data-class-id="${entry.classId}" ${entry.disabled ? 'disabled' : ''}>${this.escapeHtml(entry.recruitLabel)}</button>
          </article>
        </div>
      </section>
    </div>`;
  }

  private ensureActionBinding(root: HTMLElement): void {
    if (root === this.boundRoot) return;
    if (this.boundRoot) {
      this.boundRoot.removeEventListener('click', this.handleClick);
      this.boundRoot.removeEventListener('keydown', this.handleKeyDown);
    }
    root.addEventListener('click', this.handleClick);
    root.addEventListener('keydown', this.handleKeyDown);
    this.boundRoot = root;
  }

  private readonly handleClick = (event: Event): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-tavern-action]');
    if (!button || button.disabled) return;
    const action = button.dataset['tavernAction'];

    if (action === 'close-detail') {
      this.closeDetailState();
      this.render();
      return;
    }

    const classId = button.dataset['classId'] ?? '';
    if (!Object.prototype.hasOwnProperty.call(CHARACTER_CLASSES, classId)) return;

    if (action === 'select-offer') {
      this.selectedClassId = classId;
      this.detailOpen = true;
      this.render();
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLButtonElement>('[data-character-modal="recruitment"] .character-modal-close')?.focus();
      });
      return;
    }

    if (action === 'recruit') this.recruit(classId);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.detailOpen) return;
    event.preventDefault();
    this.closeDetailState();
    this.render();
  };

  private recruit(classId: string): void {
    const result = this.gameProgression.recruit(classId);
    if (!result.ok) {
      if (result.reason === 'inn-full') {
        alert('Inn voll – zuerst einen weiteren Kaderplatz kaufen.');
      } else if (result.reason === 'insufficient-funds') {
        alert('Nicht genug Geld.');
      }
      this.render();
      return;
    }

    this.combatLog.add(`${result.character.name} wurde für ${formatCurrencyNickel(result.costNickel)} angeworben.`, 'good');
    this.closeDetailState();
    this.render();
    this.characterPresentation.render();
    this.resourcePresentation.render();
  }

  private closeDetailState(): void {
    this.detailOpen = false;
    this.selectedClassId = null;
  }

  private renderStats(stats: readonly { label: string; value: string }[], className = 'stat'): string {
    return stats.map(stat => `<div class="${className}"><span>${this.escapeHtml(stat.label)}</span><b>${this.escapeHtml(stat.value)}</b></div>`).join('');
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character] ?? character);
  }

  private state(): RuntimeTavernState {
    return this.gameState.getState<RuntimeTavernState>();
  }
}

import { Injectable } from '@angular/core';
import {
  CITY_OVERVIEW_ACTIONS,
  CITY_OVERVIEW_BACKGROUND_ASSET,
  getCityOverviewPresentation,
  type CityOverviewActionDefinition,
  type CityOverviewActionPresentation
} from '../game/city-overview-presentation-core';
import { teamIds, type TeamWorldState } from '../game/team-core';
import { GameDungeonPresentationService } from './game-dungeon-presentation.service';
import { GameStateService, type MutableGameState } from './game-state.service';

type CityNavigationWindow = Window & { go?: (pageId: string) => void };

const CITY_OVERVIEW_MISSION_ASSET = 'ui/mission_gebaeude_64.png';
const CITY_OVERVIEW_TEAM_ASSET_PREFIX = 'ui/team_gebaeude_';

@Injectable({ providedIn: 'root' })
export class GameCityOverviewPresentationService {
  private root: HTMLElement | null = null;
  private basePage: HTMLElement | null = null;
  private activeObserver: MutationObserver | null = null;

  constructor(
    private readonly gameState: GameStateService,
    private readonly dungeonPresentation: GameDungeonPresentationService
  ) {}

  render(): void {
    const root = this.ensureInstalled();
    if (!root) return;

    const presentation = this.currentPresentation();
    for (const action of presentation) {
      const button = root.querySelector<HTMLButtonElement>(`[data-city-action="${action.id}"]`);
      if (!button) continue;
      button.disabled = !action.enabled;
      button.setAttribute('aria-disabled', action.enabled ? 'false' : 'true');
      button.title = action.disabledReason ?? action.label;
      button.dataset['cityActionEnabled'] = action.enabled ? 'true' : 'false';
    }
    this.syncShellState();
  }

  destroy(): void {
    this.activeObserver?.disconnect();
    this.activeObserver = null;
    this.root?.removeEventListener('click', this.handleClick);
    this.root = null;
    this.basePage = null;
    document.querySelector<HTMLElement>('.modular-ui')?.classList.remove('city-overview-active');
  }

  private ensureInstalled(): HTMLElement | null {
    if (this.root?.isConnected) return this.root;

    const basePage = document.getElementById('base');
    if (!basePage) return null;

    basePage.innerHTML = `<div id="cityOverview" class="city-overview-stage" data-city-overview-owner="angular" role="navigation" aria-label="Stadtübersicht">
      <img id="cityOverviewBackground" class="city-overview-background" src="${CITY_OVERVIEW_BACKGROUND_ASSET}" alt="" aria-hidden="true">
      ${CITY_OVERVIEW_ACTIONS.map(action => this.renderActionButton(action)).join('')}
    </div>`;

    const root = basePage.querySelector<HTMLElement>('#cityOverview');
    if (!root) return null;
    root.addEventListener('click', this.handleClick);

    this.root = root;
    this.basePage = basePage;
    this.activeObserver?.disconnect();
    this.activeObserver = new MutationObserver(() => {
      this.syncShellState();
      if (this.basePage?.classList.contains('active')) this.render();
    });
    this.activeObserver.observe(basePage, { attributes: true, attributeFilter: ['class'] });
    this.installHelpSection();
    return root;
  }

  private renderActionButton(action: CityOverviewActionDefinition): string {
    const position = action.position;
    const style = `--city-left:${position.left}%;--city-top:${position.top}%;--city-width:${position.width}%;--city-height:${position.height}%;`;
    const label = this.escapeHtml(action.label);
    const imageAsset = this.actionImageAsset(action);
    const imageClass = imageAsset ? ' city-map-action--image' : '';
    const accessibleLabel = imageAsset ? ` aria-label="${label}"` : '';
    const content = imageAsset
      ? `<img class="city-map-action-image" src="${imageAsset}" alt="" aria-hidden="true">`
      : label;
    return `<button id="cityAction-${action.id}" class="btn city-map-action${imageClass}" type="button" data-city-action="${action.id}"${accessibleLabel} style="${style}">${content}</button>`;
  }

  private actionImageAsset(action: CityOverviewActionDefinition): string | null {
    if (action.kind === 'mission') return CITY_OVERVIEW_MISSION_ASSET;
    if (action.kind === 'team' && action.teamId) return `${CITY_OVERVIEW_TEAM_ASSET_PREFIX}${action.teamId}_64.png`;
    return null;
  }

  private currentPresentation(): CityOverviewActionPresentation[] {
    const state = this.gameState.getState<MutableGameState & TeamWorldState>();
    return getCityOverviewPresentation(teamIds(state));
  }

  private currentAction(actionId: string): CityOverviewActionPresentation | null {
    return this.currentPresentation().find(action => action.id === actionId) ?? null;
  }

  private readonly handleClick = (event: Event): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-city-action]');
    if (!button || button.disabled) return;
    const action = this.currentAction(button.dataset['cityAction'] ?? '');
    if (!action?.enabled) return;

    if (action.kind === 'page' && action.targetPageId) {
      this.navigate(action.targetPageId);
      return;
    }
    if (action.kind === 'mission') {
      document.getElementById('questHeaderButton')?.click();
      return;
    }
    if (action.kind === 'team' && action.teamId) {
      this.navigate('dungeon');
      this.dungeonPresentation.openTeam(action.teamId);
    }
  };

  private navigate(pageId: string): void {
    const go = (window as CityNavigationWindow).go;
    if (typeof go !== 'function') throw new Error(`Stadtübersicht kann Seite ${pageId} nicht öffnen.`);
    go(pageId);
  }

  private syncShellState(): void {
    const shell = document.querySelector<HTMLElement>('.modular-ui');
    if (!shell || !this.basePage) return;
    shell.classList.toggle('city-overview-active', this.basePage.classList.contains('active'));
  }

  private installHelpSection(): void {
    const grid = document.querySelector<HTMLElement>('#index .grid');
    if (!grid || grid.querySelector('[data-city-overview-help]')) return;
    const card = document.createElement('div');
    card.className = 'card span-12';
    card.dataset['cityOverviewHelp'] = 'true';
    card.innerHTML = `<h2>Stadtübersicht</h2>
      <p class="index-note">Die Übersicht zeigt deine Stadt als Karte. Aktive Gebäude und vorhandene Teams öffnen die bereits freigeschalteten Spielbereiche direkt. Noch nicht freigeschaltete Teams sowie noch nicht verfügbare Bereiche werden ausgegraut und können nicht geöffnet werden.</p>`;
    grid.prepend(card);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character] ?? character);
  }
}

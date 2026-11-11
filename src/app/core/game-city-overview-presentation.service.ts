import { Injectable } from '@angular/core';
import {
  CITY_QUICK_ACCESS,
  getCityLegacyTeamAccess,
  getCityOverviewPresentation,
  type CityBuildingPresentation
} from '../game/city-overview-presentation-core.ts';
import { type CityLayoutWorldState, type CityLayoutState } from '../game/city-layout-core.ts';
import { teamIds, type TeamWorldState } from '../game/team-core.ts';
import { GameDungeonPresentationService } from './game-dungeon-presentation.service';
import { GameStateService, type MutableGameState } from './game-state.service';

type CityNavigationWindow = Window & { go?: (pageId: string) => void };

@Injectable({ providedIn: 'root' })
export class GameCityOverviewPresentationService {
  private root: HTMLElement | null = null;
  private basePage: HTMLElement | null = null;
  private activeObserver: MutationObserver | null = null;
  private renderedSignature = '';

  constructor(
    private readonly gameState: GameStateService,
    private readonly dungeonPresentation: GameDungeonPresentationService
  ) {}

  render(): void {
    const root = this.ensureInstalled();
    if (!root) return;
    const state = this.gameState.getState<MutableGameState & TeamWorldState & CityLayoutWorldState>();
    const layout = state.cityLayout;
    if (!layout) throw new Error('S08: Stadtlayout fehlt nach der S07-Save-Migration.');
    const ownedIds = teamIds(state);
    const signature = JSON.stringify({ layout, ownedIds });
    if (signature !== this.renderedSignature) {
      const viewport = root.querySelector<HTMLElement>('.city-grid-viewport');
      const scrollLeft = viewport?.scrollLeft ?? 0;
      const scrollTop = viewport?.scrollTop ?? 0;
      root.innerHTML = this.renderCity(layout, ownedIds);
      const nextViewport = root.querySelector<HTMLElement>('.city-grid-viewport');
      if (nextViewport) {
        nextViewport.scrollLeft = scrollLeft;
        nextViewport.scrollTop = scrollTop;
      }
      this.renderedSignature = signature;
    }
    this.syncShellState();
  }

  destroy(): void {
    this.activeObserver?.disconnect();
    this.activeObserver = null;
    this.root?.removeEventListener('click', this.handleClick);
    this.root = null;
    this.basePage = null;
    this.renderedSignature = '';
    document.querySelector<HTMLElement>('.modular-ui')?.classList.remove('city-overview-active');
  }

  private ensureInstalled(): HTMLElement | null {
    if (this.root?.isConnected) return this.root;

    const basePage = document.getElementById('base');
    if (!basePage) return null;
    // Kein zweites Legacy-City-Bild oder unsichtbares Hotspot-Dashboard behalten.
    basePage.innerHTML = '<div id="cityOverview" class="city-overview-stage city-grid-overview" data-city-overview-owner="angular" role="region" aria-label="Stadtübersicht"></div>';

    const root = basePage.querySelector<HTMLElement>('#cityOverview');
    if (!root) return null;
    root.addEventListener('click', this.handleClick);
    this.root = root;
    this.basePage = basePage;
    this.renderedSignature = '';
    this.activeObserver?.disconnect();
    this.activeObserver = new MutationObserver(() => {
      this.syncShellState();
      if (this.basePage?.classList.contains('active')) this.render();
    });
    this.activeObserver.observe(basePage, { attributes: true, attributeFilter: ['class'] });
    this.installHelpSection();
    return root;
  }

  private renderCity(layout: CityLayoutState, ownedIds: readonly number[]): string {
    const buildings = getCityOverviewPresentation(layout, ownedIds);
    const extraTeams = getCityLegacyTeamAccess(layout, ownedIds);
    const gridColumns = layout.grid.width;
    const gridRows = layout.grid.height;
    const quickLinks = CITY_QUICK_ACCESS.map(access => {
      return `<button id="cityAction-${access.id}" type="button" class="city-grid-quick-link" data-city-quick-id="${access.id}"><span aria-hidden="true">${access.icon}</span>${this.escapeHtml(access.label)}</button>`;
    }).join('');
    const legacyTeamLinks = extraTeams.length
      ? `<section class="city-grid-legacy-teams" aria-label="Weitere vorhandene Teams">
          <h3>Weitere Teams aus deinem Spielstand</h3>
          <p>Bis die Teamgebäude in S10–S12 übernommen sind, bleiben diese bereits erworbenen Teams direkt erreichbar.</p>
          <div class="city-grid-legacy-list">${extraTeams.map(team => `<button type="button" class="city-grid-quick-link" data-city-team-id="${team.teamId}">${this.escapeHtml(team.label)}</button>`).join('')}</div>
        </section>` : '';

    return `<header class="city-grid-heading">
        <h2>Stadtgebäude</h2>
        <p>${gridColumns} × ${gridRows} Felder · ${buildings.length} Gebäude · Berühre ein Gebäude zum Öffnen</p>
      </header>
      <div class="city-grid-scroll-hint">Karte seitlich verschieben, um alle Gebäude zu erreichen.</div>
      <div class="city-grid-viewport" tabindex="0" role="region" aria-label="Stadtraster, horizontal scrollbar">
        <div id="cityGrid" class="city-grid-map" role="group" aria-label="Gebäuderaster" data-grid-width="${gridColumns}" data-grid-height="${gridRows}" style="--city-grid-columns:${gridColumns};--city-grid-rows:${gridRows}">
          ${buildings.map(building => this.renderBuilding(building, layout)).join('')}
        </div>
      </div>
      <nav class="city-grid-links" aria-label="Weitere Stadtzugänge">
        <h3>Stadtwege &amp; Lager</h3>
        <div class="city-grid-link-list">${quickLinks}</div>
      </nav>
      ${legacyTeamLinks}`;
  }

  private renderBuilding(building: CityBuildingPresentation, layout: CityLayoutState): string {
    const x = building.x - layout.grid.minX + 1;
    const y = building.y - layout.grid.minY + 1;
    const label = this.escapeHtml(building.label);
    const disabledReason = building.disabledReason ? this.escapeHtml(building.disabledReason) : null;
    const detail = disabledReason ?? (building.buildingTypeId === 'team' ? 'Zum Team' : 'Öffnen');
    const disabled = !building.enabled ? ' disabled aria-disabled="true"' : ' aria-disabled="false"';
    const title = this.escapeHtml(disabledReason ? `${building.label}: ${building.disabledReason}` : `${building.label} öffnen`);
    return `<button id="cityBuilding-${building.buildingInstanceId}" type="button"
        class="city-grid-building city-grid-building--${building.buildingTypeId}"
        data-city-building-id="${building.buildingInstanceId}"
        data-city-building-type="${building.buildingTypeId}"
        data-city-building-status="${building.status}"
        data-city-asset-key="${this.escapeHtml(building.assetKey)}"
        style="grid-column:${x} / span ${building.width};grid-row:${y} / span ${building.height}"
        aria-label="${title}" title="${title}"${disabled}>
      <span class="city-grid-building-icon" aria-hidden="true">${building.icon}</span>
      <span class="city-grid-building-name">${label}</span>
      <span class="city-grid-building-state">${detail}</span>
    </button>`;
  }

  private readonly handleClick = (event: Event): void => {
    if (!(event.target instanceof Element)) return;

    const buildingButton = event.target.closest<HTMLButtonElement>('button[data-city-building-id]');
    if (buildingButton && this.root?.contains(buildingButton) && !buildingButton.disabled) {
      const state = this.gameState.getState<MutableGameState & TeamWorldState & CityLayoutWorldState>();
      if (!state.cityLayout) return;
      const building = getCityOverviewPresentation(state.cityLayout, teamIds(state))
        .find(item => item.buildingInstanceId === buildingButton.dataset['cityBuildingId']);
      if (!building?.enabled || !building.navigation) return;
      if (building.navigation.kind === 'page') {
        this.navigate(building.navigation.pageId);
      } else {
        this.openTeam(building.navigation.teamId);
      }
      return;
    }

    const quickButton = event.target.closest<HTMLButtonElement>('button[data-city-quick-id]');
    if (quickButton && this.root?.contains(quickButton)) {
      const quick = CITY_QUICK_ACCESS.find(link => link.id === quickButton.dataset['cityQuickId']);
      if (quick?.kind === 'page' && quick.pageId) this.navigate(quick.pageId);
      else if (quick?.kind === 'mission') document.getElementById('questHeaderButton')?.click();
      return;
    }

    const legacyTeamButton = event.target.closest<HTMLButtonElement>('button[data-city-team-id]');
    if (legacyTeamButton && this.root?.contains(legacyTeamButton)) {
      const id = Number(legacyTeamButton.dataset['cityTeamId']);
      const state = this.gameState.getState<MutableGameState & TeamWorldState & CityLayoutWorldState>();
      if (state.cityLayout &&
          getCityLegacyTeamAccess(state.cityLayout, teamIds(state)).some(team => team.teamId === id)) {
        this.openTeam(id);
      }
    }
  };

  private openTeam(teamId: number): void {
    this.navigate('dungeon');
    this.dungeonPresentation.openTeam(teamId);
  }

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
    if (!grid) return;
    let card = grid.querySelector<HTMLElement>('[data-city-overview-help]');
    if (!card) {
      card = document.createElement('div');
      card.className = 'card span-12';
      card.dataset['cityOverviewHelp'] = 'true';
      grid.prepend(card);
    }
    card.innerHTML = `<h2>Stadtraster und Gebäude</h2>
      <p class="index-note">Die bisherige starre Stadtgrafik wurde durch die gespeicherten Gebäude aus dem 12×8-Raster ersetzt. Jedes Gebäude besitzt eine feste technische ID und öffnet die passende bestehende Spielseite. Auf Smartphones lässt sich das Raster seitlich verschieben. Dungeonweg, Materiallager, Waffenlager und Missionen sind über die Zugänge unter der Karte erreichbar.</p>
      <p class="index-note">Die Bauhütte ist bereits sichtbar, aber Bauaufträge kommen erst mit S11. Gebäude verschieben, neue Gebäude bauen und Stadtfläche erweitern sind noch nicht möglich (S09–S11). Deine bisherigen Ausbauplätze und zusätzlichen Teams bleiben bestehen. Bereits gekaufte Teams ohne Gebäude werden vorübergehend unter der Karte angeboten; die Umstellung auf eigene Teamgebäude erfolgt in S10–S12.</p>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character] ?? character);
  }
}

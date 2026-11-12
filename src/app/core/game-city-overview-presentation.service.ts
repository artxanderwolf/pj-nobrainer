import { Injectable, Injector } from '@angular/core';
import {
  CITY_QUICK_ACCESS,
  getCityLegacyTeamAccess,
  getCityOverviewPresentation,
  type CityBuildingPresentation
} from '../game/city-overview-presentation-core.ts';
import { type CityLayoutWorldState, type CityLayoutState } from '../game/city-layout-core.ts';
import { moveCityBuilding, type CityExpandDirection } from '../game/city-placement-core.ts';
import { buyCityExpansion, cityExpansionPrice, type CityEconomyWorldState } from '../game/city-economy-core.ts';
import { teamIds, type TeamWorldState } from '../game/team-core.ts';
import { GameDungeonPresentationService } from './game-dungeon-presentation.service';
import { GameStateService, type MutableGameState } from './game-state.service';
import { GameRuntimeService } from './game-runtime.service';

type CityNavigationWindow = Window & { go?: (pageId: string) => void };

@Injectable({ providedIn: 'root' })
export class GameCityOverviewPresentationService {
  private root: HTMLElement | null = null;
  private basePage: HTMLElement | null = null;
  private activeObserver: MutationObserver | null = null;
  private renderedSignature = '';
  private moveMode = false;
  private moveBuildingId: string | null = null;
  private moveNotice = '';

  constructor(
    private readonly gameState: GameStateService,
    private readonly dungeonPresentation: GameDungeonPresentationService,
    private readonly injector: Injector
  ) {}

  render(): void {
    const root = this.ensureInstalled();
    if (!root) return;
    const state = this.gameState.getState<MutableGameState & TeamWorldState & CityLayoutWorldState & CityEconomyWorldState>();
    const layout = state.cityLayout;
    if (!layout) throw new Error('S08: Stadtlayout fehlt nach der S07-Save-Migration.');
    const ownedIds = teamIds(state);
    if (this.moveBuildingId && !layout.buildings.some(building => building.buildingInstanceId === this.moveBuildingId)) {
      this.moveBuildingId = null;
    }
    const signature = JSON.stringify({
      layout, ownedIds, gold: state.gold, cityEconomy: state.cityEconomy, moveMode: this.moveMode,
      moveBuildingId: this.moveBuildingId, moveNotice: this.moveNotice
    });
    if (signature !== this.renderedSignature) {
      const viewport = root.querySelector<HTMLElement>('.city-grid-viewport');
      const scrollLeft = viewport?.scrollLeft ?? 0;
      const scrollTop = viewport?.scrollTop ?? 0;
      root.innerHTML = this.renderCity(layout, ownedIds, state.cityEconomy?.paidExpansions ?? 0, Number(state.gold ?? 0));
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
    this.root?.removeEventListener('change', this.handleChange);
    this.root = null;
    this.basePage = null;
    this.renderedSignature = '';
    this.moveMode = false;
    this.moveBuildingId = null;
    this.moveNotice = '';
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
    root.addEventListener('change', this.handleChange);
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

  private renderCity(layout: CityLayoutState, ownedIds: readonly number[], paidExpansions: number, gold: number): string {
    const buildings = getCityOverviewPresentation(layout, ownedIds);
    const extraTeams = getCityLegacyTeamAccess(layout, ownedIds);
    const gridColumns = layout.grid.width;
    const gridRows = layout.grid.height;
    const tools = this.renderPlacementToolbar(buildings, layout, paidExpansions, gold);
    const moveCells = this.moveMode ? this.renderMoveCells(layout) : '';
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
      ${tools}
      <div class="city-grid-scroll-hint">Karte seitlich verschieben, um alle Gebäude zu erreichen.</div>
      <div class="city-grid-viewport" tabindex="0" role="region" aria-label="Stadtraster, horizontal scrollbar">
        <div id="cityGrid" class="city-grid-map" role="group" aria-label="Gebäuderaster" data-grid-width="${gridColumns}" data-grid-height="${gridRows}" style="--city-grid-columns:${gridColumns};--city-grid-rows:${gridRows}">
          ${buildings.map(building => this.renderBuilding(building, layout)).join('')}
          ${moveCells}
        </div>
      </div>
      <nav class="city-grid-links" aria-label="Weitere Stadtzugänge">
        <h3>Stadtwege &amp; Lager</h3>
        <div class="city-grid-link-list">${quickLinks}</div>
      </nav>
      ${legacyTeamLinks}`;
  }

  private renderPlacementToolbar(
    buildings: readonly CityBuildingPresentation[], layout: CityLayoutState, paidExpansions: number, gold: number
  ): string {
    const expansionCost = cityExpansionPrice(paidExpansions);
    const canExpand = gold >= expansionCost;
    const modeLabel = this.moveMode ? 'Verschiebemodus beenden' : 'Gebäude verschieben';
    const selectedId = this.moveBuildingId ?? buildings[0]?.buildingInstanceId ?? null;
    const options = buildings.map(building =>
      `<option value="${building.buildingInstanceId}"${selectedId === building.buildingInstanceId ? ' selected' : ''}>${this.escapeHtml(building.label)} · ${building.buildingInstanceId}</option>`
    ).join('');
    const selection = this.moveMode
      ? `<label class="city-placement-selector" for="cityMoveBuildingSelect">Gebäude wählen
           <select id="cityMoveBuildingSelect" data-city-move-select>${options}</select>
         </label><p class="city-placement-hint">Tippe auf das gewünschte Rasterfeld. Es wird die linke obere Ecke des Gebäudes. Überlappungen und Felder außerhalb der Stadt werden abgelehnt.</p>`
      : '';
    return `<section class="city-placement-tools" aria-label="Stadtfläche und Platzierung">
      <div class="city-placement-primary">
        <button type="button" class="btn city-placement-toggle" data-city-move-toggle aria-pressed="${this.moveMode}">${modeLabel}</button>
        <span class="city-placement-coordinates">Stadtursprung: ${layout.grid.minX}/${layout.grid.minY}</span>
      </div>
      ${selection}
      <p class="city-placement-notice" role="status" aria-live="polite">${this.escapeHtml(this.moveNotice)}</p>
      <fieldset class="city-expand-controls">
        <legend>Stadtfläche um vier Felder erweitern · ${expansionCost.toLocaleString('de-DE')} Nickel</legend>
        <button type="button" class="btn" data-city-expand="left"${canExpand ? "" : " disabled"}>← Links +4</button>
        <button type="button" class="btn" data-city-expand="right"${canExpand ? "" : " disabled"}>Rechts +4 →</button>
        <button type="button" class="btn" data-city-expand="up"${canExpand ? "" : " disabled"}>↑ Oben +4</button>
        <button type="button" class="btn" data-city-expand="down"${canExpand ? "" : " disabled"}>Unten +4 ↓</button>
      </fieldset>
      <p class="city-placement-hint">S10: Neue Stadterweiterungen kosten Nickel (3.000 Grundpreis × zentraler Faktor × 1,5 pro bezahlter Erweiterung). Migrationsfläche bleibt kostenlos. Gebäude-Bauaufträge folgen in S11.</p>
    </section>`;
  }

  private renderMoveCells(layout: CityLayoutState): string {
    const buttons: string[] = [];
    for (let row = 0; row < layout.grid.height; row++) {
      for (let column = 0; column < layout.grid.width; column++) {
        const x = layout.grid.minX + column;
        const y = layout.grid.minY + row;
        buttons.push(`<button type="button" class="city-placement-cell" data-city-target-x="${x}" data-city-target-y="${y}" aria-label="Gebäude setzen: Spalte ${x}, Reihe ${y}" title="Ziel ${x}/${y}"></button>`);
      }
    }
    return `<div class="city-placement-cell-overlay" aria-label="Zielfelder zum Verschieben">${buttons.join('')}</div>`;
  }

  private readonly handleChange = (event: Event): void => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement) || !select.matches('[data-city-move-select]') ||
        !this.root?.contains(select)) return;
    this.moveBuildingId = select.value;
    this.moveNotice = 'Gebäude ausgewählt. Jetzt ein freies Zielfeld auf der Karte antippen.';
    this.render();
  };

  private applyMove(x: number, y: number): void {
    if (!this.moveMode) return;
    const state = this.gameState.getState<MutableGameState & CityLayoutWorldState>();
    if (!state.cityLayout) return;
    const buildingId = this.moveBuildingId ?? state.cityLayout.buildings[0]?.buildingInstanceId;
    if (!buildingId) return;
    const attempt = moveCityBuilding(state.cityLayout, buildingId, x, y);
    if (!attempt.ok) {
      this.moveNotice = attempt.message;
      this.render();
      return;
    }
    const existing = state.cityLayout;
    state.cityLayout = attempt.layout;
    try {
      if (!this.injector.get(GameRuntimeService).save(false)) throw new Error('Der Spielstand konnte nicht geschrieben werden.');
      this.moveNotice = `Gebäude ${buildingId} kostenlos auf ${x}/${y} verschoben und gespeichert.`;
    } catch {
      state.cityLayout = existing;
      this.moveNotice = 'Speichern fehlgeschlagen. Das Gebäude steht weiterhin am ursprünglichen Platz.';
    }
    this.render();
  }

  private applyExpansion(direction: CityExpandDirection): void {
    const state = this.gameState.getState<MutableGameState & CityLayoutWorldState & CityEconomyWorldState>();
    if (!state.cityLayout || !state.cityEconomy) return;
    const oldLayout = state.cityLayout;
    const oldEconomy = state.cityEconomy;
    const oldGold = state.gold;
    try {
      const result = buyCityExpansion(state, direction);
      if (!result.ok) {
        this.moveNotice = result.reason ?? 'Stadterweiterung nicht möglich.';
      } else {
        if (!this.injector.get(GameRuntimeService).save(false)) {
          throw new Error('Der Spielstand konnte nicht geschrieben werden.');
        }
        this.moveNotice = `Stadtfläche für ${result.costNickel.toLocaleString('de-DE')} Nickel um vier Felder erweitert.`;
      }
    } catch {
      state.cityLayout = oldLayout;
      state.cityEconomy = oldEconomy;
      state.gold = oldGold;
      this.moveNotice = 'Erweiterung oder Speicherung fehlgeschlagen: Stadt und Nickelbestand unverändert.';
    }
    this.render();
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
    const toggle = event.target.closest<HTMLButtonElement>('[data-city-move-toggle]');
    if (toggle && this.root?.contains(toggle)) {
      this.moveMode = !this.moveMode;
      if (this.moveMode && !this.moveBuildingId) {
        const state = this.gameState.getState<MutableGameState & CityLayoutWorldState>();
        this.moveBuildingId = state.cityLayout?.buildings[0]?.buildingInstanceId ?? null;
      }
      this.moveNotice = this.moveMode
        ? 'Gebäude auswählen und ein Zielfeld auf dem Raster antippen.'
        : 'Verschiebemodus beendet.';
      this.render();
      return;
    }

    const expand = event.target.closest<HTMLButtonElement>('[data-city-expand]');
    if (expand && this.root?.contains(expand)) {
      const direction = expand.dataset['cityExpand'];
      if (direction === 'left' || direction === 'right' || direction === 'up' || direction === 'down') {
        this.applyExpansion(direction);
      }
      return;
    }

    const cell = event.target.closest<HTMLButtonElement>('[data-city-target-x][data-city-target-y]');
    if (cell && this.root?.contains(cell)) {
      this.applyMove(Number(cell.dataset['cityTargetX']), Number(cell.dataset['cityTargetY']));
      return;
    }

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
      <p class="index-note">Die Bauhütte ist bereits sichtbar, aber Bauaufträge kommen erst mit S11. Über den Verschiebemodus kannst du ein bestehendes Gebäude auswählen und danach kostenlos auf ein freies Rasterfeld setzen; belegte oder zu kleine Flächen werden abgelehnt. Die Karte kannst du links, rechts, oben oder unten um jeweils vier Felder vergrößern. Neue Flächenerweiterungen kosten Nickel: Grundpreis 3.000 × zentraler Kostenfaktor × 1,5 je bezahlter Erweiterung. Bereits bezahlte Schmiede-, Markt- und Teamplätze werden einmalig kostenlos als Gebäude übernommen. Bei Platzmangel wird kostenlos erweitert. Erstes Gebäude je Art kostenlos; weitere: Schmiede/Markt 5.000, Team 3.000, Bauhütte/Taverne/Runenwerkstatt 20.000 Nickel Grundpreis × zentraler Faktor × Wachstum 1,2. Maximal 10 Schmieden, Märkte, Tavernen und Teams sowie je 2 Bauhütten und Runenwerkstätten. Die Stadt ist theoretisch unbegrenzt erweiterbar. Bauaufträge folgen S11.</p>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character] ?? character);
  }
}

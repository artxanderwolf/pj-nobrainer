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
import { CITY_BUILDING_TYPES, type CityBuildingTypeId } from '../game/city-layout-core.ts';
import { cityBuildingPrice, cityBuildingCount } from '../game/city-economy-core.ts';
import { CONSTRUCTIBLE_CITY_BUILDINGS, CITY_CONSTRUCTION_DURATION_MS, startCityConstruction, cancelCityConstruction, availableCityBuilders, type ConstructibleCityBuildingType, type CityConstructionWorldState } from '../game/city-construction-core.ts';
import { ensureFirstRuneWorkshop, type RuneWorldState } from '../game/rune-inventory-core.ts';
import { GameRuneWorkshopPresentationService } from './game-rune-workshop-presentation.service.ts';
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
  private buildMode = false;
  private buildType: ConstructibleCityBuildingType = 'forge';
  private moveBuildingId: string | null = null;
  private moveNotice = '';
  private cityMenu: 'closed'|'main'|'build'|'expand' = 'closed';
  private contextBuildingId: string|null = null;
  private pressTimer: ReturnType<typeof setTimeout>|null = null;
  private pressOrigin: {x:number;y:number}|null = null;
  private suppressBuildingClick = false;

  constructor(
    private readonly gameState: GameStateService,
    private readonly dungeonPresentation: GameDungeonPresentationService,
    private readonly injector: Injector
  ) {}

  render(): void {
    const root = this.ensureInstalled();
    if (!root) return;
    const state = this.gameState.getState<MutableGameState & TeamWorldState & CityLayoutWorldState & CityEconomyWorldState & CityConstructionWorldState>();
    const layout = state.cityLayout;
    if (!layout) throw new Error('S08: Stadtlayout fehlt nach der S07-Save-Migration.');
    const ownedIds = teamIds(state);
    if (this.moveBuildingId && !layout.buildings.some(building => building.buildingInstanceId === this.moveBuildingId)) {
      this.moveBuildingId = null;
    }
    const signature = JSON.stringify({
      layout, ownedIds, gold: state.gold, cityEconomy: state.cityEconomy, construction: state.cityConstruction,
      countdownSecond: state.cityConstruction?.jobs.length ? Math.floor(Date.now()/1000) : null, buildMode: this.buildMode, buildType: this.buildType, moveMode: this.moveMode,
      moveBuildingId: this.moveBuildingId, moveNotice: this.moveNotice, cityMenu: this.cityMenu, contextBuildingId: this.contextBuildingId
    });
    if (signature !== this.renderedSignature) {
      const viewport = root.querySelector<HTMLElement>('.city-grid-viewport');
      const scrollLeft = viewport?.scrollLeft ?? 0;
      const scrollTop = viewport?.scrollTop ?? 0;
      root.innerHTML = this.renderCity(layout, ownedIds, state.cityEconomy?.paidExpansions ?? 0, Number(state.gold ?? 0), state);
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
    this.root?.removeEventListener('pointerdown', this.handlePointerDown);
    this.root?.removeEventListener('pointermove', this.handlePointerMove);
    this.root?.removeEventListener('pointerup', this.clearPress);
    this.root?.removeEventListener('pointercancel', this.clearPress);
    this.root?.removeEventListener('contextmenu', this.handleContextMenu);
    this.root?.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleHeaderClick);
    this.clearPress();
    document.removeEventListener('city-construction-updated', this.handleCityConstructionUpdate);
    document.removeEventListener('rune-workshop-updated',this.handleCityConstructionUpdate);
    this.root = null;
    this.basePage = null;
    this.renderedSignature = '';
    this.moveMode = false;
    this.buildMode = false;
    this.moveBuildingId = null;
    this.moveNotice = '';
    this.cityMenu = 'closed';
    this.contextBuildingId = null;
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
    root.addEventListener('pointerdown', this.handlePointerDown);
    root.addEventListener('pointermove', this.handlePointerMove);
    root.addEventListener('pointerup', this.clearPress);
    root.addEventListener('pointercancel', this.clearPress);
    root.addEventListener('contextmenu', this.handleContextMenu);
    root.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('click', this.handleHeaderClick);
    document.addEventListener('city-construction-updated', this.handleCityConstructionUpdate);
    document.addEventListener('rune-workshop-updated',this.handleCityConstructionUpdate);
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

  private readonly handleCityConstructionUpdate = (): void => {
    if (this.basePage?.classList.contains('active')) this.render();
  };

  private renderCity(layout: CityLayoutState, ownedIds: readonly number[], paidExpansions: number, gold: number, state: CityConstructionWorldState): string {
    const buildings = getCityOverviewPresentation(layout, ownedIds);
    const extraTeams = getCityLegacyTeamAccess(layout, ownedIds);
    const gridColumns = layout.grid.width;
    const gridRows = layout.grid.height;
    const tools = this.renderPlacementToolbar(buildings, layout, paidExpansions, gold, state);
    const moveCells = (this.moveMode || this.buildMode) ? this.renderMoveCells(layout) : '';
    const quickLinks = CITY_QUICK_ACCESS.map(access => {
      return `<button id="cityAction-${access.id}" type="button" class="city-grid-quick-link" data-city-quick-id="${access.id}"><span aria-hidden="true">${access.icon}</span>${this.escapeHtml(access.label)}</button>`;
    }).join('');
    const legacyTeamLinks = extraTeams.length
      ? `<section class="city-grid-legacy-teams" aria-label="Weitere vorhandene Teams">
          <h3>Weitere Teams aus deinem Spielstand</h3>
          <p>Bereits erworbene Teams ohne Gebäude bleiben vorübergehend erreichbar, falls ihr Altspielstand noch nicht vollständig migriert ist.</p>
          <div class="city-grid-legacy-list">${extraTeams.map(team => `<button type="button" class="city-grid-quick-link" data-city-team-id="${team.teamId}">${this.escapeHtml(team.label)}</button>`).join('')}</div>
        </section>` : '';

    return `<header class="city-grid-heading">
        <h2>Stadtgebäude</h2>
        <p>${gridColumns} × ${gridRows} Felder · ${buildings.length} Gebäude · Berühre ein Gebäude zum Öffnen</p>
      </header>
      <div class="city-grid-viewport" tabindex="0" role="region" aria-label="Stadtraster, horizontal scrollbar">
        <div id="cityGrid" class="city-grid-map" role="group" aria-label="Gebäuderaster" data-grid-width="${gridColumns}" data-grid-height="${gridRows}" style="--city-grid-columns:${gridColumns};--city-grid-rows:${gridRows}">
          ${buildings.map(building => this.renderBuilding(building, layout)).join('')}
          ${moveCells}
        </div>
      </div>
      <nav class="city-grid-links" aria-label="Weitere Stadtzugänge">
        <div class="city-grid-link-list">${quickLinks}</div>
      </nav>
      ${tools}
      ${legacyTeamLinks}`;
  }


  private renderPlacementToolbar(buildings: readonly CityBuildingPresentation[], layout: CityLayoutState,
    paidExpansions:number, gold:number, state: CityConstructionWorldState):string {
    const notice=this.moveNotice
      ? `<p class="city-placement-notice" role="status" aria-live="polite">${this.escapeHtml(this.moveNotice)}</p>` : '';
    const mode=this.moveMode
      ? `<div class="city-map-mode-hint">Verschieben: ${this.escapeHtml(buildings.find(b=>b.buildingInstanceId===this.moveBuildingId)?.label??'Gebäude')} · Zielfeld wählen <button class="btn" type="button" data-city-mode-cancel>Abbrechen</button></div>`
      : this.buildMode
        ? `<div class="city-map-mode-hint">Bauplatz für ${this.escapeHtml(CITY_BUILDING_TYPES[this.buildType].label)} wählen <button class="btn" type="button" data-city-mode-cancel>Abbrechen</button></div>` : '';
    if(this.contextBuildingId){
      const selected=buildings.find(b=>b.buildingInstanceId===this.contextBuildingId);
      if(selected)return `${mode}${notice}<div class="city-action-shade" data-city-menu-backdrop>
        <section class="city-action-dialog" role="dialog" aria-modal="true" aria-label="Gebäudeaktionen">
          <h3>${this.escapeHtml(selected.label)}</h3>
          <p>Was möchtest du mit diesem Gebäude machen?</p>
          <button class="btn" type="button" data-city-move-context>Gebäude verschieben</button>
          <button class="btn" type="button" data-city-menu-close>Schließen</button>
        </section></div>`;
    }
    if(this.cityMenu==='closed')return `${mode}${notice}`;
    const expansionCost=cityExpansionPrice(paidExpansions);
    const canExpand=gold>=expansionCost;
    const jobs=(state.cityConstruction?.jobs??[]).map(job=>{
      const building=layout.buildings.find(b=>b.buildingInstanceId===job.buildingInstanceId);
      const remaining=Math.max(0,Math.ceil((job.completesAt-Date.now())/1000));
      return `<div class="city-construction-job"><span>${this.escapeHtml(CITY_BUILDING_TYPES[building?.buildingTypeId??'builder'].label)} · ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} · ${job.paidNickel.toLocaleString('de-DE')} Nickel</span><button class="btn" type="button" data-city-build-cancel="${job.jobId}">Abbrechen (100 % zurück)</button></div>`;
    }).join('');
    let body='';
    if(this.cityMenu==='main'){
      body=`<button class="btn" type="button" data-city-menu-section="build">Neues Gebäude bauen</button>
        <button class="btn" type="button" data-city-menu-section="expand">Stadtfläche erweitern</button>
        ${jobs?`<div class="city-construction-list"><h4>Laufende Bauaufträge</h4>${jobs}</div>`:''}`;
    }else if(this.cityMenu==='build'){
      const options=CONSTRUCTIBLE_CITY_BUILDINGS.map(type=>{
        const price=cityBuildingPrice(type,cityBuildingCount(layout,type));
        return `<option value="${type}"${type===this.buildType?' selected':''}${price===null?' disabled':''}>${this.escapeHtml(CITY_BUILDING_TYPES[type].label)} · ${price===null?'Maximum':price.toLocaleString('de-DE')+' Nickel'}</option>`;
      }).join('');
      body=`<label class="city-placement-selector" for="cityBuildTypeSelect">Gebäudetyp
        <select id="cityBuildTypeSelect" data-city-build-select>${options}</select></label>
        <p class="city-placement-hint">Freie Baumeister: ${availableCityBuilders(state)} · Bauzeit: 30 Minuten.</p>
        <button class="btn" type="button" data-city-build-toggle>Bauplatz auf Karte wählen</button>`;
    }else{
      body=`<p>Stadtfläche um vier Felder erweitern · ${expansionCost.toLocaleString('de-DE')} Nickel</p>
        <div class="city-expand-controls">
        <button class="btn" type="button" data-city-expand="left"${canExpand?'':' disabled'}>← Links +4</button>
        <button class="btn" type="button" data-city-expand="right"${canExpand?'':' disabled'}>Rechts +4 →</button>
        <button class="btn" type="button" data-city-expand="up"${canExpand?'':' disabled'}>↑ Oben +4</button>
        <button class="btn" type="button" data-city-expand="down"${canExpand?'':' disabled'}>Unten +4 ↓</button>
        </div>`;
    }
    return `${mode}${notice}<div class="city-action-shade" data-city-menu-backdrop>
      <section class="city-action-dialog" role="dialog" aria-modal="true" aria-label="Stadt bauen und erweitern">
      <div class="city-action-dialog-head"><h3>${this.cityMenu==='main'?'Bauen & Erweitern':this.cityMenu==='build'?'Gebäude bauen':'Stadt erweitern'}</h3>
      <button class="btn" type="button" data-city-menu-close aria-label="Menü schließen">✕</button></div>
      ${body}
      ${this.cityMenu==='main'?'':'<button class="btn" type="button" data-city-menu-back>Zurück</button>'}
      </section></div>`;
  }

  private readonly clearPress=():void=>{
    if(this.pressTimer!==null)clearTimeout(this.pressTimer);
    this.pressTimer=null;this.pressOrigin=null;
  };

  private openBuildingContext(buildingId:string):void{
    const state=this.gameState.getState<MutableGameState&CityLayoutWorldState>();
    if(!state.cityLayout?.buildings.some(b=>b.buildingInstanceId===buildingId))return;
    this.clearPress();this.suppressBuildingClick=true;
    this.contextBuildingId=buildingId;this.cityMenu='closed';this.render();
  }

  private readonly handlePointerDown=(event:PointerEvent):void=>{
    this.clearPress();
    if(event.button!==0||this.moveMode||this.buildMode||this.cityMenu!=='closed'||this.contextBuildingId)return;
    const target=event.target instanceof Element?event.target.closest<HTMLElement>('[data-city-building-id]'):null;
    if(!target||!this.root?.contains(target))return;
    const id=target.dataset['cityBuildingId'];if(!id)return;
    this.pressOrigin={x:event.clientX,y:event.clientY};
    this.pressTimer=setTimeout(()=>this.openBuildingContext(id),550);
  };
  private readonly handlePointerMove=(event:PointerEvent):void=>{
    if(this.pressOrigin&&Math.hypot(event.clientX-this.pressOrigin.x,event.clientY-this.pressOrigin.y)>12)this.clearPress();
  };
  private readonly handleContextMenu=(event:MouseEvent):void=>{
    const target=event.target instanceof Element?event.target.closest<HTMLElement>('[data-city-building-id]'):null;
    if(!target||!this.root?.contains(target))return;
    event.preventDefault();this.openBuildingContext(target.dataset['cityBuildingId']??'');
  };
  private readonly handleKeyDown=(event:KeyboardEvent):void=>{
    if(event.key==='Escape'&&(this.cityMenu!=='closed'||this.contextBuildingId||this.moveMode||this.buildMode)){
      this.cityMenu='closed';this.contextBuildingId=null;this.moveMode=false;this.buildMode=false;this.render();event.preventDefault();
    }else if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){
      const target=event.target instanceof Element?event.target.closest<HTMLElement>('[data-city-building-id]'):null;
      if(target){event.preventDefault();this.openBuildingContext(target.dataset['cityBuildingId']??'');}
    }
  };
  private readonly handleHeaderClick=(event:MouseEvent):void=>{
    const target=event.target instanceof Element?event.target.closest('#cityBuildMenuButton'):null;
    if(!target||!this.basePage?.classList.contains('active'))return;
    this.contextBuildingId=null;this.cityMenu=this.cityMenu==='closed'?'main':'closed';
    this.moveMode=false;this.buildMode=false;this.render();
  };

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
    if (!(select instanceof HTMLSelectElement) || !this.root?.contains(select)) return;
    if (select.matches('[data-city-build-select]')) {
      if ((CONSTRUCTIBLE_CITY_BUILDINGS as readonly string[]).includes(select.value)) {
        this.buildType = select.value as ConstructibleCityBuildingType;
        this.moveNotice = 'Gebäudetyp ausgewählt. Jetzt ein freies 2×2-Feld antippen.';
        this.render();
      }
      return;
    }
    if (!select.matches('[data-city-move-select]')) return;
    this.moveBuildingId = select.value;
    this.moveNotice = 'Gebäude ausgewählt. Jetzt ein freies Zielfeld auf der Karte antippen.';
    this.render();
  };

  private applyMove(x: number, y: number): void {
    if (!this.moveMode) return;
    const state = this.gameState.getState<MutableGameState & CityLayoutWorldState & RuneWorldState>();
    if (!state.cityLayout) return;
    const buildingId = this.moveBuildingId ?? state.cityLayout.buildings[0]?.buildingInstanceId;
    if (!buildingId) return;
    const selectedBuilding = state.cityLayout.buildings.find(b => b.buildingInstanceId === buildingId);
    if (selectedBuilding?.status === 'underConstruction' || selectedBuilding?.activeJobId?.startsWith('build-job-')) {
      this.moveNotice = 'Eine aktive Baustelle oder beschäftigte Bauhütte kann nicht verschoben werden.';
      this.render();
      return;
    }
    const attempt = moveCityBuilding(state.cityLayout, buildingId, x, y);
    if (!attempt.ok) {
      this.moveNotice = attempt.message;
      this.render();
      return;
    }
    const existing = state.cityLayout;
    state.cityLayout = attempt.layout;
    ensureFirstRuneWorkshop(state);
    try {
      if (!this.injector.get(GameRuntimeService).save(false)) throw new Error('Der Spielstand konnte nicht geschrieben werden.');
      this.moveNotice = `Gebäude ${buildingId} kostenlos auf ${x}/${y} verschoben und gespeichert.`;
    } catch {
      state.cityLayout = existing;
      this.moveNotice = 'Speichern fehlgeschlagen. Das Gebäude steht weiterhin am ursprünglichen Platz.';
    }
    this.moveMode = false;
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
        ensureFirstRuneWorkshop(state as MutableGameState & RuneWorldState);
        if (!this.injector.get(GameRuntimeService).save(false)) {
          throw new Error('Der Spielstand konnte nicht geschrieben werden.');
        }
        this.moveNotice = `Stadtfläche für ${result.costNickel.toLocaleString('de-DE')} Nickel um vier Felder erweitert.`;
        this.cityMenu = 'closed';
      }
    } catch {
      state.cityLayout = oldLayout;
      state.cityEconomy = oldEconomy;
      state.gold = oldGold;
      this.moveNotice = 'Erweiterung oder Speicherung fehlgeschlagen: Stadt und Nickelbestand unverändert.';
    }
    this.render();
  }

  private applyBuild(x: number, y: number): void {
    const state = this.gameState.getState<MutableGameState & CityConstructionWorldState>();
    if (!state.cityLayout || !state.cityConstruction) return;
    const before = { cityLayout: state.cityLayout, cityConstruction: state.cityConstruction, gold: state.gold };
    try {
      const result = startCityConstruction(state, this.buildType, x, y, Date.now());
      if (!result.ok) {
        this.moveNotice = result.reason;
      } else {
        if (!this.injector.get(GameRuntimeService).save(false)) throw new Error('Speichern fehlgeschlagen');
        this.moveNotice = `Bauauftrag ${result.jobId} gestartet: 30 Minuten, ${result.costNickel.toLocaleString('de-DE')} Nickel.`;
        this.buildMode = false;
      }
    } catch {
      Object.assign(state, before);
      this.moveNotice = 'Bauauftrag konnte nicht gespeichert werden. Keine Nickel abgezogen.';
    }
    this.render();
  }

  private applyCancel(jobId: string): void {
    const state = this.gameState.getState<MutableGameState & CityConstructionWorldState>();
    if (!state.cityLayout || !state.cityConstruction) return;
    const before = { cityLayout: state.cityLayout, cityConstruction: state.cityConstruction, gold: state.gold };
    try {
      const result = cancelCityConstruction(state, jobId, Date.now());
      if (!result.ok) {
        this.moveNotice = result.reason ?? 'Abbruch nicht möglich.';
      } else {
        if (!this.injector.get(GameRuntimeService).save(false)) throw new Error('Speichern fehlgeschlagen');
        this.moveNotice = `Bauauftrag abgebrochen: ${result.refundedNickel.toLocaleString('de-DE')} Nickel vollständig erstattet.`;
      }
    } catch {
      Object.assign(state, before);
      this.moveNotice = 'Abbruch konnte nicht gespeichert werden. Bauauftrag unverändert.';
    }
    this.render();
  }

  private renderBuilding(building: CityBuildingPresentation, layout: CityLayoutState): string {
    const x = building.x - layout.grid.minX + 1;
    const y = building.y - layout.grid.minY + 1;
    const label = this.escapeHtml(building.label);
    const disabledReason = building.disabledReason ? this.escapeHtml(building.disabledReason) : null;
    const detail = disabledReason ?? (building.buildingTypeId === 'team' ? 'Zum Team' : 'Öffnen');
    const disabled = !building.enabled ? ' aria-disabled="true"' : ' aria-disabled="false"';
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

  private readonly handleClick = (event:Event):void=>{
    if(!(event.target instanceof Element))return;
    const close=event.target.closest<HTMLElement>('[data-city-menu-close],[data-city-menu-backdrop]');
    if(close&&this.root?.contains(close)&&(close===event.target||close.hasAttribute('data-city-menu-close'))){
      this.contextBuildingId=null;this.cityMenu='closed';this.render();return;
    }
    const back=event.target.closest<HTMLElement>('[data-city-menu-back]');
    if(back&&this.root?.contains(back)){this.cityMenu='main';this.render();return;}
    const section=event.target.closest<HTMLElement>('[data-city-menu-section]');
    if(section&&this.root?.contains(section)){
      const value=section.dataset['cityMenuSection'];
      if(value==='build'||value==='expand'){this.cityMenu=value;this.render();}
      return;
    }
    const moveContext=event.target.closest<HTMLElement>('[data-city-move-context]');
    if(moveContext&&this.root?.contains(moveContext)){
      this.moveBuildingId=this.contextBuildingId;
      this.contextBuildingId=null;this.moveMode=true;this.buildMode=false;
      this.moveNotice='Tippe auf ein freies Zielfeld für dieses Gebäude.';
      this.render();return;
    }
    const modeCancel=event.target.closest<HTMLElement>('[data-city-mode-cancel]');
    if(modeCancel&&this.root?.contains(modeCancel)){
      this.moveMode=false;this.buildMode=false;this.moveNotice='';this.render();return;
    }
    const buildToggle=event.target.closest<HTMLElement>('[data-city-build-toggle]');
    if(buildToggle&&this.root?.contains(buildToggle)){
      this.buildMode=true;this.moveMode=false;this.cityMenu='closed';
      this.moveNotice='Freies 2×2-Feld auf der Karte antippen.';
      this.render();return;
    }
    const cancel=event.target.closest<HTMLElement>('[data-city-build-cancel]');
    if(cancel&&this.root?.contains(cancel)){
      this.applyCancel(cancel.dataset['cityBuildCancel']??'');return;
    }
    const expand=event.target.closest<HTMLElement>('[data-city-expand]');
    if(expand&&this.root?.contains(expand)){
      const direction=expand.dataset['cityExpand'];
      if(direction==='left'||direction==='right'||direction==='up'||direction==='down')this.applyExpansion(direction);
      return;
    }
    const cell=event.target.closest<HTMLElement>('[data-city-target-x][data-city-target-y]');
    if(cell&&this.root?.contains(cell)){
      const x=Number(cell.dataset['cityTargetX']),y=Number(cell.dataset['cityTargetY']);
      if(this.buildMode)this.applyBuild(x,y);
      else this.applyMove(x,y);
      return;
    }
    const buildingButton=event.target.closest<HTMLButtonElement>('button[data-city-building-id]');
    if(buildingButton&&this.root?.contains(buildingButton)){
      if(this.suppressBuildingClick){this.suppressBuildingClick=false;return;}
      const state=this.gameState.getState<MutableGameState&TeamWorldState&CityLayoutWorldState>();
      if(!state.cityLayout)return;
      const building=getCityOverviewPresentation(state.cityLayout,teamIds(state))
        .find(item=>item.buildingInstanceId===buildingButton.dataset['cityBuildingId']);
      if(!building?.enabled||!building.navigation)return;
      if(building.navigation.kind==='page'){
        if(building.navigation.pageId==='rune-workshop')this.injector.get(GameRuneWorkshopPresentationService).open();
        else this.navigate(building.navigation.pageId);
      }else this.openTeam(building.navigation.teamId);
      return;
    }
    const quickButton=event.target.closest<HTMLButtonElement>('button[data-city-quick-id]');
    if(quickButton&&this.root?.contains(quickButton)){
      const quick=CITY_QUICK_ACCESS.find(link=>link.id===quickButton.dataset['cityQuickId']);
      if(quick?.kind==='page'&&quick.pageId)this.navigate(quick.pageId);
      else if(quick?.kind==='mission')document.getElementById('questHeaderButton')?.click();
      return;
    }
    const legacyTeamButton=event.target.closest<HTMLButtonElement>('button[data-city-team-id]');
    if(legacyTeamButton&&this.root?.contains(legacyTeamButton)){
      const id=Number(legacyTeamButton.dataset['cityTeamId']);
      const state=this.gameState.getState<MutableGameState&TeamWorldState&CityLayoutWorldState>();
      if(state.cityLayout&&getCityLegacyTeamAccess(state.cityLayout,teamIds(state)).some(team=>team.teamId===id))this.openTeam(id);
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
      <p class="index-note">Jede fertige Bauhütte hat einen festen Baumeister und kann genau ein Bauprojekt für 30 Minuten durchführen. Über das Bau-Icon oben rechts im Kopfbereich einen Gebäudetyp wählen und auf ein freies 2×2-Feld tippen. Der Nickelpreis wird beim Start einmalig abgezogen; bei Abbruch werden 100 % erstattet, ohne freien Bauplatz wird nichts abgebucht. Baustellen werden auch offline fertiggestellt. Halte ein Gebäude etwa eine halbe Sekunde gedrückt (am PC auch Rechtsklick oder Umschalt+F10), wähle „Gebäude verschieben“ und setze es kostenlos auf ein freies Rasterfeld; belegte oder zu kleine Flächen werden abgelehnt. Über das Bau-Icon und „Stadtfläche erweitern“ kannst du die Karte links, rechts, oben oder unten um jeweils vier Felder vergrößern. Alle Teams haben jeweils einen eigenen Stadteingang mit fester Team-ID. Weitere Teams werden ausschließlich über „Gebäude bauen“ gekauft und nach 30 Minuten freigeschaltet; Team 1 ist kostenlos. Ein älterer Teamkauf wird nicht erneut berechnet. Neue Flächenerweiterungen kosten Nickel: Grundpreis 3.000 × zentraler Kostenfaktor × 1,5 je bezahlter Erweiterung. Bereits bezahlte Schmiede-, Markt- und Teamplätze werden einmalig kostenlos als Gebäude übernommen. Bei Platzmangel wird kostenlos erweitert. Erstes Gebäude je Art kostenlos; weitere: Schmiede/Markt 5.000, Team 3.000, Bauhütte/Taverne/Runenwerkstatt 20.000 Nickel Grundpreis × zentraler Faktor × Wachstum 1,2. Maximal 10 Schmieden, Märkte, Tavernen und Teams sowie je 2 Bauhütten und Runenwerkstätten. S13: Jede fertige und aktive Schmiede bzw. jeder Markt besitzt genau einen aktiven Bearbeitungsplatz. Alle Betriebe einer Art verwenden eine gemeinsame Auftrags- und Warteschlangenliste; weitere Plätze entstehen durch den Bau neuer Gebäude, nicht mehr durch das alte Plätze-Upgrade. Bestehende, reservierte Aufträge behalten ihre Startzeiten und werden beim Offline-Bauabschluss dem neuen Betrieb zugeteilt. Warteschlangenplatz-Upgrades bleiben weiterhin nutzbar. S16: Jeder fertige Markt und jede fertige Schmiede arbeitet durch einen festen Grundarbeiter auch ohne Held mit 100 % Geschwindigkeit. In der jeweiligen Betriebsübersicht kann genau ein freier Kadercharakter als Helfer ausgewählt werden; das erhöht die Bearbeitungsgeschwindigkeit auf 120 % (60 Sekunden Arbeit dauern 50 Sekunden). Helfer sind weder in mehreren Betrieben noch im Dungeon gleichzeitig einsetzbar. Helferwechsel erhalten den bereits erarbeiteten Fortschritt; laufende Aufträge, Offlinezeiten und Gebäudeverschiebungen bleiben erhalten. Die sieben Mindest-Schmiedezeiten betragen Dolch 20 s, Einhandschwert/Einhandaxt 45 s, Zweihandschwert/Zweihandaxt 75 s, Bogen 90 s und Stab 50 s, sofern die wertabhängige Dauer nicht länger ist. S15: Material- und Waffenverkäufe reservieren die Ware bei Annahme; nach Verkaufsende bleibt der Nickelbetrag bis „Auszahlen“ oder „Alle auszahlen“ im Markt bereit. Fertige Verkäufe zählen zum Auftragslimit, blockieren keinen aktiven Verkaufsplatz und können nicht mehr abgebrochen werden. Laufende und wartende Verkäufe können weiterhin abgebrochen werden und geben die reservierte Ware zurück. Auch nach Neustart oder Offlinezeit ist die Auszahlung manuell auszulösen. S14: Fertige Schmiedeaufträge bleiben als „abholbereit“ gespeichert. Über „Abholen“ oder „Alle abholen“ in der Schmiede werden sie erst dann dem Waffenlager hinzugefügt. Sie belegen keinen aktiven Schmiedeplatz, zählen aber weiterhin zur gesamten Auftragsgrenze. Auch nach Offlinezeit oder Neustart musst du sie bewusst abholen. Die Stadt ist theoretisch unbegrenzt erweiterbar. Runenwerkstätten werden erst mit der vorgesehenen Freischaltung baubar.</p>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character] ?? character);
  }
}

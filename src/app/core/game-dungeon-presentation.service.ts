import { DUNGEON_IDS, getDungeonSession, assignDungeonCharacter, characterDungeonReservation, type DungeonSessionState } from '../game/parallel-dungeon-core.ts';
import { dungeonUnlocked } from '../game/mission-core.ts';
import { getDungeonDefinition } from '../game/dungeon-definitions.ts';
import { Injectable } from '@angular/core';
import { CHARACTER_CLASSES, CONFIG, type CharacterClassId } from '../game/game-core';
import { getMaterialStorageEntries, type MaterialStorageInventory } from '../game/material-storage-core';
import {
  getDungeonTeamPresentation,
  type DungeonTeamPresentationCharacterLike
} from '../game/character-presentation-core';
import { type DungeonActionResult } from './game-dungeon.service';
import { GameDungeonSessionService } from './game-dungeon-session.service';
import { GameStateService, type MutableGameState } from './game-state.service';

interface DungeonPresentationCharacter extends DungeonTeamPresentationCharacterLike { classId?: string | null; }
interface DungeonPresentationEnemy { name: string; hp: number; maxHp: number; alive?: boolean; }
interface DungeonPresentationState extends MutableGameState {
  characters: DungeonPresentationCharacter[];
  session: DungeonSessionState;
}

interface DungeonLogEntry {
  text: string;
  className: string;
}

@Injectable({ providedIn: 'root' })
export class GameDungeonPresentationService {
  private openTeamPickerSlot: number | null = null;
  private actionsBound = false;
  private actionHandler: ((result: DungeonActionResult, inventoryChanged: boolean) => void) | null = null;
  private readonly maxVisibleLogEntries = 1000;
  private get liveLogEntries(): DungeonLogEntry[] { return this.getState().session.log; }
  private set liveLogEntries(entries:DungeonLogEntry[]) { this.getState().session.log=entries; }
  private liveLogPlaceholder = 'Noch kein Lauf gestartet.';

  constructor(
    private readonly gameState: GameStateService,
    private readonly dungeonSession: GameDungeonSessionService
  ) {}

  bindActions(handler: (result: DungeonActionResult, inventoryChanged: boolean) => void): void {
    this.actionHandler = handler;
    if (this.actionsBound) return;

    this.installHubMarkup();
    this.installModalMarkup();
    this.installHelpSection();

    const openButton = document.getElementById('dungeonOverviewOpenBtn');
    const overviewAction = document.getElementById('dungeonOverviewAction') as HTMLButtonElement | null;
    const primaryButton = document.getElementById('dungeonPrimaryBtn');
    const teamCard = document.getElementById('dungeonTeamCard');
    const collectButton = document.getElementById('dungeonCollectLootBtn');
    const closeButton = document.getElementById('dungeonModalCloseBtn');
    const backdrop = document.getElementById('dungeonModalBackdrop');
    if (!openButton || !overviewAction || !primaryButton || !teamCard || !collectButton || !closeButton || !backdrop) {
      throw new Error('Angular-Dungeon-Präsentation konnte die Trainingslager-Popup-Bedienelemente nicht finden.');
    }

    openButton.removeAttribute('onclick');
    openButton.addEventListener('click', () => this.openModal(1));
    document.getElementById('dungeon')?.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-open-dungeon]');const id=Number(button?.dataset['openDungeon']);if(id>1)this.openModal(id);});

    // Der alte zweite Hub-Knopf bleibt nur als unsichtbarer Kompatibilitätsanker für Altstand-/Browserchecks bestehen.
    overviewAction.hidden = true;
    overviewAction.tabIndex = -1;
    overviewAction.setAttribute('aria-hidden', 'true');
    overviewAction.addEventListener('click', () => this.handleOverviewAction());

    primaryButton.addEventListener('click', () => this.handlePrimaryAction());
    teamCard.addEventListener('click', event => this.handleTeamClick(event));
    collectButton.addEventListener('click', () => this.handleCollectLoot());
    closeButton.addEventListener('click', () => this.closeModal());
    backdrop.addEventListener('click', () => this.closeModal());
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.dungeonSession.isOpen()) this.closeModal();
    });

    this.actionsBound = true;
  }

  render(): void {
    const title=document.getElementById('dungeonModalTitle');if(title)title.textContent=this.getDisplayName();
    this.renderHub();
    this.renderTeam();
    this.renderTiming();
    this.renderEnemies();
    this.renderLoot();
    this.renderPrimaryAction();
  }

  addEvent(text: string, className = '', dungeonId = this.dungeonSession.getOpenedDungeonId()): void {
    const session = getDungeonSession(this.gameState.getState(),dungeonId);
    session.log.unshift({ text, className });
    if (session.log.length > this.maxVisibleLogEntries) session.log.length = this.maxVisibleLogEntries;
    if (!this.dungeonSession.isOpen() || dungeonId!==this.dungeonSession.getOpenedDungeonId()) return;

    const log = document.getElementById('dungeonCombatLog');
    if (!log) return;
    const previousScrollTop = log.scrollTop;
    const previousScrollHeight = log.scrollHeight;
    if (log.dataset['placeholder'] === 'true') {
      log.innerHTML = '';
      delete log.dataset['placeholder'];
    }
    const row = document.createElement('div');
    row.className = className;
    row.textContent = text;
    log.prepend(row);
    while (log.children.length > this.maxVisibleLogEntries) log.lastElementChild?.remove();
    if (previousScrollTop > 0) {
      log.scrollTop = previousScrollTop + Math.max(0, log.scrollHeight - previousScrollHeight);
    }
  }

  private installHubMarkup(): void {
    const hub=document.querySelector('#dungeon .screen-menu');
    if(!hub)throw new Error('Dungeon-Übersicht fehlt.');
    hub.innerHTML=DUNGEON_IDS.map(id=>`<div class="menu-card menu-card-split dungeon-overview-card" data-dungeon-card="${id}"><button ${id===1?'id="dungeonOverviewOpenBtn"':''} data-open-dungeon="${id}" class="menu-card-main" type="button"><span class="menu-card-title">${getDungeonDefinition(id).displayName}</span><span class="menu-card-copy"></span></button>${id===1?'<button id="dungeonOverviewAction" hidden class="btn">Trainingslager öffnen</button>':''}</div>`).join('');
  }

  private installModalMarkup(): void {
    for (const id of ['dungeon-team', 'dungeon-expedition', 'dungeon-loot']) {
      document.getElementById(id)?.remove();
    }

    const modal = document.getElementById('dungeon-select');
    if (!modal) throw new Error('Dungeon-1-Detailseite fehlt für den Popup-Cutover.');
    modal.className = 'dungeon-modal-page';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'dungeonModalTitle');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;
    modal.innerHTML = `
      <div id="dungeonModalBackdrop" class="dungeon-modal-backdrop"></div>
      <div class="dungeon-modal-dialog">
        <div class="dungeon-modal-header">
          <div>
            <div class="ui-version">DUNGEON</div>
            <h2 id="dungeonModalTitle">${this.getDisplayName()}</h2>
          </div>
          <button id="dungeonModalCloseBtn" class="dungeon-modal-close" type="button" aria-label="Trainingslager schließen">×</button>
        </div>
        <div class="dungeon-modal-layout">
          <section class="dungeon-panel dungeon-team-panel">
            <h3>Team</h3>
            <div id="dungeonTeamCard" class="dungeon-team-region"></div>
          </section>
          <section class="dungeon-panel dungeon-time-panel">
            <div class="dungeon-section-head"><h3>Laufzeit</h3><strong id="dungeonTimeText">05:00:00</strong></div>
            <div class="bar dungeon-time-bar" role="progressbar" aria-label="Verbleibende Laufzeit im Trainingslager" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="dungeonTimeBar" style="width:100%"></i></div>
          </section>
          <section class="dungeon-panel dungeon-enemy-panel">
            <h3>Aktive Gegner</h3>
            <div id="dungeonActiveEnemies" class="dungeon-enemy-list"></div>
          </section>
          <section class="dungeon-panel dungeon-loot-panel">
            <div class="dungeon-section-head"><h3>Beute</h3><button id="dungeonCollectLootBtn" class="btn" type="button">Einsammeln</button></div>
            <div id="dungeonLoot"></div>
            <div id="dungeonLootEmpty" class="empty dungeon-compact-empty">Noch keine Beute gesammelt.</div>
          </section>
          <section class="dungeon-panel dungeon-log-panel">
            <h3>Dungeon-Protokoll</h3>
            <div id="dungeonCombatLog" class="log dungeon-live-log" data-placeholder="true"><div class="muted">Noch kein Lauf gestartet.</div></div>
          </section>
        </div>
        <div class="dungeon-modal-footer">
          <p id="dungeonPrimaryStatus" class="status-line dungeon-primary-status">Team wählen und Lauf starten.</p>
          <button id="dungeonPrimaryBtn" class="btn primary" type="button">Lauf starten</button>
        </div>
      </div>`;
  }

  private installHelpSection(): void {
    const grid = document.querySelector<HTMLElement>('#index .grid');
    if (!grid || grid.querySelector('[data-dungeon-session-help]')) return;
    const card = document.createElement('div');
    card.className = 'card span-12';
    card.dataset['dungeonSessionHelp'] = 'true';
    card.innerHTML = `
      <h2>${this.getDisplayName()} – Ablauf</h2>
      <p class="index-note">Das Trainingslager ist Dungeon 1 und wird ausschließlich über seine Karte im Dungeon-Bereich als Popup geöffnet. Jeder Dungeon hat eine eigene Karte, Gruppe, Restzeit, Beute und ein eigenes Protokoll. Mehrere Dungeons können parallel laufen. Ein Charakter kann während eines laufenden Dungeons keinem weiteren aktiven Dungeon zugeordnet werden; auch gefallene Teilnehmer bleiben bis zum Laufende reserviert. Die zuletzt gewählte Gruppe bleibt pro Dungeon gespeichert.</p>
      <div class="formula">Maximale Laufzeit: 5 Stunden · Ende: Zeitablauf oder manueller Abbruch</div>
      <p class="index-note">Schließen des Popups beendet einen laufenden Run nicht. Suche, Kämpfe, Countdown, Erfahrung, Beute und Live-Protokoll laufen innerhalb der geöffneten Spielanwendung im Hintergrund weiter. Erst ein manueller Abbruch oder das Ende der fünf Stunden beendet den Run.</p>
      <p class="index-note">Energie wird im Trainingslager derzeit weder angezeigt noch verbraucht. Charaktere und aktive Gegner werden im Dungeon-Kontext ohne HP-Zahlen dargestellt; ihr aktueller Lebensstand ist ausschließlich über Lebensbalken sichtbar.</p>
      <p class="index-note">Das Live-Protokoll zeigt die tatsächlich berechneten Kampfereignisse und bleibt beim Schließen und erneuten Öffnen desselben Runs erhalten. Beim Start eines neuen Runs beginnt das Protokoll neu.</p>`;
    grid.prepend(card);
  }

  private openModal(dungeonId = this.dungeonSession.getOpenedDungeonId()): void {
    if(!dungeonUnlocked(this.gameState.getState(),dungeonId))return;
    this.gameState.getState()['selectedDungeonId']=dungeonId;
    const modal = document.getElementById('dungeon-select');
    if (!modal) return;
    const result = this.dungeonSession.open(Date.now(),dungeonId);
    modal.dataset['dungeonId']=String(dungeonId);
    modal.hidden = false;
    modal.classList.add('dungeon-modal-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('dungeon-modal-active');
    this.openTeamPickerSlot = null;
    this.handleResult(result);
    this.renderLiveLog();
    (document.getElementById('dungeonModalCloseBtn') as HTMLButtonElement | null)?.focus();
  }

  private closeModal(): void {
    const modal = document.getElementById('dungeon-select');
    if (!modal || !this.dungeonSession.isOpen()) return;
    const result = this.dungeonSession.close(Date.now());
    modal.classList.remove('dungeon-modal-open');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;
    document.body.classList.remove('dungeon-modal-active');
    this.openTeamPickerSlot = null;
    this.handleResult(result);
    (document.getElementById('dungeonOverviewOpenBtn') as HTMLButtonElement | null)?.focus();
  }

  private renderHub(): void {
    const state = this.getState();
    const overviewAction = document.getElementById('dungeonOverviewAction') as HTMLButtonElement | null;
    for(const id of DUNGEON_IDS){
      const card=document.querySelector<HTMLElement>(`[data-dungeon-card="${id}"]`);
      const button=card?.querySelector<HTMLButtonElement>('button');
      const copy=card?.querySelector<HTMLElement>('.menu-card-copy');
      const unlocked=dungeonUnlocked(this.gameState.getState(),id);
      if(button){button.disabled=!unlocked;button.setAttribute('aria-label',`${getDungeonDefinition(id).displayName}${unlocked?' öffnen':' · gesperrt'}`);}
      if(copy)copy.textContent=!unlocked?'Gesperrt · Zugang über Mission freischalten':this.dungeonSession.isRunActive(id)?`Läuft im Hintergrund · ${this.formatDuration(this.dungeonSession.getTiming(Date.now(),id).remainingMs)} verbleibend`:'5 Stunden Laufzeit · Team, Gegner, Beute und Live-Protokoll';
    }
    if (overviewAction) {
      const lootTotal = this.getLootTotal(state);
      overviewAction.textContent = lootTotal > 0 ? 'Loot sammeln' : `${this.getDisplayName()} öffnen`;
      overviewAction.disabled = false;
      overviewAction.dataset['dungeonOverviewOwner'] = 'angular';
    }
  }

  private renderTeam(): void {
    const state = this.getState();
    const root = document.getElementById('dungeonTeamCard');
    if (!root) return;
    const characters = this.presentationCharacters(state);
    const locked = this.dungeonSession.isRunActive();
    const presentation = getDungeonTeamPresentation(
      state.session.dungeonTeamSlots,
      characters,
      locked,
      state.session.dungeonCycleActiveIds ?? [],
      locked
    );
    const slots = presentation.slots.map(slot => {
      const picker = this.teamPickerHtml(state, characters, slot.slotIndex);
      const pickerOpen = this.openTeamPickerSlot === slot.slotIndex ? ' picker-open' : '';
      if (!slot.occupied) {
        return `<div class="team-slot${pickerOpen}"><div class="team-slot-head"><strong>${slot.title}</strong></div><div class="empty">${slot.emptyText}</div><div class="actions"><button class="btn primary" data-dungeon-action="picker" data-slot="${slot.slotIndex}" ${locked ? 'disabled' : ''}>${slot.addLabel}</button></div>${picker}</div>`;
      }
      const character = characters.find(entry => entry.id === slot.characterId);
      const hpPercent = character ? this.resourcePercent(character.hp, character.maxHp) : 0;
      const fallen = slot.fallen ? `<span class="tag temp">${slot.fallenLabel}</span>` : '';
      return `<div class="team-slot${pickerOpen}"><div class="team-slot-head"><strong>${slot.title}</strong>${fallen}</div><div class="bar hp dungeon-character-hp" role="progressbar" aria-label="Leben ${character?.name ?? ''}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(hpPercent)}"><i style="width:${hpPercent}%"></i></div><div class="actions"><button class="btn" data-dungeon-action="remove" data-slot="${slot.slotIndex}" ${locked ? 'disabled' : ''}>${slot.removeLabel}</button><button class="btn" data-dungeon-action="picker" data-slot="${slot.slotIndex}" ${locked ? 'disabled' : ''}>${slot.switchLabel}</button></div>${picker}</div>`;
    }).join('');
    root.innerHTML = `<div class="team-slot-grid">${slots}</div>${locked ? '<p class="status-line">Teamzuweisung ist während eines laufenden Dungeon-Runs gesperrt.</p>' : ''}`;
  }

  private teamPickerHtml(
    state: DungeonPresentationState,
    characters: DungeonTeamPresentationCharacterLike[],
    slot: number
  ): string {
    if (this.openTeamPickerSlot !== slot) return '';
    const used = new Set(state.session.dungeonTeamSlots.filter((id, index): id is number => index !== slot && typeof id === 'number'));
    const candidates = characters.filter(character => !used.has(character.id) && characterDungeonReservation(this.gameState.getState(),character.id,state.session.dungeonId)===null);
    if (!candidates.length) return '<div class="team-slot-picker muted small">Keine weiteren Charaktere verfügbar.</div>';
    return `<div class="team-slot-picker">${candidates.map(candidate => `<div class="team-candidate"><div><strong>${candidate.name}</strong><div class="sell-meta">${candidate.className}</div></div><button class="btn smallbtn primary" data-dungeon-action="assign" data-slot="${slot}" data-character-id="${candidate.id}">Zuweisen</button></div>`).join('')}</div>`;
  }

  private renderTiming(): void {
    const text = document.getElementById('dungeonTimeText');
    const bar = document.getElementById('dungeonTimeBar') as HTMLElement | null;
    const progress = bar?.parentElement;
    if (!text || !bar || !progress) return;
    const timing = this.dungeonSession.getTiming(Date.now());
    text.textContent = this.formatDuration(timing.remainingMs);
    const percent = Math.round(timing.progress * 10000) / 100;
    bar.style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(Math.round(percent)));
  }

  private renderEnemies(): void {
    const root = document.getElementById('dungeonActiveEnemies');
    if (!root) return;
    const state = this.getState();
    const enemies = (state.session.dungeonRun?.enemies ?? []).filter(enemy => enemy.alive !== false && enemy.hp > 0);
    if (!enemies.length) {
      root.innerHTML = `<div class="empty dungeon-compact-empty">${this.dungeonSession.isRunActive() ? `${this.getDisplayName()} wird durchsucht …` : 'Keine aktiven Gegner.'}</div>`;
      return;
    }
    root.innerHTML = enemies.map(enemy => {
      const percent = this.resourcePercent(enemy.hp, enemy.maxHp);
      return `<div class="dungeon-enemy"><strong>${enemy.name}</strong><div class="bar hp" role="progressbar" aria-label="Leben ${enemy.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}"><i style="width:${percent}%"></i></div></div>`;
    }).join('');
  }

  private renderLoot(): void {
    const state = this.getState();
    const box = document.getElementById('dungeonLoot');
    const empty = document.getElementById('dungeonLootEmpty');
    const collect = document.getElementById('dungeonCollectLootBtn') as HTMLButtonElement | null;
    if (!box || !empty || !collect) return;
    const entries = getMaterialStorageEntries(state.session.dungeonLoot).filter(entry => entry.qty > 0);
    box.innerHTML = entries.map(entry => `<span class="loot-chip">${entry.displayName}<b>×${entry.qty}</b></span>`).join('');
    empty.style.display = entries.length ? 'none' : 'block';
    collect.textContent = entries.length ? `Einsammeln (${entries.reduce((sum, entry) => sum + entry.qty, 0)})` : 'Einsammeln';
    collect.disabled = !entries.length || this.dungeonSession.isRunActive();
  }

  private renderPrimaryAction(): void {
    const state = this.getState();
    const button = document.getElementById('dungeonPrimaryBtn') as HTMLButtonElement | null;
    const status = document.getElementById('dungeonPrimaryStatus');
    if (!button || !status) return;
    const selectedCount = this.getSelectedIds(state).length;
    const lootTotal = this.getLootTotal(state);
    if (this.dungeonSession.isRunActive()) {
      button.textContent = 'Lauf abbrechen';
      button.disabled = false;
      status.textContent = state.session.dungeonRun
        ? `Kampf aktiv · ${this.getAliveEnemyCount(state)} Gegner aktiv`
        : state.session.dungeonLootCollect
          ? 'Beute der aktuellen Welle wird eingesammelt …'
          : `${this.getDisplayName()} wird durchsucht …`;
      return;
    }
    button.textContent = 'Lauf starten';
    button.disabled = selectedCount <= 0 || lootTotal > 0;
    status.textContent = lootTotal > 0
      ? 'Vor einem neuen Lauf zuerst die vorhandene Beute einsammeln.'
      : selectedCount > 0
        ? `${selectedCount} von 4 Charakterplätzen belegt.`
        : 'Team wählen und Lauf starten.';
  }

  private handlePrimaryAction(): void {
    if (this.getLootTotal(this.getState()) > 0 && !this.dungeonSession.isRunActive()) return;
    if (!this.dungeonSession.isRunActive()) this.resetLiveLog(`${this.getDisplayName()} wird gestartet …`);
    this.handleResult(this.dungeonSession.toggleRun(Date.now()));
  }

  private handleCollectLoot(): void {
    if (this.dungeonSession.isRunActive()) return;
    const result = this.dungeonSession.collectLoot();
    this.handleResult(result, result.events.length > 0);
  }

  private handleOverviewAction(): void {
    const state = this.getState();
    if (this.getLootTotal(state) > 0 && !this.dungeonSession.isRunActive()) {
      const result = this.dungeonSession.collectLoot();
      this.handleResult(result, result.events.length > 0);
      return;
    }
    this.openModal();
  }

  private handleTeamClick(event: Event): void {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-dungeon-action]') : null;
    if (!target || this.dungeonSession.isRunActive()) return;
    const state = this.getState();
    const slot = Number(target.dataset['slot']);
    if (!Number.isInteger(slot) || slot < 0 || slot >= 4) return;
    const action = target.dataset['dungeonAction'];
    if (action === 'picker') {
      this.openTeamPickerSlot = this.openTeamPickerSlot === slot ? null : slot;
      this.renderTeam();
      return;
    }
    if (action === 'remove') {
      if(!assignDungeonCharacter(this.gameState.getState() as MutableGameState & {characters:Array<{id:number}>},state.session.dungeonId,slot,null))return;
      state.session.dungeonCycleOriginalIds = [];
      state.session.dungeonCycleActiveIds = [];
      this.openTeamPickerSlot = null;
      this.handleResult({ events: [], saveRequested: true });
      return;
    }
    if (action === 'assign') {
      const characterId = Number(target.dataset['characterId']);
      if (!state.characters.some(character => character.id === characterId)) return;
      if (state.session.dungeonTeamSlots.some((id, index) => index !== slot && id === characterId)) return;
      if(!assignDungeonCharacter(this.gameState.getState() as MutableGameState & {characters:Array<{id:number}>},state.session.dungeonId,slot,characterId))return;
      state.session.dungeonCycleOriginalIds = [];
      state.session.dungeonCycleActiveIds = [];
      this.openTeamPickerSlot = null;
      this.handleResult({ events: [], saveRequested: true });
    }
  }

  private handleResult(result: DungeonActionResult, inventoryChanged = false): void {
    this.actionHandler?.(result, inventoryChanged);
    this.render();
  }

  private resetLiveLog(message: string): void {
    this.liveLogEntries = [];
    this.liveLogPlaceholder = message;
    this.renderLiveLog();
  }

  private renderLiveLog(): void {
    const log = document.getElementById('dungeonCombatLog');
    if (!log) return;
    if (!this.liveLogEntries.length) {
      log.dataset['placeholder'] = 'true';
      log.innerHTML = '';
      const row = document.createElement('div');
      row.className = 'muted';
      row.textContent = this.liveLogPlaceholder;
      log.appendChild(row);
      return;
    }

    delete log.dataset['placeholder'];
    log.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (const entry of this.liveLogEntries) {
      const row = document.createElement('div');
      row.className = entry.className;
      row.textContent = entry.text;
      fragment.appendChild(row);
    }
    log.appendChild(fragment);
  }

  private presentationCharacters(state: DungeonPresentationState): DungeonTeamPresentationCharacterLike[] {
    return state.characters.map(character => ({
      id: character.id,
      name: character.name,
      hp: character.hp,
      maxHp: character.maxHp,
      energy: character.energy,
      maxEnergy: character.maxEnergy,
      className: CHARACTER_CLASSES[(character.classId as CharacterClassId) || 'recruit']?.name ?? CHARACTER_CLASSES.recruit.name
    }));
  }

  private getSelectedIds(state: DungeonPresentationState): number[] {
    return state.session.dungeonTeamSlots.filter((id): id is number => typeof id === 'number' && id > 0);
  }

  private getLootTotal(state: DungeonPresentationState): number {
    return getMaterialStorageEntries(state.session.dungeonLoot).reduce((sum, entry) => sum + entry.qty, 0);
  }

  private getAliveEnemyCount(state: DungeonPresentationState): number {
    return (state.session.dungeonRun?.enemies ?? []).filter(enemy => enemy.alive !== false && enemy.hp > 0).length;
  }

  private getDisplayName(): string {
    const displayName = getDungeonDefinition(this.dungeonSession.getOpenedDungeonId()).displayName;
    return displayName || 'Trainingslager';
  }

  private resourcePercent(value: number, maximum: number): number {
    const max = Math.max(0.0001, Number(maximum) || 0.0001);
    return Math.max(0, Math.min(100, (Math.max(0, Number(value) || 0) / max) * 100));
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(Number(ms) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  }

  private getState(): DungeonPresentationState {
    const root=this.gameState.getState();
    return {characters:root['characters'],session:getDungeonSession(root,this.dungeonSession.getOpenedDungeonId())} as DungeonPresentationState;
  }
}

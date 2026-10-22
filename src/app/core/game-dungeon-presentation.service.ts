import { Injectable } from '@angular/core';
import { CHARACTER_CLASSES, type CharacterClassId } from '../game/game-core';
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
  dungeonAuto: boolean;
  dungeonRun: { participantIds: number[]; enemies: DungeonPresentationEnemy[] } | null;
  dungeonSearch: { nextCheckAt: number } | null;
  dungeonLootCollect: { enemyCount: number } | null;
  dungeonLoot: MaterialStorageInventory;
  dungeonTeamSlots: Array<number | null>;
  dungeonCycleOriginalIds: number[];
  dungeonCycleActiveIds: number[];
  dungeonWavesDefeated: number;
}

@Injectable({ providedIn: 'root' })
export class GameDungeonPresentationService {
  private openTeamPickerSlot: number | null = null;
  private actionsBound = false;
  private actionHandler: ((result: DungeonActionResult, inventoryChanged: boolean) => void) | null = null;
  private readonly maxVisibleLogEntries = 1000;

  constructor(
    private readonly gameState: GameStateService,
    private readonly dungeonSession: GameDungeonSessionService
  ) {}

  bindActions(handler: (result: DungeonActionResult, inventoryChanged: boolean) => void): void {
    this.actionHandler = handler;
    if (this.actionsBound) return;

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
      throw new Error('Angular-Dungeon-Präsentation konnte die Dungeon-1-Popup-Bedienelemente nicht finden.');
    }

    openButton.removeAttribute('onclick');
    openButton.addEventListener('click', () => this.openModal());

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
    this.renderHub();
    this.renderTeam();
    this.renderTiming();
    this.renderEnemies();
    this.renderLoot();
    this.renderPrimaryAction();
  }

  addEvent(text: string, className = ''): void {
    if (!this.dungeonSession.isOpen()) return;
    const log = document.getElementById('dungeonCombatLog');
    if (!log) return;
    if (log.dataset['placeholder'] === 'true') {
      log.innerHTML = '';
      delete log.dataset['placeholder'];
    }
    const row = document.createElement('div');
    row.className = className;
    row.textContent = text;
    log.prepend(row);
    while (log.children.length > this.maxVisibleLogEntries) log.lastElementChild?.remove();
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
            <h2 id="dungeonModalTitle">Dungeon 1</h2>
          </div>
          <button id="dungeonModalCloseBtn" class="dungeon-modal-close" type="button" aria-label="Dungeon schließen">×</button>
        </div>
        <p class="screen-intro dungeon-modal-intro">Bis zu vier Charaktere auswählen. Ein Lauf endet nach maximal 5 Stunden oder durch manuellen Abbruch.</p>
        <div class="dungeon-modal-layout">
          <div class="dungeon-modal-column">
            <section class="dungeon-panel">
              <h3>Team</h3>
              <div id="dungeonTeamCard" class="dungeon-team-region"></div>
            </section>
            <section class="dungeon-panel">
              <div class="dungeon-section-head"><h3>Laufzeit</h3><strong id="dungeonTimeText">05:00:00</strong></div>
              <div class="bar dungeon-time-bar" role="progressbar" aria-label="Verbleibende Dungeon-Laufzeit" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="dungeonTimeBar" style="width:100%"></i></div>
            </section>
            <section class="dungeon-panel dungeon-loot-panel">
              <div class="dungeon-section-head"><h3>Beute</h3><button id="dungeonCollectLootBtn" class="btn" type="button">Einsammeln</button></div>
              <div id="dungeonLoot"></div>
              <div id="dungeonLootEmpty" class="empty dungeon-compact-empty">Noch keine Beute gesammelt.</div>
            </section>
          </div>
          <div class="dungeon-modal-column dungeon-live-column">
            <section class="dungeon-panel">
              <h3>Aktive Gegner</h3>
              <div id="dungeonActiveEnemies" class="dungeon-enemy-list"></div>
            </section>
            <section class="dungeon-panel dungeon-log-panel">
              <h3>Dungeon-1-Protokoll</h3>
              <div id="dungeonCombatLog" class="log dungeon-live-log" data-placeholder="true"><div class="muted">Noch kein Lauf gestartet.</div></div>
            </section>
          </div>
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
      <h2>Dungeon 1 – Ablauf</h2>
      <p class="index-note">Dungeon 1 wird ausschließlich über die Dungeon-1-Karte als Popup geöffnet. Die zuletzt gewählte Gruppe bleibt gespeichert und wird beim nächsten Öffnen wiederverwendet.</p>
      <div class="formula">Maximale Laufzeit: 5 Stunden · Ende: Zeitablauf oder manueller Abbruch</div>
      <p class="index-note">Energie wird in Dungeon 1 derzeit weder angezeigt noch verbraucht. Schließen des Popups beendet den aktuellen Lauf sofort; Gegner, Countdown und Live-Protokoll beginnen beim nächsten Öffnen wieder neu. Bereits vollständig eingesammelte Dungeon-Beute bleibt erhalten.</p>
      <p class="index-note">Das Live-Protokoll zeigt die tatsächlich berechneten Kampfereignisse wie Angriffe, Fehlschläge, Ausweichen, verursachten Schaden, verbleibende HP und besiegte Ziele. Aktive Gegner werden mit Name und Lebensbalken angezeigt.</p>`;
    grid.prepend(card);
  }

  private openModal(): void {
    const modal = document.getElementById('dungeon-select');
    if (!modal) return;
    const result = this.dungeonSession.open(Date.now());
    modal.hidden = false;
    modal.classList.add('dungeon-modal-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('dungeon-modal-active');
    this.openTeamPickerSlot = null;
    this.clearLiveLog('Noch kein Lauf gestartet.');
    this.handleResult(result);
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
    this.clearLiveLog('Noch kein Lauf gestartet.');
    this.handleResult(result);
    (document.getElementById('dungeonOverviewOpenBtn') as HTMLButtonElement | null)?.focus();
  }

  private renderHub(): void {
    const state = this.getState();
    const overviewAction = document.getElementById('dungeonOverviewAction') as HTMLButtonElement | null;
    if (overviewAction) {
      const lootTotal = this.getLootTotal(state);
      overviewAction.textContent = lootTotal > 0 ? 'Loot sammeln' : 'Dungeon 1 öffnen';
      overviewAction.disabled = false;
      overviewAction.dataset['dungeonOverviewOwner'] = 'angular';
    }
    const copy = document.querySelector<HTMLElement>('.dungeon-overview-card .menu-card-copy');
    if (copy) copy.textContent = '5 Stunden Laufzeit · Team, Gegner und Kampfprotokoll im Popup';
  }

  private renderTeam(): void {
    const state = this.getState();
    const root = document.getElementById('dungeonTeamCard');
    if (!root) return;
    const characters = this.presentationCharacters(state);
    const locked = this.dungeonSession.isRunActive();
    const presentation = getDungeonTeamPresentation(
      state.dungeonTeamSlots,
      characters,
      locked,
      state.dungeonCycleActiveIds ?? [],
      locked
    );
    const slots = presentation.slots.map(slot => {
      const picker = this.teamPickerHtml(state, characters, slot.slotIndex);
      const pickerOpen = this.openTeamPickerSlot === slot.slotIndex ? ' picker-open' : '';
      if (!slot.occupied) {
        return `<div class="team-slot${pickerOpen}"><div class="team-slot-head"><strong>${slot.title}</strong></div><div class="empty">${slot.emptyText}</div><div class="actions"><button class="btn primary" data-dungeon-action="picker" data-slot="${slot.slotIndex}" ${locked ? 'disabled' : ''}>${slot.addLabel}</button></div>${picker}</div>`;
      }
      const fallen = slot.fallen ? `<span class="tag temp">${slot.fallenLabel}</span>` : '';
      return `<div class="team-slot${pickerOpen}"><div class="team-slot-head"><strong>${slot.title}</strong>${fallen}</div><div class="statrow dungeon-character-stats"><div class="stat"><span>HP</span><b>${slot.hpValue}</b></div></div><div class="actions"><button class="btn" data-dungeon-action="remove" data-slot="${slot.slotIndex}" ${locked ? 'disabled' : ''}>${slot.removeLabel}</button><button class="btn" data-dungeon-action="picker" data-slot="${slot.slotIndex}" ${locked ? 'disabled' : ''}>${slot.switchLabel}</button></div>${picker}</div>`;
    }).join('');
    root.innerHTML = `<div class="team-slot-grid">${slots}</div>${locked ? '<p class="status-line">Teamzuweisung ist während eines laufenden Dungeon-Runs gesperrt.</p>' : ''}`;
  }

  private teamPickerHtml(
    state: DungeonPresentationState,
    characters: DungeonTeamPresentationCharacterLike[],
    slot: number
  ): string {
    if (this.openTeamPickerSlot !== slot) return '';
    const used = new Set(state.dungeonTeamSlots.filter((id, index): id is number => index !== slot && typeof id === 'number'));
    const candidates = characters.filter(character => !used.has(character.id));
    if (!candidates.length) return '<div class="team-slot-picker muted small">Keine weiteren Charaktere verfügbar.</div>';
    return `<div class="team-slot-picker">${candidates.map(candidate => `<div class="team-candidate"><div><strong>${candidate.name}</strong><div class="sell-meta">${candidate.className} · HP ${this.formatNumber(candidate.hp)}</div></div><button class="btn smallbtn primary" data-dungeon-action="assign" data-slot="${slot}" data-character-id="${candidate.id}">Zuweisen</button></div>`).join('')}</div>`;
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
    const enemies = (state.dungeonRun?.enemies ?? []).filter(enemy => enemy.alive !== false && enemy.hp > 0);
    if (!enemies.length) {
      root.innerHTML = `<div class="empty dungeon-compact-empty">${this.dungeonSession.isRunActive() ? 'Dungeon wird durchsucht …' : 'Keine aktiven Gegner.'}</div>`;
      return;
    }
    root.innerHTML = enemies.map(enemy => {
      const maxHp = Math.max(0.0001, Number(enemy.maxHp) || 0.0001);
      const hp = Math.max(0, Number(enemy.hp) || 0);
      const percent = Math.max(0, Math.min(100, hp / maxHp * 100));
      return `<div class="dungeon-enemy"><div class="dungeon-section-head"><strong>${enemy.name}</strong><span>${hp.toFixed(1)} / ${maxHp.toFixed(1)} HP</span></div><div class="bar hp" role="progressbar" aria-label="Leben ${enemy.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}"><i style="width:${percent}%"></i></div></div>`;
    }).join('');
  }

  private renderLoot(): void {
    const state = this.getState();
    const box = document.getElementById('dungeonLoot');
    const empty = document.getElementById('dungeonLootEmpty');
    const collect = document.getElementById('dungeonCollectLootBtn') as HTMLButtonElement | null;
    if (!box || !empty || !collect) return;
    const entries = getMaterialStorageEntries(state.dungeonLoot).filter(entry => entry.qty > 0);
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
      status.textContent = state.dungeonRun
        ? `Kampf aktiv · ${this.getAliveEnemyCount(state)} Gegner aktiv`
        : state.dungeonLootCollect
          ? 'Beute der aktuellen Welle wird eingesammelt …'
          : 'Dungeon wird durchsucht …';
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
    this.handleResult(this.dungeonSession.toggleRun(Date.now()));
  }

  private handleCollectLoot(): void {
    if (this.dungeonSession.isRunActive()) return;
    const result = this.dungeonSession.collectLoot();
    this.handleResult(result, result.events.length > 0);
  }

  private handleOverviewAction(): void {
    const state = this.getState();
    if (this.getLootTotal(state) > 0) {
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
      state.dungeonTeamSlots[slot] = null;
      state.dungeonCycleOriginalIds = [];
      state.dungeonCycleActiveIds = [];
      this.openTeamPickerSlot = null;
      this.handleResult({ events: [], saveRequested: true });
      return;
    }
    if (action === 'assign') {
      const characterId = Number(target.dataset['characterId']);
      if (!state.characters.some(character => character.id === characterId)) return;
      if (state.dungeonTeamSlots.some((id, index) => index !== slot && id === characterId)) return;
      state.dungeonTeamSlots[slot] = characterId;
      state.dungeonCycleOriginalIds = [];
      state.dungeonCycleActiveIds = [];
      this.openTeamPickerSlot = null;
      this.handleResult({ events: [], saveRequested: true });
    }
  }

  private handleResult(result: DungeonActionResult, inventoryChanged = false): void {
    this.actionHandler?.(result, inventoryChanged);
    this.render();
  }

  private clearLiveLog(message: string): void {
    const log = document.getElementById('dungeonCombatLog');
    if (!log) return;
    log.dataset['placeholder'] = 'true';
    log.innerHTML = `<div class="muted">${message}</div>`;
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
    return state.dungeonTeamSlots.filter((id): id is number => typeof id === 'number' && id > 0);
  }

  private getLootTotal(state: DungeonPresentationState): number {
    return getMaterialStorageEntries(state.dungeonLoot).reduce((sum, entry) => sum + entry.qty, 0);
  }

  private getAliveEnemyCount(state: DungeonPresentationState): number {
    return (state.dungeonRun?.enemies ?? []).filter(enemy => enemy.alive !== false && enemy.hp > 0).length;
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(Number(ms) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  }

  private formatNumber(value: number): string {
    return Number(value).toFixed(1).replace(/\.0$/, '');
  }

  private getState(): DungeonPresentationState {
    return this.gameState.getState<DungeonPresentationState>();
  }
}

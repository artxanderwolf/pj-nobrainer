import { Injectable } from '@angular/core';
import { CHARACTER_CLASSES, CONFIG, type CharacterClassId } from '../game/game-core';
import { getDungeonLootPresentation, getDungeonStatusPresentation } from '../game/dungeon-presentation-core';
import { getMaterialStorageEntries, type MaterialStorageInventory } from '../game/material-storage-core';
import {
  getDungeonTeamPickerPresentation,
  getDungeonTeamPresentation,
  type DungeonTeamPresentationCharacterLike
} from '../game/character-presentation-core';
import { GameDungeonService, type DungeonActionResult } from './game-dungeon.service';
import { GameEnergyService } from './game-energy.service';
import { GameStateService, type MutableGameState } from './game-state.service';

interface DungeonPresentationCharacter extends DungeonTeamPresentationCharacterLike { classId?: string | null; }
interface DungeonPresentationState extends MutableGameState {
  characters: DungeonPresentationCharacter[];
  dungeonAuto: boolean;
  dungeonStopRequested?: boolean;
  dungeonRun: { participantIds: number[]; energyShare: number; enemies: Array<{ name: string; hp: number; maxHp: number; alive?: boolean }> } | null;
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

  constructor(
    private readonly gameState: GameStateService,
    private readonly gameDungeon: GameDungeonService,
    private readonly gameEnergy: GameEnergyService
  ) {}

  bindActions(handler: (result: DungeonActionResult, inventoryChanged: boolean) => void): void {
    this.actionHandler = handler;
    if (this.actionsBound) return;

    const primaryButton = document.getElementById('dungeonPrimaryBtn');
    const primaryTeamCard = document.getElementById('dungeonTeamCard');
    const overviewAction = document.getElementById('dungeonOverviewAction');
    if (!primaryButton || !primaryTeamCard || !overviewAction) {
      throw new Error('Angular-Dungeon-Präsentation konnte die Dungeon-1-Bedienelemente nicht finden.');
    }

    primaryButton.addEventListener('click', () => this.handlePrimaryAction());
    primaryTeamCard.addEventListener('click', event => this.handleTeamClick(event));
    overviewAction.addEventListener('click', () => this.handleOverviewAction());

    const legacyAutoButton = document.getElementById('autoDungeonBtn');
    const legacyCollectButton = document.getElementById('collectLootBtn');
    const legacyTeamCard = document.getElementById('teamCard');
    if (legacyAutoButton) {
      legacyAutoButton.removeAttribute('onclick');
      legacyAutoButton.addEventListener('click', () => this.handleResult(this.gameDungeon.toggleAuto(Date.now())));
    }
    if (legacyCollectButton) {
      legacyCollectButton.removeAttribute('onclick');
      legacyCollectButton.addEventListener('click', () => {
        const result = this.gameDungeon.collectLoot();
        this.handleResult(result, result.events.length > 0);
      });
    }
    if (legacyTeamCard) legacyTeamCard.addEventListener('click', event => this.handleTeamClick(event));

    this.actionsBound = true;
  }

  render(): void {
    this.renderOverview();
    this.renderOverviewAction();
    this.renderStatus();
    this.renderLoot();
    this.renderTeamInto('dungeonTeamCard');
    this.renderTeamInto('teamCard');
    this.renderPrimaryAction();
  }

  private renderOverview(): void {
    const state = this.getState();
    const displayedCount = state.dungeonRun?.participantIds?.length || this.getSelectedIds(state).length;
    const enemyHp = document.getElementById('enemyHp');
    const enemyArmor = document.getElementById('enemyArmor');
    const enemyDamage = document.getElementById('enemyDamage');
    const energyCost = document.getElementById('energyCost');

    if (enemyHp) enemyHp.textContent = `${CONFIG.dungeon.enemyBase.damage} Basis-SCH`;
    if (enemyArmor) enemyArmor.textContent = `${Math.round(CONFIG.dungeon.enemyBase.hitChance * 100)} % Basis-TRF`;
    if (enemyDamage) enemyDamage.textContent = `${CONFIG.dungeon.enemyBase.speed.toFixed(2)} Basis-GES`;
    if (energyCost) {
      const share = this.gameEnergy.costPerCharacter(displayedCount);
      energyCost.textContent = displayedCount ? `${share} je Char. (${share * displayedCount} gesamt)` : '–';
    }
  }

  private renderOverviewAction(): void {
    const state = this.getState();
    const button = document.getElementById('dungeonOverviewAction') as HTMLButtonElement | null;
    if (!button) return;

    button.dataset['dungeonOverviewOwner'] = 'angular';
    const sessionBusy = Boolean(
      state.dungeonAuto || state.dungeonRun || state.dungeonSearch || state.dungeonLootCollect || state.dungeonStopRequested
    );

    if (sessionBusy) {
      button.textContent = 'Läuft';
      button.disabled = true;
      return;
    }

    if (this.getLootTotal(state) > 0) {
      button.textContent = 'Loot sammeln';
      button.disabled = false;
      return;
    }

    button.textContent = 'Lauf starten';
    button.disabled = false;
  }

  private renderStatus(): void {
    const state = this.getState();
    const box = document.getElementById('dungeonRunCard');
    const autoButton = document.getElementById('autoDungeonBtn') as HTMLButtonElement | null;
    const collectButton = document.getElementById('collectLootBtn') as HTMLButtonElement | null;
    const waveCounter = document.getElementById('runDuration');
    if (waveCounter) waveCounter.textContent = `${this.gameDungeon.getSessionWaveCount()} besiegt`;
    if (!box || !autoButton || !collectButton) return;

    const presentation = getDungeonStatusPresentation({
      auto: Boolean(state.dungeonAuto),
      selectedCharacterCount: this.getSelectedIds(state).length,
      run: state.dungeonRun,
      lootCollect: state.dungeonLootCollect,
      lootTotal: this.getLootTotal(state)
    });
    autoButton.textContent = presentation.autoButtonText;
    autoButton.disabled = presentation.autoButtonDisabled;
    collectButton.textContent = presentation.collectButtonText;
    collectButton.disabled = presentation.collectButtonDisabled;
    const card = presentation.card;
    box.className = card.className;
    if (card.mode === 'active') {
      box.innerHTML = `<strong>${card.title}</strong><p>${card.aliveText}</p><p class="muted small">${card.metaText}</p><div class="statrow">${card.enemies.map(enemy => `<div class="stat"><span>${enemy.name}</span><b>${enemy.hpText}</b></div>`).join('')}</div>`;
      return;
    }
    if (card.mode === 'collecting' || card.mode === 'searching') {
      box.innerHTML = `<strong>${card.title}</strong><br><span class="small">${card.detailText}</span>`;
      return;
    }
    if (card.mode === 'idle') box.textContent = card.text;
  }

  private renderLoot(): void {
    const state = this.getState();
    const box = document.getElementById('dungeonLoot');
    const empty = document.getElementById('dungeonLootEmpty');
    if (!box || !empty) return;
    const presentation = getDungeonLootPresentation(
      getMaterialStorageEntries(state.dungeonLoot).map(entry => ({ name: entry.displayName, qty: entry.qty }))
    );
    box.innerHTML = '';
    empty.style.display = presentation.empty ? 'block' : 'none';
    if (presentation.empty) return;
    const grid = document.createElement('div');
    grid.className = 'loot-grid';
    for (const entry of presentation.entries) {
      const chip = document.createElement('div');
      chip.className = 'loot-chip';
      chip.innerHTML = `${entry.name}<b>${entry.quantityText}</b>`;
      grid.appendChild(chip);
    }
    box.appendChild(grid);
  }

  private renderPrimaryAction(): void {
    const state = this.getState();
    const button = document.getElementById('dungeonPrimaryBtn') as HTMLButtonElement | null;
    const status = document.getElementById('dungeonPrimaryStatus');
    if (!button || !status) return;

    const selectedCount = this.getSelectedIds(state).length;
    const lootTotal = this.getLootTotal(state);
    const sessionBusy = Boolean(
      state.dungeonAuto || state.dungeonRun || state.dungeonSearch || state.dungeonLootCollect || state.dungeonStopRequested
    );

    if (state.dungeonStopRequested) {
      button.textContent = 'Abbruch läuft …';
      button.disabled = true;
      status.textContent = state.dungeonRun
        ? 'Abbruch angefordert. Die aktuelle Welle wird noch beendet.'
        : 'Abbruch angefordert. Die aktuelle Beute wird noch eingesammelt.';
      return;
    }

    if (sessionBusy) {
      button.textContent = 'Lauf abbrechen';
      button.disabled = false;
      if (state.dungeonRun) status.textContent = `Welle aktiv · ${this.gameDungeon.getSessionWaveCount()} besiegt`;
      else if (state.dungeonLootCollect) status.textContent = 'Beute der aktuellen Welle wird eingesammelt …';
      else status.textContent = `Dungeon wird durchsucht · ${this.gameDungeon.getSessionWaveCount()} besiegt`;
      return;
    }

    if (lootTotal > 0) {
      button.textContent = `Beute einsammeln (${lootTotal})`;
      button.disabled = false;
      status.textContent = `${lootTotal} Beute liegt zum Einsammeln bereit.`;
      return;
    }

    button.textContent = 'Lauf starten';
    button.disabled = selectedCount <= 0;
    status.textContent = selectedCount > 0
      ? `${selectedCount} von 4 Charakterplätzen belegt.`
      : 'Team wählen und Lauf starten.';
  }

  private renderTeamInto(rootId: string): void {
    const state = this.getState();
    const root = document.getElementById(rootId);
    if (!root) return;
    const characters = this.presentationCharacters(state);
    const locked = Boolean(
      state.dungeonRun || state.dungeonAuto || state.dungeonSearch || state.dungeonLootCollect || state.dungeonStopRequested
    );
    const cycleActive = Boolean(
      state.dungeonAuto || state.dungeonRun || state.dungeonSearch || state.dungeonLootCollect ||
      state.dungeonStopRequested || state.dungeonCycleOriginalIds?.length
    );
    const presentation = getDungeonTeamPresentation(
      state.dungeonTeamSlots,
      characters,
      locked,
      state.dungeonCycleActiveIds ?? [],
      cycleActive
    );
    const slots = presentation.slots.map(slot => {
      const picker = this.teamPickerHtml(state, characters, slot.slotIndex);
      const pickerOpen = this.openTeamPickerSlot === slot.slotIndex ? ' picker-open' : '';
      if (!slot.occupied) {
        return `<div class="team-slot${pickerOpen}"><div class="team-slot-head"><strong>${slot.title}</strong></div><div class="empty">${slot.emptyText}</div><div class="actions"><button class="btn primary" data-dungeon-action="picker" data-slot="${slot.slotIndex}" ${presentation.locked ? 'disabled' : ''}>${slot.addLabel}</button></div>${picker}</div>`;
      }
      const fallen = slot.fallen ? `<span class="tag temp">${slot.fallenLabel}</span>` : '';
      return `<div class="team-slot${pickerOpen}"><div class="team-slot-head"><strong>${slot.title}</strong>${fallen}</div><div class="statrow"><div class="stat"><span>HP</span><b>${slot.hpValue}</b></div><div class="stat"><span>EN</span><b>${slot.energyValue}</b></div></div><div class="actions"><button class="btn" data-dungeon-action="remove" data-slot="${slot.slotIndex}" ${presentation.locked ? 'disabled' : ''}>${slot.removeLabel}</button><button class="btn" data-dungeon-action="picker" data-slot="${slot.slotIndex}" ${presentation.locked ? 'disabled' : ''}>${slot.switchLabel}</button></div>${picker}</div>`;
    }).join('');
    root.innerHTML = `<div class="team-slot-grid">${slots}</div>${presentation.locked ? `<p class="status-line">${presentation.lockedText}</p>` : ''}`;
  }

  private teamPickerHtml(
    state: DungeonPresentationState,
    characters: DungeonTeamPresentationCharacterLike[],
    slot: number
  ): string {
    const presentation = getDungeonTeamPickerPresentation(state.dungeonTeamSlots, characters, slot, this.openTeamPickerSlot);
    if (!presentation.open) return '';
    if (!presentation.candidates.length) return `<div class="team-slot-picker muted small">${presentation.emptyText}</div>`;
    return `<div class="team-slot-picker">${presentation.candidates.map(candidate => `<div class="team-candidate"><div><strong>${candidate.name}</strong><div class="sell-meta">${candidate.meta}</div></div><button class="btn smallbtn primary" data-dungeon-action="assign" data-slot="${slot}" data-character-id="${candidate.id}">${candidate.assignLabel}</button></div>`).join('')}</div>`;
  }

  private handleOverviewAction(): void {
    const state = this.getState();
    const sessionBusy = Boolean(
      state.dungeonAuto || state.dungeonRun || state.dungeonSearch || state.dungeonLootCollect || state.dungeonStopRequested
    );
    if (sessionBusy) return;

    if (this.getLootTotal(state) > 0) {
      const result = this.gameDungeon.collectLoot();
      this.handleResult(result, result.events.length > 0);
      return;
    }

    if (this.getSelectedIds(state).length <= 0) {
      (document.getElementById('dungeonOverviewOpenBtn') as HTMLButtonElement | null)?.click();
      return;
    }

    this.handleResult(this.gameDungeon.toggleAuto(Date.now()));
  }

  private handlePrimaryAction(): void {
    const state = this.getState();
    if (state.dungeonStopRequested) return;
    const sessionBusy = Boolean(state.dungeonAuto || state.dungeonRun || state.dungeonSearch || state.dungeonLootCollect);
    if (sessionBusy) {
      this.handleResult(this.gameDungeon.toggleAuto(Date.now()));
      return;
    }
    if (this.getLootTotal(state) > 0) {
      const result = this.gameDungeon.collectLoot();
      this.handleResult(result, result.events.length > 0);
      return;
    }
    this.handleResult(this.gameDungeon.toggleAuto(Date.now()));
  }

  private handleTeamClick(event: Event): void {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-dungeon-action]') : null;
    if (!target) return;
    const state = this.getState();
    if (state.dungeonRun || state.dungeonAuto || state.dungeonSearch || state.dungeonLootCollect || state.dungeonStopRequested) return;
    const slot = Number(target.dataset['slot']);
    if (!Number.isInteger(slot) || slot < 0 || slot >= 4) return;
    const action = target.dataset['dungeonAction'];
    if (action === 'picker') {
      this.openTeamPickerSlot = this.openTeamPickerSlot === slot ? null : slot;
      this.renderTeamInto('dungeonTeamCard');
      this.renderTeamInto('teamCard');
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

  private getState(): DungeonPresentationState {
    return this.gameState.getState<DungeonPresentationState>();
  }
}
import { Injectable } from '@angular/core';
import {
  getDungeonTeamPickerPresentation,
  getDungeonTeamPresentation,
  type DungeonTeamPresentationCharacterLike
} from '../game/character-presentation-core';
import { getEnergyCostPerCharacter } from '../game/dungeon-core';
import {
  getDungeonLootPresentation,
  getDungeonStatusPresentation,
  type DungeonPresentationLootCollectLike,
  type DungeonPresentationRunLike
} from '../game/dungeon-presentation-core';
import { CHARACTER_CLASSES, CONFIG, type CharacterClassId } from '../game/game-core';
import { GameDungeonService, type DungeonActionResult } from './game-dungeon.service';
import { GameStateService, type MutableGameState } from './game-state.service';

interface RuntimeDungeonPresentationCharacter extends DungeonTeamPresentationCharacterLike {
  classId?: string | null;
}

interface RuntimeDungeonLootEntry {
  qty: number;
}

type RuntimeDungeonPresentationState = MutableGameState & {
  characters: RuntimeDungeonPresentationCharacter[];
  dungeonAuto: boolean;
  dungeonRun: DungeonPresentationRunLike | null;
  dungeonLootCollect: DungeonPresentationLootCollectLike | null;
  dungeonLoot: Record<string, RuntimeDungeonLootEntry | undefined>;
  dungeonTeamSlots: Array<number | null>;
  dungeonCycleOriginalIds: number[];
  dungeonCycleActiveIds: number[];
};

interface LegacyDungeonPresentationCompatibilityBridge {
  renderStatus(): void;
  renderLoot(): void;
  renderTeam(): void;
}

declare global {
  interface Window {
    NoBrainerDungeonPresentationCompatibility?: LegacyDungeonPresentationCompatibilityBridge;
  }
}

type DungeonActionResultHandler = (result: DungeonActionResult) => void;

type DungeonUiAction =
  | 'toggle-auto'
  | 'collect-loot'
  | 'toggle-team-picker'
  | 'assign-team-character'
  | 'remove-team-character';

@Injectable({ providedIn: 'root' })
export class GameDungeonPresentationService {
  private host: HTMLElement | null = null;
  private actionResultHandler: DungeonActionResultHandler | null = null;
  private openTeamPickerSlot: number | null = null;
  private readonly clickHandler = (event: Event) => this.handleClick(event);

  constructor(
    private readonly gameState: GameStateService,
    private readonly gameDungeon: GameDungeonService
  ) {}

  attach(host: HTMLElement, actionResultHandler: DungeonActionResultHandler): void {
    if (this.host === host && this.actionResultHandler === actionResultHandler) return;
    this.detach();
    this.host = host;
    this.actionResultHandler = actionResultHandler;
    host.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    if (this.host) this.host.removeEventListener('click', this.clickHandler);
    this.host = null;
    this.actionResultHandler = null;
    this.openTeamPickerSlot = null;
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerDungeonPresentationCompatibility) {
      throw new Error('NoBrainer-Dungeon-Präsentationsbrücke ist bereits geöffnet.');
    }

    window.NoBrainerDungeonPresentationCompatibility = {
      renderStatus: () => this.renderStatus(),
      renderLoot: () => this.renderLoot(),
      renderTeam: () => this.renderTeam()
    };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerDungeonPresentationCompatibility;
  }

  renderAll(): void {
    this.renderStatus();
    this.renderLoot();
    this.renderTeam();
  }

  renderStatus(): void {
    const state = this.getState();
    const selectedIds = this.getSelectedDungeonIds(state);
    const displayedCount = state.dungeonRun?.participantIds?.length || selectedIds.length;
    const energyShare = getEnergyCostPerCharacter(displayedCount);

    this.setText('enemyHp', `${CONFIG.dungeon.enemyBase.damage} Basis-SCH`);
    this.setText('enemyArmor', `${Math.round(CONFIG.dungeon.enemyBase.hitChance * 100)} % Basis-TRF`);
    this.setText('enemyDamage', `${CONFIG.dungeon.enemyBase.speed.toFixed(2)} Basis-GES`);
    this.setText(
      'energyCost',
      displayedCount ? `${energyShare} je Char. (${energyShare * displayedCount} gesamt)` : '–'
    );
    this.setText('runDuration', `${this.gameDungeon.getSessionWaveCount()} besiegt`);

    const box = this.getElement<HTMLElement>('dungeonRunCard');
    const autoButton = this.getElement<HTMLButtonElement>('autoDungeonBtn');
    const collectButton = this.getElement<HTMLButtonElement>('collectLootBtn');
    if (!box || !autoButton || !collectButton) return;

    const presentation = getDungeonStatusPresentation({
      auto: Boolean(state.dungeonAuto),
      selectedCharacterCount: selectedIds.length,
      run: state.dungeonRun ?? null,
      lootCollect: state.dungeonLootCollect ?? null,
      lootTotal: Object.values(state.dungeonLoot ?? {}).reduce(
        (sum, entry) => sum + (Number(entry?.qty) || 0),
        0
      )
    });

    autoButton.textContent = presentation.autoButtonText;
    autoButton.disabled = presentation.autoButtonDisabled;
    collectButton.textContent = presentation.collectButtonText;
    collectButton.disabled = presentation.collectButtonDisabled;

    const card = presentation.card;
    box.className = card.className;
    if (card.mode === 'active') {
      box.innerHTML =
        `<strong>${card.title}</strong>` +
        `<p>${card.aliveText}</p>` +
        `<p class="muted small">${card.metaText}</p>` +
        `<div class="statrow">${card.enemies
          .map(enemy => `<div class="stat"><span>${enemy.name}</span><b>${enemy.hpText}</b></div>`)
          .join('')}</div>`;
      return;
    }

    if (card.mode === 'collecting' || card.mode === 'searching') {
      box.innerHTML = `<strong>${card.title}</strong><br><span class="small">${card.detailText}</span>`;
      return;
    }

    if (card.mode === 'idle') box.innerHTML = card.text;
  }

  renderLoot(): void {
    const state = this.getState();
    const box = this.getElement<HTMLElement>('dungeonLoot');
    const empty = this.getElement<HTMLElement>('dungeonLootEmpty');
    if (!box || !empty) return;

    const presentation = getDungeonLootPresentation(state.dungeonLoot ?? {});
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

  renderTeam(): void {
    const state = this.getState();
    const root = this.getElement<HTMLElement>('teamCard');
    if (!root) return;

    const characters = state.characters.map(character => ({
      id: character.id,
      name: character.name,
      hp: character.hp,
      maxHp: character.maxHp,
      energy: character.energy,
      maxEnergy: character.maxEnergy,
      className: this.getCharacterClassName(character.classId)
    }));
    const locked = Boolean(state.dungeonRun) || Boolean(state.dungeonAuto);
    const cycleActive = Boolean(
      state.dungeonAuto || state.dungeonRun || state.dungeonCycleOriginalIds?.length
    );
    const presentation = getDungeonTeamPresentation(
      state.dungeonTeamSlots,
      characters,
      locked,
      state.dungeonCycleActiveIds ?? [],
      cycleActive
    );

    const slots = presentation.slots.map(slot => {
      const picker = this.getTeamPickerHtml(state, characters, slot.slotIndex, presentation.locked);
      if (!slot.occupied) {
        return (
          '<div class="team-slot">' +
          `<div class="team-slot-head"><strong>${slot.title}</strong></div>` +
          `<div class="empty">${slot.emptyText}</div>` +
          '<div class="actions">' +
          `<button class="btn primary" type="button" ${presentation.locked ? 'disabled' : ''} data-dungeon-action="toggle-team-picker" data-slot="${slot.slotIndex}">${slot.addLabel}</button>` +
          '</div>' +
          picker +
          '</div>'
        );
      }

      const fallen = slot.fallen ? `<span class="tag temp">${slot.fallenLabel}</span>` : '';
      return (
        '<div class="team-slot">' +
        `<div class="team-slot-head"><strong>${slot.title}</strong>${fallen}</div>` +
        '<div class="statrow">' +
        `<div class="stat"><span>HP</span><b>${slot.hpValue}</b></div>` +
        `<div class="stat"><span>EN</span><b>${slot.energyValue}</b></div>` +
        '</div>' +
        '<div class="actions">' +
        `<button class="btn" type="button" ${presentation.locked ? 'disabled' : ''} data-dungeon-action="remove-team-character" data-slot="${slot.slotIndex}">${slot.removeLabel}</button>` +
        `<button class="btn" type="button" ${presentation.locked ? 'disabled' : ''} data-dungeon-action="toggle-team-picker" data-slot="${slot.slotIndex}">${slot.switchLabel}</button>` +
        '</div>' +
        picker +
        '</div>'
      );
    }).join('');

    root.innerHTML =
      `<div class="team-slot-grid">${slots}</div>` +
      (presentation.locked ? `<p class="status-line">${presentation.lockedText}</p>` : '');
  }

  private getTeamPickerHtml(
    state: RuntimeDungeonPresentationState,
    characters: readonly DungeonTeamPresentationCharacterLike[],
    slot: number,
    locked: boolean
  ): string {
    const picker = getDungeonTeamPickerPresentation(
      state.dungeonTeamSlots,
      characters,
      slot,
      this.openTeamPickerSlot
    );
    if (!picker.open) return '';
    if (!picker.candidates.length) {
      return `<div class="team-slot-picker muted small">${picker.emptyText}</div>`;
    }

    return (
      '<div class="team-slot-picker">' +
      picker.candidates.map(candidate => (
        '<div class="team-candidate">' +
        `<div><strong>${candidate.name}</strong><div class="sell-meta">${candidate.meta}</div></div>` +
        `<button class="btn smallbtn primary" type="button" ${locked ? 'disabled' : ''} data-dungeon-action="assign-team-character" data-slot="${slot}" data-character-id="${candidate.id}">${candidate.assignLabel}</button>` +
        '</div>'
      )).join('') +
      '</div>'
    );
  }

  private handleClick(event: Event): void {
    if (!this.host || !(event.target instanceof Element)) return;
    const actionElement = event.target.closest<HTMLElement>('[data-dungeon-action]');
    if (!actionElement || !this.host.contains(actionElement)) return;

    const action = actionElement.dataset['dungeonAction'] as DungeonUiAction | undefined;
    if (!action) return;

    if (action === 'toggle-auto') {
      this.forwardActionResult(this.gameDungeon.toggleAuto(Date.now()), true);
      this.renderAll();
      return;
    }
    if (action === 'collect-loot') {
      this.forwardActionResult(this.gameDungeon.collectLoot(), true);
      this.renderAll();
      return;
    }

    const slot = Number(actionElement.dataset['slot']);
    if (!Number.isInteger(slot) || slot < 0 || slot >= 4) return;

    if (action === 'toggle-team-picker') {
      if (this.isTeamLocked(this.getState())) return;
      this.openTeamPickerSlot = this.openTeamPickerSlot === slot ? null : slot;
      this.renderTeam();
      return;
    }
    if (action === 'remove-team-character') {
      this.removeTeamCharacter(slot);
      return;
    }
    if (action === 'assign-team-character') {
      const characterId = Number(actionElement.dataset['characterId']);
      if (!Number.isFinite(characterId)) return;
      this.assignTeamCharacter(slot, characterId);
    }
  }

  private assignTeamCharacter(slot: number, characterId: number): void {
    const state = this.getState();
    if (this.isTeamLocked(state)) return;
    if (!state.characters.some(character => character.id === characterId)) return;
    if (state.dungeonTeamSlots.some((id, index) => index !== slot && id === characterId)) return;

    state.dungeonTeamSlots[slot] = characterId;
    state.dungeonCycleOriginalIds = [];
    state.dungeonCycleActiveIds = [];
    this.openTeamPickerSlot = null;
    this.forwardActionResult({ events: [], saveRequested: true });
    this.renderStatus();
    this.renderTeam();
  }

  private removeTeamCharacter(slot: number): void {
    const state = this.getState();
    if (this.isTeamLocked(state)) return;

    state.dungeonTeamSlots[slot] = null;
    state.dungeonCycleOriginalIds = [];
    state.dungeonCycleActiveIds = [];
    this.openTeamPickerSlot = null;
    this.forwardActionResult({ events: [], saveRequested: true });
    this.renderStatus();
    this.renderTeam();
  }

  private forwardActionResult(result: DungeonActionResult, forceSave = false): void {
    if (!this.actionResultHandler) return;
    this.actionResultHandler({
      ...result,
      saveRequested: forceSave || result.saveRequested
    });
  }

  private getState(): RuntimeDungeonPresentationState {
    return this.gameState.getState<RuntimeDungeonPresentationState>();
  }

  private getSelectedDungeonIds(state: RuntimeDungeonPresentationState): number[] {
    return (state.dungeonTeamSlots ?? [])
      .map(id => Number(id))
      .filter(id => Number.isFinite(id) && state.characters.some(character => character.id === id));
  }

  private getCharacterClassName(classId: string | null | undefined): string {
    const resolved = CHARACTER_CLASSES[classId as CharacterClassId] ?? CHARACTER_CLASSES.recruit;
    return resolved.name;
  }

  private isTeamLocked(state: RuntimeDungeonPresentationState): boolean {
    return Boolean(state.dungeonRun) || Boolean(state.dungeonAuto);
  }

  private getElement<TElement extends HTMLElement>(id: string): TElement | null {
    return this.host?.querySelector<TElement>(`#${id}`) ?? null;
  }

  private setText(id: string, value: string): void {
    const element = this.getElement<HTMLElement>(id);
    if (element) element.textContent = value;
  }
}

import { Injectable } from '@angular/core';
import {
  CHARACTER_CLASSES,
  calculateCharacterStats,
  weaponDamageAfterArmor,
  type ResolvedCharacterStats
} from '../game/game-core';
import { type CharacterState } from '../game/character-core';
import { characterStatLevelMultiplier } from '../game/character-progression-core';
import {
  getCharacterCardPresentation,
  getWeaponPickerKey,
  type CharacterHandPresentation,
  type CharacterStatPresentation
} from '../game/character-presentation-core';
import { GameEquipmentService } from './game-equipment.service';
import { GameStateService, type MutableGameState } from './game-state.service';
import {
  GameWeaponPresentationService,
  type RuntimeWeaponPresentation
} from './game-weapon-presentation.service';

type RuntimeCharacterPresentationState = MutableGameState & {
  characters: CharacterState[];
  weaponInventory: RuntimeWeaponPresentation[];
};

type CharacterAssetId = 'recruit' | 'fighter' | 'archer' | 'scholar';

const CHARACTER_ASSET_IDS: readonly CharacterAssetId[] = ['recruit', 'fighter', 'archer', 'scholar'];
const CHARACTER_NAME_MAX_LENGTH = 32;
const STATS_PER_PAGE = 8;

@Injectable({ providedIn: 'root' })
export class GameCharacterPresentationService {
  private openWeaponPickerHand: string | null = null;
  private selectedCharacterId: number | null = null;
  private renamingCharacterId: number | null = null;
  private statPageIndex = 0;
  private boundRoot: HTMLElement | null = null;
  private equipmentChanged: (() => void) | null = null;

  constructor(
    private readonly gameState: GameStateService,
    private readonly gameEquipment: GameEquipmentService,
    private readonly weaponPresentation: GameWeaponPresentationService
  ) {}

  bindActions(equipmentChanged: () => void): void {
    this.equipmentChanged = equipmentChanged;
    this.ensureActionBinding();
  }

  render(): void {
    const root = document.getElementById('rosterCard');
    if (!root) return;
    this.ensureActionBinding(root);

    const state = this.state();
    const selectedCharacter = this.resolveSelectedCharacter(state.characters);
    if (!selectedCharacter) {
      root.innerHTML = '<div class="empty">Noch keine Charaktere im Kader.</div>';
      return;
    }

    const selectorScrollTop = root.querySelector<HTMLElement>('.roster-list-panel')?.scrollTop ?? 0;
    const detailScrollTop = root.querySelector<HTMLElement>('.roster-detail-panel')?.scrollTop ?? 0;
    root.innerHTML = `<div class="roster-layout" data-roster-presentation-owner="angular">
      ${this.renderRosterList(state.characters, selectedCharacter.id)}
      ${this.renderCharacterDetail(selectedCharacter)}
    </div>`;

    const selector = root.querySelector<HTMLElement>('.roster-list-panel');
    const detail = root.querySelector<HTMLElement>('.roster-detail-panel');
    if (selector) selector.scrollTop = selectorScrollTop;
    if (detail) detail.scrollTop = detailScrollTop;
  }

  renderIfIdle(): void {
    const root = document.getElementById('rosterCard');
    if (!root) return;
    const rosterIsBeingUsed = root.contains(document.activeElement);
    if (!rosterIsBeingUsed && !this.openWeaponPickerHand && this.renamingCharacterId === null) this.render();
  }

  private renderRosterList(characters: CharacterState[], selectedCharacterId: number): string {
    const rows = characters.map(character => {
      const assetId = this.assetId(character.classId);
      const level = Number.isFinite(Number(character.level)) ? Math.max(1, Math.floor(Number(character.level))) : 1;
      const selected = character.id === selectedCharacterId;
      return `<button class="roster-list-item${selected ? ' selected' : ''}" type="button" data-roster-action="select-character" data-character-id="${character.id}" aria-pressed="${selected}">
        <span class="class-emblem class-emblem-small" data-class-id="${assetId}" aria-hidden="true"></span>
        <span class="roster-list-name">${this.escapeHtml(character.name)}</span>
        <span class="roster-list-level">LVL ${level}</span>
      </button>`;
    }).join('');

    return `<div class="roster-list-panel" aria-label="Kaderauswahl">
      <div class="roster-list-head"><span>Klasse</span><span>Name</span><span>LVL</span></div>
      <div class="roster-list">${rows}</div>
    </div>`;
  }

  private renderCharacterDetail(character: CharacterState): string {
    const characterClass = CHARACTER_CLASSES[character.classId] ?? CHARACTER_CLASSES.recruit;
    const effectiveStats = this.effectiveStats(character);
    const presentation = getCharacterCardPresentation(
      character,
      characterClass,
      effectiveStats,
      this.effectiveOffense(character, effectiveStats),
      this.openWeaponPickerHand
    );
    const assetId = this.assetId(character.classId);
    const levelStat = presentation.stats.find(stat => stat.label === 'LVL');
    const pagedStats = presentation.stats.filter(stat => stat.label !== 'LVL');
    const pageCount = Math.max(1, Math.ceil(pagedStats.length / STATS_PER_PAGE));
    this.statPageIndex = Math.min(this.statPageIndex, pageCount - 1);
    const pageStats = pagedStats.slice(
      this.statPageIndex * STATS_PER_PAGE,
      this.statPageIndex * STATS_PER_PAGE + STATS_PER_PAGE
    );
    const picker = presentation.hands.find(hand => hand.pickerOpen);

    return `<div class="roster-detail-panel">
      <article class="roster-detail-card" data-character-id="${character.id}">
        ${this.renderCharacterHeader(character, characterClass.name, levelStat?.value ?? `${character.level ?? 1}`)}
        <div class="roster-emblem-stage">
          <span class="class-emblem class-emblem-large" data-class-id="${assetId}" role="img" aria-label="Klassenemblem ${this.escapeHtml(characterClass.name)}"></span>
          <div class="roster-equipment-layer" aria-label="Ausrüstung">
            ${presentation.hands.map(hand => this.renderEquipmentSlot(character, hand)).join('')}
          </div>
        </div>
        ${picker ? this.renderWeaponPicker(character, picker) : ''}
        ${this.renderStatPage(pageStats, this.statPageIndex, pageCount)}
      </article>
    </div>`;
  }

  private renderCharacterHeader(character: CharacterState, className: string, levelValue: string): string {
    const isRenaming = this.renamingCharacterId === character.id;
    const nameMarkup = isRenaming
      ? `<div class="roster-name-edit">
          <input class="text-input roster-name-input" data-roster-name-input data-character-id="${character.id}" maxlength="${CHARACTER_NAME_MAX_LENGTH}" value="${this.escapeAttribute(character.name)}" aria-label="Charaktername">
          <button class="roster-icon-btn confirm" type="button" data-roster-action="save-name" data-character-id="${character.id}" aria-label="Namen speichern">✓</button>
          <button class="roster-icon-btn" type="button" data-roster-action="cancel-name" data-character-id="${character.id}" aria-label="Umbenennen abbrechen">×</button>
        </div>`
      : `<div class="roster-name-display">
          <strong>${this.escapeHtml(character.name)}</strong>
          <button class="roster-icon-btn" type="button" data-roster-action="edit-name" data-character-id="${character.id}" aria-label="Namen ändern" title="Namen ändern">✎</button>
        </div>`;

    return `<header class="roster-detail-head">
      ${nameMarkup}
      <div class="roster-character-meta"><span>${this.escapeHtml(className)}</span><span>LVL ${this.escapeHtml(levelValue.split(' / ')[0] ?? levelValue)}</span></div>
    </header>`;
  }

  private renderEquipmentSlot(character: CharacterState, handPresentation: CharacterHandPresentation): string {
    const weapon = this.getWeaponById(handPresentation.weaponId);
    const active = handPresentation.pickerOpen;
    return `<button class="roster-equipment-slot${active ? ' active' : ''}" type="button" data-roster-action="toggle-picker" data-character-id="${character.id}" data-hand="${handPresentation.hand}" aria-expanded="${active}">
      <span class="roster-equipment-label">${handPresentation.label}</span>
      <strong>${weapon ? this.escapeHtml(weapon.name) : '+'}</strong>
      <span class="roster-equipment-action">${active ? 'Auswahl schließen' : weapon ? 'Wechseln' : 'Ausrüsten'}</span>
    </button>`;
  }

  private renderStatPage(stats: CharacterStatPresentation[], pageIndex: number, pageCount: number): string {
    const statHtml = stats
      .map(stat => `<div class="roster-stat"><span>${stat.label}</span><b>${stat.value}</b></div>`)
      .join('');
    return `<section class="roster-stats" aria-label="Charakterwerte">
      <div class="roster-stat-grid">${statHtml}</div>
      <div class="roster-stat-pagination">
        <button class="roster-page-btn" type="button" data-roster-action="stat-page-prev" aria-label="Vorherige Werteseite" ${pageIndex <= 0 ? 'disabled' : ''}>←</button>
        <span>Seite ${pageIndex + 1} / ${pageCount}</span>
        <button class="roster-page-btn" type="button" data-roster-action="stat-page-next" aria-label="Nächste Werteseite" ${pageIndex >= pageCount - 1 ? 'disabled' : ''}>→</button>
      </div>
    </section>`;
  }

  private renderWeaponPicker(character: CharacterState, handPresentation: CharacterHandPresentation): string {
    const currentWeapon = this.getWeaponById(handPresentation.weaponId);
    const cards = this.state().weaponInventory.map(weapon => {
      const picker = this.gameEquipment.getWeaponPickerPresentation(weapon.id, character.id, handPresentation.hand);
      const disabled = picker.disabled;
      const label = disabled ? picker.status : 'Ausrüsten';
      const actions = `<div class="weapon-card-actions"><button class="btn ${disabled ? '' : 'primary'}" ${disabled ? 'disabled' : ''} data-roster-action="equip-weapon" data-character-id="${character.id}" data-hand="${handPresentation.hand}" data-weapon-id="${weapon.id}">${label}</button></div>`;
      return this.weaponPresentation.renderCard(weapon, currentWeapon, picker.status, actions);
    }).join('');
    const clearAction = currentWeapon
      ? `<div class="weapon-card-actions"><button class="btn" data-roster-action="clear-hand" data-character-id="${character.id}" data-hand="${handPresentation.hand}">Hand leeren</button></div>`
      : '';

    return `<div class="weapon-picker roster-weapon-picker"><div class="weapon-picker-title">${handPresentation.label} · Klammerwerte = Änderung zur aktuell ausgerüsteten Waffe.</div>${clearAction}<div class="weapon-card-list">${cards || '<div class="empty">Keine Waffen im Lager.</div>'}</div></div>`;
  }

  private effectiveStats(character: CharacterState): ResolvedCharacterStats {
    return calculateCharacterStats(
      character.classId,
      this.getEquippedWeapons(character),
      characterStatLevelMultiplier(character.level)
    );
  }

  private effectiveOffense(character: CharacterState, stats: ResolvedCharacterStats): number {
    const weapons = this.getEquippedWeapons(character);
    if (weapons.length) {
      return weapons.reduce((sum, weapon) => sum + weaponDamageAfterArmor(weapon, 0, stats).raw, 0);
    }
    const fistRaw = 1 * stats.strengthFactor * 1 * Math.min(1, 0.5 * stats.precision);
    return fistRaw * (1 + stats.critChance * (stats.critDamage - 1));
  }

  private getEquippedWeapons(character: CharacterState): RuntimeWeaponPresentation[] {
    const ids = [...new Set([character.equipment.leftHand, character.equipment.rightHand].filter((id): id is number => id !== null))];
    return ids
      .map(weaponId => this.getWeaponById(weaponId))
      .filter((weapon): weapon is RuntimeWeaponPresentation => Boolean(weapon));
  }

  private getWeaponById(weaponId: number | null): RuntimeWeaponPresentation | null {
    if (weaponId === null) return null;
    return this.state().weaponInventory.find(weapon => Number(weapon.id) === Number(weaponId)) ?? null;
  }

  private resolveSelectedCharacter(characters: CharacterState[]): CharacterState | null {
    if (!characters.length) {
      this.selectedCharacterId = null;
      return null;
    }
    const selected = characters.find(character => character.id === this.selectedCharacterId) ?? characters[0];
    this.selectedCharacterId = selected.id;
    return selected;
  }

  private assetId(classId: string): CharacterAssetId {
    return CHARACTER_ASSET_IDS.includes(classId as CharacterAssetId) ? classId as CharacterAssetId : 'recruit';
  }

  private ensureActionBinding(root = document.getElementById('rosterCard')): void {
    if (!root || root === this.boundRoot) return;
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
    const button = event.target.closest<HTMLButtonElement>('button[data-roster-action]');
    if (!button || button.disabled) return;
    const action = button.dataset['rosterAction'];
    const characterId = Number(button.dataset['characterId']);
    const hand = button.dataset['hand'] ?? '';

    if (action === 'stat-page-prev') {
      this.statPageIndex = Math.max(0, this.statPageIndex - 1);
      this.render();
      return;
    }
    if (action === 'stat-page-next') {
      this.statPageIndex += 1;
      this.render();
      return;
    }
    if (!Number.isFinite(characterId)) return;

    if (action === 'select-character') {
      this.selectedCharacterId = characterId;
      this.openWeaponPickerHand = null;
      this.renamingCharacterId = null;
      this.statPageIndex = 0;
      this.render();
      return;
    }

    if (action === 'edit-name') {
      this.renamingCharacterId = characterId;
      this.render();
      window.requestAnimationFrame(() => {
        const input = document.querySelector<HTMLInputElement>(`[data-roster-name-input][data-character-id="${characterId}"]`);
        input?.focus();
        input?.select();
      });
      return;
    }

    if (action === 'cancel-name') {
      this.renamingCharacterId = null;
      this.render();
      return;
    }

    if (action === 'save-name') {
      this.saveName(characterId);
      return;
    }

    if (action === 'toggle-picker') {
      const key = getWeaponPickerKey(characterId, hand === 'rightHand' ? 'rightHand' : 'leftHand');
      this.openWeaponPickerHand = this.openWeaponPickerHand === key ? null : key;
      this.renamingCharacterId = null;
      this.render();
      return;
    }

    if (action === 'clear-hand') {
      if (!this.gameEquipment.unequipHand(characterId, hand)) return;
      this.finishEquipmentChange();
      return;
    }

    if (action === 'equip-weapon') {
      const weaponId = Number(button.dataset['weaponId']);
      if (!Number.isFinite(weaponId)) return;
      const result = this.gameEquipment.equipWeapon(weaponId, hand, characterId);
      if (!result.ok) {
        if (result.reason === 'weapon-in-use') {
          alert('Diese konkrete Waffe ist bereits bei einem anderen Charakter ausgerüstet.');
        } else if (result.reason === 'both-hands-required') {
          alert('Diese 2H-Waffe benötigt beide Hände. Leere zuerst die andere Hand.');
        }
        return;
      }
      this.finishEquipmentChange();
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!(event.target instanceof HTMLInputElement) || !event.target.matches('[data-roster-name-input]')) return;
    const characterId = Number(event.target.dataset['characterId']);
    if (!Number.isFinite(characterId)) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveName(characterId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.renamingCharacterId = null;
      this.render();
    }
  };

  private saveName(characterId: number): void {
    const input = document.querySelector<HTMLInputElement>(`[data-roster-name-input][data-character-id="${characterId}"]`);
    const character = this.state().characters.find(entry => entry.id === characterId);
    if (!input || !character) return;
    const nextName = input.value.trim().slice(0, CHARACTER_NAME_MAX_LENGTH);
    if (!nextName) {
      alert('Der Charaktername darf nicht leer sein.');
      input.focus();
      return;
    }
    character.name = nextName;
    this.renamingCharacterId = null;
    this.render();
  }

  private finishEquipmentChange(): void {
    this.openWeaponPickerHand = null;
    this.render();
    this.equipmentChanged?.();
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

  private escapeAttribute(value: unknown): string {
    return this.escapeHtml(value);
  }

  private state(): RuntimeCharacterPresentationState {
    return this.gameState.getState<RuntimeCharacterPresentationState>();
  }
}

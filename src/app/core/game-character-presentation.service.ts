import { Injectable } from '@angular/core';
import {
  CHARACTER_CLASSES,
  calculateCharacterStats,
  weaponDamageAfterArmor,
  type ResolvedCharacterStats
} from '../game/game-core';
import { type CharacterState } from '../game/character-core';
import {
  getCharacterCardPresentation,
  getWeaponPickerKey,
  type CharacterHandPresentation
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

@Injectable({ providedIn: 'root' })
export class GameCharacterPresentationService {
  private openWeaponPickerHand: string | null = null;
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
    root.innerHTML = this.state().characters.map(character => this.renderCharacterCard(character)).join('');
  }

  renderIfIdle(): void {
    const root = document.getElementById('rosterCard');
    if (!root) return;
    const rosterIsBeingUsed = root.contains(document.activeElement);
    if (!rosterIsBeingUsed && !this.openWeaponPickerHand) this.render();
  }

  private renderCharacterCard(character: CharacterState): string {
    const characterClass = CHARACTER_CLASSES[character.classId] ?? CHARACTER_CLASSES.recruit;
    const effectiveStats = this.effectiveStats(character);
    const presentation = getCharacterCardPresentation(
      character,
      characterClass,
      effectiveStats,
      this.effectiveOffense(character, effectiveStats),
      this.openWeaponPickerHand
    );
    const stats = presentation.stats
      .map(stat => `<div class="stat"><span>${stat.label}</span><b>${stat.value}</b></div>`)
      .join('');
    const hands = presentation.hands
      .map(handPresentation => this.renderHand(character, handPresentation))
      .join('');

    return `<div class="roster-character"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><strong>${presentation.name}</strong><span class="tag fixed">${presentation.classTag}</span></div>
      <div class="statrow" style="grid-template-columns:repeat(2,minmax(0,1fr))">${stats}</div>${hands}</div>`;
  }

  private renderHand(character: CharacterState, handPresentation: CharacterHandPresentation): string {
    const weapon = this.getWeaponById(handPresentation.weaponId);
    const weaponHtml = weapon
      ? this.weaponPresentation.renderCard(weapon, null, handPresentation.equippedStatus)
      : `<div class="empty">${handPresentation.emptyText}</div>`;
    const pickerHtml = this.renderWeaponPicker(character, handPresentation);

    return `<div class="hand-section"><div class="hand-section-head"><strong>${handPresentation.label}</strong><button class="btn smallbtn" data-roster-action="toggle-picker" data-character-id="${character.id}" data-hand="${handPresentation.hand}">${handPresentation.toggleLabel}</button></div><div style="margin-top:10px">${weaponHtml}</div>${pickerHtml}</div>`;
  }

  private renderWeaponPicker(character: CharacterState, handPresentation: CharacterHandPresentation): string {
    if (!handPresentation.pickerOpen) return '';
    const currentWeapon = this.getWeaponById(handPresentation.weaponId);
    const cards = this.state().weaponInventory.map(weapon => {
      const picker = this.gameEquipment.getWeaponPickerPresentation(weapon.id, character.id, handPresentation.hand);
      const disabled = picker.disabled;
      const label = disabled ? picker.status : 'Ausrüsten';
      const actions = `<div class="weapon-card-actions"><button class="btn ${disabled ? '' : 'primary'}" ${disabled ? 'disabled' : ''} data-roster-action="equip-weapon" data-character-id="${character.id}" data-hand="${handPresentation.hand}" data-weapon-id="${weapon.id}">${label}</button></div>`;
      return this.weaponPresentation.renderCard(weapon, currentWeapon, picker.status, actions);
    }).join('');

    return `<div class="weapon-picker"><div class="weapon-picker-title">Klammerwerte = Änderung zur aktuell ausgerüsteten Waffe.</div><div class="weapon-card-actions"><button class="btn" data-roster-action="clear-hand" data-character-id="${character.id}" data-hand="${handPresentation.hand}">Hand leeren</button></div><div class="weapon-card-list">${cards}</div></div>`;
  }

  private effectiveStats(character: CharacterState): ResolvedCharacterStats {
    return calculateCharacterStats(character.classId, this.getEquippedWeapons(character));
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
    return [character.equipment.leftHand, character.equipment.rightHand]
      .map(weaponId => this.getWeaponById(weaponId))
      .filter((weapon): weapon is RuntimeWeaponPresentation => Boolean(weapon));
  }

  private getWeaponById(weaponId: number | null): RuntimeWeaponPresentation | null {
    if (weaponId === null) return null;
    return this.state().weaponInventory.find(weapon => Number(weapon.id) === Number(weaponId)) ?? null;
  }

  private ensureActionBinding(root = document.getElementById('rosterCard')): void {
    if (!root || root === this.boundRoot) return;
    if (this.boundRoot) this.boundRoot.removeEventListener('click', this.handleClick);
    root.addEventListener('click', this.handleClick);
    this.boundRoot = root;
  }

  private readonly handleClick = (event: Event): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-roster-action]');
    if (!button || button.disabled) return;
    const action = button.dataset['rosterAction'];
    const characterId = Number(button.dataset['characterId']);
    const hand = button.dataset['hand'] ?? '';
    if (!Number.isFinite(characterId)) return;

    if (action === 'toggle-picker') {
      const key = getWeaponPickerKey(characterId, hand === 'rightHand' ? 'rightHand' : 'leftHand');
      this.openWeaponPickerHand = this.openWeaponPickerHand === key ? null : key;
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
        }
        return;
      }
      this.finishEquipmentChange();
    }
  };

  private finishEquipmentChange(): void {
    this.openWeaponPickerHand = null;
    this.render();
    this.equipmentChanged?.();
  }

  private state(): RuntimeCharacterPresentationState {
    return this.gameState.getState<RuntimeCharacterPresentationState>();
  }
}

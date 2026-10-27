import { Injectable } from '@angular/core';
import { type EquipmentCharacterLike } from '../game/equipment-core';
import { GameEquipmentService } from './game-equipment.service';
import { GameStateService, type MutableGameState } from './game-state.service';
import {
  GameWeaponPresentationService,
  type RuntimeWeaponPresentation
} from './game-weapon-presentation.service';

type RuntimeWeaponInventoryState = MutableGameState & {
  characters: EquipmentCharacterLike[];
  weaponInventory: RuntimeWeaponPresentation[];
};

interface WeaponInventoryPresentationCompatibilityBridge {
  render(): void;
}

declare global {
  interface Window {
    NoBrainerWeaponInventoryPresentationCompatibility?: WeaponInventoryPresentationCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameWeaponInventoryPresentationService {
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
    const box = document.getElementById('weaponInventory');
    const empty = document.getElementById('weaponInventoryEmpty');
    if (!box || !empty) return;
    this.ensureActionBinding(box);

    const weapons = this.weaponPresentation.sortWeaponInventory(this.state().weaponInventory);
    empty.style.display = weapons.length ? 'none' : 'block';
    box.innerHTML = weapons.map(weapon => this.renderWeapon(weapon)).join('');
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerWeaponInventoryPresentationCompatibility) {
      throw new Error('NoBrainer-Waffenlager-Präsentationsbrücke ist bereits geöffnet.');
    }
    window.NoBrainerWeaponInventoryPresentationCompatibility = { render: () => this.render() };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerWeaponInventoryPresentationCompatibility;
  }

  private renderWeapon(weapon: RuntimeWeaponPresentation): string {
    const presentation = this.gameEquipment.getWeaponInventoryPresentation(weapon.id);
    const location = presentation.location;
    let actions = '';

    if (location) {
      actions = `<div class="weapon-card-actions"><button class="btn" data-weapon-inventory-action="unequip" data-character-id="${location.characterId}" data-hand="${location.hand}">Ablegen</button></div>`;
    } else {
      const options = presentation.targets.map(target => {
        const character = this.state().characters.find(entry => Number(entry.id) === Number(target.characterId));
        return `<option value="${target.characterId}:${target.hand}">${character?.name || 'Charakter'} · ${target.label}</option>`;
      }).join('');
      actions = options
        ? `<div class="weapon-card-actions" style="display:grid;grid-template-columns:1fr auto"><select class="equip-select" data-weapon-inventory-select="${weapon.id}">${options}</select><button class="btn primary" data-weapon-inventory-action="equip" data-weapon-id="${weapon.id}">Ausrüsten</button></div>`
        : '<div class="weapon-card-actions"><button class="btn" disabled>Kein zulässiger freier Handplatz</button></div>';
    }

    return this.weaponPresentation.renderCard(weapon, null, presentation.status, actions);
  }

  private ensureActionBinding(root = document.getElementById('weaponInventory')): void {
    if (!root || root === this.boundRoot) return;
    if (this.boundRoot) this.boundRoot.removeEventListener('click', this.handleClick);
    root.addEventListener('click', this.handleClick);
    this.boundRoot = root;
  }

  private readonly handleClick = (event: Event): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-weapon-inventory-action]');
    if (!button || button.disabled) return;

    const action = button.dataset['weaponInventoryAction'];
    if (action === 'unequip') {
      const characterId = Number(button.dataset['characterId']);
      const hand = button.dataset['hand'] ?? '';
      if (!Number.isFinite(characterId) || !this.gameEquipment.unequipHand(characterId, hand)) return;
      this.finishEquipmentChange();
      return;
    }

    if (action === 'equip') {
      const weaponId = Number(button.dataset['weaponId']);
      if (!Number.isFinite(weaponId) || !this.boundRoot) return;
      const select = this.boundRoot.querySelector<HTMLSelectElement>(`select[data-weapon-inventory-select="${weaponId}"]`);
      if (!select?.value) return;
      const [characterIdText, hand = ''] = select.value.split(':');
      const characterId = Number(characterIdText);
      if (!Number.isFinite(characterId)) return;
      const result = this.gameEquipment.equipWeapon(weaponId, hand, characterId);
      if (!result.ok) {
        alert(this.gameEquipment.rejectionText(result.reason));
        return;
      }
      this.finishEquipmentChange();
    }
  };

  private finishEquipmentChange(): void {
    this.render();
    this.equipmentChanged?.();
  }

  private state(): RuntimeWeaponInventoryState {
    return this.gameState.getState<RuntimeWeaponInventoryState>();
  }
}

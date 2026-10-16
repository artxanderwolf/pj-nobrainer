import { Injectable } from '@angular/core';
import {
  equipWeapon,
  getWeaponEquipLocation,
  getWeaponInventoryPresentation,
  getWeaponPickerPresentation,
  isEquipmentHand,
  unequipHand,
  type EquipmentCharacterLike,
  type EquipWeaponResult,
  type WeaponEquipLocation,
  type WeaponInventoryPresentation,
  type WeaponPickerPresentation
} from '../game/equipment-core';
import { GameStateService, type MutableGameState } from './game-state.service';

type RuntimeEquipmentState = MutableGameState & {
  characters: EquipmentCharacterLike[];
};

interface EquipmentCompatibilityBridge {
  getWeaponEquipLocation(weaponId: number): WeaponEquipLocation | null;
  getWeaponInventoryPresentation(weaponId: number): WeaponInventoryPresentation;
  equipWeapon(weaponId: number, hand: string, characterId: number): EquipWeaponResult;
  unequipHand(characterId: number, hand: string): boolean;
}

declare global {
  interface Window {
    NoBrainerEquipmentCompatibility?: EquipmentCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameEquipmentService {
  constructor(private readonly gameState: GameStateService) {}

  getWeaponEquipLocation(weaponId: number): WeaponEquipLocation | null {
    return getWeaponEquipLocation(this.characters(), Number(weaponId));
  }

  getWeaponInventoryPresentation(weaponId: number): WeaponInventoryPresentation {
    return getWeaponInventoryPresentation(this.characters(), Number(weaponId));
  }

  getWeaponPickerPresentation(weaponId: number, characterId: number, hand: string): WeaponPickerPresentation {
    if (!isEquipmentHand(hand)) return { status: '', disabled: false };
    return getWeaponPickerPresentation(this.characters(), Number(weaponId), Number(characterId), hand);
  }

  equipWeapon(weaponId: number, hand: string, characterId: number): EquipWeaponResult {
    return equipWeapon(this.characters(), Number(weaponId), hand, Number(characterId));
  }

  unequipHand(characterId: number, hand: string): boolean {
    return unequipHand(this.characters(), Number(characterId), hand);
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerEquipmentCompatibility) {
      throw new Error('NoBrainer-Equipment-Kompatibilitätsbrücke ist bereits geöffnet.');
    }

    window.NoBrainerEquipmentCompatibility = {
      getWeaponEquipLocation: (weaponId) => this.getWeaponEquipLocation(weaponId),
      getWeaponInventoryPresentation: (weaponId) => this.getWeaponInventoryPresentation(weaponId),
      equipWeapon: (weaponId, hand, characterId) => this.equipWeapon(weaponId, hand, characterId),
      unequipHand: (characterId, hand) => this.unequipHand(characterId, hand)
    };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerEquipmentCompatibility;
  }

  private characters(): EquipmentCharacterLike[] {
    return this.gameState.getState<RuntimeEquipmentState>().characters;
  }
}

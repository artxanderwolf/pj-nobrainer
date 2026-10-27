import { Injectable } from '@angular/core';
import {
  equipWeapon,
  getWeaponEquipLocation,
  getWeaponInventoryPresentation,
  getWeaponPickerPresentation,
  isEquipmentHand,
  projectWeaponEquipment,
  type EquipmentSlots,
  unequipHand,
  type EquipmentCharacterLike,
  type EquipWeaponResult,
  type WeaponEquipLocation,
  type WeaponHandCount,
  type WeaponInventoryPresentation,
  type WeaponPickerPresentation
} from '../game/equipment-core';
import { getWeaponHandCount, calculateCharacterStats, type WeaponStats } from '../game/game-core';
import { characterStatLevelMultiplier } from '../game/character-progression-core';
import { checkProjectedEquipment, cloneStarterWeaponForEquipment, equipmentRestrictionText, getCharacterWeaponDamageFactor, sanitizeEquipmentLoadouts, type EquipmentRepair } from '../game/equipment-rules-core';
import { GameStateService, type MutableGameState } from './game-state.service';

interface RuntimeEquipmentWeapon {
  id: number;
  weaponForm?: string | null;
  name: string;
  stats?: Partial<WeaponStats> | null;
}

type RuntimeEquipmentState = MutableGameState & {
  characters: Array<EquipmentCharacterLike & { level?: number; hp?: number; maxHp?: number; energy?: number; maxEnergy?: number }>;
  weaponInventory: RuntimeEquipmentWeapon[];
};

interface EquipmentCompatibilityBridge {
  cloneStarterWeapon(record: Record<string, unknown>): Record<string, unknown>;
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
    return getWeaponInventoryPresentation(this.characters(), Number(weaponId), id => this.weaponHandCount(id), this.policy);
  }

  getWeaponPickerPresentation(weaponId: number, characterId: number, hand: string): WeaponPickerPresentation {
    if (!isEquipmentHand(hand)) return { status: 'Ungültiger Handplatz', disabled: true };
    return getWeaponPickerPresentation(
      this.characters(),
      Number(weaponId),
      Number(characterId),
      hand,
      id => this.weaponHandCount(id),
      this.policy,
      equipmentRestrictionText
    );
  }

  equipWeapon(weaponId: number, hand: string, characterId: number): EquipWeaponResult {
    const result = equipWeapon(
      this.characters(),
      Number(weaponId),
      hand,
      Number(characterId),
      id => this.weaponHandCount(id),
      this.policy
    );
    if (result.ok) this.refreshCharacterStats(characterId);
    return result;
  }

  unequipHand(characterId: number, hand: string): boolean {
    const changed = unequipHand(this.characters(), Number(characterId), hand);
    if (changed) this.refreshCharacterStats(characterId);
    return changed;
  }

  rejectionText(reason: string): string { return equipmentRestrictionText(reason); }

  normalizeEquipment(): EquipmentRepair[] {
    const repairs = sanitizeEquipmentLoadouts(this.state().characters, this.state().weaponInventory);
    for (const id of new Set(repairs.map(repair => repair.characterId))) this.refreshCharacterStats(id);
    return repairs;
  }

  previewWeaponEquip(weaponId: number, characterId: number, hand: string): { weapons: RuntimeEquipmentWeapon[]; factor: number } | null {
    const character = this.characters().find(entry => entry.id === characterId);
    if (!character || !isEquipmentHand(hand)) return null;
    const slots = projectWeaponEquipment(character, weaponId, hand, id => this.weaponHandCount(id));
    if (this.policy(character, weaponId, slots)) return null;
    const ids = new Set([slots.leftHand, slots.rightHand]);
    const weapons = this.state().weaponInventory.filter(weapon => ids.has(weapon.id));
    return { weapons, factor: getCharacterWeaponDamageFactor(character.classId, weapons) };
  }

  private readonly policy = (character: EquipmentCharacterLike, weaponId: number, slots: EquipmentSlots) =>
    checkProjectedEquipment(character, weaponId, slots, this.state().weaponInventory);

  private refreshCharacterStats(characterId: number): void {
    const character = this.state().characters.find(entry => entry.id === Number(characterId));
    if (!character) return;
    const ids = new Set([character.equipment.leftHand, character.equipment.rightHand]);
    const weapons = this.state().weaponInventory.filter(weapon => ids.has(weapon.id));
    const stats = calculateCharacterStats(character.classId, weapons, characterStatLevelMultiplier(character.level));
    character.maxHp = stats.maxHp; character.maxEnergy = stats.maxEnergy;
    if (typeof character.hp === 'number') character.hp = Math.min(character.hp, stats.maxHp);
    if (typeof character.energy === 'number') character.energy = Math.min(character.energy, stats.maxEnergy);
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerEquipmentCompatibility) {
      throw new Error('NoBrainer-Equipment-Kompatibilitätsbrücke ist bereits geöffnet.');
    }

    window.NoBrainerEquipmentCompatibility = {
      cloneStarterWeapon: record => cloneStarterWeaponForEquipment(record),
      getWeaponEquipLocation: (weaponId) => this.getWeaponEquipLocation(weaponId),
      getWeaponInventoryPresentation: (weaponId) => this.getWeaponInventoryPresentation(weaponId),
      equipWeapon: (weaponId, hand, characterId) => this.equipWeapon(weaponId, hand, characterId),
      unequipHand: (characterId, hand) => this.unequipHand(characterId, hand)
    };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerEquipmentCompatibility;
  }

  private weaponHandCount(weaponId: number): WeaponHandCount {
    const weapon = this.state().weaponInventory.find(entry => Number(entry.id) === Number(weaponId));
    return getWeaponHandCount(weapon?.weaponForm);
  }

  private characters(): EquipmentCharacterLike[] {
    return this.state().characters;
  }

  private state(): RuntimeEquipmentState {
    return this.gameState.getState<RuntimeEquipmentState>();
  }
}

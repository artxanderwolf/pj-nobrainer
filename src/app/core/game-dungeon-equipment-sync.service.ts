import { DUNGEON_IDS, getDungeonSession, type DungeonSessionState } from '../game/parallel-dungeon-core.ts';
import { Injectable } from '@angular/core';
import {
  filterActiveDungeonAttackPoints,
  refreshCharacterAttackPoints,
  type CharacterAttackPointSource,
  type DungeonRunLike
} from '../game/dungeon-core';
import { type WeaponStats } from '../game/game-core';
import { GameStateService, type MutableGameState } from './game-state.service';

interface RuntimeDungeonEquipmentSyncWeapon {
  id: number;
  stats?: Partial<WeaponStats> | null;
}

interface RuntimeDungeonEquipmentSyncCharacter {
  id: number;
  alive: boolean;
  hp: number;
  equipment: {
    leftHand?: number | null;
    rightHand?: number | null;
  };
}

type RuntimeDungeonEquipmentSyncState = MutableGameState & {
  characters: RuntimeDungeonEquipmentSyncCharacter[];
  weaponInventory: RuntimeDungeonEquipmentSyncWeapon[];
  dungeons?: Record<number,DungeonSessionState>;
};

@Injectable({ providedIn: 'root' })
export class GameDungeonEquipmentSyncService {
  constructor(private readonly gameState: GameStateService) {}

  refresh(at = Date.now()): boolean {
    const state = this.gameState.getState<RuntimeDungeonEquipmentSyncState>();
    let changed=false;
    for(const id of DUNGEON_IDS){
      const run=getDungeonSession(state,id).dungeonRun;
      if(run)changed=this.refreshRun(state,run,at)||changed;
    }
    return changed;
  }

  private refreshRun(state:RuntimeDungeonEquipmentSyncState,run:DungeonRunLike,at:number):boolean {
    if (!run) return false;

    const activeCharacters = run.participantIds
      .map(id => state.characters.find(character => character.id === Number(id)))
      .filter((character): character is RuntimeDungeonEquipmentSyncCharacter => Boolean(character?.alive && character.hp > 0));

    let attackPoints = run.attackPoints;
    for (const character of activeCharacters) {
      attackPoints = refreshCharacterAttackPoints(
        attackPoints,
        character.id,
        this.getCharacterAttackPoints(state, character),
        at
      );
    }

    run.attackPoints = filterActiveDungeonAttackPoints(
      attackPoints,
      activeCharacters.map(character => character.id),
      run.enemies.filter(enemy => enemy.alive && enemy.hp > 0).map(enemy => enemy.id)
    );
    return true;
  }

  private getCharacterAttackPoints(
    state: RuntimeDungeonEquipmentSyncState,
    character: RuntimeDungeonEquipmentSyncCharacter
  ): CharacterAttackPointSource[] {
    const equipped = [
      { id: character.equipment?.leftHand, label: 'Linke Hand' },
      { id: character.equipment?.rightHand, label: 'Rechte Hand' }
    ]
      .map(entry => ({ ...entry, weapon: this.getWeaponById(state, entry.id) }))
      .filter((entry): entry is { id: number | null | undefined; label: string; weapon: RuntimeDungeonEquipmentSyncWeapon } => Boolean(entry.weapon));

    if (equipped.length) {
      return equipped.map(entry => ({
        kind: 'weapon',
        weaponId: entry.weapon.id,
        label: entry.label,
        speed: Math.max(0.01, Number(entry.weapon.stats?.attackSpeed) || 0)
      }));
    }

    return [{ kind: 'fist', weaponId: null, label: 'Faust', speed: 1 }];
  }

  private getWeaponById(
    state: RuntimeDungeonEquipmentSyncState,
    id: number | null | undefined
  ): RuntimeDungeonEquipmentSyncWeapon | null {
    if (id === null || id === undefined) return null;
    return state.weaponInventory.find(weapon => Number(weapon.id) === Number(id)) ?? null;
  }
}

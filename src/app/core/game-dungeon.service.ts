import { DUNGEON_IDS, getDungeonSession, migrateParallelDungeons, characterDungeonReservation, type DungeonSessionState } from '../game/parallel-dungeon-core.ts';
import { getDungeonDefinition } from '../game/dungeon-definitions.ts';
import { healParty } from '../game/healing-core.ts';
import { dungeonUnlocked, initializeReleaseProgress, recordSuccessfulWave, startProgressSession, type MissionState } from '../game/mission-core.ts';
import { Injectable } from '@angular/core';
import { getCharacterWeaponDamageFactor } from '../game/equipment-rules-core.ts';
import { buildWeightedTargets, resolveAttack, type CombatTargetLike } from '../game/combat-core';
import {
  checkDungeonStart,
  createDungeonAttackPoints,
  createDungeonEnemies,
  filterActiveDungeonAttackPoints,
  getDungeonPhase,
  getNextDueAttack,
  isDungeonCatchup,
  payDungeonEnergy,
  resetDungeonCycle,
  resolveSearchStep,
  rescheduleDungeonAttack,
  rollEnemyCount,
  rollWeightedIndex,
  type CharacterAttackPointSource,
  type DungeonAttackPoint,
  type DungeonCharacterLike,
  type DungeonEnemy,
  type DungeonRunLike
} from '../game/dungeon-core';
import {
  CHARACTER_CLASSES,
  CONFIG,
  calculateCharacterStats,
  getDungeonEnemyDefinition,
  getMaterialIdByName,
  getMaterialReferenceById,
  type CharacterClassId,
  type ResolvedCharacterStats,
  type WeaponStats
} from '../game/game-core';
import {
  characterStatLevelMultiplier,
  grantCharacterExperience
} from '../game/character-progression-core';
import {
  addMaterialQuantityById,
  getMaterialStorageEntries,
  normalizeMaterialInventory,
  type MaterialStorageInventory
} from '../game/material-storage-core';
import { GameStateService, type MutableGameState } from './game-state.service';

export interface DungeonRuntimeEvent {
  dungeonId?: number;
  text: string;
  className?: string;
}

export interface DungeonActionResult {
  events: DungeonRuntimeEvent[];
  saveRequested: boolean;
  alertMessage?: string;
}

export interface DungeonUpdateResult extends DungeonActionResult {
  catchingUp: boolean;
}

interface RuntimeDungeonEquipment {
  leftHand?: number | null;
  rightHand?: number | null;
}

interface RuntimeDungeonWeapon {
  id: number;
  weaponForm?: string | null;
  name: string;
  stats?: Partial<WeaponStats> | null;
}

interface RuntimeDungeonCharacter extends DungeonCharacterLike, CombatTargetLike {
  name: string;
  classId?: string | null;
  level?: number | null;
  xp?: number | null;
  maxHp: number;
  maxEnergy: number;
  armor?: number | null;
  dodge?: number | null;
  strengthFactor: number;
  precision: number;
  equipment: RuntimeDungeonEquipment;
}

interface RuntimeDungeonSearch {
  nextCheckAt: number;
}

interface RuntimeDungeonDrop {
  /** Kanonische Referenz für neue Laufzeitlogik. */
  materialId?: number | null;
  /** Kompatibilitätsfelder für bestehende Saves und einen sicheren Rollback. */
  name?: string;
  category?: string;
}

interface RuntimeDungeonLootCollect {
  readyAt: number;
  drops: RuntimeDungeonDrop[];
  enemyCount: number;
}

type DungeonSessionEndReason = 'manual' | 'energy';

type RuntimeDungeonState = MutableGameState & MissionState & {
  characters: RuntimeDungeonCharacter[];
  weaponInventory: RuntimeDungeonWeapon[];
  inventory: MaterialStorageInventory;
  session: DungeonSessionState;
  dungeons: Record<number,DungeonSessionState>;
};

@Injectable({ providedIn: 'root' })
export class GameDungeonService {
  private catchupMode = false;

  constructor(private readonly gameState: GameStateService) {}

  update(now = Date.now(), dungeonId = 1): DungeonUpdateResult {
    const state = this.getState(dungeonId);
    const outcome: DungeonUpdateResult = { events: [], saveRequested: false, catchingUp: false };
    const firstEventAt = this.getFirstEventAt(state, now);
    const catchingUp = isDungeonCatchup(firstEventAt, now);
    const previousCatchupMode = this.catchupMode;
    this.catchupMode = catchingUp;
    outcome.catchingUp = catchingUp;
    const wavesBefore = Number(state.session.dungeonWavesDefeated) || 0;
    let events = 0;

    try {
      while (events++ < 100_000) {
        const phase = getDungeonPhase(state.session);

        if (phase === 'loot') {
          const collect = state.session.dungeonLootCollect;
          if (!collect || collect.readyAt > now) break;
          this.completeLootCollect(state, collect.readyAt, outcome);
          continue;
        }

        if (phase === 'combat') {
          const run = state.session.dungeonRun;
          if (!run) continue;

          const alivePlayers = run.participantIds
            .map(id => this.getCharacterById(state, id))
            .filter((character): character is RuntimeDungeonCharacter => !!character && character.alive && character.hp > 0);
          const aliveEnemies = run.enemies.filter(enemy => enemy.alive && enemy.hp > 0);
          const nextAt = run.attackPoints.reduce((minimum, point) => Math.min(minimum, point.nextAt), Infinity);

          if (!aliveEnemies.length) {
            this.finishWave(state, true, Number.isFinite(nextAt) ? Math.min(nextAt, now) : now, outcome);
            continue;
          }
          if (!alivePlayers.length) {
            this.finishWave(state, false, Number.isFinite(nextAt) ? Math.min(nextAt, now) : now, outcome);
            continue;
          }

          run.attackPoints = filterActiveDungeonAttackPoints(
            run.attackPoints,
            alivePlayers.map(character => character.id),
            aliveEnemies.map(enemy => enemy.id)
          );
          const due = getNextDueAttack(run.attackPoints, now);
          if (!due) break;

          const at = due.nextAt;
          if (due.side === 'player') this.playerAttack(state, due, run, outcome);
          else this.enemyAttack(state, due, run, outcome);
          rescheduleDungeonAttack(due, this.getAttackPointSpeed(state, due, run), run.attackPoints);
          continue;
        }

        if (phase === 'idle') break;

        if (!state.session.dungeonSearch) {
          this.beginSearch(state, now, outcome);
          break;
        }
        if (state.session.dungeonSearch.nextCheckAt > now) break;

        const at = state.session.dungeonSearch.nextCheckAt;
        const searchResult = resolveSearchStep(this.getAliveParticipants(state), Math.random(), getDungeonDefinition(state.session.dungeonId).encounterChance);
        if (searchResult === 'encounter') this.startRun(state, at, outcome);
        else state.session.dungeonSearch.nextCheckAt = at + CONFIG.dungeon.searchStepMs;
      }
    } finally {
      this.catchupMode = previousCatchupMode;
    }

    if (catchingUp) {
      const waves = (Number(state.session.dungeonWavesDefeated) || 0) - wavesBefore;
      this.addEvent(
        outcome,
        `Offline-Fortschritt nachgeholt${waves > 0 ? `: ${waves} Welle${waves === 1 ? '' : 'n'} besiegt` : ''}.`,
        'muted'
      );
    }

    return outcome;
  }

  toggleAuto(at = Date.now(), dungeonId = 1): DungeonActionResult {
    const state = this.getState(dungeonId);
    const outcome = this.createOutcome();
    const sessionActive = Boolean(
      state.session.dungeonAuto || state.session.dungeonRun || state.session.dungeonSearch || state.session.dungeonLootCollect || state.session.dungeonStopRequested
    );

    if (sessionActive) {
      if (state.session.dungeonStopRequested) return outcome;

      state.session.dungeonAuto = false;
      state.session.dungeonSearch = null;

      if (state.session.dungeonRun || state.session.dungeonLootCollect) {
        state.session.dungeonStopRequested = true;
        this.addEvent(
          outcome,
          state.session.dungeonRun
            ? 'Laufabbruch angefordert. Die aktuelle Welle wird noch beendet.'
            : 'Laufabbruch angefordert. Die aktuelle Beute wird noch eingesammelt.',
          'muted'
        );
        outcome.saveRequested = true;
        return outcome;
      }

      this.finishSession(state, 'manual', at, outcome);
      return outcome;
    }

    if (this.getLootTotal(state) > 0) {
      outcome.alertMessage = 'Bitte zuerst die Beute des vorherigen Dungeonlaufs einsammeln.';
      return outcome;
    }

    const selectedIds = this.getSelectedIds(state);
    if (!selectedIds.length) {
      outcome.alertMessage = 'Bitte zuerst mindestens einen Charakter einem Dungeonplatz zuweisen.';
      return outcome;
    }

    initializeReleaseProgress(state);
    const selectedDungeonId = state.session.dungeonId;
    if (!dungeonUnlocked(state, selectedDungeonId)) { outcome.alertMessage = 'Dungeon noch nicht freigeschaltet.'; return outcome; }
    const occupied = selectedIds.find(id => characterDungeonReservation(state,id,selectedDungeonId)!==null);
    if (occupied !== undefined) { outcome.alertMessage = 'Ein gewählter Charakter befindet sich bereits in einem anderen Dungeon.'; return outcome; }
    startProgressSession(state, selectedDungeonId);
    state.session.log = [];
    state.session.dungeonStopRequested = false;
    state.session.dungeonCycleOriginalIds = [...selectedIds];
    state.session.dungeonCycleActiveIds = [...selectedIds];
    resetDungeonCycle(selectedIds.map(id => this.getCharacterById(state, id)).filter((character): character is RuntimeDungeonCharacter => !!character));
    state.session.expeditionActive = selectedIds.length > 0;
    state.session.dungeonSessionStartWaves = Number(state.session.dungeonWavesDefeated) || 0;
    state.session.dungeonAuto = true;
    this.addEvent(outcome, 'Dungeon-1-Lauf gestartet. Das ausgewählte Team beginnt mit der Suche.', 'good');
    this.beginSearch(state, at, outcome);
    outcome.saveRequested = true;
    return outcome;
  }

  collectLoot(dungeonId = 1): DungeonActionResult {
    const state = this.getState(dungeonId);
    const outcome = this.createOutcome();
    normalizeMaterialInventory(state.session.dungeonLoot);
    const entries = getMaterialStorageEntries(state.session.dungeonLoot).filter(entry => entry.qty > 0);
    if (!entries.length) return outcome;

    let total = 0;
    for (const entry of entries) {
      const added = addMaterialQuantityById(state.inventory, entry.materialId, entry.qty);
      if (!added) throw new Error(`Dungeon-Beute konnte nicht ins Lager übertragen werden: Material-ID ${entry.materialId}.`);
      delete state.session.dungeonLoot[String(entry.materialId)];
      total += entry.qty;
    }
    this.addEvent(outcome, `${total} Material${total === 1 ? '' : 'ien'} aus der Dungeon-Beute ins Lager eingesammelt.`, 'good');
    return outcome;
  }

  /** Migriert alte Namensreferenzen in Dungeon-Beute und ausstehenden Drops auf stabile IDs. */
  normalizeMaterialReferences(): number {
    return DUNGEON_IDS.reduce((sum,id)=>sum+this.normalizeDungeonMaterialReferences(id),0);
  }

  private normalizeDungeonMaterialReferences(dungeonId: number): number {
    const state = this.getState(dungeonId);
    let changed = normalizeMaterialInventory(state.session.dungeonLoot);
    const collect = state.session.dungeonLootCollect;
    if (!collect?.drops?.length) return changed;

    for (const drop of collect.drops) {
      const resolved = this.resolveDungeonDrop(drop);
      if (!resolved) continue;
      if (drop.materialId !== resolved.materialId || drop.name !== undefined || drop.category !== undefined) {
        drop.materialId = resolved.materialId;
        delete drop.name;
        delete drop.category;
        changed += 1;
      }
    }
    return changed;
  }

  getSessionWaveCount(dungeonId = 1): number {
    const state = this.getState(dungeonId);
    const start = Number.isFinite(Number(state.session.dungeonSessionStartWaves))
      ? Number(state.session.dungeonSessionStartWaves)
      : Number(state.session.dungeonWavesDefeated) || 0;
    return Math.max(0, (Number(state.session.dungeonWavesDefeated) || 0) - start);
  }

  private beginSearch(state: RuntimeDungeonState, at: number, outcome: DungeonActionResult): boolean {
    if (!state.session.dungeonAuto || state.session.dungeonRun || state.session.dungeonLootCollect || state.session.dungeonStopRequested) return false;
    const check = checkDungeonStart(this.getAliveParticipants(state));
    if (!check.ok) {
      if (check.reason.includes('Energie')) {
        this.stopForEnergy(
          state,
          at,
          'Dungeon-1-Lauf beendet: Nicht genügend Energie für eine weitere Gegnerwelle.',
          outcome
        );
      }
      return false;
    }

    state.session.expeditionActive = true;
    state.session.dungeonSearch = { nextCheckAt: at + CONFIG.dungeon.searchStepMs };
    return true;
  }

  private startRun(state: RuntimeDungeonState, at: number, outcome: DungeonActionResult): boolean {
    if (state.session.dungeonRun || state.session.dungeonLootCollect || state.session.dungeonStopRequested) return false;
    state.session.dungeonSearch = null;
    const check = checkDungeonStart(this.getAliveParticipants(state));
    if (!check.ok) {
      if (state.session.dungeonAuto && check.reason.includes('Energie')) {
        this.stopForEnergy(
          state,
          at,
          'Dungeon-1-Lauf beendet: Nicht genügend Energie für die gefundene Gegnerwelle.',
          outcome
        );
      }
      return false;
    }

    payDungeonEnergy(check.participants, check.share);
    const enemyCount = rollEnemyCount(check.participants.length, Math.random());
    const enemies = createDungeonEnemies(enemyCount, () => Math.random(), state.session.dungeonId, () => Math.random());
    const attackPoints = createDungeonAttackPoints(
      check.participants,
      enemies,
      at,
      character => this.getCharacterAttackPoints(state, character as RuntimeDungeonCharacter)
    );

    state.session.expeditionActive = true;
    state.session.dungeonRun = {
      dungeonId: state.session.dungeonId,
      startedAt: at,
      participantIds: check.participants.map(character => character.id),
      energyShare: check.share,
      totalEnergyCost: check.totalCost,
      enemies,
      attackPoints
    };
    if (!this.catchupMode) {
      this.addEvent(
        outcome,
        `Gegner gefunden: ${enemyCount} Gegner · ${check.participants.length} Charakter${check.participants.length === 1 ? '' : 'e'} · ${check.share} EN je Charakter.`,
        'muted'
      );
    }
    outcome.saveRequested = true;
    return true;
  }

  private finishWave(state: RuntimeDungeonState, success: boolean, at: number, outcome: DungeonActionResult): void {
    const run = state.session.dungeonRun;
    if (!run) return;
    state.session.dungeonRun = null;

    if (success) {
      const drops = this.rollDrops(run.enemies, run.dungeonId);
      recordSuccessfulWave(state, run.dungeonId, () => Math.random());
      this.grantWaveExperience(state, run, outcome);
      state.session.dungeonWavesDefeated = (Number(state.session.dungeonWavesDefeated) || 0) + 1;
      state.session.dungeonCycleActiveIds = run.participantIds
        .map(id => this.getCharacterById(state, id))
        .filter((character): character is RuntimeDungeonCharacter => !!character && character.alive)
        .map(character => character.id);
      state.session.dungeonLootCollect = {
        readyAt: at + CONFIG.dungeon.lootCollectMs,
        drops,
        enemyCount: run.enemies.length
      };
      if (!this.catchupMode) {
        this.addEvent(
          outcome,
          `WELLE BESIEGT – Beute wird eingesammelt (${run.enemies.length} Materialwurf${run.enemies.length === 1 ? '' : 'würfe'}).`,
          'good'
        );
      }
    } else {
      this.resetCycleAfterFailure(state, outcome);
      if (state.session.dungeonStopRequested) this.finishSession(state, 'manual', at, outcome);
      else if (state.session.dungeonAuto) this.beginSearch(state, at, outcome);
    }

    outcome.saveRequested = true;
  }

  private completeLootCollect(state: RuntimeDungeonState, at: number, outcome: DungeonActionResult): void {
    const collect = state.session.dungeonLootCollect;
    if (!collect) return;

    const resolvedDrops = collect.drops
      .map(drop => this.resolveDungeonDrop(drop))
      .filter((drop): drop is { materialId: number; name: string; category: string } => Boolean(drop));

    resolvedDrops.forEach(drop => {
      const added = addMaterialQuantityById(state.session.dungeonLoot, drop.materialId, 1);
      if (!added) throw new Error(`Dungeon-Drop konnte nicht gespeichert werden: Material-ID ${drop.materialId}.`);
    });
    if (!this.catchupMode) {
      this.addEvent(outcome, `BEUTE EINGESAMMELT – ${resolvedDrops.map(drop => drop.name).join(', ')}.`, 'good');
    }
    state.session.dungeonLootCollect = null;
    outcome.saveRequested = true;

    if (state.session.dungeonStopRequested) {
      this.finishSession(state, 'manual', at, outcome);
      return;
    }
    if (state.session.dungeonAuto) this.beginSearch(state, at, outcome);
  }

  private resetCycleAfterFailure(state: RuntimeDungeonState, outcome: DungeonActionResult): void {
    const ids = (state.session.dungeonCycleOriginalIds ?? []).filter(id => !!this.getCharacterById(state, id));
    resetDungeonCycle(ids.map(id => this.getCharacterById(state, id)).filter((character): character is RuntimeDungeonCharacter => !!character));
    state.session.dungeonCycleActiveIds = [...ids];
    this.addEvent(outcome, 'Welle verloren: Das ursprünglich ausgewählte Team startet mit vollen HP wieder im Suchmodus.', 'bad');
  }

  private stopForEnergy(
    state: RuntimeDungeonState,
    at: number,
    message: string,
    outcome: DungeonActionResult
  ): void {
    state.session.dungeonAuto = false;
    state.session.dungeonSearch = null;
    this.addEvent(outcome, message, 'muted');
    this.finishSession(state, 'energy', at, outcome);
  }

  private finishSession(
    state: RuntimeDungeonState,
    reason: DungeonSessionEndReason,
    at: number,
    outcome: DungeonActionResult
  ): void {
    const summary = this.buildSessionSummary(state, reason);
    state.session.dungeonAuto = false;
    state.session.dungeonStopRequested = false;
    state.session.dungeonSearch = null;
    state.session.dungeonRun = null;
    state.session.dungeonLootCollect = null;
    state.session.expeditionActive = false;
    state.session.dungeonTeamSlots = [null, null, null, null];
    state.session.dungeonCycleOriginalIds = [];
    state.session.dungeonCycleActiveIds = [];
    state.session.dungeonSessionStartWaves = Number(state.session.dungeonWavesDefeated) || 0;
    outcome.alertMessage = summary;
    outcome.saveRequested = true;
  }

  private buildSessionSummary(state: RuntimeDungeonState, reason: DungeonSessionEndReason): string {
    const teamIds = state.session.dungeonCycleOriginalIds?.length ? state.session.dungeonCycleOriginalIds : this.getSelectedIds(state);
    const teamNames = teamIds
      .map(id => this.getCharacterById(state, id)?.name)
      .filter((name): name is string => Boolean(name));
    const waves = this.getSessionWaveCount(state.session.dungeonId);
    const loot = getMaterialStorageEntries(state.session.dungeonLoot)
      .filter(entry => entry.qty > 0)
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map(entry => `${entry.displayName} ×${entry.qty}`);
    const title = reason === 'manual' ? 'Dungeon 1 – Lauf abgebrochen' : 'Dungeon 1 – Lauf beendet';
    const reasonText = reason === 'manual'
      ? 'Grund: Abbruch nach Abschluss der aktuellen Welle.'
      : 'Grund: Ausdauer reicht für keine weitere Welle.';
    const lines = [
      title,
      '',
      reasonText,
      `Team: ${teamNames.length ? teamNames.join(', ') : '–'}`,
      `Besiegte Wellen: ${waves}`,
      `Beute: ${loot.length ? loot.join(', ') : 'keine'}`
    ];
    if (loot.length) lines.push('', 'Beute liegt zum Einsammeln bereit.');
    return lines.join('\n');
  }

  private getLootTotal(state: RuntimeDungeonState): number {
    return getMaterialStorageEntries(state.session.dungeonLoot).reduce((sum, entry) => sum + entry.qty, 0);
  }

  private playerAttack(
    state: RuntimeDungeonState,
    point: DungeonAttackPoint,
    run: DungeonRunLike,
    outcome: DungeonActionResult
  ): void {
    const character = typeof point.ownerId === 'number' ? this.getCharacterById(state, point.ownerId) : null;
    if (!character || !character.alive) return;
    const target = this.weightedTarget(run.enemies);
    if (!target) return;

    const characterStats = this.getCharacterStats(state, character);
    let damage: number;
    let hitChance: number;
    let penetration: number;
    let label: string;

    if (point.kind === 'fist') {
      damage = 1 * characterStats.strengthFactor;
      hitChance = Math.min(1, 0.5 * characterStats.precision);
      penetration = characterStats.penetration;
      label = 'Faust';
    } else {
      const weapon = this.getWeaponById(state, point.weaponId);
      if (!weapon) return;
      const baseDamage = Number(weapon.stats?.weaponBaseDamage ?? weapon.stats?.damagePerHit) || 0;
      const baseHitChance = Number(weapon.stats?.weaponBaseHitChance ?? weapon.stats?.hitChance) || 0;
      const equippedIds = new Set([character.equipment.leftHand, character.equipment.rightHand]);
      const equippedWeapons = state.weaponInventory.filter(entry => equippedIds.has(entry.id));
      damage = baseDamage * characterStats.strengthFactor * getCharacterWeaponDamageFactor(character.classId, equippedWeapons);
      hitChance = Math.min(1, baseHitChance * characterStats.precision);
      penetration = characterStats.penetration;
      label = weapon.name;
    }

    if (character.classId === 'healer') {
      const party = state.session.dungeonTeamSlots.map(id => this.getCharacterById(state,id)).filter((c): c is RuntimeDungeonCharacter => !!c && run.participantIds.includes(c.id));
      const heal = healParty(party, damage, c => this.getCharacterStats(state,c).threat);
      if (heal) this.addCombatEvent(outcome, `${character.name} heilt ${heal.target.name} um ${heal.healed.toFixed(2)} HP.`, 'good');
      return;
    }
    const result = resolveAttack(
      target,
      damage,
      hitChance,
      penetration,
      Math.random(),
      Math.random(),
      {
        critChance: characterStats.critChance,
        critDamage: characterStats.critDamage,
        critRoll: Math.random()
      }
    );
    if (result.outcome === 'miss') {
      this.addCombatEvent(outcome, `${character.name} · ${label}: verfehlt ${target.name}.`, 'muted');
      return;
    }
    if (result.outcome === 'dodge') {
      this.addCombatEvent(outcome, `${target.name} weicht ${character.name} · ${label} aus.`, 'muted');
      return;
    }

    if (!target.alive && target.classId === 'healer') {
      initializeReleaseProgress(state).healerDefeated += 1;
      outcome.saveRequested = true;
    }
    if (characterStats.lifeSteal > 0 && result.dealt > 0) {
      const maxHp = characterStats.maxHp;
      character.hp = Math.min(maxHp, character.hp + result.dealt * characterStats.lifeSteal);
    }
    this.addCombatEvent(
      outcome,
      `${character.name} · ${label}${result.critical ? ' · KRIT' : ''} trifft ${target.name} für ${result.dealt.toFixed(2)} Schaden${target.alive ? ` (${target.hp.toFixed(1)} HP)` : ' – besiegt'}.`,
      target.alive ? '' : 'good'
    );
  }

  private enemyAttack(
    state: RuntimeDungeonState,
    point: DungeonAttackPoint,
    run: DungeonRunLike,
    outcome: DungeonActionResult
  ): void {
    const enemy = typeof point.ownerId === 'string' ? run.enemies.find(entry => entry.id === point.ownerId) : null;
    if (!enemy || !enemy.alive) return;
    if (enemy.classId === 'healer') {
      const heal = healParty(run.enemies, enemy.damage * enemy.strengthFactor, e => CHARACTER_CLASSES[e.classId].threat);
      if (heal) this.addCombatEvent(outcome, `${enemy.name} heilt ${heal.target.name} um ${heal.healed.toFixed(2)} HP.`, 'bad');
      return;
    }
    const target = this.weightedTarget(
      run.participantIds
        .map(id => this.getCharacterById(state, id))
        .filter((character): character is RuntimeDungeonCharacter => !!character),
      character => this.getCharacterStats(state, character).threat
    );
    if (!target) return;

    const enemyName = this.enemyDisplayName(enemy);
    const hitChance = Math.min(1, enemy.hitChance * enemy.precision);
    const targetStats = this.getCharacterStats(state, target);
    const result = resolveAttack(
      target,
      enemy.damage * enemy.strengthFactor,
      hitChance,
      enemy.penetration,
      Math.random(),
      Math.random(),
      { armor: targetStats.armor, dodge: targetStats.dodge }
    );
    if (result.outcome === 'miss') {
      this.addCombatEvent(outcome, `${enemyName} verfehlt ${target.name}.`, 'muted');
      return;
    }
    if (result.outcome === 'dodge') {
      this.addCombatEvent(outcome, `${target.name} weicht dem Angriff von ${enemyName} aus.`, 'muted');
      return;
    }
    this.addCombatEvent(
      outcome,
      `${enemyName} trifft ${target.name} für ${result.dealt.toFixed(2)} Schaden${target.alive ? ` (${target.hp.toFixed(1)} HP)` : ' – gefallen'}.`,
      target.alive ? '' : 'bad'
    );
  }

  private getSelectedIds(state: RuntimeDungeonState): number[] {
    return (state.session.dungeonTeamSlots ?? [])
      .map(id => Number(id))
      .filter(id => Number.isFinite(id) && !!this.getCharacterById(state, id));
  }

  private getParticipants(state: RuntimeDungeonState): RuntimeDungeonCharacter[] {
    const activeIds = state.session.dungeonCycleActiveIds?.length ? state.session.dungeonCycleActiveIds : this.getSelectedIds(state);
    return activeIds
      .map(id => this.getCharacterById(state, id))
      .filter((character): character is RuntimeDungeonCharacter => !!character);
  }

  private getAliveParticipants(state: RuntimeDungeonState): RuntimeDungeonCharacter[] {
    return this.getParticipants(state).filter(character => character.alive && character.hp > 0);
  }

  private getCharacterAttackPoints(
    state: RuntimeDungeonState,
    character: RuntimeDungeonCharacter
  ): CharacterAttackPointSource[] {
    const equipped = [
      { id: character.equipment?.leftHand, label: 'Linke Hand' },
      { id: character.equipment?.rightHand, label: 'Rechte Hand' }
    ]
      .map(entry => ({ ...entry, weapon: this.getWeaponById(state, entry.id) }))
      .filter((entry): entry is { id: number | null | undefined; label: string; weapon: RuntimeDungeonWeapon } => !!entry.weapon);

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

  private getAttackPointSpeed(state: RuntimeDungeonState, point: DungeonAttackPoint, run: DungeonRunLike): number {
    if (point.side === 'enemy') {
      return Math.max(0.01, run.enemies.find(enemy => enemy.id === point.ownerId)?.speed || 1);
    }
    if (point.kind === 'fist') return 1;
    return Math.max(0.01, Number(this.getWeaponById(state, point.weaponId)?.stats?.attackSpeed) || 1);
  }

  private getCharacterStats(state: RuntimeDungeonState, character: RuntimeDungeonCharacter): ResolvedCharacterStats {
    const weapons = [character.equipment?.leftHand, character.equipment?.rightHand]
      .map(id => this.getWeaponById(state, id))
      .filter((weapon): weapon is RuntimeDungeonWeapon => Boolean(weapon));
    return calculateCharacterStats(
      character.classId,
      weapons,
      characterStatLevelMultiplier(character.level)
    );
  }

  private weightedTarget<TTarget extends CombatTargetLike & { classId?: string | null }>(
    targets: readonly TTarget[],
    getFallbackThreat: (target: TTarget) => number = target => CHARACTER_CLASSES[this.resolveClassId(target.classId)]?.threat ?? 50
  ): TTarget | null {
    const weighted = buildWeightedTargets(targets, getFallbackThreat);
    if (!weighted.length) return null;
    return weighted[rollWeightedIndex(weighted.map(entry => entry.weight), Math.random())]?.target ?? null;
  }

  private rollDrops(enemies: readonly DungeonEnemy[], dungeonId: number): RuntimeDungeonDrop[] {
    const result: RuntimeDungeonDrop[] = [];
    for (const enemy of enemies) {
      if (enemy.boss) {
        const ids = [...new Set(Object.values(CHARACTER_CLASSES).flatMap(cls => getDungeonEnemyDefinition(dungeonId, cls.id)?.lootMaterialIds ?? []))];
        for (let draw=0; draw<5 && ids.length; draw++) result.push({materialId: ids.splice(Math.floor(Math.random()*ids.length),1)[0]});
        continue;
      }
      const candidates = enemy.lootMaterialIds
        .map(materialId => getMaterialReferenceById(materialId))
        .filter((entry): entry is NonNullable<ReturnType<typeof getMaterialReferenceById>> => Boolean(entry));
      if (!candidates.length) continue;
      const selected = candidates[rollWeightedIndex(
        candidates.map(candidate => candidate.definition.dungeonDropWeight),
        Math.random()
      )];
      if (selected) result.push({ materialId: selected.materialId });
    }
    return result;
  }

  private resolveDungeonDrop(drop: RuntimeDungeonDrop): { materialId: number; name: string; category: string } | null {
    const referenceById = getMaterialReferenceById(drop.materialId);
    const legacyName = typeof drop.name === 'string' && drop.name ? drop.name : null;
    const materialIdByName = getMaterialIdByName(legacyName);
    if (referenceById && materialIdByName !== null && materialIdByName !== referenceById.materialId) {
      throw new Error(
        `Widersprüchliche Materialreferenz im Dungeon-Drop: ${legacyName} verweist auf ID ${materialIdByName}, ` +
        `der Drop auf ID ${referenceById.materialId}.`
      );
    }

    const reference = referenceById ?? getMaterialReferenceById(materialIdByName);
    if (!reference) return null;
    return {
      materialId: reference.materialId,
      name: reference.displayName,
      category: reference.definition.category
    };
  }

  private grantWaveExperience(
    state: RuntimeDungeonState,
    run: DungeonRunLike,
    outcome: DungeonActionResult
  ): void {
    const participants = run.participantIds
      .map(id => this.getCharacterById(state, id))
      .filter((character): character is RuntimeDungeonCharacter => Boolean(character));
    if (!participants.length) return;

    const totalBaseXp = Math.max(0, Math.floor(run.enemies.reduce((sum, enemy) => sum + (Number(enemy.xpDrop) || 0), 0)));
    const baseShare = Math.floor(totalBaseXp / participants.length);
    const remainder = totalBaseXp % participants.length;

    participants.forEach((character, index) => {
      const baseXp = baseShare + (index < remainder ? 1 : 0);
      if (baseXp <= 0) return;
      const experienceFactor = this.getCharacterStats(state, character).experienceFactor;
      const result = grantCharacterExperience(character, baseXp, experienceFactor);
      if (result.levelsGained <= 0) return;

      const effective = this.getCharacterStats(state, character);
      character.maxHp = effective.maxHp;
      character.maxEnergy = effective.maxEnergy;
      character.hp = Math.min(character.hp, character.maxHp);
      character.energy = Math.min(character.energy, character.maxEnergy);
      if (!this.catchupMode) {
        this.addEvent(
          outcome,
          `${character.name} erreicht Level ${result.level}. Grundwerte steigen auf ×${characterStatLevelMultiplier(result.level).toFixed(3)}.`,
          'good'
        );
      }
    });
  }

  private getFirstEventAt(state: RuntimeDungeonState, now: number): number {
    if (state.session.dungeonLootCollect) return Number(state.session.dungeonLootCollect.readyAt);
    if (state.session.dungeonRun) return state.session.dungeonRun.attackPoints.reduce((minimum, point) => Math.min(minimum, point.nextAt), Infinity);
    if (state.session.dungeonSearch) return Number(state.session.dungeonSearch.nextCheckAt);
    return now;
  }

  private getCharacterById(state: RuntimeDungeonState, id: number | null | undefined): RuntimeDungeonCharacter | null {
    if (id === null || id === undefined) return null;
    return state.characters.find(character => character.id === Number(id)) ?? null;
  }

  private getWeaponById(state: RuntimeDungeonState, id: number | null | undefined): RuntimeDungeonWeapon | null {
    if (id === null || id === undefined) return null;
    return state.weaponInventory.find(weapon => weapon.id === Number(id)) ?? null;
  }

  private enemyDisplayName(enemy: DungeonEnemy): string {
    const name = String(enemy?.name || 'Gegner');
    return name.startsWith('G ') ? name : `G ${name}`;
  }

  private resolveClassId(classId: string | null | undefined): CharacterClassId {
    return classId && Object.prototype.hasOwnProperty.call(CHARACTER_CLASSES, classId)
      ? classId as CharacterClassId
      : 'recruit';
  }

  private createOutcome(): DungeonActionResult {
    return { events: [], saveRequested: false };
  }

  private addEvent(outcome: DungeonActionResult, text: string, className = ''): void {
    outcome.events.push(className ? { text, className } : { text });
  }

  private addCombatEvent(outcome: DungeonActionResult, text: string, className = ''): void {
    if (!this.catchupMode) this.addEvent(outcome, text, className);
  }

  private getState(dungeonId = 1): RuntimeDungeonState {
    const root=this.gameState.getState();
    initializeReleaseProgress(root);
    if(!root['dungeons'])migrateParallelDungeons(root);
    return {
      characters:root['characters'], weaponInventory:root['weaponInventory'], inventory:root['inventory'],
      releaseProgress:root['releaseProgress'], weaponCraftCounts:root['weaponCraftCounts'],
      dungeons:root['dungeons'], session:getDungeonSession(root,dungeonId)
    } as RuntimeDungeonState;
  }
}

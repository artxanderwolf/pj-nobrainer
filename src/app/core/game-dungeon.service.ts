import { Injectable } from '@angular/core';
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
  MATERIALS,
  calculateCharacterStats,
  getMaterialById,
  type CharacterClassId,
  type ResolvedCharacterStats,
  type WeaponStats
} from '../game/game-core';
import {
  characterStatLevelMultiplier,
  grantCharacterExperience
} from '../game/character-progression-core';
import { GameStateService, type MutableGameState } from './game-state.service';

export interface DungeonRuntimeEvent {
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

interface RuntimeDungeonInventoryEntry {
  category?: string;
  qty?: number | null;
}

type DungeonSessionEndReason = 'manual' | 'energy';

type RuntimeDungeonState = MutableGameState & {
  characters: RuntimeDungeonCharacter[];
  weaponInventory: RuntimeDungeonWeapon[];
  inventory: Record<string, RuntimeDungeonInventoryEntry | undefined>;
  expeditionActive: boolean;
  dungeonAuto: boolean;
  dungeonStopRequested?: boolean;
  dungeonRun: DungeonRunLike | null;
  dungeonSearch: RuntimeDungeonSearch | null;
  dungeonLootCollect: RuntimeDungeonLootCollect | null;
  dungeonLoot: Record<string, RuntimeDungeonInventoryEntry | undefined>;
  dungeonTeamSlots: Array<number | null>;
  dungeonCycleOriginalIds: number[];
  dungeonCycleActiveIds: number[];
  dungeonWavesDefeated: number;
  dungeonSessionStartWaves?: number;
  lastEnergyUpdate: number;
};

@Injectable({ providedIn: 'root' })
export class GameDungeonService {
  private catchupMode = false;

  constructor(private readonly gameState: GameStateService) {}

  update(now = Date.now()): DungeonUpdateResult {
    const state = this.getState();
    const outcome: DungeonUpdateResult = { events: [], saveRequested: false, catchingUp: false };
    const firstEventAt = this.getFirstEventAt(state, now);
    const catchingUp = isDungeonCatchup(firstEventAt, now);
    const previousCatchupMode = this.catchupMode;
    this.catchupMode = catchingUp;
    outcome.catchingUp = catchingUp;
    const wavesBefore = Number(state.dungeonWavesDefeated) || 0;
    let events = 0;

    try {
      while (events++ < 100_000) {
        const phase = getDungeonPhase(state);

        if (phase === 'loot') {
          const collect = state.dungeonLootCollect;
          if (!collect || collect.readyAt > now) break;
          this.completeLootCollect(state, collect.readyAt, outcome);
          continue;
        }

        if (phase === 'combat') {
          const run = state.dungeonRun;
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

        if (!state.dungeonSearch) {
          this.beginSearch(state, now, outcome);
          break;
        }
        if (state.dungeonSearch.nextCheckAt > now) break;

        const at = state.dungeonSearch.nextCheckAt;
        const searchResult = resolveSearchStep(this.getAliveParticipants(state), Math.random());
        if (searchResult === 'encounter') this.startRun(state, at, outcome);
        else state.dungeonSearch.nextCheckAt = at + CONFIG.dungeon.searchStepMs;
      }
    } finally {
      this.catchupMode = previousCatchupMode;
    }

    if (catchingUp) {
      const waves = (Number(state.dungeonWavesDefeated) || 0) - wavesBefore;
      this.addEvent(
        outcome,
        `Offline-Fortschritt nachgeholt${waves > 0 ? `: ${waves} Welle${waves === 1 ? '' : 'n'} besiegt` : ''}.`,
        'muted'
      );
    }

    return outcome;
  }

  toggleAuto(at = Date.now()): DungeonActionResult {
    const state = this.getState();
    const outcome = this.createOutcome();
    const sessionActive = Boolean(
      state.dungeonAuto || state.dungeonRun || state.dungeonSearch || state.dungeonLootCollect || state.dungeonStopRequested
    );

    if (sessionActive) {
      if (state.dungeonStopRequested) return outcome;

      state.dungeonAuto = false;
      state.dungeonSearch = null;

      if (state.dungeonRun || state.dungeonLootCollect) {
        state.dungeonStopRequested = true;
        this.addEvent(
          outcome,
          state.dungeonRun
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

    state.dungeonStopRequested = false;
    state.dungeonCycleOriginalIds = [...selectedIds];
    state.dungeonCycleActiveIds = [...selectedIds];
    resetDungeonCycle(selectedIds.map(id => this.getCharacterById(state, id)).filter((character): character is RuntimeDungeonCharacter => !!character));
    state.expeditionActive = selectedIds.length > 0;
    state.dungeonSessionStartWaves = Number(state.dungeonWavesDefeated) || 0;
    state.dungeonAuto = true;
    this.addEvent(outcome, 'Dungeon-1-Lauf gestartet. Das ausgewählte Team beginnt mit der Suche.', 'good');
    this.beginSearch(state, at, outcome);
    outcome.saveRequested = true;
    return outcome;
  }

  collectLoot(): DungeonActionResult {
    const state = this.getState();
    const outcome = this.createOutcome();
    const entries = Object.entries(state.dungeonLoot ?? {}).filter(([, entry]) => (Number(entry?.qty) || 0) > 0);
    if (!entries.length) return outcome;

    let total = 0;
    entries.forEach(([name, entry]) => {
      const quantity = Number(entry?.qty) || 0;
      const category = entry?.category || MATERIALS[name]?.category || 'Unbekannt';
      state.inventory[name] ??= { category, qty: 0 };
      const inventoryEntry = state.inventory[name];
      if (!inventoryEntry) return;
      inventoryEntry.qty = (Number(inventoryEntry.qty) || 0) + quantity;
      total += quantity;
    });
    state.dungeonLoot = {};
    this.addEvent(outcome, `${total} Material${total === 1 ? '' : 'ien'} aus der Dungeon-Beute ins Lager eingesammelt.`, 'good');
    return outcome;
  }

  getSessionWaveCount(): number {
    const state = this.getState();
    const start = Number.isFinite(Number(state.dungeonSessionStartWaves))
      ? Number(state.dungeonSessionStartWaves)
      : Number(state.dungeonWavesDefeated) || 0;
    return Math.max(0, (Number(state.dungeonWavesDefeated) || 0) - start);
  }

  private beginSearch(state: RuntimeDungeonState, at: number, outcome: DungeonActionResult): boolean {
    if (!state.dungeonAuto || state.dungeonRun || state.dungeonLootCollect || state.dungeonStopRequested) return false;
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

    state.expeditionActive = true;
    state.dungeonSearch = { nextCheckAt: at + CONFIG.dungeon.searchStepMs };
    return true;
  }

  private startRun(state: RuntimeDungeonState, at: number, outcome: DungeonActionResult): boolean {
    if (state.dungeonRun || state.dungeonLootCollect || state.dungeonStopRequested) return false;
    state.dungeonSearch = null;
    const check = checkDungeonStart(this.getAliveParticipants(state));
    if (!check.ok) {
      if (state.dungeonAuto && check.reason.includes('Energie')) {
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
    const enemies = createDungeonEnemies(enemyCount, () => Math.random());
    const attackPoints = createDungeonAttackPoints(
      check.participants,
      enemies,
      at,
      character => this.getCharacterAttackPoints(state, character as RuntimeDungeonCharacter)
    );

    state.expeditionActive = true;
    state.dungeonRun = {
      dungeonId: CONFIG.dungeon.id,
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
    const run = state.dungeonRun;
    if (!run) return;
    state.dungeonRun = null;

    if (success) {
      const drops = this.rollDrops(run.enemies);
      this.grantWaveExperience(state, run, outcome);
      state.dungeonWavesDefeated = (Number(state.dungeonWavesDefeated) || 0) + 1;
      state.dungeonCycleActiveIds = run.participantIds
        .map(id => this.getCharacterById(state, id))
        .filter((character): character is RuntimeDungeonCharacter => !!character && character.alive)
        .map(character => character.id);
      state.dungeonLootCollect = {
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
      if (state.dungeonStopRequested) this.finishSession(state, 'manual', at, outcome);
      else if (state.dungeonAuto) this.beginSearch(state, at, outcome);
    }

    outcome.saveRequested = true;
  }

  private completeLootCollect(state: RuntimeDungeonState, at: number, outcome: DungeonActionResult): void {
    const collect = state.dungeonLootCollect;
    if (!collect) return;

    const resolvedDrops = collect.drops
      .map(drop => this.resolveDungeonDrop(drop))
      .filter((drop): drop is { materialId: number; name: string; category: string } => Boolean(drop));

    resolvedDrops.forEach(drop => {
      state.dungeonLoot[drop.name] ??= { category: drop.category, qty: 0 };
      const entry = state.dungeonLoot[drop.name];
      if (entry) entry.qty = (Number(entry.qty) || 0) + 1;
    });
    if (!this.catchupMode) {
      this.addEvent(outcome, `BEUTE EINGESAMMELT – ${resolvedDrops.map(drop => drop.name).join(', ')}.`, 'good');
    }
    state.dungeonLootCollect = null;
    outcome.saveRequested = true;

    if (state.dungeonStopRequested) {
      this.finishSession(state, 'manual', at, outcome);
      return;
    }
    if (state.dungeonAuto) this.beginSearch(state, at, outcome);
  }

  private resetCycleAfterFailure(state: RuntimeDungeonState, outcome: DungeonActionResult): void {
    const ids = (state.dungeonCycleOriginalIds ?? []).filter(id => !!this.getCharacterById(state, id));
    resetDungeonCycle(ids.map(id => this.getCharacterById(state, id)).filter((character): character is RuntimeDungeonCharacter => !!character));
    state.dungeonCycleActiveIds = [...ids];
    this.addEvent(outcome, 'Welle verloren: Das ursprünglich ausgewählte Team startet mit vollen HP wieder im Suchmodus.', 'bad');
  }

  private stopForEnergy(
    state: RuntimeDungeonState,
    at: number,
    message: string,
    outcome: DungeonActionResult
  ): void {
    state.dungeonAuto = false;
    state.dungeonSearch = null;
    state.lastEnergyUpdate = at;
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
    state.dungeonAuto = false;
    state.dungeonStopRequested = false;
    state.dungeonSearch = null;
    state.dungeonRun = null;
    state.dungeonLootCollect = null;
    state.expeditionActive = false;
    state.lastEnergyUpdate = at;
    state.dungeonTeamSlots = [null, null, null, null];
    state.dungeonCycleOriginalIds = [];
    state.dungeonCycleActiveIds = [];
    state.dungeonSessionStartWaves = Number(state.dungeonWavesDefeated) || 0;
    outcome.alertMessage = summary;
    outcome.saveRequested = true;
  }

  private buildSessionSummary(state: RuntimeDungeonState, reason: DungeonSessionEndReason): string {
    const teamIds = state.dungeonCycleOriginalIds?.length ? state.dungeonCycleOriginalIds : this.getSelectedIds(state);
    const teamNames = teamIds
      .map(id => this.getCharacterById(state, id)?.name)
      .filter((name): name is string => Boolean(name));
    const waves = this.getSessionWaveCount();
    const loot = Object.entries(state.dungeonLoot ?? {})
      .filter(([, entry]) => (Number(entry?.qty) || 0) > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, entry]) => `${name} ×${Number(entry?.qty) || 0}`);
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
    return Object.values(state.dungeonLoot ?? {}).reduce((sum, entry) => sum + (Number(entry?.qty) || 0), 0);
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
      damage = baseDamage * characterStats.strengthFactor;
      hitChance = Math.min(1, baseHitChance * characterStats.precision);
      penetration = characterStats.penetration;
      label = weapon.name;
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
    return (state.dungeonTeamSlots ?? [])
      .map(id => Number(id))
      .filter(id => Number.isFinite(id) && !!this.getCharacterById(state, id));
  }

  private getParticipants(state: RuntimeDungeonState): RuntimeDungeonCharacter[] {
    const activeIds = state.dungeonCycleActiveIds?.length ? state.dungeonCycleActiveIds : this.getSelectedIds(state);
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

  private rollDrops(enemies: readonly DungeonEnemy[]): RuntimeDungeonDrop[] {
    const result: RuntimeDungeonDrop[] = [];
    for (const enemy of enemies) {
      const candidates = enemy.lootMaterialIds
        .map(materialId => {
          const resolved = getMaterialById(materialId);
          return resolved ? { materialId, name: resolved[0], material: resolved[1] } : null;
        })
        .filter((entry): entry is { materialId: number; name: string; material: NonNullable<ReturnType<typeof getMaterialById>>[1] } => Boolean(entry));
      if (!candidates.length) continue;
      const selected = candidates[rollWeightedIndex(
        candidates.map(candidate => candidate.material.dungeonDropWeight),
        Math.random()
      )];
      if (selected) {
        result.push({
          materialId: selected.materialId,
          name: selected.name,
          category: selected.material.category
        });
      }
    }
    return result;
  }

  private resolveDungeonDrop(drop: RuntimeDungeonDrop): { materialId: number; name: string; category: string } | null {
    const resolvedById = getMaterialById(drop.materialId);
    if (resolvedById) {
      return {
        materialId: resolvedById[1].materialId,
        name: resolvedById[0],
        category: resolvedById[1].category
      };
    }

    const legacyName = String(drop.name ?? '');
    const legacyDefinition = legacyName ? MATERIALS[legacyName] : null;
    if (!legacyDefinition) return null;
    return {
      materialId: legacyDefinition.materialId,
      name: legacyName,
      category: legacyDefinition.category
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
    if (state.dungeonLootCollect) return Number(state.dungeonLootCollect.readyAt);
    if (state.dungeonRun) return state.dungeonRun.attackPoints.reduce((minimum, point) => Math.min(minimum, point.nextAt), Infinity);
    if (state.dungeonSearch) return Number(state.dungeonSearch.nextCheckAt);
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

  private getState(): RuntimeDungeonState {
    return this.gameState.getState<RuntimeDungeonState>();
  }
}

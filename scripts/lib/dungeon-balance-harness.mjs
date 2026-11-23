// Reproducible balance measurements using the actual Angular dungeon service.
// Only the Angular decorator is removed for Node; gameplay methods are unchanged.
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { calculateCharacterStats, calculateWeaponStats, getWeaponForm, getStarterBlueprint, MATERIAL_REFERENCES } from '../../src/app/game/game-core.ts';
import { characterStatLevelMultiplier } from '../../src/app/game/character-progression-core.ts';
import { createTeam } from '../../src/app/game/team-core.ts';
import { initializeReleaseProgress } from '../../src/app/game/mission-core.ts';

async function loadService(file, exportName) {
  const sourceUrl = new URL('../../src/app/core/' + file, import.meta.url);
  const source = readFileSync(sourceUrl, 'utf8')
    .replace("import { Injectable } from '@angular/core';", '')
    .replace("@Injectable({ providedIn: 'root' })", '')
    .replace(/from '([^']+)'/g, (whole, path) => path.startsWith('.')
      ? `from '${new URL(path.endsWith('.ts') ? path : `${path}.ts`, sourceUrl).href}'` : whole);
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return (await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`))[exportName];
}
export const GameDungeonService = await loadService('game-dungeon.service.ts', 'GameDungeonService');
export const GameDungeonSessionService = await loadService('game-dungeon-session.service.ts', 'GameDungeonSessionService');

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
export function makeWorld(profile, dungeonId) {
  const weaponInventory = profile.forms.map((form, i) => {
    if (form === 'starter') return { id: i + 1, name: 'Startschwert', weaponForm: 'sword', ...getStarterBlueprint() };
    const slots = getWeaponForm(form).parts.map(part => {
      const category = part.categories[0];
      const materialId = profile.materials.find(id => MATERIAL_REFERENCES.find(r => r.materialId === id)?.definition.category === category);
      if (!materialId) throw Error(`Profile ${profile.id}: missing ${category} for ${form}.${part.id}`);
      return { slot: part.materialSlot, materialId };
    });
    return { id: i + 1, name: form, weaponForm: form, slots, stats: calculateWeaponStats(slots, form) };
  });
  const characters = profile.classes.map((classId, i) => {
    const level = Array.isArray(profile.level) ? profile.level[i] : profile.level;
    const stats = calculateCharacterStats(classId, [weaponInventory[i]], characterStatLevelMultiplier(level));
    const twoHanded = !getWeaponForm(weaponInventory[i].weaponForm).oneHanded;
    return { id: i + 1, name: classId, classId, raceId: 'human', level, xp: 0,
      ...stats, hp: stats.maxHp, energy: stats.maxEnergy, alive: true,
      equipment: { leftHand: i + 1, rightHand: twoHanded ? i + 1 : null } };
  });
  const team = createTeam(1, dungeonId);
  team.dungeonTeamSlots = [...characters.map(c => c.id), ...Array(4 - characters.length).fill(null)];
  const world = { characters, weaponInventory, inventory: {}, teams: { 1: team } };
  initializeReleaseProgress(world);
  for (let id = 2; id <= 5; id++) world.releaseProgress.claimed[`dungeon_${id}`] = true;
  return world;
}

export function nextEvent(team) {
  return team.dungeonRun ? Math.min(...team.dungeonRun.attackPoints.map(p => p.nextAt))
    : team.dungeonLootCollect?.readyAt ?? team.dungeonSearch?.nextCheckAt ?? Infinity;
}
export function freshWave(profile, dungeonId, createWorld = makeWorld) {
  const world = createWorld(profile, dungeonId), service = new GameDungeonService({ getState: () => world });
  service.toggleAuto(0);
  service.startRun(service.getState(), 0, { events: [], saveRequested: false });
  const team = world.teams[1];
  let at = 0, actions = 0;
  while (team.dungeonRun) {
    at = nextEvent(team);
    service.update(at);
    if (++actions > 20000) throw Error('Combat measurement exceeded 20000 events');
  }
  return { won: team.dungeonWavesDefeated > 0, ms: at, actions };
}

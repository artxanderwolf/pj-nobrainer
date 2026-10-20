import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const gameDir = new URL('../src/app/game/', import.meta.url);
const coreDir = new URL('../src/app/core/', import.meta.url);
const temporaryFiles = [];

function writeTemporary(baseUrl, name, source) {
  const url = new URL(name, baseUrl);
  writeFileSync(url, source, 'utf8');
  temporaryFiles.push(url);
  return url;
}

writeTemporary(gameDir, 'game-core.node-check.ts', readFileSync(new URL('game-core.ts', gameDir), 'utf8'));
writeTemporary(gameDir, 'combat-core.node-check.ts', readFileSync(new URL('combat-core.ts', gameDir), 'utf8'));
writeTemporary(gameDir, 'dungeon-search-core.node-check.ts', readFileSync(new URL('dungeon-search-core.ts', gameDir), 'utf8'));
writeTemporary(gameDir, 'character-progression-core.node-check.ts', readFileSync(new URL('character-progression-core.ts', gameDir), 'utf8'));
const dungeonCoreSource = readFileSync(new URL('dungeon-core.ts', gameDir), 'utf8')
  .replace("from './game-core';", "from './game-core.node-check.ts';")
  .replace("from './combat-core';", "from './combat-core.node-check.ts';")
  .replace("from './dungeon-search-core';", "from './dungeon-search-core.node-check.ts';");
writeTemporary(gameDir, 'dungeon-core.node-check.ts', dungeonCoreSource);

let dungeonServiceSource = readFileSync(new URL('game-dungeon.service.ts', coreDir), 'utf8')
  .replace("import { Injectable } from '@angular/core';\n", '')
  .replace("from '../game/combat-core';", "from '../game/combat-core.node-check.ts';")
  .replace("from '../game/dungeon-core';", "from '../game/dungeon-core.node-check.ts';")
  .replace("from '../game/game-core';", "from '../game/game-core.node-check.ts';")
  .replace("from '../game/character-progression-core';", "from '../game/character-progression-core.node-check.ts';")
  .replace(
    "import { GameStateService, type MutableGameState } from './game-state.service';",
    "import type { GameStateService, MutableGameState } from './game-state.service';"
  )
  .replace("@Injectable({ providedIn: 'root' })\n", '')
  .replace(
    'constructor(private readonly gameState: GameStateService) {}',
    'private readonly gameState: GameStateService;\n\n  constructor(gameState: GameStateService) { this.gameState = gameState; }'
  );
const dungeonServiceUrl = writeTemporary(coreDir, 'game-dungeon.service.node-check.ts', dungeonServiceSource);

function makeCharacter(id, energy = 100) {
  return {
    id,
    name: `Test ${id}`,
    classId: 'recruit',
    level: 1,
    xp: 0,
    hp: 30,
    maxHp: 30,
    alive: true,
    energy,
    maxEnergy: 100,
    armor: 2,
    dodge: 0.1,
    strengthFactor: 1,
    precision: 1,
    equipment: { leftHand: 1, rightHand: null }
  };
}

function makeState(characterCount = 1, energy = 100) {
  const characters = Array.from({ length: characterCount }, (_, index) => makeCharacter(index + 1, energy));
  return {
    characters,
    weaponInventory: [{
      id: 1,
      name: 'Testwaffe',
      stats: { damagePerHit: 100, attackSpeed: 1, hitChance: 1, penetration: 1 }
    }],
    inventory: {},
    expeditionActive: false,
    dungeonAuto: false,
    dungeonStopRequested: false,
    dungeonRun: null,
    dungeonSearch: null,
    dungeonLootCollect: null,
    dungeonLoot: {},
    dungeonTeamSlots: [1, characterCount > 1 ? 2 : null, null, null],
    dungeonCycleOriginalIds: [],
    dungeonCycleActiveIds: [],
    dungeonWavesDefeated: 0,
    dungeonSessionStartWaves: 0,
    lastEnergyUpdate: 0
  };
}

const originalRandom = Math.random;

try {
  const { GameDungeonService } = await import(`${dungeonServiceUrl.href}?check=${Date.now()}`);

  const successState = makeState(1);
  successState.characters[0].xp = 95;
  const successService = new GameDungeonService({ getState: () => successState });
  let result = successService.toggleAuto(1000);
  assert.equal(successState.dungeonAuto, true);
  assert.deepEqual(successState.dungeonCycleOriginalIds, [1]);
  assert.deepEqual(successState.dungeonCycleActiveIds, [1]);
  assert.equal(successState.dungeonSearch.nextCheckAt, 2000);
  assert.equal(result.saveRequested, true);

  Math.random = () => 0;
  result = successService.update(2000);
  assert.ok(successState.dungeonRun, 'Bei Begegnungswurf 0 muss eine Dungeon-Welle starten.');
  assert.equal(successState.characters[0].energy, 96, 'Der Wellenstart muss 4 Energie verbrauchen.');
  assert.equal(successState.dungeonRun.enemies.length, 1);
  assert.equal(successState.dungeonRun.enemies[0].name, 'Neuling 1');
  assert.deepEqual(successState.dungeonRun.enemies[0].lootMaterialIds, [9, 5, 3]);
  assert.equal(successState.dungeonRun.enemies[0].xpDrop, 10);

  Math.random = () => 0.5;
  result = successService.update(3000);
  assert.equal(successState.dungeonRun, null, 'Die Testwaffe muss den Gegner in der ersten fälligen Aktion besiegen.');
  assert.equal(successState.dungeonWavesDefeated, 1);
  assert.ok(successState.dungeonLootCollect, 'Nach Sieg muss zunächst die Loot-Zwischenphase aktiv sein.');
  assert.deepEqual(successState.dungeonLootCollect.drops, [{ materialId: 9 }], 'Aktive Dungeon-Beute muss nur noch die stabile Material-ID tragen.');
  assert.deepEqual(successState.dungeonCycleActiveIds, [1], 'Überlebende müssen für den nächsten Durchlauf aktiv bleiben.');
  assert.equal(successState.characters[0].level, 2, '10 Gegner-XP müssen bei 95/100 XP den Levelaufstieg auslösen.');
  assert.equal(successState.characters[0].xp, 5);
  assert.equal(successState.characters[0].maxHp, 33, 'Level 2 muss die nicht-null HP-Grundbasis mit 1,1 skalieren.');
  assert.ok(Math.abs(successState.characters[0].maxEnergy - 110) < 1e-12);
  assert.ok(result.events.some(event => event.text.includes('erreicht Level 2')));

  result = successService.update(4000);
  assert.equal(successState.dungeonLootCollect, null, 'Die Loot-Zwischenphase muss nach Ablauf abgeschlossen werden.');
  assert.equal(Object.values(successState.dungeonLoot).reduce((sum, entry) => sum + (entry.qty || 0), 0), 1);
  assert.equal(successState.dungeonLoot.Lederfetzen?.qty, 1, 'Neuling muss aus seinem ID-Pool gewichten; bei Testwurf 0,5 gewinnt Lederfetzen.');
  assert.equal(successState.dungeonSearch.nextCheckAt, 5000, 'Bei aktivem Lauf muss nach dem Loot wieder gesucht werden.');
  assert.equal(successService.getSessionWaveCount(), 1);

  const collected = successService.collectLoot();
  assert.equal(Object.keys(successState.dungeonLoot).length, 0, 'Manuelles Einsammeln muss die Dungeon-Beute leeren.');
  assert.equal(Object.values(successState.inventory).reduce((sum, entry) => sum + (entry.qty || 0), 0), 1);
  assert.equal(collected.events.length, 1);

  const legacyLootState = makeState(1);
  legacyLootState.dungeonLootCollect = {
    readyAt: 1000,
    drops: [{ name: 'Kupfer', category: 'Metall' }],
    enemyCount: 1
  };
  const legacyLootService = new GameDungeonService({ getState: () => legacyLootState });
  const legacyLootResult = legacyLootService.update(1000);
  assert.equal(legacyLootState.dungeonLoot.Kupfer?.qty, 1, 'Alte laufende Loot-Saves mit Materialnamen müssen weiterhin auflösbar sein.');
  assert.ok(legacyLootResult.events.some(event => event.text.includes('Kupfer')));

  const splitState = makeState(2);
  const splitService = new GameDungeonService({ getState: () => splitState });
  splitService.toggleAuto(1000);
  Math.random = () => 0;
  splitService.update(2000);
  assert.equal(splitState.dungeonRun.enemies.length, 1);
  Math.random = () => 0.5;
  splitService.update(3000);
  assert.equal(splitState.characters[0].xp, 5);
  assert.equal(splitState.characters[1].xp, 5, '10 Basis-XP eines Gegners werden gleichmäßig auf zwei Teilnehmer verteilt.');

  const failureState = makeState(2);
  const failureService = new GameDungeonService({ getState: () => failureState });
  failureService.toggleAuto(1000);
  Math.random = () => 0;
  failureService.update(2000);
  assert.ok(failureState.dungeonRun);
  failureState.characters.forEach(character => { character.hp = 0; character.alive = false; });
  const failureResult = failureService.update(2500);
  assert.equal(failureState.dungeonRun, null);
  assert.deepEqual(failureState.dungeonCycleActiveIds, [1, 2], 'Nach Niederlage muss das ursprüngliche Team wieder aktiv sein.');
  failureState.characters.forEach(character => {
    assert.equal(character.hp, character.maxHp, 'Nach Niederlage müssen die HP des Ursprungsteams zurückgesetzt sein.');
    assert.equal(character.alive, true, 'Nach Niederlage müssen Mitglieder des Ursprungsteams wieder leben.');
  });
  assert.ok(failureState.dungeonSearch, 'Bei aktivem Lauf muss nach Niederlage wieder die Suche starten.');
  assert.ok(failureResult.events.some(event => event.text.startsWith('Welle verloren:')));

  const searchAbortState = makeState(1);
  const searchAbortService = new GameDungeonService({ getState: () => searchAbortState });
  searchAbortService.toggleAuto(1000);
  const searchAbortResult = searchAbortService.toggleAuto(1500);
  assert.equal(searchAbortState.dungeonAuto, false);
  assert.equal(searchAbortState.dungeonSearch, null);
  assert.equal(searchAbortState.dungeonStopRequested, false);
  assert.deepEqual(searchAbortState.dungeonTeamSlots, [null, null, null, null], 'Ein sofortiger Abbruch muss die Teamauswahl leeren.');
  assert.match(searchAbortResult.alertMessage || '', /Dungeon 1 – Lauf abgebrochen/);

  const waveAbortState = makeState(1);
  const waveAbortService = new GameDungeonService({ getState: () => waveAbortState });
  waveAbortService.toggleAuto(1000);
  Math.random = () => 0;
  waveAbortService.update(2000);
  assert.ok(waveAbortState.dungeonRun);
  const abortRequest = waveAbortService.toggleAuto(2100);
  assert.equal(waveAbortState.dungeonAuto, false);
  assert.equal(waveAbortState.dungeonStopRequested, true, 'Abbruch während einer Welle muss bis zum Wellenende vorgemerkt werden.');
  assert.ok(waveAbortState.dungeonRun, 'Die laufende Welle darf durch den Abbruch nicht abgeschnitten werden.');
  assert.ok(abortRequest.events.some(event => event.text.includes('aktuelle Welle wird noch beendet')));
  Math.random = () => 0.5;
  const waveFinished = waveAbortService.update(3000);
  assert.ok(waveAbortState.dungeonLootCollect, 'Nach der noch laufenden Welle muss zunächst die Beutephase beendet werden.');
  assert.equal(waveFinished.alertMessage, undefined);
  const aborted = waveAbortService.update(4000);
  assert.equal(waveAbortState.dungeonStopRequested, false);
  assert.deepEqual(waveAbortState.dungeonTeamSlots, [null, null, null, null], 'Nach abgeschlossenem Abbruch muss das Team geleert sein.');
  assert.equal(waveAbortState.dungeonAuto, false);
  assert.match(aborted.alertMessage || '', /Dungeon 1 – Lauf abgebrochen/);
  assert.match(aborted.alertMessage || '', /Besiegte Wellen: 1/);
  assert.match(aborted.alertMessage || '', /Beute:/);

  const lowEnergyState = makeState(1, 3);
  const lowEnergyService = new GameDungeonService({ getState: () => lowEnergyState });
  const lowEnergyResult = lowEnergyService.toggleAuto(1000);
  assert.equal(lowEnergyState.dungeonAuto, false, 'Bei unzureichender Energie muss der Lauf beendet werden.');
  assert.equal(lowEnergyState.dungeonSearch, null);
  assert.deepEqual(lowEnergyState.dungeonTeamSlots, [null, null, null, null], 'Nach Energieende muss für den nächsten Lauf ein neues Team gewählt werden.');
  assert.ok(lowEnergyResult.events.some(event => event.text.includes('Nicht genügend Energie')));
  assert.match(lowEnergyResult.alertMessage || '', /Ausdauer reicht für keine weitere Welle/);

  console.log('Dungeon-Service-Ablauf: Laufstart, Wiederholung, ID-basierter Loot, Altstand-Kompatibilität, Abbruch, Energieende, XP/Level und Beute sind konsistent.');
} finally {
  Math.random = originalRandom;
  for (const url of temporaryFiles.reverse()) {
    try { unlinkSync(url); } catch {}
  }
}

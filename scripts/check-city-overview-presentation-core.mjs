import assert from 'node:assert/strict';
import {
  CITY_OVERVIEW_ACTIONS,
  CITY_OVERVIEW_BACKGROUND_ASSET,
  getCityOverviewPresentation
} from '../src/app/game/city-overview-presentation-core.ts';

assert.equal(CITY_OVERVIEW_BACKGROUND_ASSET, 'ui/city.png');
assert.equal(CITY_OVERVIEW_ACTIONS.length, 21, 'Die Stadtübersicht besitzt nicht alle vorgesehenen Aktionsflächen.');
assert.equal(new Set(CITY_OVERVIEW_ACTIONS.map(action => action.id)).size, CITY_OVERVIEW_ACTIONS.length, 'Stadtaktionen benötigen eindeutige technische IDs.');

for (const action of CITY_OVERVIEW_ACTIONS) {
  const { left, top, width, height } = action.position;
  assert.ok(left >= 0 && top >= 0 && width > 0 && height > 0, `${action.id} besitzt ungültige Positionswerte.`);
  assert.ok(left + width <= 100.01, `${action.id} ragt horizontal aus der Stadtkarte.`);
  assert.ok(top + height <= 100.01, `${action.id} ragt vertikal aus der Stadtkarte.`);
  if (action.kind === 'page') assert.ok(action.targetPageId, `${action.id} besitzt kein stabiles Navigationsziel.`);
  if (action.kind === 'team') assert.ok(Number.isInteger(action.teamId) && action.teamId >= 1 && action.teamId <= 10, `${action.id} besitzt keine gültige Team-ID.`);
}

const expectedPageTargets = {
  recruit: 'tavern',
  market: 'market',
  dungeon: 'dungeon',
  roster: 'roster',
  forge: 'forge',
  materials: 'storage-materials',
  weapons: 'storage-weapons'
};
for (const [id, targetPageId] of Object.entries(expectedPageTargets)) {
  const action = CITY_OVERVIEW_ACTIONS.find(entry => entry.id === id);
  assert.equal(action?.targetPageId, targetPageId, `${id} verweist nicht auf das bestehende Menü ${targetPageId}.`);
}

const presentation = getCityOverviewPresentation([1, 2, 5]);
for (const id of ['recruit', 'market', 'dungeon', 'roster', 'forge', 'materials', 'weapons', 'missions']) {
  assert.equal(presentation.find(action => action.id === id)?.enabled, true, `${id} soll als vorhandener Bereich aktiv sein.`);
}
for (const teamId of [1, 2, 5]) {
  assert.equal(presentation.find(action => action.id === `team-${teamId}`)?.enabled, true, `Vorhandenes Team ${teamId} ist nicht aktiv.`);
}
for (const teamId of [3, 4, 6, 7, 8, 9, 10]) {
  const team = presentation.find(action => action.id === `team-${teamId}`);
  assert.equal(team?.enabled, false, `Nicht gekauftes Team ${teamId} darf nicht aktiv sein.`);
  assert.equal(team?.disabledReason, 'Noch nicht freigeschaltet');
}
for (const id of ['armor', 'upgrade', 'activity']) {
  const action = presentation.find(entry => entry.id === id);
  assert.equal(action?.enabled, false, `${id} darf vor Implementierung der Mechanik nicht aktiv sein.`);
  assert.equal(action?.disabledReason, 'Noch nicht verfügbar');
}

console.log('Stadtübersicht: stabile technische Ziele, Positionen, Team-Freischaltung und zukünftige deaktivierte Bereiche sind konsistent.');

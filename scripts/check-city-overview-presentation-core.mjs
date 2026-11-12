import assert from 'node:assert/strict';
import {
  CITY_QUICK_ACCESS,
  getCityOverviewPresentation,
  getCityLegacyTeamAccess
} from '../src/app/game/city-overview-presentation-core.ts';
import {
  createInitialCityLayout,
  CITY_BUILDING_TYPES
} from '../src/app/game/city-layout-core.ts';

const layout = createInitialCityLayout();
const snapshot = JSON.stringify(layout);
const projected = getCityOverviewPresentation(layout, [1, 2, 5]);
assert.equal(projected.length, 6, 'S08 darf nicht die alten 21 Hotspots zeichnen.');
assert.deepEqual(projected.map(x => x.buildingInstanceId), [
  'building-1','building-2','building-3','building-4','building-5','building-6'
]);
assert.deepEqual(projected.map(x => x.buildingTypeId), [
  'roster','tavern','forge','market','team','builder'
]);
assert.deepEqual(projected.map(x => [x.x, x.y, x.width, x.height]), [
  [0,0,2,2],[4,0,2,2],[8,0,2,2],
  [0,4,2,2],[4,4,2,2],[8,4,2,2]
]);
for (const building of projected) {
  assert.equal(building.assetKey, CITY_BUILDING_TYPES[building.buildingTypeId].assetKey);
  assert.ok(building.icon, 'Gebäude benötigt ein Icon-Platzhalter.');
}
const destinations = new Map(projected.filter(x => x.navigation?.kind === 'page')
  .map(x => [x.buildingTypeId, x.navigation.pageId]));
assert.deepEqual(Object.fromEntries(destinations), {
  roster:'roster', tavern:'tavern', forge:'forge', market:'market'
});
const team1 = projected.find(x => x.buildingTypeId === 'team');
assert.deepEqual(team1.navigation, { kind:'team', teamId:1 });
assert.equal(team1.enabled, true);
const builder = projected.find(x => x.buildingTypeId === 'builder');
assert.equal(builder.enabled, false);
assert.match(builder.disabledReason, /Baumeister/);
assert.equal(builder.navigation, null);

assert.deepEqual(CITY_QUICK_ACCESS.map(x => x.id),
  ['dungeon','materials','weapons','missions']);
assert.deepEqual(CITY_QUICK_ACCESS.filter(x => x.kind === 'page').map(x => x.pageId),
  ['dungeon','storage-materials','storage-weapons']);
assert.equal(CITY_QUICK_ACCESS.find(x => x.id === 'missions')?.kind,'mission');

assert.deepEqual(getCityLegacyTeamAccess(layout,[1,2,5]), [
  {teamId:2,label:'Team 2'},{teamId:5,label:'Team 5'}
], 'Bereits vorhandene Teams ohne Stadtinstanz müssen bis S12 erreichbar bleiben.');
assert.deepEqual(getCityLegacyTeamAccess(layout,[1,1,2,2,5]), [
  {teamId:2,label:'Team 2'},{teamId:5,label:'Team 5'}
]);
assert.equal(getCityLegacyTeamAccess(layout,[1]).length, 0);

const teamNotOwned = getCityOverviewPresentation(layout, [2,5])
  .find(x => x.buildingTypeId === 'team');
assert.equal(teamNotOwned.enabled,false);
assert.equal(teamNotOwned.navigation,null);

const updated = structuredClone(layout);
updated.buildings[0].status='underConstruction';
updated.buildings[1].status='inactive';
const disabled = getCityOverviewPresentation(updated,[1]);
assert.equal(disabled[0].enabled,false);
assert.match(disabled[0].disabledReason,/Bau/);
assert.equal(disabled[1].enabled,false);
assert.match(disabled[1].disabledReason,/aktiv/);
assert.equal(JSON.stringify(layout), snapshot, 'Reines Rendering darf den Spielstand nicht ändern.');

const moved = structuredClone(layout);
moved.buildings[0].x=2; // Noch keine Move-Funktion, nur Präsentation eines gespeicherten Felds.
const newPresentation = getCityOverviewPresentation(moved,[1]);
assert.equal(newPresentation[0].x,2,'Die Karte muss gespeicherte Positionen statt feste Prozent-Hotspots nutzen.');
assert.equal(projected[0].x,0,'Keine gemeinsame Referenz zwischen Layouts.');

console.log('S08: sechs persistierte IDs, 12x8-Baukoordinaten, vier Gebäudeziele, Team 1, Altteams, drei Direktwege und Missionen geprüft.');

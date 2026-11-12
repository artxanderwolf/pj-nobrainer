import assert from 'node:assert/strict';
import { createInitialCityLayout, validateCityLayout } from '../src/app/game/city-layout-core.ts';
import { createTeam, teamIds, getTeamOffer, buyTeam } from '../src/app/game/team-core.ts';
import { migrateCityEconomy } from '../src/app/game/city-economy-core.ts';
import { initializeCityConstruction, startCityConstruction, finishCityConstruction, CITY_CONSTRUCTION_DURATION_MS } from '../src/app/game/city-construction-core.ts';
import { reconcileCityTeamBuildings } from '../src/app/game/city-team-core.ts';
import { getCityOverviewPresentation, getCityLegacyTeamAccess } from '../src/app/game/city-overview-presentation-core.ts';
import { encodeSave, decodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';
import { validateImportedSave } from '../src/app/game/save-transfer-core.ts';

function setupOldSave() {
  const state = {gold: 1_000_000, characters: [], inventory: {},
    cityLayout: createInitialCityLayout(), teams: {1:createTeam(1)},
    upgrades: {forgeSlots:1,marketSlots:1}};
  migrateCityEconomy(state);
  initializeCityConstruction(state);
  return state;
}
const modern = setupOldSave();
assert.equal(getTeamOffer(modern).reason,'building-required');
const initialGold = modern.gold;
assert.equal(buyTeam(modern).ok,false,'Kein zweiter alter Teamkauf.');
assert.equal(modern.gold,initialGold);
assert.deepEqual(teamIds(modern),[1]);

const old = setupOldSave();
const sessions = {};
for(let id=2;id<=10;id++){
  old.teams[id] = createTeam(id);
  old.teams[id].log.unshift({text:'Unverändert '+id,className:''});
}
// Active expedition/session state must not be reset by S12 migration.
old.teams[2].dungeonAuto=true;
old.teams[7].dungeonAuto=true;
old.teams[2].dungeonSessionEndsAt=1_900_000_000_000;
old.teams[7].dungeonSessionEndsAt=1_900_000_000_000;
const teamSnapshot=structuredClone(old.teams);
const originalBuildings=old.cityLayout.buildings.map(x=>structuredClone(x));
const beforeGold=old.gold;
assert.equal(reconcileCityTeamBuildings(old),true);
assert.equal(old.gold,beforeGold,'Alte Teamrechte dürfen nicht erneut Nickel kosten.');
assert.deepEqual(old.teams,teamSnapshot,'Alle zehn Teams und aktiven Sitzungen erhalten.');
validateCityLayout(old.cityLayout);
assert.ok(old.cityLayout.buildings.length>=15);
assert.deepEqual(old.cityLayout.buildings.slice(0,originalBuildings.length),originalBuildings,
  'Alte Positionen, IDs und Jobs werden nicht verändert.');
const teamBuildings=old.cityLayout.buildings.filter(b=>b.buildingTypeId==='team');
assert.equal(teamBuildings.length,10);
assert.deepEqual(teamBuildings.map(b=>b.teamId).sort((a,b)=>a-b),Array.from({length:10},(_,i)=>i+1));
assert.deepEqual(getCityLegacyTeamAccess(old.cityLayout,teamIds(old)),[]);
const presented=getCityOverviewPresentation(old.cityLayout,teamIds(old)).filter(x=>x.buildingTypeId==='team');
assert.equal(presented.length,10);
for(const view of presented){
  assert.equal(view.enabled,true);
  assert.deepEqual(view.navigation,{kind:'team',teamId:view.teamId});
  assert.ok(old.teams[view.teamId], 'Jeder Eingang öffnet eine vorhandene Team-ID.');
}
const saved=JSON.stringify(old);
assert.equal(reconcileCityTeamBuildings(old),false);
assert.equal(JSON.stringify(old),saved,'Bei Reload keine zweite Migration.');
assert.equal(getTeamOffer(old).reason,'max');
const json=encodeSave(old);
assert.equal(SAVE_VERSION,22,'S14 hat das bisherige Save20 um die Forge-Ready-Felder auf Save22 erweitert.');
assert.equal(validateImportedSave(json).ok,true);
const restored=decodeSave(json).state;
assert.equal(reconcileCityTeamBuildings(restored),false);
assert.deepEqual(restored,old);
assert.deepEqual(restored.teams,teamSnapshot);

// No extra claim when a team building is already under construction.
const build=setupOldSave();
const now=1_800_000_000_000;
const pending=startCityConstruction(build,'team',2,0,now);
assert.equal(pending.ok,true);
assert.equal(build.cityLayout.buildings.filter(b=>b.buildingTypeId==='team').length,2);
assert.equal(reconcileCityTeamBuildings(build),false);
assert.equal(build.teams[2],undefined);
finishCityConstruction(build,now+CITY_CONSTRUCTION_DURATION_MS);
assert.ok(build.teams[2]);
assert.equal(reconcileCityTeamBuildings(build),false);
assert.equal(getTeamOffer(build).reason,'building-required');
assert.equal(buyTeam(build).ok,false);

// Reconciliation must be free even when a city is fully occupied.
const full=setupOldSave();
for(let id=2;id<=10;id++)full.teams[id]=createTeam(id);
const firstGrid=structuredClone(full.cityLayout.grid);
assert.equal(reconcileCityTeamBuildings(full),true);
assert.equal(full.cityEconomy.paidExpansions,0);
assert.equal(full.gold,1_000_000);
assert.equal(full.cityLayout.grid.minX,firstGrid.minX);
assert.equal(full.cityLayout.buildings.filter(b=>b.buildingTypeId==='team').length,10);

console.log('S12: zehn Teamgebäude und parallele Sessions, direkte ID-Navigation, Altteam-Migration, No-Doppelkauf, Save22, Baustelle und Idempotenz geprüft.');

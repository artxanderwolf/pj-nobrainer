import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_UI_VERSION} from '../src/app/game/app-shell-presentation-core.ts';
import {SAVE_VERSION} from '../src/app/game/save-codec.ts';
import {getWeaponCraftingSlots} from '../src/app/game/game-core.ts';
import {RUNE_IDS, runeSocketCount, applyRuneBonuses} from '../src/app/game/rune-core.ts';
import {calculateWeaponStats} from '../src/app/game/game-core.ts';

const read = path => readFileSync(path,'utf8');
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
const help=read('src/app/game/index-page-markup.ts');
const build=read('.github/workflows/angular-ci.yml');
const android=read('.github/workflows/android-ci.yml');
const scripts=pkg.scripts.check || '';

assert.equal(APP_UI_VERSION,pkg.version,'Angezeigte Version und package.json müssen identisch sein');
assert.equal(lock.version,pkg.version,'Lockfile-Version darf nicht abweichen');
assert.equal(lock.packages[''].version,pkg.version,'Lockfile-Rootversion muss synchron sein');
assert.equal(SAVE_VERSION,29,'S24 verändert ohne Schemaänderung die Save-Version nicht');
assert.match(help,/data-rune-system-help/,'Der Runen-Hilfeabschnitt muss vorhanden sein');
assert.match(help,/Runenwerkstatt/,'Die kostenlose Runenwerkstatt muss erklärt sein');
assert.match(help,/0,1\s*%/,'Die Runendrop-Chance muss erklärt sein');
assert.doesNotMatch(help,/Runen werden erst mit dem späteren Runensystem ergänzt/,'Veralteter Runenhinweis in der Hilfe');
assert.equal(RUNE_IDS.length,6,'Genau sechs Start-Runen');
assert.deepEqual([1,2,3,4,5,6].map(runeSocketCount),[0,1,2,3,4,5]);
assert.equal(getWeaponCraftingSlots('sword').includes('special'),false,'Neue Waffen dürfen kein Spezialmaterial benötigen');
const base=calculateWeaponStats([
  {slot:'workingPart',materialId:4},{slot:'back',materialId:1},
  {slot:'gripCore',materialId:1},{slot:'gripWrap',materialId:9},
  {slot:'parry',materialId:1}
],'sword');
const five=applyRuneBonuses(base,Array(5).fill('rune-ges-2'));
assert.ok(Math.abs(five.attackSpeed/base.weaponBaseSpeed-1.75)<1e-9,'Fünf GES-II-Runen sind additiv');
for(const name of ['check:s20-runes','check:s21-s23-runes','check:s19-tavern','check:races','check:save','check:parallel-dungeons','check:android-system']){
  assert.ok(scripts.includes('npm run '+name),'Der vollständige Check enthält '+name);
}
for(const name of ['Smoke test built runtime','Test save JSON export and import in browser','Test Trainingslager resume across browser restart']){
  assert.ok(build.includes(name),'Web-CI muss enthalten: '+name);
  assert.ok(android.includes(name),'Android-CI muss enthalten: '+name);
}
assert.match(android,/npx cap sync android/,'Android-CI synchronisiert Capacitor');
console.log('S24: Versions-/Save-Konsistenz, Runen-Hilfe, 5er-Grenzfall, neue Waffenslots und CI-Integrationsabdeckung geprüft. Manuelle Web-/Geräteabnahme bleibt separat.');

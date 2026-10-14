import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const marketService = readFileSync('src/app/core/game-market.service.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const marketAdapter = readFileSync('src/app/core/legacy-market-adapter.service.ts', 'utf8');
const marketPresentationAdapter = readFileSync('src/app/core/legacy-market-presentation-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

assert.match(marketService, /constructor\(private readonly gameState: GameStateService\)/, 'Der Angular-Markt-Service verwendet den Angular-State nicht.');
assert.match(marketService, /hasMarketCapacity\(/, 'Marktkapazität läuft nicht über den bestehenden Market-Core.');
assert.match(marketService, /materialSellData\(name\)/, 'Materialverkaufswerte laufen nicht über den bestehenden Economy-Core.');
assert.match(marketService, /weaponSellData\(weapon\)/, 'Waffenverkaufswerte laufen nicht über den bestehenden Economy-Core.');
assert.match(marketService, /getWeaponEquipLocation\(state\.characters, weaponId\)/, 'Ausgerüstete Waffen werden nicht über den bestehenden Equipment-Core geschützt.');
assert.match(marketService, /enqueueMarketJob\(/, 'Verkaufsstart und Warteschlange laufen nicht über den Market-Core.');
assert.match(marketService, /cancelMarketJob\(/, 'Marktabbruch läuft nicht über den Market-Core.');
assert.match(marketService, /advanceMarketJobs\(/, 'Markt-Timeline läuft nicht über den Market-Core.');
assert.match(marketService, /state\.gold \+= job\.valueNickel;/, 'Verkaufserlöse werden nicht durch den Angular-Markt-Service gutgeschrieben.');
assert.match(marketService, /state\.inventory\[job\.name\] \?\?=/, 'Abgebrochene Materialverkäufe werden nicht im Angular-Markt-Service zurückgegeben.');
assert.match(marketService, /state\.weaponInventory\.unshift\(job\.weaponSnapshot as RuntimeMarketWeapon\)/, 'Abgebrochene Waffenverkäufe werden nicht im Angular-Markt-Service zurückgegeben.');
assert.match(marketService, /window\.NoBrainerMarketCompatibility = \{/, 'Die kontrollierte Markt-Kompatibilitätsbrücke fehlt.');
assert.match(marketService, /delete window\.NoBrainerMarketCompatibility;/, 'Die Markt-Kompatibilitätsbrücke kann nicht entfernt werden.');

assert.match(runtimeService, /private readonly gameMarket: GameMarketService/, 'GameRuntimeService besitzt keinen Angular-Markt-Service.');
assert.match(runtimeService, /private runTickCycle\(\): void \{[\s\S]*const marketUpdate = this\.gameMarket\.update\(\);/, 'Der Angular-Tick aktualisiert den Markt nicht direkt.');
assert.match(runtimeService, /runtime\.prepare\(\);[\s\S]*this\.gameEnergy\.update\(\);[\s\S]*const forgeUpdate = this\.gameForge\.update\(\);[\s\S]*const marketUpdate = this\.gameMarket\.update\(\);[\s\S]*runtime\.updateDungeonAutomation\(\);[\s\S]*this\.gameEnergy\.update\(\);/, 'Die Startreihenfolge Energie → Schmiede → Markt → Dungeon → Energie wurde nicht erhalten.');
assert.doesNotMatch(runtimeService, /\bupdateMarketJob\(\): boolean;/, 'GameRuntimeApi enthält weiterhin einen Legacy-Markt-Callback.');
assert.doesNotMatch(runtimeService, /runtime\.updateMarketJob\(\)/, 'GameRuntimeService ruft weiterhin updateMarketJob aus der Legacy-Runtime auf.');
assert.match(runtimeService, /Verkauf abgeschlossen: \$\{sale\.name\} → \$\{formatCurrencyNickel\(sale\.valueNickel\)\}\./, 'Markt-Abschlussmeldungen gehen beim Angular-Cutover verloren.');

assert.doesNotMatch(marketAdapter, /MARKET_CORE_BRIDGE|NoBrainerMarketCore/, 'Der Legacy-Markt-Adapter registriert weiterhin den Market-Core selbst global.');
assert.match(marketAdapter, /getMarketCompatibility\(\)\.startMaterial\(name,quantity,Date\.now\(\)\)/, 'Legacy-Materialverkauf delegiert nicht an Angular.');
assert.match(marketAdapter, /getMarketCompatibility\(\)\.startWeapon\(weaponId,Date\.now\(\)\)/, 'Legacy-Waffenverkauf delegiert nicht an Angular.');
assert.match(marketAdapter, /getMarketCompatibility\(\)\.cancel\(kind,index,Date\.now\(\)\)/, 'Legacy-Marktabbruch delegiert nicht an Angular.');
assert.match(marketAdapter, /'function startMarketQueuedJob\('/, 'Der Legacy-Markt-Cutover besitzt keinen Startanker.');
assert.match(marketAdapter, /'function renderMarketJob\(\)\{'/, 'Der Legacy-Markt-Cutover besitzt keinen Endanker.');
assert.doesNotMatch(marketPresentationAdapter, /NoBrainerMarketCore/, 'Die Markt-Präsentation greift weiterhin direkt auf den alten globalen Market-Core zu.');
assert.match(marketPresentationAdapter, /window\.NoBrainerMarketCompatibility\.hasCapacity\(\)/, 'Die Markt-Präsentation bezieht die Kapazität nicht aus dem Angular-Markt-Service.');

const registrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /\n  updateMarketJob,/, 'Die Legacy-Runtime exportiert weiterhin updateMarketJob.');
assert.match(registrationMatch[1], /function prepareGameRuntime\(\)\{\n  loadGame\(\);\n\}/, 'Der Runtime-Prepare-Callback enthält weiterhin Fachupdates, die Angular orchestrieren soll.');

const openForgeIndex = appComponent.indexOf('this.gameForge.openLegacyCompatibilityBridge();');
const openMarketIndex = appComponent.indexOf('this.gameMarket.openLegacyCompatibilityBridge();');
const openStateIndex = appComponent.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(openForgeIndex >= 0 && openMarketIndex > openForgeIndex && openStateIndex > openMarketIndex, 'Die Markt-Kompatibilitätsbrücke wird nicht vor State- und Runtime-Bootstrap geöffnet.');
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameMarket\.closeLegacyCompatibilityBridge\(\);/, 'Die Markt-Kompatibilitätsbrücke wird beim App-Abbau nicht geschlossen.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.65';/, 'Die App-Version wurde nicht auf v0.12.65 gesetzt.');

console.log('Markt-Eigentümerschaft: Material-/Waffenverkauf, Plätze, Queue, Abbruch, Rückgabe, Fortschritt und Erlös laufen auf Angular-State im GameMarketService; Legacy-Code enthält nur noch UI-Kompatibilitätswrapper.');

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const dungeonCore = readFileSync('src/app/game/dungeon-core.ts', 'utf8');
const dungeonService = readFileSync('src/app/core/game-dungeon.service.ts', 'utf8');
const sessionService = readFileSync('src/app/core/game-dungeon-session.service.ts', 'utf8');
const presentationService = readFileSync('src/app/core/game-dungeon-presentation.service.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const dungeonAdapter = readFileSync('src/app/core/legacy-dungeon-domain-adapter.service.ts', 'utf8');
const presentationAdapter = readFileSync('src/app/core/legacy-dungeon-presentation-adapter.service.ts', 'utf8');
const characterPresentationAdapter = readFileSync('src/app/core/legacy-character-presentation-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');
const dungeonStyles = readFileSync('src/dungeon-modal-v0.15.0.css', 'utf8');
const dungeonData = readFileSync('balancing/tables/dungeons.csv', 'utf8');
const dataGenerator = readFileSync('scripts/data/build-game-data.mjs', 'utf8');

for (const pattern of [/getDungeonPhase\(state\)/, /resolveSearchStep\(/, /checkDungeonStart\(/, /payDungeonEnergy\(/, /createDungeonEnemies\(/, /createDungeonAttackPoints\(/, /resolveAttack\(/, /rescheduleDungeonAttack\(/, /getMaterialReferenceById\(/, /addMaterialQuantityById\(/, /getMaterialStorageEntries\(/, /grantCharacterExperience\(/, /characterStatLevelMultiplier\(/, /resetDungeonCycle\(/]) {
  assert.match(dungeonService, pattern, `Dungeon-Service verliert erwartete Fachlogik: ${pattern}`);
}
assert.doesNotMatch(dungeonService, /DUNGEON_LOOT_TABLES|MATERIALS\[/, 'Aktive Dungeon-Drops hängen weiterhin an einer namenbasierten oder alten globalen Loot-Tabelle.');
assert.match(dungeonService, /if \(selected\) result\.push\(\{ materialId: selected\.materialId \}\);/, 'Neue Dungeon-Drops persistieren weiterhin Namen statt ausschließlich Material-IDs.');
assert.match(dungeonService, /normalizeMaterialReferences\(\): number/, 'Dungeon besitzt keine Altstand-Migration für Loot-Referenzen.');
assert.doesNotMatch(dungeonService, /NoBrainerDungeonCompatibility|openLegacyCompatibilityBridge|closeLegacyCompatibilityBridge/, 'GameDungeonService enthält weiterhin die alte Dungeon-Kompatibilitätsbrücke.');

assert.match(dungeonCore, /Dungeon 1 verwendet Energie nicht mehr als Kosten- oder Abbruchsystem/);
assert.match(dungeonCore, /return \{ ok: true, reason: 'Bereit', participants: alive, share: 0, totalCost: 0 \};/);
assert.match(dungeonCore, /payDungeonEnergy[\s\S]*\{\}/, 'Dungeon-Energieabbuchung ist nicht als wirkungsloser Kompatibilitätsanker neutralisiert.');
assert.match(dungeonData, /^1,Trainingslager,0,18000000,/m, 'Dungeon-ID 1 muss den Anzeigenamen Trainingslager, 0 Energiekosten und 5 Stunden Laufzeit besitzen.');
assert.match(dataGenerator, /displayName: String\(dungeon\.display_name\)/, 'Der Anzeigename wird nicht aus der kanonischen Dungeon-Datenquelle generiert.');

assert.match(sessionService, /private modalOpen = false;/, 'Dungeon-Sitzung besitzt keinen expliziten Popup-Zustand.');
assert.match(sessionService, /open\(_at = Date\.now\(\)\)[\s\S]*this\.modalOpen = true;[\s\S]*saveRequested: false/, 'Öffnen des Popups ist nicht vom Run-Lebenszyklus getrennt.');
assert.match(sessionService, /close\(_at = Date\.now\(\)\)[\s\S]*this\.modalOpen = false;[\s\S]*saveRequested: false/, 'Schließen des Popups ist nicht vom Run-Lebenszyklus getrennt.');
const closeStart = sessionService.indexOf('  close(_at = Date.now()): DungeonActionResult {');
const closeEnd = sessionService.indexOf('  /**', closeStart);
assert.ok(closeStart >= 0 && closeEnd > closeStart, 'Popup-Close-Methode konnte nicht isoliert werden.');
const closeBody = sessionService.slice(closeStart, closeEnd);
assert.doesNotMatch(closeBody, /resetRuntimeState|runStartedAt = null/, 'Schließen des Popups beendet oder setzt den aktiven Run weiterhin zurück.');
assert.match(sessionService, /resetLoadedSession\(_at = Date\.now\(\)\)/, 'Ein separater Start-/Altstand-Reset für persistierte Laufzustände fehlt.');
assert.match(sessionService, /if \(!this\.hasActiveRun\(state\)\)/, 'Dungeon-Update hängt nicht am tatsächlichen Run-Zustand.');
assert.doesNotMatch(sessionService, /if \(!this\.modalOpen\) return \{ events: \[\], saveRequested: false, catchingUp: false \};/, 'Dungeon-Update wird bei geschlossenem Popup weiterhin gestoppt.');
assert.match(sessionService, /if \(now - this\.runStartedAt >= this\.getDurationMs\(\)\)/, '5-Stunden-Ende wird nicht im Session-Service geprüft.');
assert.match(sessionService, /finishSession\(state, 'manual', at\)/, 'Manueller Abbruch endet nicht sofort über den Session-Service.');
assert.match(sessionService, /isRunActive\(\): boolean \{\n    return this\.hasActiveRun\(this\.getState\(\)\);/, 'Run-Aktivität hängt weiterhin fälschlich vom Popup-Zustand ab.');
assert.match(sessionService, /\.replace\(\/\\s\*\\\([\\d\.,]\+\\s\*HP\\\)\/g, ''\)/, 'Numerische Rest-HP werden nicht aus dem Trainingslager-Protokoll ausgeblendet.');
assert.doesNotMatch(sessionService, /state\.dungeonTeamSlots\s*=\s*\[null/, 'Session-Ende darf die gespeicherte Teamauswahl nicht leeren.');

assert.match(presentationService, /installModalMarkup\(\)/, 'Dungeon 1 wird nicht in ein Angular-eigenes Popup überführt.');
assert.match(presentationService, /id="dungeonModalTitle">\$\{this\.getDisplayName\(\)\}/, 'Das Popup verwendet nicht den datengetriebenen Anzeigenamen.');
assert.match(presentationService, /liveLogEntries/, 'Das Live-Protokoll besitzt keinen popup-unabhängigen Sitzungspuffer.');
assert.match(presentationService, /this\.liveLogEntries\.unshift/, 'Dungeon-Ereignisse werden nicht unabhängig vom geöffneten Popup gesammelt.');
assert.match(presentationService, /id="dungeonTimeBar"/, 'Dungeon-Popup besitzt keinen Laufzeitbalken.');
assert.match(presentationService, /id="dungeonActiveEnemies"/, 'Dungeon-Popup besitzt keine aktive Gegneranzeige.');
assert.match(presentationService, /id="dungeonCombatLog"/, 'Dungeon-Popup besitzt kein eigenes Live-Protokoll.');
assert.match(presentationService, /dungeon-character-hp/, 'Charakter-HP werden im Dungeon nicht als Lebensbalken dargestellt.');
assert.match(presentationService, /class="bar hp"/, 'Gegner-HP werden nicht als Balken dargestellt.');
assert.doesNotMatch(presentationService, /\$\{hp\.toFixed|\/ \$\{maxHp\.toFixed|HP \$\{this\.formatNumber/, 'Dungeon-Präsentation zeigt weiterhin numerische HP-Werte.');
assert.match(presentationService, /this\.dungeonSession\.toggleRun\(Date\.now\(\)\)/, 'Popup-Aktion delegiert nicht an den Dungeon-Session-Service.');
assert.match(presentationService, /Teamzuweisung ist während eines laufenden Trainingslager-Runs gesperrt/, 'Teamänderung wird während des Runs nicht sichtbar gesperrt.');
assert.doesNotMatch(presentationService, /GameEnergyService|EN je Charakter|Energiekosten/, 'Dungeon-Präsentation verwendet weiterhin das alte Energiesystem.');
assert.match(presentationService, /data-dungeon-session-help/, 'Hilfe/Index wird für den neuen Dungeon-Ablauf nicht ergänzt.');
assert.match(presentationService, /Schließen des Popups beendet einen laufenden Run nicht/, 'Hilfe erklärt die Hintergrundfortsetzung nicht.');
assert.match(dungeonStyles, /#dungeonTeamCard \.team-slot-grid \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, 'Die vier Charakterplätze bleiben nicht als 2x2-Raster erhalten.');
assert.match(dungeonStyles, /\.dungeon-modal-layout \{[\s\S]*overflow: hidden;/, 'Die gesamte Dungeon-Ansicht ist weiterhin scrollbar.');
assert.match(dungeonStyles, /\.dungeon-live-log \{[\s\S]*overflow: auto;/, 'Nur das Protokoll besitzt keinen eigenen Scrollbereich.');

assert.doesNotMatch(dungeonAdapter, /DUNGEON_UI_BRIDGE|NoBrainerDungeonCompatibility|toggleDungeonAuto|collectDungeonLoot/, 'Der Legacy-Dungeon-Domain-Adapter enthält weiterhin Kompatibilitätswrapper.');
assert.match(dungeonAdapter, /return source\.slice\(0, start\) \+ source\.slice\(end\);/, 'Der Legacy-Dungeon-Domainbereich wird nicht vollständig entfernt.');
assert.doesNotMatch(presentationAdapter, /NoBrainerDungeonPresentationCore|getDungeonStatusPresentation|getDungeonLootPresentation/, 'Der Legacy-Dungeon-Präsentationsadapter registriert weiterhin einen Presentation-Core oder baut Legacy-Renderer auf.');
assert.doesNotMatch(characterPresentationAdapter, /ADAPTED_DUNGEON_TEAM|ADAPTED_DUNGEON_TEAM_PICKER/, 'Der Charakter-Präsentationsadapter erzeugt weiterhin eine zweite Dungeon-Team-Präsentation.');

assert.match(runtimeService, /private readonly gameDungeon: GameDungeonService/, 'GameRuntimeService besitzt keinen Angular-Dungeon-Service.');
assert.match(runtimeService, /private readonly dungeonSession: GameDungeonSessionService/, 'GameRuntimeService besitzt keine Angular-Dungeon-Sitzung.');
assert.match(runtimeService, /const dungeonUpdate = this\.dungeonSession\.update\(\);[\s\S]*this\.applyDungeonResult\(runtime, dungeonUpdate\);/, 'Der Angular-Tick aktualisiert die Dungeon-Sitzung nicht.');
assert.match(runtimeService, /this\.dungeonPresentation\.addEvent\(event\.text, event\.className\);/, 'Dungeon-Ereignisse werden nicht in das Trainingslager-Live-Protokoll geleitet.');
assert.match(runtimeService, /const dungeonSessionReset = this\.dungeonSession\.resetLoadedSession\(Date\.now\(\)\);/, 'Persistierter alter Dungeon-Lauf wird beim Runtime-Start nicht gezielt beendet.');
assert.doesNotMatch(runtimeService, /const dungeonUpdate = this\.gameDungeon\.update\(\)/, 'Runtime verarbeitet den Dungeon weiterhin außerhalb des Angular-Session-Service.');
assert.match(runtimeService, /renderInventoryState\(\): void;/, 'GameRuntimeApi stellt keinen gezielten Inventar-Refresh bereit.');

const registrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /renderDungeonStatus,|renderDungeonLoot,|renderTeam:|updateDungeonAutomation,/, 'Legacy-Runtime exportiert weiterhin Dungeon-Fach- oder Präsentationscallbacks.');
assert.doesNotMatch(appComponent, /GameDungeonService|NoBrainerDungeonCompatibility|gameDungeon\.openLegacyCompatibilityBridge|gameDungeon\.closeLegacyCompatibilityBridge/, 'AppComponent verwaltet weiterhin die alte Dungeon-Kompatibilitätsbrücke.');
assert.match(appComponent, /const APP_VERSION = APP_UI_VERSION;/, 'Der Dungeon-Cutover verwendet nicht die gemeinsame App-Version.');

console.log('Dungeon-Eigentümerschaft: Kampf/Loot bleiben Angular-Fachlogik; Trainingslager-Anzeigename, Hintergrund-Session, 5-Stunden-Limit, reine HP-Balken und popup-unabhängiges Live-Protokoll liegen in Angular-Session/Präsentation.');

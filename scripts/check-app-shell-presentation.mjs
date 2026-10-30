import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { APP_SHELL_PAGE_IDS, APP_UI_VERSION, composeAppShell } from '../src/app/game/app-shell-presentation-core.ts';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const angularConfig = JSON.parse(readFileSync('angular.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const stateService = readFileSync('src/app/core/game-state.service.ts', 'utf8');
const navigationAdapter = readFileSync('src/app/core/legacy-navigation-presentation-adapter.service.ts', 'utf8');
const missionService = readFileSync('src/app/core/game-mission.service.ts', 'utf8');
const cityOverviewService = readFileSync('src/app/core/game-city-overview-presentation.service.ts', 'utf8');
const cityHeaderStyles = readFileSync('src/city-header-v0.5.0.1.css', 'utf8');
const currencyHeaderStyles = readFileSync('src/currency-header-v0.5.0.2.css', 'utf8');
const cityOverviewStyles = readFileSync('src/city-overview-v0.6.0.0.css', 'utf8');
const probePage = '<section class="page" id="probe">Probe</section>';
const shell = composeAppShell(probePage);

assert.equal(APP_UI_VERSION, '0.6.0.0', 'Die gemeinsame sichtbare Web-App-Version muss v0.6.0.0 sein.');
assert.equal(packageJson.version, APP_UI_VERSION, 'package.json und sichtbare App-Version dürfen nicht auseinanderlaufen.');
assert.equal(APP_SHELL_PAGE_IDS[0], 'base');
for (const required of ['character', 'storage', 'forge-preview', 'market-jobs', 'dungeon-select', 'index']) {
  assert.ok(APP_SHELL_PAGE_IDS.includes(required), `Modulare Seite ${required} fehlt in der Shell-Seitenliste.`);
}
assert.match(shell, /^<div class="app modular-ui" data-ui-version="0\.6\.0\.0">/, 'Die modulare UI-v0.6.0.0-Shell fehlt.');
assert.match(shell, /id="backBtn"[\s\S]*onclick="goBack\(\)"/, 'Der globale Zurück-Button fehlt.');
assert.match(shell, /<div class="ui-version">SMITHS OF ELDRAVAR · v0\.6\.0\.0<\/div>/, 'Die sichtbare Versionsanzeige ist nicht v0.6.0.0.');
assert.match(shell, /<h1 id="pageTitle" class="city-name-editable" contenteditable="true"[^>]*>Stadt Name<\/h1>/, 'Die editierbare Stadt-Headline fehlt.');
assert.match(shell, /class="pill money-pill" aria-label="Stadtgeld"[\s\S]*id="goldIcon"[\s\S]*src="ui\/coin_1nic_32\.png"[\s\S]*id="gold">0 Nickel<\/b>/, 'Der Stadtgeld-Pill besitzt nicht den Nickel-Fallback mit Münzicon.');
assert.doesNotMatch(shell, /class="pill money-pill">Geld/, 'Der alte sichtbare Geld-Text darf nicht vor dem dynamischen Münzicon stehen.');
assert.match(shell, /id="questHeaderButton"[\s\S]*src="ui\/quest_32\.png"[\s\S]*id="questHeaderBadge"/, 'Das Quest-PNG oder sein Missionsbadge fehlt im Header.');
assert.match(shell, /aria-label="Hilfe"[\s\S]*src="ui\/fragezeichen_32\.png"/, 'Das Hilfe-PNG fehlt im Header.');
assert.match(shell, /id="gold"/, 'Der Geld-Anker fehlt.');
assert.match(shell, /id="matCount" class="sr-only"/, 'Der Legacy-Materialanker muss unsichtbar erhalten bleiben.');
assert.match(shell, /id="saveStatus" class="sr-only"/, 'Der Save-Status-Anker muss unsichtbar erhalten bleiben.');
assert.ok(shell.includes(probePage), 'Seitenmarkup wird nicht in die Angular-Shell eingesetzt.');

const bottomItems = [
  ['base', 'base', 'Übersicht'],
  ['character', 'character', 'Charakter'],
  ['storage', 'storage', 'Lager'],
  ['dungeon', 'dungeon', 'Dungeon']
];
for (const [pageId, sectionId, title] of bottomItems) {
  assert.match(shell, new RegExp(`data-page="${pageId}" data-section="${sectionId}"[^>]*>${title}<`), `Bottom-Navigation ${title} fehlt.`);
}
assert.doesNotMatch(shell, /<aside>/, 'Die alte Sidebar darf in der modularen Shell nicht mehr erscheinen.');
assert.doesNotMatch(shell, /onclick="saveGame\(true\)"/, 'Manuelles Speichern soll nicht mehr permanent in der Spiel-UI stehen.');
assert.doesNotMatch(shell, /onclick="resetSave\(\)"/, 'Spielstand-Reset soll nicht mehr permanent in der Spiel-UI stehen.');

assert.ok(existsSync('public/ui/quest_32.png'), 'Das neue Quest-PNG fehlt im Web-Asset-Verzeichnis.');
assert.ok(existsSync('public/ui/fragezeichen_32.png'), 'Das neue Hilfe-PNG fehlt im Web-Asset-Verzeichnis.');
assert.ok(existsSync('public/ui/city.png'), 'Der Stadt-Hintergrund fehlt im Web-Asset-Verzeichnis.');
for (const coin of ['coin_1nic_32.png', 'coin_2bro_32.png', 'coin_3sil_32.png', 'coin_4gol_32.png', 'coin_5net_32.png']) {
  assert.ok(existsSync(`public/ui/${coin}`), `Das Münzasset ${coin} fehlt im Web-Asset-Verzeichnis.`);
}
assert.match(missionService, /mission-overview-icon[\s\S]*ui\/quest_32\.png/, 'Der Legacy-Missionszugang verwendet nicht das gemeinsame Quest-PNG, bevor die Stadtkarte ihn ersetzt.');
assert.match(missionService, /questHeaderBadge/, 'Der Missionszähler wird nicht mehr als Badge am Quest-Icon geführt.');
assert.doesNotMatch(missionService, /📜/, 'Die alte Schriftrollen-Emoji-Darstellung darf nicht mehr aktiv sein.');
assert.match(cityOverviewService, /data-city-overview-owner=\\"angular\\"/, 'Die Stadtübersicht besitzt keinen Angular-Ownership-Marker.');
assert.match(cityOverviewService, /document\.getElementById\('questHeaderButton'\)\?\.click\(\)/, 'Der Stadt-Missionsbutton verwendet nicht den bestehenden Missionszugang.');
assert.match(cityOverviewService, /this\.navigate\('dungeon'\)/, 'Teamaktionen verwenden nicht den bestehenden Dungeon-Bereich.');
assert.match(stateService, /DEFAULT_CITY_NAME = 'Stadt Name'/, 'Der Standard-Stadtname fehlt.');
assert.match(stateService, /this\.state\['cityName'\] = normalizeCityName/, 'Der Stadtname wird beim Laden nicht normalisiert.');
assert.match(navigationAdapter, /presentation\.pageId !== 'base'/, 'Der Stadtname ist nicht auf die Übersichtsseite begrenzt.');
assert.match(navigationAdapter, /NoBrainerCityNamePresentation/, 'Die Stadtname-Bearbeitung ist nicht an die Navigation angebunden.');
assert.match(navigationAdapter, /this\.gameRuntime\.save\(false\)/, 'Eine Stadtname-Änderung wird nicht gespeichert.');
assert.match(navigationAdapter, /syncLoadedCityName\(\): void/, 'Die Stadt-Headline besitzt keine explizite Synchronisierung nach dem Save-Laden.');
assert.doesNotMatch(navigationAdapter, /queueMicrotask/, 'Die Stadt-Headline darf nicht mehr über einen zeitabhängigen Microtask vor dem Save-Laden synchronisiert werden.');
assert.match(navigationAdapter, /Nickel zu Bronze, Silber, Gold und Netherit/, 'Die Hilfe erklärt die Stadtgeld-Münzstaffel nicht.');
assert.match(cityHeaderStyles, /\.header-action-icon/, 'Die gemeinsamen Header-Icon-Styles fehlen.');
assert.match(cityHeaderStyles, /\.city-name-editable/, 'Die editierbare Stadt-Headline besitzt keine eigenen Styles.');
assert.match(currencyHeaderStyles, /\.city-currency-icon/, 'Die Stadtgeld-Münze besitzt keine eigenen Styles.');
assert.match(currencyHeaderStyles, /width: 32px/, 'Die Stadtgeld-Münze wird nicht in der vorgesehenen 32px-Assetgröße geführt.');
assert.match(cityOverviewStyles, /\.city-overview-stage/, 'Die neue Stadtkarte besitzt keine eigene responsive Bühne.');
assert.match(cityOverviewStyles, /\.city-map-action:disabled/, 'Gesperrte Stadtziele besitzen keinen sichtbaren Disabled-Zustand.');
assert.match(cityOverviewStyles, /\.modular-ui\.city-overview-active \.bottom-nav/, 'Die alte Bottom-Navigation wird auf der Stadtübersicht nicht gezielt ausgeblendet.');

const styles = angularConfig.projects?.nobrainer?.architect?.build?.options?.styles ?? [];
assert.ok(styles.includes('src/styles.css'));
assert.ok(styles.includes('src/save-transfer-v0.17.3.css'), 'Das Spielstand-Reiter-Hotfix-Stylesheet ist nicht registriert.');
assert.ok(styles.includes('src/ui-shell-v0.12.0.css'), 'Das responsive modulare UI-Stylesheet ist nicht registriert.');
assert.ok(styles.includes('src/city-header-v0.5.0.1.css'), 'Das Stadt-/Header-Stylesheet v0.5.0.1 ist nicht registriert.');
assert.ok(styles.includes('src/currency-header-v0.5.0.2.css'), 'Das Münzheader-Stylesheet v0.5.0.2 ist nicht registriert.');
assert.ok(styles.includes('src/city-overview-v0.6.0.0.css'), 'Das neue Stadtübersicht-Stylesheet ist nicht registriert.');
assert.ok(styles.includes('src/character-selection-v0.16.0.css'), 'Das gemeinsame Kader-/Rekrutierungs-Modal-Stylesheet ist nicht registriert.');
assert.ok(!styles.includes('src/roster-compact-v0.15.5.css'), 'Das abgelöste v0.15.5-Kader-Stylesheet darf nicht mehr registriert sein.');
assert.ok(styles.includes('src/forge-compact-v0.15.4.css'), 'Das kompakte Waffenherstellungs-Stylesheet ist nicht registriert.');
assert.ok(styles.includes('src/dungeon-modal-v0.15.0.css'), 'Das Trainingslager-Popup-Stylesheet ist nicht registriert.');

assert.match(appComponent, /composePageMarkup\(APP_SHELL_PAGE_IDS\)/, 'Der App-Component bezieht die Seiten nicht mehr vollständig aus dem Angular-eigenen Seiten-Composer.');
assert.match(appComponent, /composeAppShell\(pageMarkup\)/, 'Der App-Component baut die Oberfläche nicht mehr über die Angular-eigene Shell auf.');
assert.match(appComponent, /this\.gameRuntime\.prepare\(\);[\s\S]*this\.legacyNavigationPresentationAdapter\.syncLoadedCityName\(\);/, 'Die Stadt-Headline wird nicht direkt nach dem Laden des Spielstands synchronisiert.');
assert.doesNotMatch(appComponent, /DOMParser/, 'Der App-Component parst weiterhin die Legacy-HTML.');
assert.match(appComponent, /const LEGACY_RUNTIME_PATH = 'legacy\/NoBrainer_GitHub_v0\.12\.2\.runtime\.js';/, 'Der App-Component verweist nicht auf das eigenständige Runtime-Asset.');

console.log('App-Shell-Präsentation: Web-UI v0.6.0.0 mit editierbarem Stadtname, dynamischem Stadtgeld, Stadtkarte sowie Quest-/Hilfe-PNGs ist Angular-eigen.');

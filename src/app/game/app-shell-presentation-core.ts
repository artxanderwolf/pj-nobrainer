export const APP_UI_VERSION = '0.13.8';

export const APP_SHELL_PAGE_IDS = [
  'base',
  'activity',
  'character',
  'roster',
  'tavern',
  'character-capacity',
  'storage',
  'storage-materials',
  'storage-weapons',
  'forge',
  'forge-form',
  'forge-preview',
  'forge-jobs',
  'forge-upgrade',
  'market',
  'market-materials',
  'market-weapons',
  'market-jobs',
  'market-upgrade',
  'dungeon',
  'dungeon-select',
  'dungeon-team',
  'dungeon-expedition',
  'dungeon-loot',
  'dungeon-log',
  'index'
] as const;

const APP_SHELL_BEFORE_PAGES = `<div class="app modular-ui" data-ui-version="${APP_UI_VERSION}">
  <main class="app-main">
    <header class="topbar modular-topbar">
      <button id="backBtn" class="back-btn" type="button" aria-label="Zurück" onclick="goBack()" hidden>←</button>
      <div class="page-heading">
        <div class="ui-version">NO BRAINER · v${APP_UI_VERSION}</div>
        <h1 id="pageTitle">Übersicht</h1>
      </div>
      <div class="top-actions">
        <div class="pill money-pill">Geld <b id="gold">0 Nickel</b></div>
        <button class="help-btn" type="button" aria-label="Hilfe" onclick="go('index')">?</button>
      </div>
      <span id="matCount" class="sr-only">0</span>
      <span id="saveStatus" class="sr-only">Noch nicht gespeichert</span>
    </header>

    <div class="page-stack">`;

const APP_SHELL_AFTER_PAGES = `
    </div>

    <nav id="nav" class="bottom-nav" aria-label="Hauptnavigation">
      <button data-page="base" data-section="base" class="active">Übersicht</button>
      <button data-page="character" data-section="character">Charakter</button>
      <button data-page="storage" data-section="storage">Lager</button>
      <button data-page="dungeon" data-section="dungeon">Dungeon</button>
    </nav>
  </main>
</div>`;

export function composeAppShell(pageMarkup: string): string {
  return `${APP_SHELL_BEFORE_PAGES}\n${pageMarkup}\n${APP_SHELL_AFTER_PAGES}`;
}

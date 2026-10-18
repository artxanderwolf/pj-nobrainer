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
  'forge-materials',
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

const APP_SHELL_BEFORE_PAGES = `<div class="app modular-ui" data-ui-version="0.12.0">
  <main class="app-main">
    <header class="topbar modular-topbar">
      <button id="backBtn" class="back-btn" type="button" aria-label="Zurück" onclick="goBack()" hidden>←</button>
      <div class="page-heading">
        <div class="ui-version">NO BRAINER · v0.12.0</div>
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
      <button data-page="base" data-section="base" class="active"><span>Übersicht</span></button>
      <button data-page="character" data-section="character"><span>Charakter</span></button>
      <button data-page="storage" data-section="storage"><span>Lager</span></button>
      <button data-page="dungeon" data-section="dungeon"><span>Dungeon</span></button>
    </nav>
  </main>
</div>`;

export function composeAppShell(pageMarkup: string): string {
  return `${APP_SHELL_BEFORE_PAGES}\n${pageMarkup}\n${APP_SHELL_AFTER_PAGES}`;
}

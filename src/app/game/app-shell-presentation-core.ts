export const APP_SHELL_PAGE_IDS = [
  'base',
  'dungeon',
  'tavern',
  'roster',
  'storage',
  'forge',
  'market',
  'index'
] as const;

const APP_SHELL_BEFORE_PAGES = `<div class="app">
  <aside>
    <div class="brand">NO BRAINER <small>Prototype</small></div>
    <nav id="nav">
      <button data-page="base" class="active">Stützpunkt</button>
      <button data-page="dungeon">Dungeon</button>
      <button data-page="tavern">Taverne</button>
      <button data-page="roster">Kader</button>
      <button data-page="storage">Lager</button>
      <button data-page="forge">Schmiede</button>
      <button data-page="market">Markt</button>
      <button data-page="index">Index</button>
    </nav>
  </aside>

  <main>
    <div class="topbar">
      <div>
        <h1 id="pageTitle">Stützpunkt</h1>
        <div class="sub">System-Prototyp auf Basis des GDD v0.1.1</div>
      </div>
      <div class="resources">
        <div class="pill">Geld <b id="gold">0 Nickel</b></div>
        <div class="pill">Materialien <b id="matCount">0</b></div>
        <div class="save-controls">
          <button class="btn smallbtn" onclick="saveGame(true)">Speichern</button>
          <button class="btn smallbtn danger" onclick="resetSave()">Spielstand zurücksetzen</button>
          <span id="saveStatus" class="save-status">Noch nicht gespeichert</span>
        </div>
      </div>
    </div>`;

const APP_SHELL_AFTER_PAGES = `
  </main>
</div>`;

export function composeAppShell(pageMarkup: string): string {
  return `${APP_SHELL_BEFORE_PAGES}\n${pageMarkup}\n${APP_SHELL_AFTER_PAGES}`;
}

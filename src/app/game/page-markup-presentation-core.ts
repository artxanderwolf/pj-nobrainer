export const ANGULAR_OWNED_PAGE_IDS = ['base', 'tavern', 'roster', 'storage'] as const;

type AngularOwnedPageId = typeof ANGULAR_OWNED_PAGE_IDS[number];

const BASE_PAGE_MARKUP = `<section class="page active" id="base">
      <div class="grid">
        <div class="card span-4"><h2>Inn</h2><p class="muted">Kaderkapazität</p><div id="innUpgradeCard"></div></div>
        <div class="card span-4"><h2>Taverne</h2><p class="muted">Rekrutierung neuer Charaktere.</p><div id="baseTavernSummary"></div><div class="actions"><button class="btn primary" onclick="go('tavern')">Zur Taverne</button></div></div>
        <div class="card span-4"><h2>Händler</h2><p class="muted">Zufällige Angebote gegen Gold.</p><div class="empty">Rotationslogik noch offen</div></div>
        <div class="card span-7">
          <h2>Aktueller Kernkreislauf</h2>
          <p>Team auswählen → Autodungeon → Beute einsammeln → Schmieden / Verkaufen → Geld → Ausbau.</p>
          <div class="actions"><button class="btn primary" onclick="go('dungeon')">Zum Dungeon</button></div>
        </div>
        <div class="card span-5">
          <h2>Prototyp-Status</h2>
          <p><span class="tag fixed">FEST</span> statischer Kampf, 1–4 Charaktere, Materialdrops</p>
          <p><span class="tag temp">VORLÄUFIG</span> Testwerte für Dungeon-Kampf und Balance</p>
        </div>
      </div>
    </section>`;

const TAVERN_PAGE_MARKUP = `<section class="page" id="tavern">
      <div class="grid">
        <div class="card span-7">
          <h2>Taverne <span class="tag fixed">AKTIV</span></h2>
          <p class="muted">Vier feste Klassen stehen zur Auswahl: Rekrut, Kämpfer, Bogner und Gelehrter.</p>
          <div id="tavernOffer"></div>
        </div>
        <div class="card span-5">
          <h2>Rekrutierung & Inn</h2>
          <div id="tavernCapacity"></div>
          <p class="status-line">Neue Charaktere starten mit vollen HP und voller Energie, aber ohne Waffe. Alle Klassen dürfen aktuell alle vorhandenen Waffen verwenden.</p>
        </div>
      </div>
    </section>`;

const ROSTER_PAGE_MARKUP = `<section class="page" id="roster">
      <div class="card">
        <h2>Kader</h2>
        <p class="muted">Alle angeworbenen Charaktere und ihre persönliche Ausrüstung.</p>
        <div id="rosterCard"></div>
      </div>
    </section>`;

const STORAGE_PAGE_MARKUP = `<section class="page" id="storage">
      <div class="grid">
        <div class="card span-12">
          <h2>Materiallager</h2>
          <table>
            <thead><tr><th>Material</th><th>Kategorie</th><th>Menge</th><th>Wert / Stück</th></tr></thead>
            <tbody id="inventoryRows"></tbody>
          </table>
          <div id="inventoryEmpty" class="empty">Noch keine Materialien gesammelt.</div>
        </div>

        <div class="card span-12"><h2>Waffenlager</h2><p class="muted">Kompakte Waffenkarten. Kürzel werden im Index erklärt.</p><div id="weaponInventory" class="weapon-card-list"></div><div id="weaponInventoryEmpty" class="empty">Noch keine Waffen vorhanden.</div>
        </div>
      </div>
    </section>`;

const ANGULAR_PAGE_MARKUP: Record<AngularOwnedPageId, string> = {
  base: BASE_PAGE_MARKUP,
  tavern: TAVERN_PAGE_MARKUP,
  roster: ROSTER_PAGE_MARKUP,
  storage: STORAGE_PAGE_MARKUP
};

export function getAngularOwnedPageMarkup(pageId: string): string | null {
  return ANGULAR_OWNED_PAGE_IDS.includes(pageId as AngularOwnedPageId)
    ? ANGULAR_PAGE_MARKUP[pageId as AngularOwnedPageId]
    : null;
}

export function composePageMarkup(
  pageIds: readonly string[],
  resolveLegacyPage: (pageId: string) => string
): string {
  return pageIds
    .map(pageId => getAngularOwnedPageMarkup(pageId) ?? resolveLegacyPage(pageId))
    .join('\n');
}

export const ANGULAR_OWNED_PAGE_IDS = ['base', 'tavern', 'roster', 'storage', 'forge', 'market', 'dungeon'] as const;

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

const FORGE_PAGE_MARKUP = `<section class="page" id="forge">
      <div class="grid">
        <div class="card span-7">
          <h2>Schmiede <span class="tag fixed">AKTIV</span></h2>
          <p class="muted">Eine vollständige Waffe wird aus sechs Slots hergestellt. Es werden nur Materialien angezeigt, die aktuell im Lager vorhanden sind.</p>

          <div style="margin:14px 0">
            <label class="field-label" for="forgeWeaponName">Waffenname</label>
            <input id="forgeWeaponName" class="text-input" type="text" maxlength="40" placeholder="Leer = Standardname des Waffentyps">
          </div>

          <div class="statrow">
            <div class="stat"><span>Waffenform</span>
              <select id="weaponType" class="btn" style="width:100%;margin-top:6px" onchange="renderForgePreview()">
                <option value="dagger">Dolch</option>
                <option value="sword">Einhänder</option>
              </select>
            </div>
            <div class="stat"><span>Herstellungszeit</span><b id="forgeTimePreview">–</b></div>
            <div class="stat"><span>Waffenwert</span><b id="forgeValuePreview">–</b></div>
          </div>

          <div style="margin-top:16px" class="forge-slot-wrap">
            <table>
              <thead><tr><th>Slot</th><th>Material</th></tr></thead>
              <tbody>
                <tr><td>Waffentyp</td><td><select id="slotWeaponType" class="btn forge-select" data-categories="Holz,Metall" onchange="renderForgePreview()"></select></td></tr>
                <tr><td>Schneide</td><td><select id="slotBlade" class="btn forge-select" data-categories="Metall" onchange="renderForgePreview()"></select></td></tr>
                <tr><td>Rückseite</td><td><select id="slotBack" class="btn forge-select" data-categories="Metall" onchange="renderForgePreview()"></select></td></tr>
                <tr><td>Griffform</td><td><select id="slotGripShape" class="btn forge-select" data-categories="Holz" onchange="renderForgePreview()"></select></td></tr>
                <tr><td>Griffmaterial</td><td><select id="slotGripMaterial" class="btn forge-select" data-categories="Leder" onchange="renderForgePreview()"></select></td></tr>
                <tr><td>Verstärkungsmaterial</td><td><select id="slotReinforcementMaterial" class="btn forge-select" data-categories="Holz,Metall,Leder" onchange="renderForgePreview()"></select></td></tr>
              </tbody>
            </table>
          </div>

          <div class="preview-grid">
            <div class="stat"><span>Schaden / Treffer</span><b id="forgeDamagePreview">–</b><span id="forgeDamageBaseInfo" class="small muted"></span></div>
            <div class="stat"><span>Angriffsgeschw.</span><b id="forgeSpeedPreview">–</b><span id="forgeSpeedBaseInfo" class="small muted"></span></div>
            <div class="stat"><span>Trefferchance</span><b id="forgeHitPreview">–</b></div>
            <div class="stat"><span>Erwarteter Rohschaden</span><b id="forgeRawPreview">–</b></div>
            <div class="stat"><span>Durchschlag</span><b id="forgePenPreview">–</b></div>
            <div class="stat"><span>Seltenheitsfaktor</span><b id="forgeRarityPreview">–</b></div>
          </div>
          <p id="forgeReinforcementPreview" class="status-line">Verstärkungseffekt: –</p>

          <div class="actions">
            <button id="forgeStartBtn" class="btn primary" onclick="startForgeJob()">Waffe herstellen</button>
            <button class="btn" onclick="go('index')">Werte & Formeln öffnen</button>
          </div>
        </div>

        <div class="card span-5">
          <h2>Produktion & Ausbau</h2>
          <div id="forgeUpgradeCard"></div>
          <h3 style="margin-top:18px">Herstellungsplätze</h3>
          <div id="forgeJobCard" class="empty">Kein aktiver Schmiedeauftrag.</div>
          <h3 style="margin-top:18px">Warteschlange</h3>
          <div id="forgeQueueCard" class="empty">Warteschlange leer.</div>
        </div>
      </div>
    </section>`;

const MARKET_PAGE_MARKUP = `<section class="page" id="market">
      <div class="grid">
        <div class="card span-12">
          <h2>Verkaufsplätze & Ausbau</h2>
          <p class="muted">Mehr Verkaufsplätze erhöhen den parallelen Durchsatz. Warteschlangenplätze erhöhen die Automatisierung.</p>
          <div id="marketUpgradeCard"></div>
          <h3 style="margin-top:18px">Aktive Verkäufe</h3><div id="marketJobCard" class="empty">Kein aktiver Verkauf.</div>
          <h3 style="margin-top:18px">Warteschlange</h3><div id="marketQueueCard" class="empty">Warteschlange leer.</div>
        </div>
        <div class="card span-6">
          <h2>Materialien verkaufen</h2>
          <div id="marketMaterials"></div>
          <div id="marketMaterialsEmpty" class="empty">Keine Materialien im Lager.</div>
        </div>
        <div class="card span-6">
          <h2>Waffen verkaufen</h2>
          <div id="marketWeapons"></div>
          <div id="marketWeaponsEmpty" class="empty">Keine verkaufbaren Waffen im Lager.</div>
        </div>
      </div>
    </section>`;

const DUNGEON_PAGE_MARKUP = `<section class="page" id="dungeon">
      <div class="grid">
        <div class="card span-5">
          <h2>Dungeon 1 <span class="tag temp">TESTBALANCE</span></h2>
          <p class="muted">Endlose Dungeon-Suche mit zufälligen Begegnungen und globaler Angriffs-Zeitleiste.</p>
          <div class="statrow">
            <div class="stat"><span>Gegnerbasis</span><b id="enemyHp">6 Basis-SCH</b></div>
            <div class="stat"><span>Trefferchance</span><b id="enemyArmor">50 % Basis-TRF</b></div>
            <div class="stat"><span>Geschwindigkeit</span><b id="enemyDamage">0,80 Basis-GES</b></div>
            <div class="stat"><span>Energiekosten / Welle</span><b id="energyCost">4 gesamt</b></div>
            <div class="stat"><span>Wellen</span><b id="runDuration">0 besiegt</b></div>
          </div>
          <div id="dungeonRunCard" class="empty" style="margin-top:14px">Automatik angehalten.</div>
          <div class="actions">
            <button id="autoDungeonBtn" class="btn primary" onclick="toggleDungeonAuto()">Automatik starten</button>
            <button id="collectLootBtn" class="btn" onclick="collectDungeonLoot()">Einsammeln</button>
          </div>
          <p class="status-line">Die Gruppe durchsucht den Dungeon im Sekundentakt. Pro Suchschritt besteht eine Begegnungschance von 10 %. Energie wird erst bezahlt, wenn tatsächlich Gegner gefunden wurden. Jede vollständig besiegte Welle gibt genau einen Materialwurf pro Gegner.</p>
          <p class="status-line"><strong>Hinweis:</strong> Nach einem Sieg wird die Beute 1 Sekunde lang eingesammelt; danach beginnt die Suche erneut. Bei einer Niederlage startet das Team mit vollen HP wieder im Suchmodus.</p>
        </div>
        <div class="card span-7">
          <h2>Dungeon-Team</h2>
          <p class="muted">Bis zu vier Charaktere zuweisen. Derselbe Charakter kann nicht mehrfach eingesetzt werden.</p>
          <div id="teamCard"></div>
        </div>
        <div class="card span-5">
          <h2>Gesammelte Dungeon-Beute</h2>
          <p class="muted">Diese Materialien sind noch nicht im Lager und können erst nach „Einsammeln“ geschmiedet oder verkauft werden.</p>
          <div id="dungeonLoot"></div>
          <div id="dungeonLootEmpty" class="empty">Noch keine Beute gesammelt.</div>
        </div>
        <div class="card span-7">
          <h2>Expeditionsprotokoll</h2>
          <div class="log" id="combatLog"><div class="muted">Automatik noch nicht gestartet.</div></div>
        </div>
      </div>
    </section>`;

const ANGULAR_PAGE_MARKUP: Record<AngularOwnedPageId, string> = {
  base: BASE_PAGE_MARKUP,
  tavern: TAVERN_PAGE_MARKUP,
  roster: ROSTER_PAGE_MARKUP,
  storage: STORAGE_PAGE_MARKUP,
  forge: FORGE_PAGE_MARKUP,
  market: MARKET_PAGE_MARKUP,
  dungeon: DUNGEON_PAGE_MARKUP
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

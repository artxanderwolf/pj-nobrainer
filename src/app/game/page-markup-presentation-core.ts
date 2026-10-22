import { INDEX_PAGE_MARKUP } from './index-page-markup.ts';

export const ANGULAR_OWNED_PAGE_IDS = [
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

type AngularOwnedPageId = typeof ANGULAR_OWNED_PAGE_IDS[number];

const BASE_PAGE_MARKUP = `<section class="page active screen-page" id="base">
  <div class="screen-menu dashboard-menu">
    <button class="menu-card" type="button" onclick="go('character')">
      <span class="menu-card-title">Charakter</span>
      <span class="menu-card-copy">Kader, Ausrüstung und Rekrutierung</span>
      <span id="baseTavernSummary" class="menu-card-status"></span>
    </button>
    <button class="menu-card" type="button" onclick="go('storage')">
      <span class="menu-card-title">Lager</span>
      <span class="menu-card-copy">Materialien, Waffen, Schmiede und Verkauf</span>
    </button>
    <button class="menu-card" type="button" onclick="go('dungeon')">
      <span class="menu-card-title">Dungeon</span>
      <span class="menu-card-copy">Team, Expedition und Beute</span>
    </button>
    <button class="menu-card" type="button" onclick="go('activity')">
      <span class="menu-card-title">Aktive Vorgänge</span>
      <span class="menu-card-copy">Laufende Herstellung und Verkäufe</span>
    </button>
  </div>
</section>`;

const ACTIVITY_PAGE_MARKUP = `<section class="page screen-page" id="activity">
  <div class="screen-menu compact-menu">
    <button class="menu-card" type="button" onclick="go('forge-jobs')">
      <span class="menu-card-title">Schmiedeaufträge</span>
      <span class="menu-card-copy">Aktive Plätze und Warteschlange</span>
    </button>
    <button class="menu-card" type="button" onclick="go('market-jobs')">
      <span class="menu-card-title">Aktive Verkäufe</span>
      <span class="menu-card-copy">Verkaufsplätze und Warteschlange</span>
    </button>
  </div>
</section>`;

const CHARACTER_PAGE_MARKUP = `<section class="page screen-page" id="character">
  <div class="screen-menu">
    <button class="menu-card" type="button" onclick="go('roster')">
      <span class="menu-card-title">Kader</span>
      <span class="menu-card-copy">Charaktere, Werte und Ausrüstung</span>
    </button>
    <button class="menu-card" type="button" onclick="go('tavern')">
      <span class="menu-card-title">Rekrutieren</span>
      <span class="menu-card-copy">Neue Charaktere anwerben</span>
    </button>
    <button class="menu-card" type="button" onclick="go('character-capacity')">
      <span class="menu-card-title">Unterkunft & Ausbau</span>
      <span class="menu-card-copy">Kaderkapazität verwalten</span>
    </button>
  </div>
</section>`;

const ROSTER_PAGE_MARKUP = `<section class="page screen-page" id="roster">
  <div class="screen-card screen-card-fill">
    <p class="screen-intro">Charaktere auswählen, Werte prüfen und Ausrüstung verwalten.</p>
    <div id="rosterCard" class="scroll-region"></div>
  </div>
</section>`;

const TAVERN_PAGE_MARKUP = `<section class="page screen-page" id="tavern">
  <div class="screen-card screen-card-fill">
    <p class="screen-intro">Wähle eine Klasse. Neue Charaktere starten auf Level 1 ohne Waffe.</p>
    <div id="tavernOffer" class="scroll-region"></div>
  </div>
</section>`;

const CHARACTER_CAPACITY_PAGE_MARKUP = `<section class="page screen-page" id="character-capacity">
  <div class="screen-card">
    <h2>Kaderkapazität</h2>
    <div id="tavernCapacity"></div>
  </div>
  <div class="screen-card">
    <h2>Unterkunft ausbauen</h2>
    <div id="innUpgradeCard"></div>
  </div>
</section>`;

const STORAGE_PAGE_MARKUP = `<section class="page screen-page" id="storage">
  <div class="screen-menu">
    <button class="menu-card" type="button" onclick="go('storage-materials')">
      <span class="menu-card-title">Materiallager</span>
      <span class="menu-card-copy">Gesammelte Rohstoffe ansehen</span>
    </button>
    <button class="menu-card" type="button" onclick="go('storage-weapons')">
      <span class="menu-card-title">Waffenlager</span>
      <span class="menu-card-copy">Waffenbestand und Ausrüstung</span>
    </button>
    <button class="menu-card" type="button" onclick="go('forge')">
      <span class="menu-card-title">Schmiede</span>
      <span class="menu-card-copy">Waffen herstellen und Aufträge verwalten</span>
    </button>
    <button class="menu-card" type="button" onclick="go('market')">
      <span class="menu-card-title">Verkaufen</span>
      <span class="menu-card-copy">Materialien und Waffen verkaufen</span>
    </button>
  </div>
</section>`;

const STORAGE_MATERIALS_PAGE_MARKUP = `<section class="page screen-page" id="storage-materials">
  <div class="screen-card screen-card-fill">
    <div class="scroll-region">
      <table>
        <thead><tr><th>Material</th><th>Kategorie</th><th>Menge</th><th>Wert / Stück</th></tr></thead>
        <tbody id="inventoryRows"></tbody>
      </table>
      <div id="inventoryEmpty" class="empty">Noch keine Materialien gesammelt.</div>
    </div>
  </div>
</section>`;

const STORAGE_WEAPONS_PAGE_MARKUP = `<section class="page screen-page" id="storage-weapons">
  <div class="screen-card screen-card-fill">
    <p class="screen-intro">Waffenbestand. Ausrüstung kann direkt über die Waffenkarten geändert werden.</p>
    <div id="weaponInventory" class="weapon-card-list scroll-region"></div>
    <div id="weaponInventoryEmpty" class="empty">Noch keine Waffen vorhanden.</div>
  </div>
</section>`;

const FORGE_PAGE_MARKUP = `<section class="page screen-page" id="forge">
  <div class="screen-menu">
    <button class="menu-card" type="button" onclick="go('forge-form')">
      <span class="menu-card-title">Waffe herstellen</span>
      <span class="menu-card-copy">Waffenform und Materialien gemeinsam wählen</span>
    </button>
    <button class="menu-card" type="button" onclick="go('forge-jobs')">
      <span class="menu-card-title">Aufträge</span>
      <span class="menu-card-copy">Herstellungsplätze und Warteschlange</span>
    </button>
    <div class="menu-card menu-card-static inline-upgrade-menu-card">
      <span class="menu-card-title">Ausbau</span>
      <span class="menu-card-copy">Kapazität der Schmiede erhöhen</span>
      <div id="forgeUpgradeCardInline" class="inline-upgrade-card"></div>
    </div>
  </div>
</section>`;

const FORGE_FORM_PAGE_MARKUP = `<section class="page screen-page" id="forge-form">
  <div class="screen-card screen-card-fill forge-build-card">
    <select id="weaponForm" class="forge-weapon-native" onchange="renderForgePreview()" aria-hidden="true" tabindex="-1">
      <option value="dagger">Dolch</option>
      <option value="sword">1H Schwert</option>
      <option value="axe1h">1H Axt</option>
      <option value="sword2h">2H Schwert</option>
      <option value="axe2h">2H Axt</option>
      <option value="bow">Bogen</option>
      <option value="staff">Stab</option>
    </select>
    <div class="forge-slot-wrap">
      <table>
        <thead><tr><th>Bauteil</th><th>Material</th></tr></thead>
        <tbody>
          <tr id="forgeWorkingPartRow"><td>Schneide</td><td><select id="slotWorkingPart" class="btn forge-select" onchange="renderForgePreview()"></select></td></tr>
          <tr id="forgeBackRow"><td>Kern</td><td><select id="slotBack" class="btn forge-select" onchange="renderForgePreview()"></select></td></tr>
          <tr id="forgeGripCoreRow"><td>Griff</td><td><select id="slotGripCore" class="btn forge-select" onchange="renderForgePreview()"></select></td></tr>
          <tr id="forgeGripWrapRow"><td>Wicklung</td><td><select id="slotGripWrap" class="btn forge-select" onchange="renderForgePreview()"></select></td></tr>
          <tr id="forgeSpecialRow"><td>Spezial</td><td><select id="slotSpecial" class="btn forge-select" onchange="renderForgePreview()"></select></td></tr>
          <tr id="forgeParryRow"><td>Parierstange</td><td><select id="slotParry" class="btn forge-select" onchange="renderForgePreview()"></select></td></tr>
          <tr id="forgeBowstringRow"><td>Sehne</td><td><select id="slotBowstring" class="btn forge-select" onchange="renderForgePreview()"></select></td></tr>
        </tbody>
      </table>
    </div>
    <div class="wizard-actions"><button id="forgePreviewNextBtn" class="btn primary" type="button" onclick="go('forge-preview')" disabled>Weiter zur Vorschau</button></div>
  </div>
</section>`;

const FORGE_PREVIEW_PAGE_MARKUP = `<section class="page screen-page" id="forge-preview">
  <div class="screen-card screen-card-fill">
    <h2>3. Waffe prüfen</h2>
    <div class="scroll-region">
      <label class="field-label" for="forgeWeaponName">Waffenname</label>
      <input id="forgeWeaponName" class="text-input" type="text" maxlength="40" placeholder="Leer = Standardname der Waffenform">
      <div class="statrow compact-stats">
        <div class="stat"><span>Herstellungszeit</span><b id="forgeTimePreview">–</b></div>
        <div class="stat"><span>Waffenwert</span><b id="forgeValuePreview">–</b></div>
      </div>
      <div class="preview-grid compact-stats">
        <div class="stat"><span>Schaden / Treffer</span><b id="forgeDamagePreview">–</b><span id="forgeDamageBaseInfo" class="small muted"></span></div>
        <div class="stat"><span>Angriffsgeschw.</span><b id="forgeSpeedPreview">–</b><span id="forgeSpeedBaseInfo" class="small muted"></span></div>
        <div class="stat"><span>Trefferchance</span><b id="forgeHitPreview">–</b></div>
        <div class="stat"><span>Rohschaden</span><b id="forgeRawPreview">–</b></div>
        <div class="stat"><span>Durchschlag</span><b id="forgePenPreview">–</b></div>
        <div class="stat"><span>Leistungswert</span><b id="forgeRarityPreview">–</b></div>
      </div>
      <p id="forgeReinforcementPreview" class="status-line">Spezialeffekt: –</p>
    </div>
    <div class="wizard-actions"><button id="forgeStartBtn" class="btn primary" onclick="startForgeJob()">Waffe herstellen</button></div>
  </div>
</section>`;

const FORGE_JOBS_PAGE_MARKUP = `<section class="page screen-page" id="forge-jobs">
  <div class="screen-card screen-card-fill">
    <div class="scroll-region">
      <h2>Herstellungsplätze</h2>
      <div id="forgeJobCard" class="empty">Kein aktiver Schmiedeauftrag.</div>
      <h2>Warteschlange</h2>
      <div id="forgeQueueCard" class="empty">Warteschlange leer.</div>
    </div>
  </div>
</section>`;

const FORGE_UPGRADE_PAGE_MARKUP = `<section class="page screen-page" id="forge-upgrade">
  <div class="screen-card">
    <h2>Schmiede ausbauen</h2>
    <div id="forgeUpgradeCard"></div>
  </div>
</section>`;

const MARKET_PAGE_MARKUP = `<section class="page screen-page" id="market">
  <div class="screen-menu">
    <button class="menu-card" type="button" onclick="go('market-materials')">
      <span class="menu-card-title">Materialien</span>
      <span class="menu-card-copy">Materialbestand verkaufen</span>
    </button>
    <button class="menu-card" type="button" onclick="go('market-weapons')">
      <span class="menu-card-title">Waffen</span>
      <span class="menu-card-copy">Nicht ausgerüstete Waffen verkaufen</span>
    </button>
    <button class="menu-card" type="button" onclick="go('market-jobs')">
      <span class="menu-card-title">Aktive Verkäufe</span>
      <span class="menu-card-copy">Verkaufsplätze und Warteschlange</span>
    </button>
    <div class="menu-card menu-card-static inline-upgrade-menu-card">
      <span class="menu-card-title">Ausbau</span>
      <span class="menu-card-copy">Verkaufskapazität erhöhen</span>
      <div id="marketUpgradeCardInline" class="inline-upgrade-card"></div>
    </div>
  </div>
</section>`;

const MARKET_MATERIALS_PAGE_MARKUP = `<section class="page screen-page" id="market-materials">
  <div class="screen-card screen-card-fill">
    <div id="marketMaterials" class="scroll-region"></div>
    <div id="marketMaterialsEmpty" class="empty">Keine Materialien im Lager.</div>
  </div>
</section>`;

const MARKET_WEAPONS_PAGE_MARKUP = `<section class="page screen-page" id="market-weapons">
  <div class="screen-card screen-card-fill">
    <div id="marketWeapons" class="scroll-region"></div>
    <div id="marketWeaponsEmpty" class="empty">Keine verkaufbaren Waffen im Lager.</div>
  </div>
</section>`;

const MARKET_JOBS_PAGE_MARKUP = `<section class="page screen-page" id="market-jobs">
  <div class="screen-card screen-card-fill">
    <div class="scroll-region">
      <h2>Aktive Verkäufe</h2>
      <div id="marketJobCard" class="empty">Kein aktiver Verkauf.</div>
      <h2>Warteschlange</h2>
      <div id="marketQueueCard" class="empty">Warteschlange leer.</div>
    </div>
  </div>
</section>`;

const MARKET_UPGRADE_PAGE_MARKUP = `<section class="page screen-page" id="market-upgrade">
  <div class="screen-card">
    <h2>Verkauf ausbauen</h2>
    <div id="marketUpgradeCard"></div>
  </div>
</section>`;

const DUNGEON_PAGE_MARKUP = `<section class="page screen-page" id="dungeon">
  <div class="screen-menu compact-menu">
    <div class="menu-card menu-card-split dungeon-overview-card">
      <button id="dungeonOverviewOpenBtn" class="menu-card-main" type="button" onclick="go('dungeon-select')">
        <span class="menu-card-title">Dungeon 1</span>
        <span class="menu-card-copy">Team wählen, Lauf starten und Beute einsammeln</span>
      </button>
      <button id="dungeonOverviewAction" class="btn primary menu-card-side-action" type="button">Lauf starten</button>
    </div>
  </div>
</section>`;

const DUNGEON_SELECT_PAGE_MARKUP = `<section class="page screen-page" id="dungeon-select">
  <div class="screen-card screen-card-fill dungeon-one-card">
    <h2>Dungeon 1</h2>
    <p class="screen-intro">Bis zu vier Charaktere auswählen. Ein Lauf endet bei zu wenig Ausdauer oder nach einem manuellen Abbruch.</p>
    <div id="dungeonTeamCard" class="dungeon-team-region scroll-region"></div>
    <p id="dungeonPrimaryStatus" class="status-line dungeon-primary-status">Team wählen und Lauf starten.</p>
    <div class="wizard-actions"><button id="dungeonPrimaryBtn" class="btn primary" type="button">Lauf starten</button></div>
    <span id="enemyHp" class="sr-only">6 Basis-SCH</span>
    <span id="enemyArmor" class="sr-only">50 % Basis-TRF</span>
    <span id="enemyDamage" class="sr-only">0,80 Basis-GES</span>
    <span id="energyCost" class="sr-only">4 gesamt</span>
    <span id="runDuration" class="sr-only">0 besiegt</span>
  </div>
</section>`;

const DUNGEON_TEAM_PAGE_MARKUP = `<section class="page screen-page" id="dungeon-team">
  <div class="screen-card screen-card-fill">
    <p class="screen-intro">Bis zu vier unterschiedliche Charaktere zuweisen.</p>
    <div id="teamCard" class="scroll-region"></div>
  </div>
</section>`;

const DUNGEON_EXPEDITION_PAGE_MARKUP = `<section class="page screen-page" id="dungeon-expedition">
  <div class="screen-card screen-card-fill">
    <div id="dungeonRunCard" class="empty">Automatik angehalten.</div>
    <div class="actions primary-actions">
      <button id="autoDungeonBtn" class="btn primary" onclick="toggleDungeonAuto()">Automatik starten</button>
      <button class="btn" type="button" onclick="go('dungeon-log')">Kampfprotokoll</button>
    </div>
  </div>
</section>`;

const DUNGEON_LOOT_PAGE_MARKUP = `<section class="page screen-page" id="dungeon-loot">
  <div class="screen-card screen-card-fill">
    <div id="dungeonLoot" class="scroll-region"></div>
    <div id="dungeonLootEmpty" class="empty">Noch keine Beute gesammelt.</div>
    <div class="wizard-actions"><button id="collectLootBtn" class="btn primary" onclick="collectDungeonLoot()">Einsammeln</button></div>
  </div>
</section>`;

const DUNGEON_LOG_PAGE_MARKUP = `<section class="page screen-page" id="dungeon-log">
  <div class="screen-card screen-card-fill">
    <div class="log scroll-region" id="combatLog"><div class="muted">Automatik noch nicht gestartet.</div></div>
  </div>
</section>`;

const ANGULAR_PAGE_MARKUP: Record<AngularOwnedPageId, string> = {
  base: BASE_PAGE_MARKUP,
  activity: ACTIVITY_PAGE_MARKUP,
  character: CHARACTER_PAGE_MARKUP,
  roster: ROSTER_PAGE_MARKUP,
  tavern: TAVERN_PAGE_MARKUP,
  'character-capacity': CHARACTER_CAPACITY_PAGE_MARKUP,
  storage: STORAGE_PAGE_MARKUP,
  'storage-materials': STORAGE_MATERIALS_PAGE_MARKUP,
  'storage-weapons': STORAGE_WEAPONS_PAGE_MARKUP,
  forge: FORGE_PAGE_MARKUP,
  'forge-form': FORGE_FORM_PAGE_MARKUP,
  'forge-preview': FORGE_PREVIEW_PAGE_MARKUP,
  'forge-jobs': FORGE_JOBS_PAGE_MARKUP,
  'forge-upgrade': FORGE_UPGRADE_PAGE_MARKUP,
  market: MARKET_PAGE_MARKUP,
  'market-materials': MARKET_MATERIALS_PAGE_MARKUP,
  'market-weapons': MARKET_WEAPONS_PAGE_MARKUP,
  'market-jobs': MARKET_JOBS_PAGE_MARKUP,
  'market-upgrade': MARKET_UPGRADE_PAGE_MARKUP,
  dungeon: DUNGEON_PAGE_MARKUP,
  'dungeon-select': DUNGEON_SELECT_PAGE_MARKUP,
  'dungeon-team': DUNGEON_TEAM_PAGE_MARKUP,
  'dungeon-expedition': DUNGEON_EXPEDITION_PAGE_MARKUP,
  'dungeon-loot': DUNGEON_LOOT_PAGE_MARKUP,
  'dungeon-log': DUNGEON_LOG_PAGE_MARKUP,
  index: INDEX_PAGE_MARKUP
};

export function getAngularOwnedPageMarkup(pageId: string): string | null {
  return ANGULAR_OWNED_PAGE_IDS.includes(pageId as AngularOwnedPageId)
    ? ANGULAR_PAGE_MARKUP[pageId as AngularOwnedPageId]
    : null;
}

export function composePageMarkup(pageIds: readonly string[]): string {
  return pageIds
    .map(pageId => {
      const markup = getAngularOwnedPageMarkup(pageId);
      if (markup === null) throw new Error(`Unbekannte Angular-Seite: ${pageId}`);
      return markup;
    })
    .join('\n');
}

import { CITY_BUILDING_TYPES, validateCityLayout, type CityBuildingTypeId, type CityLayoutState } from './city-layout-core.ts';
import { expandCityLayout, placeCityBuilding, type CityExpandDirection } from './city-placement-core.ts';
import { ECONOMY_BALANCE } from './economy-core.ts';

/** S10: Feste Gebäudegrundpreise; zentraler Eldravar-Kostenfaktor bleibt maßgeblich. */
export const CITY_BUILDING_ECONOMY = {
  roster: { baseNickel: 0, growth: 1.2, max: 1 },
  forge: { baseNickel: 5000, growth: 1.2, max: 10 },
  market: { baseNickel: 5000, growth: 1.2, max: 10 },
  team: { baseNickel: 3000, growth: 1.2, max: 10 },
  builder: { baseNickel: 20000, growth: 1.2, max: 2 },
  tavern: { baseNickel: 20000, growth: 1.2, max: 10 },
  runeWorkshop: { baseNickel: 20000, growth: 1.2, max: 2 }
} as const satisfies Record<CityBuildingTypeId, { baseNickel: number; growth: number; max: number }>;
export const CITY_EXPANSION_BASE_NICKEL = 3000;
export const CITY_EXPANSION_GROWTH = 1.5;
export const CITY_ECONOMY_MIGRATION_VERSION = 1;

export interface CityEconomyState {
  migrationVersion: typeof CITY_ECONOMY_MIGRATION_VERSION;
  paidExpansions: number;
  freeMigrationExpansions: number;
}
export interface CityEconomyWorldState {
  cityLayout?: CityLayoutState;
  cityEconomy?: CityEconomyState;
  upgrades?: { forgeSlots?: number; marketSlots?: number };
  teams?: Record<number, unknown>;
  gold?: number;
}
function safeCount(value: unknown, max: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) ? Math.max(1, Math.min(max, value)) : 1;
}
function money(value: number): number {
  if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER) {
    throw new Error('Nickelpreis überschreitet den sicheren Zahlenbereich.');
  }
  return Math.round(value);
}
export function cityBuildingCount(layout: CityLayoutState, type: CityBuildingTypeId): number {
  return layout.buildings.filter(b => b.buildingTypeId === type).length;
}
export function cityBuildingPrice(type: CityBuildingTypeId, owned: number): number | null {
  const rule = CITY_BUILDING_ECONOMY[type];
  if (!Number.isSafeInteger(owned) || owned < 0 || owned >= rule.max) return null;
  if (owned === 0) return 0;
  return money(rule.baseNickel * ECONOMY_BALANCE.progressionCostMultiplier *
    Math.pow(rule.growth, owned - 1));
}
export function cityExpansionPrice(paidExpansions: number): number {
  if (!Number.isSafeInteger(paidExpansions) || paidExpansions < 0) {
    throw new Error('Ungültige Zahl bezahlter Stadterweiterungen.');
  }
  return money(CITY_EXPANSION_BASE_NICKEL * ECONOMY_BALANCE.progressionCostMultiplier *
    Math.pow(CITY_EXPANSION_GROWTH, paidExpansions));
}
export function validateCityEconomy(value: unknown): asserts value is CityEconomyState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ungültige Stadtökonomie.');
  const state = value as Partial<CityEconomyState>;
  if (state.migrationVersion !== CITY_ECONOMY_MIGRATION_VERSION ||
      !Number.isSafeInteger(state.paidExpansions) || (state.paidExpansions ?? -1) < 0 ||
      !Number.isSafeInteger(state.freeMigrationExpansions) || (state.freeMigrationExpansions ?? -1) < 0) {
    throw new Error('Ungültige Stadtökonomie.');
  }
}

/** S09-Testflächen bleiben kostenlos; neue Spielerweiterungen werden atomar bezahlt. */
export function buyCityExpansion(
  state: CityEconomyWorldState, direction: CityExpandDirection
): { ok: boolean; costNickel: number; reason?: string } {
  if (!state.cityLayout || !state.cityEconomy || !Number.isSafeInteger(state.gold) || (state.gold ?? -1) < 0) {
    return { ok: false, costNickel: 0, reason: 'Stadt oder Nickelbestand fehlt.' };
  }
  validateCityLayout(state.cityLayout);
  validateCityEconomy(state.cityEconomy);
  const costNickel = cityExpansionPrice(state.cityEconomy.paidExpansions);
  if ((state.gold ?? 0) < costNickel) return { ok: false, costNickel, reason: 'Nicht genügend Nickel.' };
  const nextLayout = expandCityLayout(state.cityLayout, direction);
  if (!Number.isSafeInteger(state.cityEconomy.paidExpansions + 1)) {
    return { ok: false, costNickel, reason: 'Erweiterungszähler ist voll.' };
  }
  state.cityLayout = nextLayout;
  state.gold = (state.gold ?? 0) - costNickel;
  state.cityEconomy = { ...state.cityEconomy, paidExpansions: state.cityEconomy.paidExpansions + 1 };
  return { ok: true, costNickel };
}
function findVacancy(layout: CityLayoutState): { x: number; y: number } | null {
  const grid = layout.grid;
  for (let y = grid.minY; y <= grid.minY + grid.height - 2; y += 1) {
    for (let x = grid.minX; x <= grid.minX + grid.width - 2; x += 1) {
      if (layout.buildings.every(b => x + 2 <= b.x || b.x + b.width <= x ||
          y + 2 <= b.y || b.y + b.height <= y)) return { x, y };
    }
  }
  return null;
}

/** Einmaliger S10-Upgrade-Transfer; kein Nickelabzug, keine Team-/Job-Mutation. */
export function migrateCityEconomy(state: CityEconomyWorldState): boolean {
  if (!state.cityLayout) throw new Error('S10 benötigt ein gültiges S07-Stadtlayout.');
  validateCityLayout(state.cityLayout);
  if (state.cityEconomy !== undefined) {
    validateCityEconomy(state.cityEconomy);
    return false;
  }
  let layout = state.cityLayout;
  let freeMigrationExpansions = 0;
  const required: Array<{ type: CityBuildingTypeId; teamId: number | null }> = [];
  const forgeCount = safeCount(state.upgrades?.forgeSlots, CITY_BUILDING_ECONOMY.forge.max);
  const marketCount = safeCount(state.upgrades?.marketSlots, CITY_BUILDING_ECONOMY.market.max);
  for (let n = cityBuildingCount(layout, 'forge'); n < forgeCount; n++) {
    required.push({ type: 'forge', teamId: null });
  }
  for (let n = cityBuildingCount(layout, 'market'); n < marketCount; n++) {
    required.push({ type: 'market', teamId: null });
  }
  const existingTeamIds = new Set(layout.buildings.filter(b => b.buildingTypeId === 'team')
    .map(b => b.teamId));
  const teamIds = Object.keys(state.teams ?? {}).map(Number)
    .filter(id => Number.isSafeInteger(id) && id > 0)
    .sort((a, b) => a - b);
  for (const teamId of teamIds) {
    if (!existingTeamIds.has(teamId)) required.push({ type: 'team', teamId });
  }
  if (cityBuildingCount(layout, 'team') + required.filter(r => r.type === 'team').length > 10) {
    throw new Error('Mehr als zehn Teamgebäude können nicht migriert werden.');
  }
  for (const item of required) {
    let vacancy = findVacancy(layout);
    // Nur Rechtecke erweitern: Keine angefangenen Jobs, IDs oder bestehenden Positionen verändern.
    while (!vacancy) {
      layout = expandCityLayout(layout, 'right');
      freeMigrationExpansions++;
      vacancy = findVacancy(layout);
    }
    const placed = placeCityBuilding(layout, {
      buildingTypeId: item.type, x: vacancy.x, y: vacancy.y,
      width: 2, height: 2, status: 'placed', unitSlots: 1, teamId: item.teamId,
      workerCharacterId: null, activeJobId: null
    });
    if (!placed.ok) throw new Error('S10 konnte einen berechtigten Altbau nicht platzieren.');
    layout = placed.layout;
  }
  validateCityLayout(layout);
  state.cityLayout = layout;
  state.cityEconomy = { migrationVersion: CITY_ECONOMY_MIGRATION_VERSION,
    paidExpansions: 0, freeMigrationExpansions };
  return true;
}

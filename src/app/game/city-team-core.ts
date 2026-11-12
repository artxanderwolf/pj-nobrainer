import { validateCityLayout, type CityLayoutState } from './city-layout-core.ts';
import { expandCityLayout, placeCityBuilding } from './city-placement-core.ts';
import { CITY_BUILDING_ECONOMY, validateCityEconomy, type CityEconomyWorldState } from './city-economy-core.ts';
import { type TeamWorldState, teamIds } from './team-core.ts';

/**
 * S12: Reconcile paid legacy teams to their own stable building IDs.
 * This is deliberately idempotent and needs no new save field/version:
 * cityLayout and cityEconomy are already persistent in Save20.
 * S10 imported the historical slots once; S12 also covers teams purchased
 * between that import and this update.
 */
export function reconcileCityTeamBuildings(
  state: CityEconomyWorldState & TeamWorldState
): boolean {
  if (!state.cityLayout || !state.cityEconomy) {
    throw new Error('S12 benötigt ein migriertes Stadtlayout und eine Stadtökonomie.');
  }
  validateCityLayout(state.cityLayout);
  validateCityEconomy(state.cityEconomy);
  const owned = teamIds(state).filter(id => Number.isSafeInteger(id) && id >= 1 && id <= CITY_BUILDING_ECONOMY.team.max);
  const mapped = new Set(state.cityLayout.buildings
    .filter(building => building.buildingTypeId === 'team')
    .map(building => building.teamId));
  const missing = owned.filter(id => !mapped.has(id));
  if (!missing.length) return false;
  if (mapped.size + missing.length > CITY_BUILDING_ECONOMY.team.max) {
    throw new Error('S12: Teamgebäude-Grenze bei Migration überschritten.');
  }
  let layout: CityLayoutState = state.cityLayout;
  let freeExpansions = 0;
  for (const teamId of missing) {
    let vacancy = findFreeArea(layout);
    while (!vacancy) {
      layout = expandCityLayout(layout, 'right');
      freeExpansions++;
      vacancy = findFreeArea(layout);
    }
    const placed = placeCityBuilding(layout, {
      buildingTypeId: 'team',
      x: vacancy.x,
      y: vacancy.y,
      width: 2,
      height: 2,
      status: 'placed',
      unitSlots: 1,
      teamId,
      workerCharacterId: null,
      activeJobId: null
    });
    if (!placed.ok) throw new Error('S12: Alt-Teamgebäude konnte nicht zugeordnet werden.');
    layout = placed.layout;
  }
  validateCityLayout(layout);
  if (!Number.isSafeInteger(state.cityEconomy.freeMigrationExpansions + freeExpansions)) {
    throw new Error('S12: Migrationsflächenzähler überschritten.');
  }
  state.cityLayout = layout;
  state.cityEconomy = {
    ...state.cityEconomy,
    freeMigrationExpansions: state.cityEconomy.freeMigrationExpansions + freeExpansions
  };
  return true;
}

function findFreeArea(layout: CityLayoutState): { x: number; y: number } | null {
  const { minX, minY, width, height } = layout.grid;
  for (let y = minY; y <= minY + height - 2; y++) {
    for (let x = minX; x <= minX + width - 2; x++) {
      if (layout.buildings.every(b =>
        x + 2 <= b.x || b.x + b.width <= x || y + 2 <= b.y || b.y + b.height <= y
      )) return { x, y };
    }
  }
  return null;
}

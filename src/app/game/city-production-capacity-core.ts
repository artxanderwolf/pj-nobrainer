import { type CityLayoutWorldState } from './city-layout-core.ts';
import { finishCityConstruction, type CityConstructionWorldState } from './city-construction-core.ts';

export type ProductionBuildingType = 'forge' | 'market';

/**
 * S13: each finished, operational building contributes exactly one active slot.
 * The historic upgrades remain in the save exclusively for migration / old-save compatibility.
 * A building under construction or inactive does not provide capacity.
 */
export function productionActiveSlots(state: CityLayoutWorldState, type: ProductionBuildingType): number {
  const layout = state.cityLayout;
  if (!layout) throw new Error('S13: Stadtlayout fehlt.');
  return layout.buildings.filter(building => building.buildingTypeId === type && building.status === 'placed').length;
}

/**
 * Replay offline construction milestones in chronological order.
 * Finish existing work with old capacity before each building completes, then
 * dispatch the shared queues using the newly available building at its true timestamp.
 * A repeated call must not replay already removed construction jobs.
 */
export function replayProductionConstructionMilestones(
  state: CityConstructionWorldState,
  now: number,
  advanceProduction: (at: number) => void
): string[] {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Ungültiger Produktionszeitpunkt.');
  const times = [...new Set((state.cityConstruction?.jobs ?? [])
    .filter(job => job.completesAt <= now).map(job => job.completesAt))].sort((a,b)=>a-b);
  const finished: string[] = [];
  for (const at of times) {
    advanceProduction(at); // Preserve old active jobs and settle due work first.
    const jobs = finishCityConstruction(state, at);
    finished.push(...jobs);
    if (jobs.length) advanceProduction(at); // New building receives next queued job at the exact time.
  }
  return finished;
}

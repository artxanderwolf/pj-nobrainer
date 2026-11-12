import {
  validateCityLayout, type CityBuildingTypeId, type CityLayoutState
} from './city-layout-core.ts';
import { placeCityBuilding } from './city-placement-core.ts';
import {
  CITY_BUILDING_ECONOMY, cityBuildingCount, cityBuildingPrice,
  validateCityEconomy, type CityEconomyWorldState
} from './city-economy-core.ts';
import { createTeam, type TeamSessionState } from './team-core.ts';

export const CITY_CONSTRUCTION_SCHEMA_VERSION = 1;
export const CITY_CONSTRUCTION_DURATION_MS = 30 * 60 * 1000;
export type ConstructibleCityBuildingType = Exclude<CityBuildingTypeId, 'roster' | 'runeWorkshop'>;
export const CONSTRUCTIBLE_CITY_BUILDINGS: readonly ConstructibleCityBuildingType[] =
  ['forge', 'market', 'team', 'builder', 'tavern'];

export interface CityConstructionJob {
  jobId: string;
  buildingInstanceId: string;
  builderInstanceId: string;
  startedAt: number;
  completesAt: number;
  paidNickel: number;
}
export interface CityConstructionState {
  schemaVersion: typeof CITY_CONSTRUCTION_SCHEMA_VERSION;
  nextJobNumber: number;
  jobs: CityConstructionJob[];
}
export interface CityConstructionWorldState extends CityEconomyWorldState {
  cityConstruction?: CityConstructionState;
  teams?: Record<number, TeamSessionState>;
}
export type CityConstructionResult = { ok: true; jobId: string; costNickel: number }
  | { ok: false; reason: string; costNickel: number };
export function initializeCityConstruction(state: CityConstructionWorldState): boolean {
  if (!state.cityLayout || !state.cityEconomy) throw new Error('S11 benötigt Stadtlayout und Stadtökonomie.');
  validateCityLayout(state.cityLayout);
  validateCityEconomy(state.cityEconomy);
  if (state.cityConstruction !== undefined) {
    validateCityConstruction(state);
    return false;
  }
  state.cityConstruction = { schemaVersion: CITY_CONSTRUCTION_SCHEMA_VERSION, nextJobNumber: 1, jobs: [] };
  return true;
}
export function validateCityConstruction(state: CityConstructionWorldState): void {
  const construction = state.cityConstruction;
  if (!construction || construction.schemaVersion !== CITY_CONSTRUCTION_SCHEMA_VERSION ||
      !Number.isSafeInteger(construction.nextJobNumber) || construction.nextJobNumber < 1 ||
      !Array.isArray(construction.jobs) || !state.cityLayout) {
    throw new Error('Ungültige gespeicherte Bauaufträge.');
  }
  validateCityLayout(state.cityLayout);
  const buildings = new Map(state.cityLayout.buildings.map(b => [b.buildingInstanceId, b]));
  const jobs = new Set<string>();
  const assignedBuilders = new Set<string>();
  let maxJob = 0;
  for (const job of construction.jobs) {
    if (!job || typeof job !== 'object' || typeof job.jobId !== 'string' ||
        !/^build-job-[1-9][0-9]*$/.test(job.jobId) || jobs.has(job.jobId) ||
        typeof job.buildingInstanceId !== 'string' || typeof job.builderInstanceId !== 'string' ||
        assignedBuilders.has(job.builderInstanceId) ||
        !Number.isSafeInteger(job.startedAt) || job.startedAt < 0 ||
        !Number.isSafeInteger(job.completesAt) ||
        job.completesAt - job.startedAt !== CITY_CONSTRUCTION_DURATION_MS ||
        !Number.isSafeInteger(job.paidNickel) || job.paidNickel < 0) {
      throw new Error('Ungültige gespeicherte Bauaufträge.');
    }
    const ordinal = Number(job.jobId.slice('build-job-'.length));
    if (!Number.isSafeInteger(ordinal)) throw new Error('Ungültige Baujob-ID.');
    maxJob = Math.max(maxJob, ordinal);
    const building = buildings.get(job.buildingInstanceId);
    const builder = buildings.get(job.builderInstanceId);
    if (!building || !builder || building.status !== 'underConstruction' ||
        building.activeJobId !== job.jobId || builder.buildingTypeId !== 'builder' ||
        builder.status !== 'placed' || builder.activeJobId !== job.jobId ||
        building.buildingInstanceId === builder.buildingInstanceId) {
      throw new Error('Baujob und Gebäudezuordnung stimmen nicht überein.');
    }
    jobs.add(job.jobId);
    assignedBuilders.add(job.builderInstanceId);
  }
  if (construction.nextJobNumber <= maxJob) throw new Error('Baujob-Zähler läuft rückwärts.');
  for (const building of state.cityLayout.buildings) {
    if (building.activeJobId?.startsWith('build-job-') &&
        (!jobs.has(building.activeJobId) ||
         !construction.jobs.some(j => j.jobId === building.activeJobId &&
           (j.builderInstanceId === building.buildingInstanceId ||
            j.buildingInstanceId === building.buildingInstanceId)))) {
      throw new Error('Verwaiste Baujob-Zuordnung.');
    }
    if (building.status === 'underConstruction' &&
        !construction.jobs.some(j => j.buildingInstanceId === building.buildingInstanceId)) {
      throw new Error('Baustelle ohne Bauauftrag.');
    }
  }
}
function chooseTeamId(state: CityConstructionWorldState): number | null {
  const reserved = new Set(state.cityLayout?.buildings.filter(b => b.buildingTypeId === 'team')
    .map(b => b.teamId) ?? []);
  for (const key of Object.keys(state.teams ?? {})) reserved.add(Number(key));
  for (let id = 1; id <= CITY_BUILDING_ECONOMY.team.max; id++) {
    if (!reserved.has(id)) return id;
  }
  return null;
}
function activeBuilder(layout: CityLayoutState) {
  return layout.buildings.find(b => b.buildingTypeId === 'builder' &&
    b.status === 'placed' && b.activeJobId === null) ?? null;
}
export function availableCityBuilders(state: CityConstructionWorldState): number {
  return state.cityLayout?.buildings.filter(b =>
    b.buildingTypeId === 'builder' && b.status === 'placed' && b.activeJobId === null).length ?? 0;
}
export function startCityConstruction(
  state: CityConstructionWorldState,
  type: ConstructibleCityBuildingType, x: number, y: number, now: number
): CityConstructionResult {
  if (!state.cityLayout || !state.cityEconomy || !state.cityConstruction) {
    return { ok: false, reason: 'Bausystem nicht vorbereitet.', costNickel: 0 };
  }
  validateCityConstruction(state);
  if (!(CONSTRUCTIBLE_CITY_BUILDINGS as readonly string[]).includes(type)) {
    return { ok: false, reason: 'Dieser Gebäudetyp ist noch nicht baubar.', costNickel: 0 };
  }
  if (!Number.isSafeInteger(now) || now < 0 ||
      !Number.isSafeInteger(now + CITY_CONSTRUCTION_DURATION_MS)) {
    return { ok: false, reason: 'Ungültige Bauzeit.', costNickel: 0 };
  }
  const layout = state.cityLayout;
  const price = cityBuildingPrice(type, cityBuildingCount(layout, type));
  if (price === null) return { ok: false, reason: 'Maximale Gebäudeanzahl erreicht.', costNickel: 0 };
  if (!Number.isSafeInteger(state.gold) || (state.gold ?? -1) < price) {
    return { ok: false, reason: 'Nicht genügend Nickel.', costNickel: price };
  }
  const builder = activeBuilder(layout);
  if (!builder) return { ok: false, reason: 'Alle Baumeister sind beschäftigt.', costNickel: price };
  const teamId = type === 'team' ? chooseTeamId(state) : null;
  if (type === 'team' && teamId === null) {
    return { ok: false, reason: 'Zehn Teams sind bereits vorhanden.', costNickel: price };
  }
  const nextJobNumber = state.cityConstruction.nextJobNumber + 1;
  if (!Number.isSafeInteger(nextJobNumber)) {
    return { ok: false, reason: 'Keine weitere Baujob-ID verfügbar.', costNickel: price };
  }
  const result = placeCityBuilding(layout, {
    buildingTypeId: type, x, y, width: 2, height: 2,
    status: 'underConstruction', unitSlots: 1, teamId,
    workerCharacterId: null, activeJobId: `build-job-${state.cityConstruction.nextJobNumber}`
  });
  if (!result.ok) return { ok: false, reason: result.message, costNickel: price };
  const jobId = `build-job-${state.cityConstruction.nextJobNumber}`;
  const buildings = result.layout.buildings.map(b =>
    b.buildingInstanceId === builder.buildingInstanceId ? { ...b, activeJobId: jobId } : b);
  const nextLayout = { ...result.layout, buildings };
  const nextConstruction: CityConstructionState = {
    ...state.cityConstruction, nextJobNumber,
    jobs: [...state.cityConstruction.jobs, {
      jobId, buildingInstanceId: nextLayout.buildings[nextLayout.buildings.length - 1].buildingInstanceId,
      builderInstanceId: builder.buildingInstanceId, startedAt: now,
      completesAt: now + CITY_CONSTRUCTION_DURATION_MS, paidNickel: price
    }]
  };
  validateCityConstruction({ ...state, cityLayout: nextLayout, cityConstruction: nextConstruction });
  state.cityLayout = nextLayout;
  state.cityConstruction = nextConstruction;
  state.gold = (state.gold ?? 0) - price;
  return { ok: true, jobId, costNickel: price };
}
export function cancelCityConstruction(
  state: CityConstructionWorldState, jobId: string, now: number
): { ok: boolean; refundedNickel: number; reason?: string } {
  validateCityConstruction(state);
  const job = state.cityConstruction!.jobs.find(j => j.jobId === jobId);
  if (!job) return { ok: false, refundedNickel: 0, reason: 'Bauauftrag nicht gefunden.' };
  if (!Number.isSafeInteger(now) || now >= job.completesAt) {
    return { ok: false, refundedNickel: 0, reason: 'Der Bauauftrag ist bereits fertiggestellt.' };
  }
  const newGold = (state.gold ?? NaN) + job.paidNickel;
  if (!Number.isSafeInteger(newGold)) {
    return { ok: false, refundedNickel: 0, reason: 'Nickelgutschrift ist nicht möglich.' };
  }
  const nextLayout: CityLayoutState = {
    ...state.cityLayout!,
    buildings: state.cityLayout!.buildings.filter(b => b.buildingInstanceId !== job.buildingInstanceId)
      .map(b => b.buildingInstanceId === job.builderInstanceId ? { ...b, activeJobId: null } : b)
  };
  const nextConstruction: CityConstructionState = {
    ...state.cityConstruction!, jobs: state.cityConstruction!.jobs.filter(j => j.jobId !== jobId)
  };
  validateCityConstruction({ ...state, cityLayout: nextLayout, cityConstruction: nextConstruction });
  state.cityLayout = nextLayout;
  state.cityConstruction = nextConstruction;
  state.gold = newGold;
  return { ok: true, refundedNickel: job.paidNickel };
}
/** Offline- und Online-Abschluss; bei wiederholtem Aufruf niemals doppelt abschließen. */
export function finishCityConstruction(state: CityConstructionWorldState, now: number): string[] {
  validateCityConstruction(state);
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Ungültiger Bauzeitpunkt.');
  const finished = state.cityConstruction!.jobs.filter(j => j.completesAt <= now);
  if (!finished.length) return [];
  const jobIds = new Set(finished.map(j => j.jobId));
  const buildingIds = new Set(finished.map(j => j.buildingInstanceId));
  const builderIds = new Set(finished.map(j => j.builderInstanceId));
  const nextLayout: CityLayoutState = {
    ...state.cityLayout!, buildings: state.cityLayout!.buildings.map(b => {
      if (buildingIds.has(b.buildingInstanceId)) return { ...b, status: 'placed', activeJobId: null };
      if (builderIds.has(b.buildingInstanceId)) return { ...b, activeJobId: null };
      return b;
    })
  };
  const nextConstruction: CityConstructionState = {
    ...state.cityConstruction!, jobs: state.cityConstruction!.jobs.filter(j => !jobIds.has(j.jobId))
  };
  const teams = { ...(state.teams ?? {}) };
  for (const job of finished) {
    const building = nextLayout.buildings.find(b => b.buildingInstanceId === job.buildingInstanceId);
    if (building?.buildingTypeId === 'team' && building.teamId !== null && !teams[building.teamId]) {
      teams[building.teamId] = createTeam(building.teamId);
    }
  }
  validateCityConstruction({ ...state, cityLayout: nextLayout, cityConstruction: nextConstruction, teams });
  state.cityLayout = nextLayout;
  state.cityConstruction = nextConstruction;
  state.teams = teams;
  return finished.map(j => j.jobId);
}

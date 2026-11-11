/**
 * S07: Persistentes Stadt-/Gebäude-Datenmodell.
 * S08 ersetzt die alte grafische Stadt; S09 ergänzt Platzierung/Move; S10
 * rechnet bestehende bezahlte Slots in Gebäudeansprüche um. Dieses Modell
 * bucht bis dahin ausdrücklich weder Geld noch Produktionskapazität um.
 */
export const CITY_LAYOUT_SCHEMA_VERSION = 1;
export const INITIAL_CITY_WIDTH = 12;
export const INITIAL_CITY_HEIGHT = 8;
export const DEFAULT_BUILDING_SIZE = 2;

export const CITY_BUILDING_TYPES = {
  roster: { assetKey: 'city.building.roster', label: 'Kader / Unterkunft' },
  tavern: { assetKey: 'city.building.tavern', label: 'Taverne' },
  forge: { assetKey: 'city.building.forge', label: 'Schmiede' },
  market: { assetKey: 'city.building.market', label: 'Markt' },
  team: { assetKey: 'city.building.team', label: 'Teamgebäude' },
  builder: { assetKey: 'city.building.builder', label: 'Bauhütte' },
  runeWorkshop: { assetKey: 'city.building.runeWorkshop', label: 'Runenwerkstatt' }
} as const;

export type CityBuildingTypeId = keyof typeof CITY_BUILDING_TYPES;
export type CityBuildingStatus = 'placed' | 'underConstruction' | 'inactive';

export interface CityGrid {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface CityBuildingInstance {
  buildingInstanceId: string;
  buildingTypeId: CityBuildingTypeId;
  x: number;
  y: number;
  width: number;
  height: number;
  status: CityBuildingStatus;
  /** Keine Spielökonomie bis S10; technische Einzelgebäude-Kapazität. */
  unitSlots: number;
  /** Teamzuordnung wird in S12 über diese stabile ID navigierbar. */
  teamId: number | null;
  workerCharacterId: number | null;
  activeJobId: string | null;
  assetKey: string;
}

export interface CityLayoutState {
  schemaVersion: typeof CITY_LAYOUT_SCHEMA_VERSION;
  grid: CityGrid;
  buildings: CityBuildingInstance[];
  nextBuildingNumber: number;
}

export interface CityLayoutWorldState {
  cityLayout?: CityLayoutState;
}

const STARTER_PLACEMENTS: readonly {
  buildingTypeId: CityBuildingTypeId;
  x: number;
  y: number;
  teamId?: number;
}[] = [
  { buildingTypeId: 'roster', x: 0, y: 0 },
  { buildingTypeId: 'tavern', x: 4, y: 0 },
  { buildingTypeId: 'forge', x: 8, y: 0 },
  { buildingTypeId: 'market', x: 0, y: 4 },
  { buildingTypeId: 'team', x: 4, y: 4, teamId: 1 },
  { buildingTypeId: 'builder', x: 8, y: 4 }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertInteger(value: unknown, label: string, minimum: number): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`Ungültige Stadtdaten: ${label}`);
  }
}

export function createInitialCityLayout(): CityLayoutState {
  return {
    schemaVersion: CITY_LAYOUT_SCHEMA_VERSION,
    grid: { minX: 0, minY: 0, width: INITIAL_CITY_WIDTH, height: INITIAL_CITY_HEIGHT },
    buildings: STARTER_PLACEMENTS.map((placement, index) => ({
      buildingInstanceId: `building-${index + 1}`,
      buildingTypeId: placement.buildingTypeId,
      x: placement.x,
      y: placement.y,
      width: DEFAULT_BUILDING_SIZE,
      height: DEFAULT_BUILDING_SIZE,
      status: 'placed',
      unitSlots: 1,
      teamId: placement.teamId ?? null,
      workerCharacterId: null,
      activeJobId: null,
      assetKey: CITY_BUILDING_TYPES[placement.buildingTypeId].assetKey
    })),
    nextBuildingNumber: STARTER_PLACEMENTS.length + 1
  };
}

export function validateCityLayout(input: unknown): asserts input is CityLayoutState {
  if (!isRecord(input) || input['schemaVersion'] !== CITY_LAYOUT_SCHEMA_VERSION ||
      !isRecord(input['grid']) || !Array.isArray(input['buildings'])) {
    throw new Error('Ungültige Stadtdaten: Stadtschema oder Gebäude fehlen.');
  }
  const grid = input['grid'];
  assertInteger(grid['minX'], 'minX', -100000);
  assertInteger(grid['minY'], 'minY', -100000);
  assertInteger(grid['width'], 'width', 1);
  assertInteger(grid['height'], 'height', 1);

  const buildings = input['buildings'] as unknown[];
  const usedIds = new Set<string>();
  const occupied = new Set<string>();
  let greatestId = 0;

  for (const building of buildings) {
    if (!isRecord(building)) throw new Error('Ungültige Stadtdaten: Gebäudeobjekt fehlt.');
    const id = building['buildingInstanceId'];
    const match = typeof id === 'string' ? /^building-([1-9][0-9]*)$/.exec(id) : null;
    if (!match || usedIds.has(id as string)) {
      throw new Error('Ungültige Stadtdaten: Gebäude-ID fehlt oder ist doppelt.');
    }
    const ordinal = Number(match[1]);
    assertInteger(ordinal, 'Gebäude-ID', 1);
    greatestId = Math.max(greatestId, ordinal);
    usedIds.add(id as string);

    const typeId = building['buildingTypeId'];
    if (typeof typeId !== 'string' || !(typeId in CITY_BUILDING_TYPES)) {
      throw new Error('Ungültige Stadtdaten: unbekannter Gebäudetyp.');
    }
    const status = building['status'];
    if (status !== 'placed' && status !== 'underConstruction' && status !== 'inactive') {
      throw new Error('Ungültige Stadtdaten: Gebäudestatus.');
    }
    assertInteger(building['x'], 'x', -100000);
    assertInteger(building['y'], 'y', -100000);
    assertInteger(building['width'], 'Gebäudebreite', 1);
    assertInteger(building['height'], 'Gebäudehöhe', 1);
    assertInteger(building['unitSlots'], 'Gebäudeplätze', 1);
    const teamId = building['teamId'];
    if (teamId !== null) assertInteger(teamId, 'Team-ID', 1);
    const workerId = building['workerCharacterId'];
    if (workerId !== null) assertInteger(workerId, 'Arbeiter-ID', 1);
    const jobId = building['activeJobId'];
    if (jobId !== null && (typeof jobId !== 'string' || !jobId.trim())) {
      throw new Error('Ungültige Stadtdaten: Auftrags-ID.');
    }
    if (typeof building['assetKey'] !== 'string' || !building['assetKey']) {
      throw new Error('Ungültige Stadtdaten: Asset-Key fehlt.');
    }
    if (typeId === 'team' && teamId === null) {
      throw new Error('Ungültige Stadtdaten: Teamgebäude ohne Team-ID.');
    }
    if (typeId !== 'team' && teamId !== null) {
      throw new Error('Ungültige Stadtdaten: Team-ID an Nicht-Teamgebäude.');
    }

    const x = building['x'] as number;
    const y = building['y'] as number;
    const width = building['width'] as number;
    const height = building['height'] as number;
    if (x < (grid['minX'] as number) || y < (grid['minY'] as number) ||
        x + width > (grid['minX'] as number) + (grid['width'] as number) ||
        y + height > (grid['minY'] as number) + (grid['height'] as number)) {
      throw new Error('Ungültige Stadtdaten: Gebäude liegt außerhalb der Stadt.');
    }
    for (let cellX = x; cellX < x + width; cellX++) {
      for (let cellY = y; cellY < y + height; cellY++) {
        const key = `${cellX}:${cellY}`;
        if (occupied.has(key)) {
          throw new Error('Ungültige Stadtdaten: Gebäude überlappen sich.');
        }
        occupied.add(key);
      }
    }
  }

  assertInteger(input['nextBuildingNumber'], 'nächste Gebäude-ID', greatestId + 1);
  const assignedTeams = buildings
    .filter(building => isRecord(building) && building['buildingTypeId'] === 'team')
    .map(building => (building as Record<string, unknown>)['teamId']);
  if (new Set(assignedTeams).size !== assignedTeams.length) {
    throw new Error('Ungültige Stadtdaten: Team-ID ist mehreren Gebäuden zugeordnet.');
  }
}

/**
 * Auf dem Speicher-Bootstrap synchron ausführen, damit auch alte Save-17-Dateien
 * sofort das neue Stadtschema erhalten. Wiederholtes Laden verändert nichts.
 * Fehlerhafte bereits vorhandene Stadtdaten werden nie stillschweigend ersetzt.
 */
export function migrateCityLayout(state: CityLayoutWorldState): boolean {
  if (state.cityLayout !== undefined) {
    validateCityLayout(state.cityLayout);
    return false;
  }
  const layout = createInitialCityLayout();
  validateCityLayout(layout);
  state.cityLayout = layout;
  return true;
}

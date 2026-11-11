import {
  CITY_BUILDING_TYPES,
  validateCityLayout,
  type CityBuildingInstance,
  type CityLayoutState
} from './city-layout-core.ts';

/**
 * S09: Nur die Stadtgeometrie; keine Berechtigung zum Kauf oder kostenlosen Neubau.
 * S10/S11 verantworten Preise, Ansprüche und Bauaufträge vor placeCityBuilding().
 */
export type CityExpandDirection = 'left' | 'right' | 'up' | 'down';
export type CityPlacementError = 'unknown-building' | 'invalid-position' | 'out-of-bounds' | 'collision' | 'unchanged' | 'invalid-building';
export type CityPlacementResult =
  | { ok: true; layout: CityLayoutState }
  | { ok: false; reason: CityPlacementError; message: string };

export const CITY_EXPANSION_SIZE = 4;

function failure(reason: CityPlacementError, message: string): CityPlacementResult {
  return { ok: false, reason, message };
}

function canUsePosition(
  layout: CityLayoutState,
  proposed: Pick<CityBuildingInstance, 'x' | 'y' | 'width' | 'height'>,
  excludeBuildingId: string | null
): CityPlacementResult | null {
  const { x, y, width, height } = proposed;
  if (![x, y, width, height].every(Number.isSafeInteger) || width < 1 || height < 1) {
    return failure('invalid-position', 'Bitte ein ganzzahliges Zielfeld auswählen.');
  }
  const { minX, minY } = layout.grid;
  if (x < minX || y < minY ||
      x + width > minX + layout.grid.width || y + height > minY + layout.grid.height) {
    return failure('out-of-bounds', 'Das Gebäude muss vollständig innerhalb der Stadtfläche stehen.');
  }
  for (const existing of layout.buildings) {
    if (existing.buildingInstanceId === excludeBuildingId) continue;
    if (x < existing.x + existing.width && x + width > existing.x &&
        y < existing.y + existing.height && y + height > existing.y) {
      return failure('collision', 'Dieses Zielfeld ist bereits durch ein anderes Gebäude belegt.');
    }
  }
  return null;
}

/** Kostenfreier, atomarer Gebäude-Move. Bei Fehlern wird nicht ein Bit geändert. */
export function moveCityBuilding(
  layout: CityLayoutState, buildingInstanceId: string, x: number, y: number
): CityPlacementResult {
  validateCityLayout(layout);
  const building = layout.buildings.find(item => item.buildingInstanceId === buildingInstanceId);
  if (!building) return failure('unknown-building', 'Das gewählte Gebäude ist nicht mehr vorhanden.');
  if (x === building.x && y === building.y) {
    return failure('unchanged', 'Das Gebäude steht bereits an dieser Position.');
  }
  const invalid = canUsePosition(layout, { ...building, x, y }, buildingInstanceId);
  if (invalid) return invalid;

  const next: CityLayoutState = {
    ...layout,
    buildings: layout.buildings.map(item =>
      item.buildingInstanceId === buildingInstanceId ? { ...item, x, y } : item)
  };
  validateCityLayout(next);
  return { ok: true, layout: next };
}

/**
 * Technischer Platzierungsbaustein für spätere autorisierte Gebäude.
 * Der Spieler erhält in S09 ausdrücklich KEINEN kostenlosen Neubau-Button.
 */
export function placeCityBuilding(
  layout: CityLayoutState,
  placement: Omit<CityBuildingInstance, 'buildingInstanceId' | 'assetKey'>
): CityPlacementResult {
  validateCityLayout(layout);
  if (!Object.prototype.hasOwnProperty.call(CITY_BUILDING_TYPES, placement.buildingTypeId)) {
    return failure('invalid-building', 'Unbekannter Gebäudetyp.');
  }
  if (placement.buildingTypeId === 'team' && (placement.teamId === null ||
      layout.buildings.some(item => item.buildingTypeId === 'team' && item.teamId === placement.teamId))) {
    return failure('invalid-building', 'Die Team-ID ist nicht eindeutig zugeordnet.');
  }
  if (placement.buildingTypeId !== 'team' && placement.teamId !== null) {
    return failure('invalid-building', 'Team-ID am falschen Gebäudetyp.');
  }
  const invalid = canUsePosition(layout, placement, null);
  if (invalid) return invalid;

  const ordinal = layout.nextBuildingNumber;
  if (!Number.isSafeInteger(ordinal + 1)) {
    return failure('invalid-building', 'Der Gebäude-ID-Zähler ist ungültig.');
  }
  const candidate: CityBuildingInstance = {
    ...placement,
    buildingInstanceId: `building-${ordinal}`,
    assetKey: CITY_BUILDING_TYPES[placement.buildingTypeId].assetKey
  };
  const next: CityLayoutState = {
    ...layout,
    nextBuildingNumber: ordinal + 1,
    buildings: [...layout.buildings, candidate]
  };
  validateCityLayout(next);
  return { ok: true, layout: next };
}

/**
 * Erweitert das bestehende Stadtrechteck um genau vier Felder auf einer Seite.
 * Vorläufig ohne Nickelbuchung; S10 legt die noch offenen Flächenpreise fest.
 * Alle Gebäude-Koordinaten bleiben unverändert, nur der Rasterursprung wandert.
 */
export function expandCityLayout(
  layout: CityLayoutState, direction: CityExpandDirection
): CityLayoutState {
  validateCityLayout(layout);
  const { grid } = layout;
  if (direction !== 'left' && direction !== 'right' && direction !== 'up' && direction !== 'down') {
    throw new Error('Unbekannte Richtung für die Stadtflächenerweiterung.');
  }
  const nextGrid = { ...grid };
  if (direction === 'left') {
    nextGrid.minX -= CITY_EXPANSION_SIZE;
    nextGrid.width += CITY_EXPANSION_SIZE;
  } else if (direction === 'right') {
    nextGrid.width += CITY_EXPANSION_SIZE;
  } else if (direction === 'up') {
    nextGrid.minY -= CITY_EXPANSION_SIZE;
    nextGrid.height += CITY_EXPANSION_SIZE;
  } else {
    nextGrid.height += CITY_EXPANSION_SIZE;
  }
  if (![nextGrid.minX, nextGrid.minY, nextGrid.width, nextGrid.height].every(Number.isSafeInteger)) {
    throw new Error('Stadtfläche kann nicht weiter vergrößert werden.');
  }
  const next: CityLayoutState = { ...layout, grid: nextGrid };
  validateCityLayout(next);
  return next;
}

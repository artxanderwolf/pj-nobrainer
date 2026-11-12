import {
  CITY_BUILDING_TYPES,
  validateCityLayout,
  type CityBuildingInstance,
  type CityBuildingTypeId,
  type CityLayoutState
} from './city-layout-core.ts';

/**
 * S08: Reine, ID-basierte Darstellung der S07-Stadtinstanzen.
 * Keine neue Stadt-Quelle, keine Legacy-Hotspots oder Persistenz beim Rendern.
 */
export interface CityBuildingPresentation extends CityBuildingInstance {
  label: string;
  icon: string;
  enabled: boolean;
  disabledReason: string | null;
  navigation: { kind: 'page'; pageId: string } | { kind: 'team'; teamId: number } | null;
}

export interface CityQuickAccess {
  id: 'dungeon' | 'materials' | 'weapons' | 'missions';
  label: string;
  icon: string;
  kind: 'page' | 'mission';
  pageId?: string;
}

export interface CityLegacyTeamAccess {
  teamId: number;
  label: string;
}

/** Bewusst kein eigener Bauplatz für den Dungeon oder die Lager-Zugänge. */
export const CITY_QUICK_ACCESS: readonly CityQuickAccess[] = Object.freeze([
  { id: 'dungeon', label: 'Dungeonweg', icon: '⚔️', kind: 'page', pageId: 'dungeon' },
  { id: 'materials', label: 'Materiallager', icon: '🪵', kind: 'page', pageId: 'storage-materials' },
  { id: 'weapons', label: 'Waffenlager', icon: '🗡️', kind: 'page', pageId: 'storage-weapons' },
  { id: 'missions', label: 'Missionen', icon: '📜', kind: 'mission' }
]);

const ICONS: Record<CityBuildingTypeId, string> = {
  roster: '🛡️',
  tavern: '🍺',
  forge: '⚒️',
  market: '⚖️',
  team: '🏕️',
  builder: '🪚',
  runeWorkshop: '✧'
};

const PAGE_BY_TYPE: Partial<Record<CityBuildingTypeId, string>> = {
  roster: 'roster',
  tavern: 'tavern',
  forge: 'forge',
  market: 'market'
};

/** Jeder Zugriff wird mit der aktuellen Team- und Gebäude-ID geprüft. */
export function getCityOverviewPresentation(
  cityLayout: CityLayoutState,
  ownedTeamIds: readonly number[]
): CityBuildingPresentation[] {
  validateCityLayout(cityLayout);
  const ownedTeams = new Set(ownedTeamIds.filter(id => Number.isInteger(id) && id > 0));
  return cityLayout.buildings.map(building => {
    const type = CITY_BUILDING_TYPES[building.buildingTypeId];
    const label = building.buildingTypeId === 'team'
      ? `Team ${building.teamId}`
      : type.label;
    const pageId = PAGE_BY_TYPE[building.buildingTypeId];
    let navigation: CityBuildingPresentation['navigation'] = null;
    let disabledReason: string | null = null;
    if (building.status === 'underConstruction') {
      disabledReason = 'Im Bau';
    } else if (building.status === 'inactive') {
      disabledReason = 'Noch nicht aktiv';
    } else if (building.buildingTypeId === 'team') {
      if (building.teamId !== null && ownedTeams.has(building.teamId)) {
        navigation = { kind: 'team', teamId: building.teamId };
      } else {
        disabledReason = 'Team noch nicht freigeschaltet';
      }
    } else if (pageId) {
      navigation = { kind: 'page', pageId };
    } else {
      disabledReason = building.buildingTypeId === 'builder'
        ? 'Bauhütte: Baumeister für Stadt-Bauaufträge'
        : 'Gebäude noch nicht freigeschaltet';
    }
    return {
      ...building,
      label,
      icon: ICONS[building.buildingTypeId],
      enabled: navigation !== null,
      disabledReason,
      navigation
    };
  });
}

/**
 * S08-S12-Übergang für schon bezahlte Teams ohne Gebäudeinstanz:
 * keine unechte Stadtinstanz und keine doppelte Kostenbuchung erfinden.
 */
export function getCityLegacyTeamAccess(
  cityLayout: CityLayoutState,
  ownedTeamIds: readonly number[]
): CityLegacyTeamAccess[] {
  validateCityLayout(cityLayout);
  const placedTeamIds = new Set(cityLayout.buildings
    .filter(building => building.buildingTypeId === 'team')
    .map(building => building.teamId));
  return [...new Set(ownedTeamIds)]
    .filter(teamId => Number.isInteger(teamId) && teamId > 0 && !placedTeamIds.has(teamId))
    .sort((a, b) => a - b)
    .map(teamId => ({ teamId, label: `Team ${teamId}` }));
}

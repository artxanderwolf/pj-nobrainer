export const CITY_OVERVIEW_BACKGROUND_ASSET = 'ui/city.png';

export type CityOverviewActionKind = 'page' | 'team' | 'mission' | 'future';

export interface CityOverviewPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CityOverviewActionDefinition {
  id: string;
  label: string;
  kind: CityOverviewActionKind;
  targetPageId?: string;
  teamId?: number;
  position: CityOverviewPosition;
}

export interface CityOverviewActionPresentation extends CityOverviewActionDefinition {
  enabled: boolean;
  disabledReason: string | null;
}

export const CITY_OVERVIEW_ACTIONS: readonly CityOverviewActionDefinition[] = Object.freeze([
  { id: 'recruit', label: 'Rekrutieren', kind: 'page', targetPageId: 'tavern', position: { left: 17.828, top: 23.735, width: 26.025, height: 8.099 } },
  { id: 'market', label: 'Verkaufen', kind: 'page', targetPageId: 'market', position: { left: 66.803, top: 27.222, width: 18.033, height: 8.211 } },
  { id: 'team-1', label: 'Team 1', kind: 'team', teamId: 1, position: { left: 29.303, top: 36.108, width: 16.393, height: 6.299 } },
  { id: 'team-2', label: 'Team 2', kind: 'team', teamId: 2, position: { left: 51.639, top: 37.795, width: 9.836, height: 5.962 } },
  { id: 'dungeon', label: 'Dungeon', kind: 'page', targetPageId: 'dungeon', position: { left: 82.377, top: 42.520, width: 13.730, height: 7.762 } },
  { id: 'team-5', label: 'Team 5', kind: 'team', teamId: 5, position: { left: 34.631, top: 46.569, width: 12.910, height: 5.737 } },
  { id: 'team-3', label: 'Team 3', kind: 'team', teamId: 3, position: { left: 63.934, top: 47.019, width: 9.221, height: 5.062 } },
  { id: 'team-4', label: 'Team 4', kind: 'team', teamId: 4, position: { left: 63.525, top: 54.218, width: 8.811, height: 5.512 } },
  { id: 'armor', label: 'Rüstung', kind: 'future', position: { left: 85.041, top: 54.556, width: 10.656, height: 9.449 } },
  { id: 'team-6', label: 'Team 6', kind: 'team', teamId: 6, position: { left: 39.344, top: 55.006, width: 13.115, height: 5.962 } },
  { id: 'team-7', label: 'Team 7', kind: 'team', teamId: 7, position: { left: 14.549, top: 55.456, width: 12.295, height: 6.524 } },
  { id: 'roster', label: 'Kader', kind: 'page', targetPageId: 'roster', position: { left: 54.098, top: 65.917, width: 19.877, height: 8.211 } },
  { id: 'team-8', label: 'Team 8', kind: 'team', teamId: 8, position: { left: 86.066, top: 67.379, width: 9.836, height: 4.837 } },
  { id: 'forge', label: 'Schmiede', kind: 'page', targetPageId: 'forge', position: { left: 24.385, top: 68.616, width: 18.648, height: 7.087 } },
  { id: 'team-9', label: 'Team 9', kind: 'team', teamId: 9, position: { left: 86.885, top: 75.141, width: 9.631, height: 4.949 } },
  { id: 'weapons', label: 'Waffen', kind: 'page', targetPageId: 'storage-weapons', position: { left: 54.098, top: 79.865, width: 19.262, height: 7.312 } },
  { id: 'materials', label: 'Material', kind: 'page', targetPageId: 'storage-materials', position: { left: 22.131, top: 80.652, width: 21.516, height: 7.649 } },
  { id: 'team-10', label: 'Team 10', kind: 'team', teamId: 10, position: { left: 87.295, top: 83.127, width: 9.221, height: 4.724 } },
  { id: 'upgrade', label: 'Upgrade', kind: 'future', position: { left: 65.574, top: 90.551, width: 9.221, height: 4.724 } },
  { id: 'missions', label: 'Missionen', kind: 'mission', position: { left: 87.090, top: 90.889, width: 9.426, height: 4.724 } },
  { id: 'activity', label: 'Übersicht aktive Vorgänge', kind: 'future', position: { left: 22.336, top: 91.564, width: 31.967, height: 6.862 } }
]);

export function getCityOverviewPresentation(ownedTeamIds: readonly number[]): CityOverviewActionPresentation[] {
  const ownedTeams = new Set(ownedTeamIds.filter(teamId => Number.isInteger(teamId) && teamId > 0));
  return CITY_OVERVIEW_ACTIONS.map(action => {
    if (action.kind === 'future') {
      return { ...action, enabled: false, disabledReason: 'Noch nicht verfügbar' };
    }
    if (action.kind === 'team' && !ownedTeams.has(action.teamId ?? 0)) {
      return { ...action, enabled: false, disabledReason: 'Noch nicht freigeschaltet' };
    }
    return { ...action, enabled: true, disabledReason: null };
  });
}

export const NAVIGATION_ITEMS = [
  { id: 'base', title: 'Stützpunkt' },
  { id: 'dungeon', title: 'Dungeon' },
  { id: 'tavern', title: 'Taverne' },
  { id: 'roster', title: 'Kader' },
  { id: 'storage', title: 'Lager' },
  { id: 'forge', title: 'Schmiede' },
  { id: 'market', title: 'Markt' },
  { id: 'index', title: 'Index' }
] as const;

export type NavigationPageId = (typeof NAVIGATION_ITEMS)[number]['id'];

export interface NavigationPresentation {
  pageId: string;
  title: string;
}

const NAVIGATION_TITLES: Record<NavigationPageId, string> = {
  base: 'Stützpunkt',
  dungeon: 'Dungeon',
  tavern: 'Taverne',
  roster: 'Kader',
  storage: 'Lager',
  forge: 'Schmiede',
  market: 'Markt',
  index: 'Index'
};

export function getNavigationPresentation(pageId: string): NavigationPresentation {
  return {
    pageId,
    title: NAVIGATION_TITLES[pageId as NavigationPageId] ?? ''
  };
}

export const NAVIGATION_PRESENTATION_CORE_BRIDGE = {
  getNavigationPresentation
};

export type NavigationPresentationCoreBridge = typeof NAVIGATION_PRESENTATION_CORE_BRIDGE;

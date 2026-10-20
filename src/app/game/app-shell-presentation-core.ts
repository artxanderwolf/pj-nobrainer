import { NAVIGATION_ITEMS } from './navigation-presentation-core';

export const APP_UI_VERSION = '0.13.10';

export const APP_SHELL_PAGE_IDS = [
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

export function composeAppShell(pageMarkup: string): string {
  const bottomNavigation = NAVIGATION_ITEMS.map(item =>
    `<button data-page="${item.id}" data-section="${item.sectionId}" onclick="go('${item.id}')">${item.title}</button>`
  ).join('');

  return `<div class="app modular-ui" data-ui-version="${APP_UI_VERSION}">
    <main class="app-main">
      <header class="modular-topbar">
        <button id="backBtn" class="back-btn" type="button" onclick="goBack()" aria-label="Zurück" hidden>←</button>
        <div class="page-heading">
          <div class="ui-version">NO BRAINER · v${APP_UI_VERSION}</div>
          <h1 id="pageTitle">Übersicht</h1>
        </div>
        <div class="top-actions">
          <div class="pill money-pill">Geld <b id="gold">0 Nickel</b></div>
          <button class="help-btn" type="button" onclick="go('index')" aria-label="Hilfe">?</button>
        </div>
        <span id="matCount" class="sr-only">0</span>
        <span id="saveStatus" class="sr-only">–</span>
      </header>
      <div class="page-stack">${pageMarkup}</div>
    </main>
    <nav id="nav" class="bottom-nav" aria-label="Hauptnavigation">${bottomNavigation}</nav>
  </div>`;
}
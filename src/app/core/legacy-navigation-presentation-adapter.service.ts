import { Injectable } from '@angular/core';
import {
  NAVIGATION_PRESENTATION_CORE_BRIDGE,
  type NavigationPresentationCoreBridge
} from '../game/navigation-presentation-core';
import { GameStateService, normalizeCityName } from './game-state.service';

declare global {
  interface Window {
    NoBrainerNavigationPresentationCore?: NavigationPresentationCoreBridge;
  }
}

const LEGACY_TITLES = [
  'const titles = {',
  '  base:"Stützpunkt", dungeon:"Dungeon", tavern:"Taverne", roster:"Kader",',
  '  storage:"Lager", forge:"Schmiede", market:"Markt", index:"Index"',
  '};'
].join('\n');

const LEGACY_GO = [
  'function go(page){',
  '  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));',
  '  document.querySelectorAll("#nav button").forEach(x=>x.classList.remove("active"));',
  '  document.getElementById(page).classList.add("active");',
  '  document.querySelector(`#nav button[data-page="${page}"]`).classList.add("active");',
  '  document.getElementById("pageTitle").textContent = titles[page];',
  '  render();',
  '}'
].join('\n');

const NAVIGATION_GO_BRIDGE = [
  'function applyNavigationPresentation(presentation){',
  '  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));',
  '  document.querySelectorAll("#nav button").forEach(x=>x.classList.remove("active"));',
  '  const pageElement=document.getElementById(presentation.pageId);',
  '  if(pageElement)pageElement.classList.add("active");',
  '  const sectionButton=document.querySelector(`#nav button[data-section="${presentation.sectionId}"]`);',
  '  if(sectionButton)sectionButton.classList.add("active");',
  '  const titleElement=document.getElementById("pageTitle");',
  '  if(titleElement){',
  '    titleElement.textContent=presentation.title;',
  '    const cityEditable=presentation.pageId==="base";',
  '    titleElement.contentEditable=cityEditable?"true":"false";',
  '    titleElement.classList.toggle("city-name-editable",cityEditable);',
  '    titleElement.setAttribute("aria-label",cityEditable?"Stadtname bearbeiten":presentation.title);',
  '  }',
  '  const backButton=document.getElementById("backBtn");',
  '  if(backButton){',
  '    backButton.hidden=!presentation.parentPageId;',
  '    backButton.dataset.parentPage=presentation.parentPageId||"";',
  '  }',
  '}',
  '',
  'function go(page){',
  '  const presentation=window.NoBrainerNavigationPresentationCore.getNavigationPresentation(page);',
  '  applyNavigationPresentation(presentation);',
  '  render();',
  '}',
  '',
  'function goBack(){',
  '  const current=document.querySelector(".page.active");',
  '  const currentId=current?.id||"base";',
  '  const presentation=window.NoBrainerNavigationPresentationCore.getNavigationPresentation(currentId);',
  '  go(presentation.parentPageId||"base");',
  '}'
].join('\n');

@Injectable({ providedIn: 'root' })
export class LegacyNavigationPresentationAdapterService {
  constructor(private readonly gameState: GameStateService) {}

  adapt(source: string): string {
    window.NoBrainerNavigationPresentationCore = {
      getNavigationPresentation: (pageId: string) => {
        const presentation = NAVIGATION_PRESENTATION_CORE_BRIDGE.getNavigationPresentation(pageId);
        if (presentation.pageId !== 'base') return presentation;
        return { ...presentation, title: this.currentCityName() };
      }
    };

    let adapted = this.replaceOnce(source, LEGACY_TITLES, '', 'Legacy-Seitentitel');
    adapted = this.replaceOnce(adapted, LEGACY_GO, NAVIGATION_GO_BRIDGE, 'Legacy-Navigation');
    return adapted;
  }

  private currentCityName(): string {
    try {
      return normalizeCityName(this.gameState.getState()['cityName']);
    } catch {
      return normalizeCityName(undefined);
    }
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }
}

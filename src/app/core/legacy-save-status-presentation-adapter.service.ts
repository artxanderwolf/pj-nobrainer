import { Injectable } from '@angular/core';
import {
  SAVE_STATUS_PRESENTATION_CORE_BRIDGE,
  type SaveStatusPresentationCoreBridge
} from '../game/save-status-presentation-core';

declare global {
  interface Window {
    NoBrainerSaveStatusPresentationCore?: SaveStatusPresentationCoreBridge;
  }
}

const NEW_SAVE_STATUS = 'if(!raw){setSaveStatus("Neuer Spielstand");return false;}';
const NEW_SAVE_STATUS_BRIDGE = 'if(!raw){setSaveStatus(window.NoBrainerSaveStatusPresentationCore.getSaveStatusPresentation("new").text);return false;}';

const LOADED_SAVE_STATUS = 'setSaveStatus(when?`Geladen · ${when.toLocaleTimeString("de-DE")}`:"Spielstand geladen");';
const LOADED_SAVE_STATUS_BRIDGE = 'setSaveStatus(window.NoBrainerSaveStatusPresentationCore.getSaveStatusPresentation("loaded",{timestamp:when?when.getTime():null,formatTime:value=>new Date(value).toLocaleTimeString("de-DE")}).text);';

const SAVED_STATUS = 'setSaveStatus(`${manual?"Manuell gespeichert":"Gespeichert"} · ${new Date(savedAt).toLocaleTimeString("de-DE")}`);';
const SAVED_STATUS_BRIDGE = 'setSaveStatus(window.NoBrainerSaveStatusPresentationCore.getSaveStatusPresentation("saved",{timestamp:savedAt,manual,formatTime:value=>new Date(value).toLocaleTimeString("de-DE")}).text);';

const UNAVAILABLE_STATUS = 'setSaveStatus("Lokaler Save nicht verfügbar");';
const UNAVAILABLE_STATUS_BRIDGE = 'setSaveStatus(window.NoBrainerSaveStatusPresentationCore.getSaveStatusPresentation("unavailable").text);';

const RESET_STATUS = 'setSaveStatus("Spielstand zurückgesetzt");';
const RESET_STATUS_BRIDGE = 'setSaveStatus(window.NoBrainerSaveStatusPresentationCore.getSaveStatusPresentation("reset").text);';

@Injectable({ providedIn: 'root' })
export class LegacySaveStatusPresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerSaveStatusPresentationCore = SAVE_STATUS_PRESENTATION_CORE_BRIDGE;

    let adapted = this.replaceOnce(source, NEW_SAVE_STATUS, NEW_SAVE_STATUS_BRIDGE, 'Status für neuen Spielstand');
    adapted = this.replaceOnce(adapted, LOADED_SAVE_STATUS, LOADED_SAVE_STATUS_BRIDGE, 'Status für geladenen Spielstand');
    adapted = this.replaceOnce(adapted, SAVED_STATUS, SAVED_STATUS_BRIDGE, 'Status für gespeicherten Spielstand');
    adapted = this.replaceExactCount(adapted, UNAVAILABLE_STATUS, UNAVAILABLE_STATUS_BRIDGE, 2, 'Status für nicht verfügbaren lokalen Save');
    adapted = this.replaceOnce(adapted, RESET_STATUS, RESET_STATUS_BRIDGE, 'Status nach Spielstand-Reset');
    return adapted;
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }

  private replaceExactCount(
    source: string,
    search: string,
    replacement: string,
    expectedCount: number,
    label: string
  ): string {
    const matches = source.split(search).length - 1;
    if (matches !== expectedCount) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde ${matches} statt ${expectedCount} Mal gefunden.`);
    }
    return source.split(search).join(replacement);
  }
}

import { Injectable } from '@angular/core';

const LEGACY_PICKER_STATE = `let openWeaponPickerHand=null;
let openDungeonTeamPickerSlot=null;`;

@Injectable({ providedIn: 'root' })
export class LegacyCharacterPresentationAdapterService {
  adapt(source: string): string {
    let adapted = this.replaceOnce(source, LEGACY_PICKER_STATE, '', 'Charakter-Picker-Zustand');
    adapted = this.replaceRangeOnce(
      adapted,
      'function weaponPickerKey(',
      'function getMaterialsForCategories(',
      '',
      'Legacy-Kader-, Waffenpicker- und Dungeon-Team-Präsentation'
    );
    adapted = this.replaceOnce(
      adapted,
      '  renderCharacter("rosterCard");renderTavern();',
      '  renderTavern();',
      'Kader-Aufruf im Legacy-Gesamtrender'
    );
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

  private replaceRangeOnce(
    source: string,
    startMarker: string,
    endMarker: string,
    replacement: string,
    label: string
  ): string {
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} ist nicht eindeutig.`);
    }
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(endMarker, end + endMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, start) + replacement + source.slice(end);
  }
}

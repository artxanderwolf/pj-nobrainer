import { Injectable } from '@angular/core';

const LEGACY_STATE_DECLARATION = 'let state=createDefaultState();';
const ANGULAR_STATE_DECLARATION = `const gameStateBootstrap=window.NoBrainerStateBootstrap;
if(!gameStateBootstrap||typeof gameStateBootstrap.initialize!=="function"||typeof gameStateBootstrap.replace!=="function")throw new Error("NoBrainer-State-Bootstrap wurde nicht registriert.");
const state=gameStateBootstrap.initialize(createDefaultState());
function replaceGameState(nextState){gameStateBootstrap.replace(nextState);}`;

const LOADED_STATE_ASSIGNMENT = 'state=normalizeLoadedState(parsed.state);';
const RESET_STATE_ASSIGNMENT = 'state=createDefaultState();';

@Injectable({ providedIn: 'root' })
export class LegacyStateAdapterService {
  adapt(source: string): string {
    let adapted = this.replaceOnce(
      source,
      LEGACY_STATE_DECLARATION,
      ANGULAR_STATE_DECLARATION,
      'Spielzustandsdeklaration'
    );
    adapted = this.replaceOnce(
      adapted,
      LOADED_STATE_ASSIGNMENT,
      'replaceGameState(normalizeLoadedState(parsed.state));',
      'Spielzustand beim Laden'
    );
    adapted = this.replaceOnce(
      adapted,
      RESET_STATE_ASSIGNMENT,
      'replaceGameState(createDefaultState());',
      'Spielzustand beim Zurücksetzen'
    );
    return adapted;
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    }
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }
}

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LegacyDungeonPresentationAdapterService {
  adapt(source: string): string {
    let adapted = this.replaceOnce(
      source,
      'document.getElementById("runDuration").textContent=`${state.dungeonWavesDefeated||0} besiegt`;',
      'renderDungeonSessionWaveCounter();',
      'Dungeon-Wellenanzeige'
    );
    adapted = this.replaceOnce(
      adapted,
      '  renderDungeonStatus();\n  renderDungeonLoot();',
      '  renderDungeonStatus();\n  renderDungeonSessionWaveCounter();\n  renderDungeonLoot();',
      'Dungeon-Wellenaktualisierung im Runtime-Tick'
    );
    return adapted;
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(search, first + search.length) >= 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }
}

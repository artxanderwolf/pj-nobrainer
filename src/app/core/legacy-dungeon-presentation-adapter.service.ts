import { Injectable } from '@angular/core';

const LEGACY_DUNGEON_SUMMARY_BLOCK = `  const displayedCount=state.dungeonRun?.participantIds?.length||getSelectedDungeonIds().length;
  document.getElementById("enemyHp").textContent=\`${'${CONFIG.dungeon.enemyBase.damage}'} Basis-SCH\`;
  document.getElementById("enemyArmor").textContent=\`${'${Math.round(CONFIG.dungeon.enemyBase.hitChance*100)}'} % Basis-TRF\`;
  document.getElementById("enemyDamage").textContent=\`${'${CONFIG.dungeon.enemyBase.speed.toFixed(2)}'} Basis-GES\`;
  const share=getEnergyCostPerCharacter(displayedCount);
  document.getElementById("energyCost").textContent=displayedCount?\`${'${share}'} je Char. (${'${share*displayedCount}'} gesamt)\`:"–";
  document.getElementById("runDuration").textContent=\`${'${state.dungeonWavesDefeated||0}'} besiegt\`;

`;

const DUNGEON_PRESENTATION_ACCESSOR = `function getDungeonPresentationCompatibility(){
  const bridge=window.NoBrainerDungeonPresentationCompatibility;
  if(!bridge)throw new Error("NoBrainer-Dungeon-Präsentationsbrücke wurde nicht registriert.");
  return bridge;
}
`;

const ADAPTED_DUNGEON_STATUS = `function renderDungeonStatus(){
  getDungeonPresentationCompatibility().renderStatus();
}
`;

const ADAPTED_DUNGEON_LOOT = `function renderDungeonLoot(){
  getDungeonPresentationCompatibility().renderLoot();
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyDungeonPresentationAdapterService {
  adapt(source: string): string {
    let adapted = this.replaceOnce(
      source,
      LEGACY_DUNGEON_SUMMARY_BLOCK,
      '',
      'Dungeon-Zusammenfassung im Vollrender'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderDungeonStatus(){',
      'function renderDungeonLoot(){',
      DUNGEON_PRESENTATION_ACCESSOR + ADAPTED_DUNGEON_STATUS + '\n',
      'Dungeon-Status-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderDungeonLoot(){',
      'function render(){',
      ADAPTED_DUNGEON_LOOT + '\n',
      'Dungeon-Beute-Präsentation'
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

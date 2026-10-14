import { Injectable } from '@angular/core';
import { DUNGEON_SEARCH_CORE_BRIDGE, type DungeonSearchCoreBridge } from '../game/dungeon-search-core';

declare global {
  interface Window {
    NoBrainerDungeonSearchCore?: DungeonSearchCoreBridge;
  }
}

const SEARCH_RESOLUTION_BLOCK = `      if(Math.random()<CONFIG.dungeon.encounterChance){startDungeonRun(at);}
      else{
        getAliveDungeonParticipants().forEach(c=>{c.hp=Math.min(c.maxHp,c.hp+1);});
        state.dungeonSearch.nextCheckAt=at+CONFIG.dungeon.searchStepMs;
      }`;

const SEARCH_RESOLUTION_BRIDGE = `      const searchResult=window.NoBrainerDungeonSearchCore.resolveDungeonSearch(CONFIG.dungeon.encounterChance,Math.random());
      if(searchResult==="encounter"){startDungeonRun(at);}
      else{
        window.NoBrainerDungeonSearchCore.healParticipantsAfterSearchMiss(getAliveDungeonParticipants(),1);
        state.dungeonSearch.nextCheckAt=at+CONFIG.dungeon.searchStepMs;
      }`;

@Injectable({ providedIn: 'root' })
export class LegacyDungeonSearchAdapterService {
  adapt(source: string): string {
    window.NoBrainerDungeonSearchCore = DUNGEON_SEARCH_CORE_BRIDGE;
    return this.replaceOnce(source, SEARCH_RESOLUTION_BLOCK, SEARCH_RESOLUTION_BRIDGE, 'Dungeon-Suchauflösung');
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

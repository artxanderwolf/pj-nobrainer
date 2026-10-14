import { Injectable } from '@angular/core';

const DUNGEON_UI_BRIDGE = `function getDungeonCompatibility(){
  const dungeonCompatibility=window.NoBrainerDungeonCompatibility;
  if(!dungeonCompatibility)throw new Error("NoBrainer-Dungeon-Kompatibilitätsbrücke wurde nicht registriert.");
  return dungeonCompatibility;
}
function applyDungeonCompatibilityResult(result){
  if(result?.alertMessage)alert(result.alertMessage);
  (result?.events||[]).forEach(event=>addLog(event.text,event.className||""));
  if(result?.saveRequested)queueSave();
  return result;
}
function toggleDungeonAuto(){
  applyDungeonCompatibilityResult(getDungeonCompatibility().toggleAuto(Date.now()));
  render();
}
function renderDungeonSessionWaveCounter(){
  const counter=document.getElementById("runDuration");if(!counter)return;
  counter.textContent=String(getDungeonCompatibility().getSessionWaveCount())+" besiegt";
}
function collectDungeonLoot(){
  const result=applyDungeonCompatibilityResult(getDungeonCompatibility().collectLoot());
  if(result?.events?.length)render();
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyDungeonDomainAdapterService {
  adapt(source: string): string {
    const startMarker = 'function getDungeonStartCheck(){';
    const endMarker = 'function rollDrops(';
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error('Legacy-Kompatibilität fehlgeschlagen: Dungeon-Domänenstart wurde nicht gefunden.');
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
      throw new Error('Legacy-Kompatibilität fehlgeschlagen: Dungeon-Domänenstart ist nicht eindeutig.');
    }
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error('Legacy-Kompatibilität fehlgeschlagen: Dungeon-Domänenende wurde nicht gefunden.');
    if (source.indexOf(endMarker, end + endMarker.length) >= 0) {
      throw new Error('Legacy-Kompatibilität fehlgeschlagen: Dungeon-Domänenende ist nicht eindeutig.');
    }
    return source.slice(0, start) + DUNGEON_UI_BRIDGE + '\n' + source.slice(end);
  }
}

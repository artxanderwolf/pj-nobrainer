import { Injectable } from '@angular/core';

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
    return source.slice(0, start) + source.slice(end);
  }
}

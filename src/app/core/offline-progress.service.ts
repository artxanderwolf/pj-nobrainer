import { Injectable } from '@angular/core';
import { getMaterialDisplayNameById } from '../game/game-core.ts';
import { formatCurrencyNickel } from '../game/economy-core';

export interface SaveSnapshot {
  savedAt: number | null;
  state: any;
}

@Injectable({ providedIn: 'root' })
export class OfflineProgressService {
  shouldShowSummary(snapshot: SaveSnapshot, now = Date.now()): boolean {
    if (!snapshot.savedAt || now - snapshot.savedAt < 10_000) return false;

    const state = snapshot.state ?? {};
    const characters = Array.isArray(state.characters) ? state.characters : [];
    const energyCanRegenerate = !this.sessions(state).some(d=>d.dungeonAuto || d.dungeonRun || d.dungeonSearch || d.dungeonLootCollect) && characters.some(
      (character: any) => Number(character.energy) < Number(character.maxEnergy)
    );

    return Boolean(
      this.sessions(state).some(d=>d.dungeonAuto || d.dungeonRun || d.dungeonSearch || d.dungeonLootCollect) ||
      state.forgeJobs?.length || state.forgeQueue?.length ||
      state.marketJobs?.length || state.marketQueue?.length || energyCanRegenerate
    );
  }

  showSummary(before: SaveSnapshot, after: SaveSnapshot, now = Date.now()): void {
    const message = this.buildSummary(before, after, now);
    if (message) window.alert(message);
  }

  buildSummary(before: SaveSnapshot, after: SaveSnapshot, now = Date.now()): string | null {
    if (!before.savedAt) return null;

    const elapsedMs = Math.max(0, now - before.savedAt);
    const beforeState = before.state ?? {};
    const afterState = after.state ?? {};
    const lines: string[] = [`Abwesend: ${this.formatDuration(elapsedMs)}`];

    const waves = Math.max(
      0,
      this.sessions(afterState).reduce((sum,d)=>sum+Number(d.dungeonWavesDefeated||0),0) - this.sessions(beforeState).reduce((sum,d)=>sum+Number(d.dungeonWavesDefeated||0),0)
    );
    if (waves > 0) {
      lines.push(`Dungeon: ${waves} Welle${waves === 1 ? '' : 'n'} erfolgreich abgeschlossen`);
    }

    const lootChanges = this.quantityChanges(this.sessionLoot(beforeState), this.sessionLoot(afterState));
    if (lootChanges.length) lines.push(`Dungeon-Beute: ${lootChanges.join(', ')}`);

    const weaponsBefore = Array.isArray(beforeState.weaponInventory) ? beforeState.weaponInventory.length : 0;
    const weaponsAfter = Array.isArray(afterState.weaponInventory) ? afterState.weaponInventory.length : 0;
    const forged = Math.max(0, weaponsAfter - weaponsBefore);
    if (forged > 0) lines.push(`Schmiede: ${forged} Waffe${forged === 1 ? '' : 'n'} fertiggestellt`);

    const goldGain = Number(afterState.gold || 0) - Number(beforeState.gold || 0);
    if (goldGain > 0) lines.push(`Markt: +${formatCurrencyNickel(goldGain)}`);

    if (this.energyFullyRegeneratedDuringAbsence(beforeState.characters, afterState.characters)) {
      lines.push('Energie vollständig regeneriert');
    }

    if (lines.length === 1) lines.push('Keine abgeschlossenen automatischen Vorgänge.');
    return `Offline-Fortschritt\n\n${lines.join('\n')}`;
  }

  private sessions(state:any): any[] { return state.dungeons ? Object.values(state.dungeons) : [state]; }

  private sessionLoot(state:any): Record<string,{qty:number}> {
    const totals:Record<string,{qty:number}>={};
    for(const session of this.sessions(state))for(const [id,entry] of Object.entries(session.dungeonLoot??{}) as Array<[string,{qty:number}]>) {
      totals[id]??={qty:0}; totals[id].qty+=Number(entry.qty)||0;
    }
    return totals;
  }

  private energyFullyRegeneratedDuringAbsence(before: any, after: any): boolean {
    const beforeById = new Map((Array.isArray(before) ? before : []).map((c: any) => [Number(c.id), c]));
    return (Array.isArray(after) ? after : []).some((c: any) => {
      const previous: any = beforeById.get(Number(c.id));
      if (!previous) return false;
      const beforeEnergy = Number(previous.energy || 0);
      const beforeMax = Number(previous.maxEnergy || 0);
      const afterEnergy = Number(c.energy || 0);
      const afterMax = Number(c.maxEnergy || 0);
      return beforeEnergy + 0.05 < beforeMax && afterMax > 0 && afterEnergy + 0.05 >= afterMax;
    });
  }

  private quantityChanges(before: any, after: any): string[] {
    const names = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
    const changes: string[] = [];
    for (const name of names) {
      const oldQty = Number(before?.[name]?.qty || 0);
      const newQty = Number(after?.[name]?.qty || 0);
      const delta = newQty - oldQty;
      if (delta > 0) changes.push(`${getMaterialDisplayNameById(Number(name))??name} +${this.formatNumber(delta)}`);
    }
    return changes;
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours} Std. ${minutes} Min.`;
    if (minutes > 0) return `${minutes} Min. ${seconds} Sek.`;
    return `${seconds} Sek.`;
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
  }
}

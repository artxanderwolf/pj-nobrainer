import { Injectable } from '@angular/core';

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
    const energyCanRegenerate = !state.dungeonAuto && characters.some(
      (character: any) => Number(character.energy) < Number(character.maxEnergy)
    );

    return Boolean(
      state.dungeonAuto || state.dungeonRun || state.dungeonSearch || state.dungeonLootCollect ||
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
      Number(afterState.dungeonWavesDefeated || 0) - Number(beforeState.dungeonWavesDefeated || 0)
    );
    if (waves > 0) {
      lines.push(`Dungeon: ${waves} Welle${waves === 1 ? '' : 'n'} erfolgreich abgeschlossen`);
    }

    const lootChanges = this.quantityChanges(beforeState.dungeonLoot, afterState.dungeonLoot);
    if (lootChanges.length) lines.push(`Dungeon-Beute: ${lootChanges.join(', ')}`);

    const weaponsBefore = Array.isArray(beforeState.weaponInventory) ? beforeState.weaponInventory.length : 0;
    const weaponsAfter = Array.isArray(afterState.weaponInventory) ? afterState.weaponInventory.length : 0;
    const forged = Math.max(0, weaponsAfter - weaponsBefore);
    if (forged > 0) lines.push(`Schmiede: ${forged} Waffe${forged === 1 ? '' : 'n'} fertiggestellt`);

    const goldGain = Number(afterState.gold || 0) - Number(beforeState.gold || 0);
    if (goldGain > 0) lines.push(`Markt: +${this.formatCurrencyNickel(goldGain)}`);

    if (this.energyFullyRegeneratedDuringAbsence(beforeState.characters, afterState.characters)) {
      lines.push('Energie vollständig regeneriert');
    }

    if (lines.length === 1) lines.push('Keine abgeschlossenen automatischen Vorgänge.');
    return `Offline-Fortschritt\n\n${lines.join('\n')}`;
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
      if (delta > 0) changes.push(`${name} +${this.formatNumber(delta)}`);
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

  private formatCurrencyNickel(value: number): string {
    let remaining = Math.max(0, Math.round(value));
    const gold = Math.floor(remaining / 1_000_000); remaining %= 1_000_000;
    const silver = Math.floor(remaining / 10_000); remaining %= 10_000;
    const bronze = Math.floor(remaining / 100); remaining %= 100;
    const parts: string[] = [];
    if (gold) parts.push(`${gold} Gold`);
    if (silver) parts.push(`${silver} Silber`);
    if (bronze) parts.push(`${bronze} Bronze`);
    if (remaining || !parts.length) parts.push(`${remaining} Nickel`);
    return parts.join(' ');
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
  }
}

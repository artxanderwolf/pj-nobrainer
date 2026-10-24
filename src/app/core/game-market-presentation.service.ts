import { Injectable } from '@angular/core';
import { formatCurrencyNickel, formatDuration, materialSellDataById, weaponSellData } from '../game/economy-core';
import { getWeaponEquipLocation, type EquipmentCharacterLike } from '../game/equipment-core';
import { getMaterialStorageEntries, type MaterialStorageInventory } from '../game/material-storage-core';
import { getMaterialDisplayNameById, type WeaponSlot } from '../game/game-core';
import { type MarketJob } from '../game/market-core';
import {
  getActiveMarketJobPresentation,
  getMarketMaterialPresentation,
  getMarketWeaponPresentation,
  getQueuedMarketJobPresentation,
  type MarketPresentationJobLike
} from '../game/market-presentation-core';
import { GameCombatLogService } from './game-combat-log.service';
import { GameMarketService } from './game-market.service';
import { GameProgressionPresentationService } from './game-progression-presentation.service';
import { GameStateService, type MutableGameState } from './game-state.service';
import { GameWeaponPresentationService } from './game-weapon-presentation.service';

interface RuntimeMarketWeapon {
  id: number;
  name: string;
  weaponForm?: string | null;
  valueNickel: number;
  slots?: readonly WeaponSlot[] | null;
  starter?: boolean;
}
type RuntimeMarketPresentationState = MutableGameState & {
  inventory: MaterialStorageInventory;
  weaponInventory: RuntimeMarketWeapon[];
  characters: EquipmentCharacterLike[];
  marketJobs: MarketJob[];
  marketQueue: MarketJob[];
};

interface MarketPresentationCompatibilityBridge {
  renderJobs(): void;
  renderMaterials(): void;
  renderWeapons(): void;
}

declare global {
  interface Window { NoBrainerMarketPresentationCompatibility?: MarketPresentationCompatibilityBridge; }
}

@Injectable({ providedIn: 'root' })
export class GameMarketPresentationService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly gameMarket: GameMarketService,
    private readonly combatLog: GameCombatLogService,
    private readonly progressionPresentation: GameProgressionPresentationService,
    private readonly weaponPresentation: GameWeaponPresentationService
  ) {}

  renderJobs(): void {
    const state = this.state();
    const active = document.getElementById('marketJobCard');
    const queue = document.getElementById('marketQueueCard');
    const now = Date.now();
    if (active) {
      active.className = state.marketJobs.length ? '' : 'empty';
      active.innerHTML = state.marketJobs.length ? state.marketJobs.map((job, index) => {
        const presentation = getActiveMarketJobPresentation(this.presentationJob(job), index, now, formatCurrencyNickel, formatDuration);
        const weapon = this.weaponSnapshot(job);
        const imageHtml = weapon
          ? this.weaponPresentation.renderImage(weapon, 'market-job-weapon-image', `${weapon.name} im Verkauf`)
          : '';
        const weaponId = weapon ? ` data-market-weapon-id="${weapon.id}"` : '';
        return `<div class="sell-row market-job-row"${weaponId}>${imageHtml}<div class="market-job-copy"><strong>${presentation.title}</strong><div class="bar energy"><i style="width:${presentation.progressPercent}%"></i></div><p>${presentation.remainingText} · Ertrag <b>${presentation.revenueValueText}</b></p></div><button class="btn smallbtn" data-market-cancel="active" data-market-index="${index}">Abbrechen</button></div>`;
      }).join('') : 'Kein aktiver Verkauf.';
      active.dataset['marketPresentationOwner'] = 'angular';
      this.bindCancelActions(active);
    }
    if (queue) {
      queue.className = state.marketQueue.length ? '' : 'empty';
      queue.innerHTML = state.marketQueue.length ? state.marketQueue.map((job, index) => {
        const presentation = getQueuedMarketJobPresentation(this.presentationJob(job), index, formatCurrencyNickel, formatDuration);
        const weapon = this.weaponSnapshot(job);
        const imageHtml = weapon
          ? this.weaponPresentation.renderImage(weapon, 'market-queue-weapon-image', `${weapon.name} in der Verkaufswarteschlange`)
          : '';
        const weaponId = weapon ? ` data-market-weapon-id="${weapon.id}"` : '';
        return `<div class="sell-row market-job-row"${weaponId}>${imageHtml}<div class="market-job-copy"><strong>${presentation.title}</strong><div class="sell-meta">${presentation.metaText}</div></div><button class="btn smallbtn" data-market-cancel="queue" data-market-index="${index}">Entfernen</button></div>`;
      }).join('') : 'Warteschlange leer.';
      this.bindCancelActions(queue);
    }
    this.progressionPresentation.render();
  }

  renderMaterials(): void {
    const box = document.getElementById('marketMaterials');
    const empty = document.getElementById('marketMaterialsEmpty');
    if (!box || !empty) return;
    const entries = getMaterialStorageEntries(this.state().inventory)
      .filter(entry => entry.qty > 0)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    const hasCapacity = this.gameMarket.hasCapacity();
    box.innerHTML = '';
    empty.style.display = entries.length ? 'none' : 'block';
    entries.forEach((entry, index) => {
      const { materialId, displayName: name, qty: stock } = entry;
      const sale = materialSellDataById(materialId);
      if (!sale) return;
      const inputId = `marketQty_${index}`;
      const row = document.createElement('div');
      row.className = 'sell-row';
      const presentation = getMarketMaterialPresentation(name, stock, 1, sale.valueNickel, sale.seconds, hasCapacity, formatCurrencyNickel, formatDuration);
      row.title = presentation.title;
      row.innerHTML = `<div><strong>${name}</strong><div class="sell-meta">${presentation.stockText}</div><div class="sell-meta" data-market-preview>${presentation.previewText}</div></div><div class="market-qty"><button class="btn smallbtn" type="button">−</button><input id="${inputId}" class="number-input" type="number" min="1" max="${stock}" step="1" value="1" data-material="${name}" data-material-id="${materialId}"><button class="btn smallbtn" type="button">+</button><button class="btn smallbtn primary" type="button" ${presentation.sellDisabled ? 'disabled' : ''}>Verkaufen</button></div>`;
      const buttons = row.querySelectorAll<HTMLButtonElement>('button');
      const input = row.querySelector<HTMLInputElement>('input');
      const preview = row.querySelector<HTMLElement>('[data-market-preview]');
      if (!input || !preview) return;

      const clampQuantity = (value: number): number =>
        Math.max(1, Math.min(stock, Math.floor(Number(value) || 1)));
      const updatePreview = (quantity: number): void => {
        preview.textContent = getMarketMaterialPresentation(
          name,
          stock,
          quantity,
          sale.valueNickel,
          sale.seconds,
          this.gameMarket.hasCapacity(),
          formatCurrencyNickel,
          formatDuration
        ).previewText;
      };
      const commitQuantity = (value: number): number => {
        const quantity = clampQuantity(value);
        input.value = String(quantity);
        updatePreview(quantity);
        return quantity;
      };

      buttons[0]?.addEventListener('click', () => commitQuantity(clampQuantity(Number(input.value)) - 1));
      buttons[1]?.addEventListener('click', () => commitQuantity(clampQuantity(Number(input.value)) + 1));
      buttons[2]?.addEventListener('click', () => this.startMaterial(materialId, commitQuantity(Number(input.value))));
      input.addEventListener('input', () => {
        if (input.value === '') return;
        const value = Number(input.value);
        if (!Number.isFinite(value)) return;
        updatePreview(clampQuantity(value));
      });
      input.addEventListener('change', () => commitQuantity(Number(input.value)));
      box.appendChild(row);
    });
  }

  renderWeapons(): void {
    const box = document.getElementById('marketWeapons');
    const empty = document.getElementById('marketWeaponsEmpty');
    if (!box || !empty) return;
    const state = this.state();
    const weapons = state.weaponInventory.filter(weapon => !weapon.starter && !getWeaponEquipLocation(state.characters, weapon.id));
    const hasCapacity = this.gameMarket.hasCapacity();
    box.innerHTML = '';
    empty.style.display = weapons.length ? 'none' : 'block';
    for (const weapon of weapons) {
      const sale = weaponSellData(weapon);
      if (!sale) continue;
      const presentation = getMarketWeaponPresentation(weapon.name, weapon.id, sale.valueNickel, sale.seconds, hasCapacity, formatCurrencyNickel);
      const imageHtml = this.weaponPresentation.renderImage(weapon, 'market-weapon-sale-image', `${weapon.name} verkaufen`);
      const row = document.createElement('div');
      row.className = 'sell-row market-weapon-sale-row';
      row.dataset['marketWeaponId'] = String(weapon.id);
      row.title = presentation.tooltip;
      row.innerHTML = `<div class="market-weapon-sale-main">${imageHtml}<div><strong>${presentation.title}</strong></div></div><button class="btn smallbtn" ${presentation.sellDisabled ? 'disabled' : ''}>Verkaufen</button>`;
      row.querySelector('button')?.addEventListener('click', () => this.startWeapon(weapon.id));
      box.appendChild(row);
    }
  }

  renderAll(): void { this.renderJobs(); this.renderMaterials(); this.renderWeapons(); }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerMarketPresentationCompatibility) throw new Error('NoBrainer-Markt-Präsentationsbrücke ist bereits geöffnet.');
    window.NoBrainerMarketPresentationCompatibility = {
      renderJobs: () => this.renderJobs(),
      renderMaterials: () => this.renderMaterials(),
      renderWeapons: () => this.renderWeapons()
    };
  }

  closeLegacyCompatibilityBridge(): void { delete window.NoBrainerMarketPresentationCompatibility; }

  private startMaterial(materialId: number, quantity: number): void {
    const result = this.gameMarket.startMaterialById(materialId, quantity, Date.now());
    if (result.status === 'full') { alert('Alle Verkaufs- und Warteschlangenplätze sind belegt.'); return; }
    if (result.status === 'no-stock' || result.status === 'unknown-material') return;
    this.combatLog.add(`Verkauf eingestellt: ${result.quantity}× ${result.name} für ${formatCurrencyNickel(result.valueNickel)}.`, 'good');
    this.renderAll();
  }

  private startWeapon(weaponId: number): void {
    const result = this.gameMarket.startWeapon(weaponId, Date.now());
    if (result.status === 'starter') { alert('Die Startwaffe kann nicht verkauft werden.'); return; }
    if (result.status === 'equipped') { alert('Ausgerüstete Waffen können nicht verkauft werden.'); return; }
    if (result.status === 'full') { alert('Alle Verkaufs- und Warteschlangenplätze sind belegt.'); return; }
    if (result.status === 'not-found') return;
    this.combatLog.add(`Verkauf eingestellt: ${result.name}.`, 'good');
    this.renderAll();
  }

  private bindCancelActions(container: HTMLElement): void {
    container.querySelectorAll<HTMLButtonElement>('[data-market-cancel]').forEach(button => button.addEventListener('click', () => {
      const kind = button.dataset['marketCancel'] === 'queue' ? 'queue' : 'active';
      const result = this.gameMarket.cancel(kind, Number(button.dataset['marketIndex']) || 0, Date.now());
      if (!result) return;
      this.combatLog.add(`Verkauf abgebrochen: ${result.name} wurde zurückgegeben.`, 'muted');
      this.renderAll();
    }));
  }

  private presentationJob(job: MarketJob): MarketPresentationJobLike {
    const name = job.type === 'material'
      ? getMaterialDisplayNameById(job.materialId) ?? `Material #${Number(job.materialId) || '?'}`
      : job.name || 'Waffe';
    return { ...job, name } as MarketPresentationJobLike;
  }

  private weaponSnapshot(job: MarketJob): RuntimeMarketWeapon | null {
    if (job.type !== 'weapon' || !job.weaponSnapshot || typeof job.weaponSnapshot !== 'object') return null;
    const snapshot = job.weaponSnapshot as Partial<RuntimeMarketWeapon>;
    const id = Number(snapshot.id);
    if (!Number.isInteger(id) || id < 0 || typeof snapshot.name !== 'string') return null;
    return snapshot as RuntimeMarketWeapon;
  }

  private state(): RuntimeMarketPresentationState { return this.gameState.getState<RuntimeMarketPresentationState>(); }
}

import { Injectable } from '@angular/core';
import { formatCurrencyNickel, formatDuration, materialSellData, weaponSellData } from '../game/economy-core';
import { getWeaponEquipLocation, type EquipmentCharacterLike } from '../game/equipment-core';
import {
  getActiveMarketJobPresentation,
  getMarketMaterialPresentation,
  getMarketWeaponPresentation,
  getQueuedMarketJobPresentation,
  type MarketPresentationJobLike
} from '../game/market-presentation-core';
import { GameMarketService } from './game-market.service';
import { GameProgressionPresentationService } from './game-progression-presentation.service';
import { GameStateService, type MutableGameState } from './game-state.service';

interface RuntimeMarketInventoryEntry { qty?: number | null; }
interface RuntimeMarketWeapon { id: number; name: string; valueNickel: number; slots?: readonly any[] | null; starter?: boolean; }
type RuntimeMarketPresentationState = MutableGameState & {
  inventory: Record<string, RuntimeMarketInventoryEntry | undefined>;
  weaponInventory: RuntimeMarketWeapon[];
  characters: EquipmentCharacterLike[];
  marketJobs: MarketPresentationJobLike[];
  marketQueue: MarketPresentationJobLike[];
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
    private readonly progressionPresentation: GameProgressionPresentationService
  ) {}

  renderJobs(): void {
    const state = this.state();
    const active = document.getElementById('marketJobCard');
    const queue = document.getElementById('marketQueueCard');
    const now = Date.now();
    if (active) {
      active.className = state.marketJobs.length ? '' : 'empty';
      active.innerHTML = state.marketJobs.length ? state.marketJobs.map((job, index) => {
        const presentation = getActiveMarketJobPresentation(job, index, now, formatCurrencyNickel, formatDuration);
        return `<div class="sell-row"><div style="width:100%"><strong>${presentation.title}</strong><div class="bar energy"><i style="width:${presentation.progressPercent}%"></i></div><p>${presentation.remainingText} · Ertrag <b>${presentation.revenueValueText}</b></p></div><button class="btn smallbtn" data-market-cancel="active" data-market-index="${index}">Abbrechen</button></div>`;
      }).join('') : 'Kein aktiver Verkauf.';
      active.dataset['marketPresentationOwner'] = 'angular';
      this.bindCancelActions(active);
    }
    if (queue) {
      queue.className = state.marketQueue.length ? '' : 'empty';
      queue.innerHTML = state.marketQueue.length ? state.marketQueue.map((job, index) => {
        const presentation = getQueuedMarketJobPresentation(job, index, formatCurrencyNickel, formatDuration);
        return `<div class="sell-row"><div><strong>${presentation.title}</strong><div class="sell-meta">${presentation.metaText}</div></div><button class="btn smallbtn" data-market-cancel="queue" data-market-index="${index}">Entfernen</button></div>`;
      }).join('') : 'Warteschlange leer.';
      this.bindCancelActions(queue);
    }
    this.progressionPresentation.render();
  }

  renderMaterials(): void {
    const box = document.getElementById('marketMaterials');
    const empty = document.getElementById('marketMaterialsEmpty');
    if (!box || !empty) return;
    const entries = Object.entries(this.state().inventory).filter(([, item]) => (Number(item?.qty) || 0) > 0).sort((a, b) => a[0].localeCompare(b[0]));
    const hasCapacity = this.gameMarket.hasCapacity();
    box.innerHTML = '';
    empty.style.display = entries.length ? 'none' : 'block';
    entries.forEach(([name, item], index) => {
      const stock = Number(item?.qty) || 0;
      const sale = materialSellData(name);
      if (!sale) return;
      const inputId = `marketQty_${index}`;
      const row = document.createElement('div');
      row.className = 'sell-row';
      const presentation = getMarketMaterialPresentation(name, stock, 1, sale.valueNickel, sale.seconds, hasCapacity, formatCurrencyNickel, formatDuration);
      row.title = presentation.title;
      row.innerHTML = `<div><strong>${name}</strong><div class="sell-meta">${presentation.stockText}</div><div class="sell-meta" data-market-preview>${presentation.previewText}</div></div><div class="market-qty"><button class="btn smallbtn" type="button">−</button><input id="${inputId}" class="number-input" type="number" min="1" max="${stock}" value="1" data-material="${name}"><button class="btn smallbtn" type="button">+</button><button class="btn smallbtn primary" type="button" ${presentation.sellDisabled ? 'disabled' : ''}>Verkaufen</button></div>`;
      const buttons = row.querySelectorAll<HTMLButtonElement>('button');
      const input = row.querySelector<HTMLInputElement>('input');
      const preview = row.querySelector<HTMLElement>('[data-market-preview]');
      if (!input || !preview) return;
      const update = (delta = 0) => {
        const quantity = Math.max(1, Math.min(stock, Math.floor(Number(input.value) || 1) + delta));
        input.value = String(quantity);
        preview.textContent = getMarketMaterialPresentation(name, stock, quantity, sale.valueNickel, sale.seconds, this.gameMarket.hasCapacity(), formatCurrencyNickel, formatDuration).previewText;
      };
      buttons[0]?.addEventListener('click', () => update(-1));
      buttons[1]?.addEventListener('click', () => update(1));
      buttons[2]?.addEventListener('click', () => { this.gameMarket.startMaterial(name, Number(input.value), Date.now()); this.renderAll(); });
      input.addEventListener('input', () => update());
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
      const row = document.createElement('div');
      row.className = 'sell-row';
      row.title = presentation.tooltip;
      row.innerHTML = `<div><strong>${presentation.title}</strong></div><button class="btn smallbtn" ${presentation.sellDisabled ? 'disabled' : ''}>Verkaufen</button>`;
      row.querySelector('button')?.addEventListener('click', () => { this.gameMarket.startWeapon(weapon.id, Date.now()); this.renderAll(); });
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

  private bindCancelActions(container: HTMLElement): void {
    container.querySelectorAll<HTMLButtonElement>('[data-market-cancel]').forEach(button => button.addEventListener('click', () => {
      const kind = button.dataset['marketCancel'] === 'queue' ? 'queue' : 'active';
      this.gameMarket.cancel(kind, Number(button.dataset['marketIndex']) || 0, Date.now());
      this.renderAll();
    }));
  }

  private state(): RuntimeMarketPresentationState { return this.gameState.getState<RuntimeMarketPresentationState>(); }
}

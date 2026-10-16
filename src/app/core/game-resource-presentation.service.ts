import { Injectable } from '@angular/core';
import { formatHighestCurrency } from '../game/economy-core';
import { getResourceHeaderPresentation } from '../game/resource-presentation-core';
import { GameStateService, type MutableGameState } from './game-state.service';

type RuntimeResourcePresentationState = MutableGameState & {
  gold: number;
  inventory: Record<string, { qty: number } | null | undefined>;
};

interface ResourcePresentationCompatibilityBridge {
  render(): void;
}

declare global {
  interface Window {
    NoBrainerResourcePresentationCompatibility?: ResourcePresentationCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameResourcePresentationService {
  constructor(private readonly gameState: GameStateService) {}

  render(): void {
    const gold = document.getElementById('gold');
    const materials = document.getElementById('matCount');
    if (!gold && !materials) return;

    const state = this.gameState.getState<RuntimeResourcePresentationState>();
    const presentation = getResourceHeaderPresentation(state.gold, state.inventory, formatHighestCurrency);

    if (gold) {
      gold.dataset['resourcePresentationOwner'] = 'angular';
      gold.textContent = presentation.goldText;
    }
    if (materials) materials.textContent = presentation.materialCountText;
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerResourcePresentationCompatibility) {
      throw new Error('NoBrainer-Ressourcen-Präsentationsbrücke ist bereits geöffnet.');
    }
    window.NoBrainerResourcePresentationCompatibility = { render: () => this.render() };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerResourcePresentationCompatibility;
  }
}

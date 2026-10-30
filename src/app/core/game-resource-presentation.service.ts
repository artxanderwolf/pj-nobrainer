import { Injectable } from '@angular/core';
import { getResourceHeaderPresentation } from '../game/resource-presentation-core';
import { GameCityOverviewPresentationService } from './game-city-overview-presentation.service';
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
  constructor(
    private readonly gameState: GameStateService,
    private readonly cityOverview: GameCityOverviewPresentationService
  ) {}

  render(): void {
    this.cityOverview.render();

    const gold = document.getElementById('gold');
    const goldIcon = document.getElementById('goldIcon') as HTMLImageElement | null;
    const materials = document.getElementById('matCount');
    if (!gold && !goldIcon && !materials) return;

    const state = this.gameState.getState<RuntimeResourcePresentationState>();
    const presentation = getResourceHeaderPresentation(state.gold, state.inventory);

    if (gold) {
      gold.dataset['resourcePresentationOwner'] = 'angular';
      gold.dataset['currencyDenomination'] = presentation.goldDenomination;
      gold.textContent = presentation.goldText;
    }
    if (goldIcon) {
      goldIcon.dataset['resourcePresentationOwner'] = 'angular';
      goldIcon.setAttribute('src', presentation.goldIconSrc);
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
    this.cityOverview.destroy();
    delete window.NoBrainerResourcePresentationCompatibility;
  }
}

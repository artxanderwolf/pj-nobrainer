import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { GameCombatLogService } from './core/game-combat-log.service';
import { GameEnergyService } from './core/game-energy.service';
import { GameEquipmentService } from './core/game-equipment.service';
import { GameForgeJobPresentationService } from './core/game-forge-job-presentation.service';
import { GameForgePreviewPresentationService } from './core/game-forge-preview-presentation.service';
import { GameForgeService } from './core/game-forge.service';
import { GameMarketService } from './core/game-market.service';
import { GameMaterialIndexPresentationService } from './core/game-material-index-presentation.service';
import { GameMaterialStoragePresentationService } from './core/game-material-storage-presentation.service';
import { GameProgressionPresentationService } from './core/game-progression-presentation.service';
import { GameProgressionService } from './core/game-progression.service';
import { GameResourcePresentationService } from './core/game-resource-presentation.service';
import { GameRuntimeService } from './core/game-runtime.service';
import { GameStateService } from './core/game-state.service';
import { GameTavernPresentationService } from './core/game-tavern-presentation.service';
import { GameWeaponInventoryPresentationService } from './core/game-weapon-inventory-presentation.service';
import { LegacyCharacterAdapterService } from './core/legacy-character-adapter.service';
import { LegacyCharacterPresentationAdapterService } from './core/legacy-character-presentation-adapter.service';
import { LegacyCombatLogPresentationAdapterService } from './core/legacy-combat-log-presentation-adapter.service';
import { LegacyDungeonDomainAdapterService } from './core/legacy-dungeon-domain-adapter.service';
import { LegacyDungeonPresentationAdapterService } from './core/legacy-dungeon-presentation-adapter.service';
import { LegacyEconomyAdapterService } from './core/legacy-economy-adapter.service';
import { LegacyEnergyAdapterService } from './core/legacy-energy-adapter.service';
import { LegacyEquipmentAdapterService } from './core/legacy-equipment-adapter.service';
import { LegacyForgeAdapterService } from './core/legacy-forge-adapter.service';
import { LegacyForgePresentationAdapterService } from './core/legacy-forge-presentation-adapter.service';
import { LegacyGameTickAdapterService } from './core/legacy-game-tick-adapter.service';
import { LegacyMarketAdapterService } from './core/legacy-market-adapter.service';
import { LegacyMarketPresentationAdapterService } from './core/legacy-market-presentation-adapter.service';
import { LegacyMaterialPresentationAdapterService } from './core/legacy-material-presentation-adapter.service';
import { LegacyMobileTablePresentationAdapterService } from './core/legacy-mobile-table-presentation-adapter.service';
import { LegacyNavigationPresentationAdapterService } from './core/legacy-navigation-presentation-adapter.service';
import { LegacyProgressionAdapterService } from './core/legacy-progression-adapter.service';
import { LegacyProgressionPresentationAdapterService } from './core/legacy-progression-presentation-adapter.service';
import { LegacyResourcePresentationAdapterService } from './core/legacy-resource-presentation-adapter.service';
import { LegacyRuntimeRegistrationAdapterService } from './core/legacy-runtime-registration-adapter.service';
import { LegacySaveStatusPresentationAdapterService } from './core/legacy-save-status-presentation-adapter.service';
import { LegacySourceAdapterService } from './core/legacy-source-adapter.service';
import { LegacyStateAdapterService } from './core/legacy-state-adapter.service';
import { LegacyTavernPresentationAdapterService } from './core/legacy-tavern-presentation-adapter.service';
import { LegacyWeaponPresentationAdapterService } from './core/legacy-weapon-presentation-adapter.service';
import { APP_SHELL_PAGE_IDS, composeAppShell } from './game/app-shell-presentation-core';
import { composePageMarkup } from './game/page-markup-presentation-core';
import { adaptLegacyWeaponScript } from './game/weapon-naming';

const APP_VERSION = '0.12.91';
const LEGACY_RUNTIME_PATH = 'legacy/NoBrainer_GitHub_v0.12.2.runtime.js';
const LEGACY_SCRIPT_ID = 'nobrainer-legacy-script';

@Component({ selector: 'app-root', standalone: true, template: '<div #legacyHost class="legacy-host" aria-live="polite"></div>' })
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('legacyHost', { static: true }) private legacyHost!: ElementRef<HTMLDivElement>;

  constructor(
    private readonly gameRuntime: GameRuntimeService,
    private readonly gameState: GameStateService,
    private readonly gameCombatLog: GameCombatLogService,
    private readonly gameEnergy: GameEnergyService,
    private readonly gameEquipment: GameEquipmentService,
    private readonly gameForge: GameForgeService,
    private readonly gameForgeJobPresentation: GameForgeJobPresentationService,
    private readonly gameForgePreviewPresentation: GameForgePreviewPresentationService,
    private readonly gameMarket: GameMarketService,
    private readonly gameMaterialIndexPresentation: GameMaterialIndexPresentationService,
    private readonly gameMaterialStoragePresentation: GameMaterialStoragePresentationService,
    private readonly gameProgression: GameProgressionService,
    private readonly gameProgressionPresentation: GameProgressionPresentationService,
    private readonly gameResourcePresentation: GameResourcePresentationService,
    private readonly gameTavernPresentation: GameTavernPresentationService,
    private readonly gameWeaponInventoryPresentation: GameWeaponInventoryPresentationService,
    private readonly legacySourceAdapter: LegacySourceAdapterService,
    private readonly legacyStateAdapter: LegacyStateAdapterService,
    private readonly legacyGameTickAdapter: LegacyGameTickAdapterService,
    private readonly legacyRuntimeRegistrationAdapter: LegacyRuntimeRegistrationAdapterService,
    private readonly legacyMobileTablePresentationAdapter: LegacyMobileTablePresentationAdapterService,
    private readonly legacyNavigationPresentationAdapter: LegacyNavigationPresentationAdapterService,
    private readonly legacySaveStatusPresentationAdapter: LegacySaveStatusPresentationAdapterService,
    private readonly legacyCombatLogPresentationAdapter: LegacyCombatLogPresentationAdapterService,
    private readonly legacyDungeonDomainAdapter: LegacyDungeonDomainAdapterService,
    private readonly legacyDungeonPresentationAdapter: LegacyDungeonPresentationAdapterService,
    private readonly legacyForgeAdapter: LegacyForgeAdapterService,
    private readonly legacyMarketAdapter: LegacyMarketAdapterService,
    private readonly legacyEconomyAdapter: LegacyEconomyAdapterService,
    private readonly legacyMarketPresentationAdapter: LegacyMarketPresentationAdapterService,
    private readonly legacyMaterialPresentationAdapter: LegacyMaterialPresentationAdapterService,
    private readonly legacyResourcePresentationAdapter: LegacyResourcePresentationAdapterService,
    private readonly legacyForgePresentationAdapter: LegacyForgePresentationAdapterService,
    private readonly legacyTavernPresentationAdapter: LegacyTavernPresentationAdapterService,
    private readonly legacyCharacterAdapter: LegacyCharacterAdapterService,
    private readonly legacyEquipmentAdapter: LegacyEquipmentAdapterService,
    private readonly legacyWeaponPresentationAdapter: LegacyWeaponPresentationAdapterService,
    private readonly legacyCharacterPresentationAdapter: LegacyCharacterPresentationAdapterService,
    private readonly legacyProgressionAdapter: LegacyProgressionAdapterService,
    private readonly legacyProgressionPresentationAdapter: LegacyProgressionPresentationAdapterService,
    private readonly legacyEnergyAdapter: LegacyEnergyAdapterService
  ) {}

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.mountGameRuntime();
      this.gameRuntime.prepare();
      this.gameRuntime.startTick();
      try { this.gameRuntime.renderInitial(); } catch (error: unknown) { console.error('Der erste NoBrainer-Render ist fehlgeschlagen.', error); }
    } catch (error: unknown) {
      this.gameRuntime.stopTick();
      this.gameWeaponInventoryPresentation.closeLegacyCompatibilityBridge();
      this.gameTavernPresentation.closeLegacyCompatibilityBridge();
      this.gameMaterialStoragePresentation.closeLegacyCompatibilityBridge();
      this.gameMaterialIndexPresentation.closeLegacyCompatibilityBridge();
      this.gameResourcePresentation.closeLegacyCompatibilityBridge();
      this.gameForgePreviewPresentation.closeLegacyCompatibilityBridge();
      this.gameForgeJobPresentation.closeLegacyCompatibilityBridge();
      this.gameProgressionPresentation.closeLegacyCompatibilityBridge();
      this.gameProgression.closeLegacyCompatibilityBridge();
      this.gameMarket.closeLegacyCompatibilityBridge();
      this.gameForge.closeLegacyCompatibilityBridge();
      this.gameEquipment.closeLegacyCompatibilityBridge();
      this.gameEnergy.closeLegacyCompatibilityBridge();
      this.gameCombatLog.closeLegacyCompatibilityBridge();
      console.error('Die NoBrainer-Runtime konnte nicht geladen werden.', error);
      this.legacyHost.nativeElement.dataset['runtimeError'] = error instanceof Error ? error.message : String(error);
      this.legacyHost.nativeElement.textContent = 'Die NoBrainer-Runtime konnte nicht geladen werden. Bitte Seite neu laden.';
    }
  }

  ngOnDestroy(): void {
    this.gameRuntime.stopTick();
    this.gameWeaponInventoryPresentation.closeLegacyCompatibilityBridge();
    this.gameTavernPresentation.closeLegacyCompatibilityBridge();
    this.gameMaterialStoragePresentation.closeLegacyCompatibilityBridge();
    this.gameMaterialIndexPresentation.closeLegacyCompatibilityBridge();
    this.gameResourcePresentation.closeLegacyCompatibilityBridge();
    this.gameForgePreviewPresentation.closeLegacyCompatibilityBridge();
    this.gameForgeJobPresentation.closeLegacyCompatibilityBridge();
    this.gameProgressionPresentation.closeLegacyCompatibilityBridge();
    this.gameProgression.closeLegacyCompatibilityBridge();
    this.gameMarket.closeLegacyCompatibilityBridge();
    this.gameForge.closeLegacyCompatibilityBridge();
    this.gameEquipment.closeLegacyCompatibilityBridge();
    this.gameEnergy.closeLegacyCompatibilityBridge();
    this.gameCombatLog.closeLegacyCompatibilityBridge();
  }

  private async mountGameRuntime(): Promise<void> {
    const runtimeUrl = new URL(LEGACY_RUNTIME_PATH, document.baseURI);
    const response = await fetch(runtimeUrl);
    if (!response.ok) throw new Error(`Legacy-Runtime nicht erreichbar (${response.status}).`);
    const source = await response.text();
    const pageMarkup = composePageMarkup(APP_SHELL_PAGE_IDS);

    let adaptedScript = this.legacySourceAdapter.adapt(source);
    adaptedScript = this.legacyStateAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyGameTickAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyRuntimeRegistrationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyMobileTablePresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyNavigationPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacySaveStatusPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyCombatLogPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyDungeonDomainAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyDungeonPresentationAdapter.adapt(adaptedScript);
    adaptedScript = adaptLegacyWeaponScript(adaptedScript);
    adaptedScript = this.legacyWeaponPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyForgeAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyMarketAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyEconomyAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyMarketPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyMaterialPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyResourcePresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyTavernPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyCharacterAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyEquipmentAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyCharacterPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyForgePresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyProgressionAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyProgressionPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyEnergyAdapter.adapt(adaptedScript);
    this.legacyHost.nativeElement.innerHTML = composeAppShell(pageMarkup);
    this.applyVersionMarker();

    this.gameCombatLog.openLegacyCompatibilityBridge();
    this.gameEnergy.openLegacyCompatibilityBridge();
    this.gameEquipment.openLegacyCompatibilityBridge();
    this.gameForge.openLegacyCompatibilityBridge();
    this.gameMarket.openLegacyCompatibilityBridge();
    this.gameProgression.openLegacyCompatibilityBridge();
    this.gameProgressionPresentation.openLegacyCompatibilityBridge();
    this.gameForgeJobPresentation.openLegacyCompatibilityBridge();
    this.gameForgePreviewPresentation.openLegacyCompatibilityBridge();
    this.gameResourcePresentation.openLegacyCompatibilityBridge();
    this.gameMaterialIndexPresentation.openLegacyCompatibilityBridge();
    this.gameMaterialStoragePresentation.openLegacyCompatibilityBridge();
    this.gameTavernPresentation.openLegacyCompatibilityBridge();
    this.gameWeaponInventoryPresentation.openLegacyCompatibilityBridge();
    this.gameState.openBootstrapRegistration();
    try {
      this.gameRuntime.openBootstrapRegistration();
      try {
        this.installLegacyScript(adaptedScript);
        this.gameState.getState();
      } finally {
        this.gameRuntime.closeBootstrapRegistration();
      }
    } finally {
      this.gameState.closeBootstrapRegistration();
    }
  }

  private applyVersionMarker(): void {
    document.title = `Projekt NoBrainer – Prototype v${APP_VERSION}`;
    const versionLabel = this.legacyHost.nativeElement.querySelector<HTMLElement>('.brand small');
    if (versionLabel) versionLabel.textContent = `Prototype v${APP_VERSION}`;
  }

  private installLegacyScript(source: string): void {
    if (document.getElementById(LEGACY_SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = LEGACY_SCRIPT_ID;
    script.textContent = `${source}\n//# sourceURL=NoBrainer_GitHub_v${APP_VERSION}.legacy.js`;
    document.body.appendChild(script);
  }
}

import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { LegacyCharacterAdapterService } from './core/legacy-character-adapter.service';
import { LegacyCharacterPresentationAdapterService } from './core/legacy-character-presentation-adapter.service';
import { LegacyDungeonDomainAdapterService } from './core/legacy-dungeon-domain-adapter.service';
import { LegacyDungeonPresentationAdapterService } from './core/legacy-dungeon-presentation-adapter.service';
import { LegacyEconomyAdapterService } from './core/legacy-economy-adapter.service';
import { LegacyEnergyAdapterService } from './core/legacy-energy-adapter.service';
import { LegacyEquipmentAdapterService } from './core/legacy-equipment-adapter.service';
import { LegacyForgeAdapterService } from './core/legacy-forge-adapter.service';
import { LegacyMarketAdapterService } from './core/legacy-market-adapter.service';
import { LegacyProgressionAdapterService } from './core/legacy-progression-adapter.service';
import { LegacyProgressionPresentationAdapterService } from './core/legacy-progression-presentation-adapter.service';
import { LegacyRuntimeService } from './core/legacy-runtime.service';
import { LegacySourceAdapterService } from './core/legacy-source-adapter.service';
import { LegacyTavernPresentationAdapterService } from './core/legacy-tavern-presentation-adapter.service';
import { LegacyWeaponPresentationAdapterService } from './core/legacy-weapon-presentation-adapter.service';
import { adaptLegacyWeaponMarkup, adaptLegacyWeaponScript } from './game/weapon-naming';

const APP_VERSION = '0.12.32';
const LEGACY_PROTOTYPE_PATH = 'legacy/NoBrainer_GitHub_v0.12.2.html';
const LEGACY_STYLE_ID = 'nobrainer-legacy-style';
const LEGACY_SCRIPT_ID = 'nobrainer-legacy-script';

@Component({ selector: 'app-root', standalone: true, template: '<div #legacyHost class="legacy-host" aria-live="polite"></div>' })
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('legacyHost', { static: true }) private legacyHost!: ElementRef<HTMLDivElement>;

  constructor(
    private readonly legacyRuntime: LegacyRuntimeService,
    private readonly legacySourceAdapter: LegacySourceAdapterService,
    private readonly legacyDungeonDomainAdapter: LegacyDungeonDomainAdapterService,
    private readonly legacyDungeonPresentationAdapter: LegacyDungeonPresentationAdapterService,
    private readonly legacyForgeAdapter: LegacyForgeAdapterService,
    private readonly legacyMarketAdapter: LegacyMarketAdapterService,
    private readonly legacyEconomyAdapter: LegacyEconomyAdapterService,
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
      await this.mountLegacyPrototype();
      this.legacyRuntime.prepare();
      this.legacyRuntime.startTick();
      try { this.legacyRuntime.renderInitial(); } catch (error: unknown) { console.error('Der erste NoBrainer-Render ist fehlgeschlagen.', error); }
    } catch (error: unknown) {
      console.error('Der NoBrainer-Prototyp konnte nicht geladen werden.', error);
      this.legacyHost.nativeElement.textContent = 'Der NoBrainer-Prototyp konnte nicht geladen werden. Bitte Seite neu laden.';
    }
  }

  ngOnDestroy(): void { this.legacyRuntime.stopTick(); }

  private async mountLegacyPrototype(): Promise<void> {
    const prototypeUrl = new URL(LEGACY_PROTOTYPE_PATH, document.baseURI);
    const response = await fetch(prototypeUrl);
    if (!response.ok) throw new Error(`Legacy-Prototyp nicht erreichbar (${response.status}).`);
    const source = await response.text();
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    const app = parsed.querySelector<HTMLElement>('body > .app');
    const legacyStyle = parsed.querySelector<HTMLStyleElement>('head > style');
    const legacyScript = parsed.querySelector<HTMLScriptElement>('body > script');
    if (!app || !legacyStyle || !legacyScript) throw new Error('Legacy-Prototyp hat nicht die erwartete v0.12.2-Struktur.');

    let adaptedScript = this.legacySourceAdapter.adapt(legacyScript.textContent ?? '');
    adaptedScript = this.legacyDungeonDomainAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyDungeonPresentationAdapter.adapt(adaptedScript);
    adaptedScript = adaptLegacyWeaponScript(adaptedScript);
    adaptedScript = this.legacyWeaponPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyForgeAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyMarketAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyEconomyAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyTavernPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyCharacterAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyEquipmentAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyCharacterPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyProgressionAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyProgressionPresentationAdapter.adapt(adaptedScript);
    adaptedScript = this.legacyEnergyAdapter.adapt(adaptedScript);
    const adaptedMarkup = adaptLegacyWeaponMarkup(app.outerHTML);
    this.installLegacyStyle(legacyStyle.textContent ?? '');
    this.legacyHost.nativeElement.innerHTML = adaptedMarkup;
    this.applyVersionMarker();
    this.installLegacyScript(adaptedScript);
  }

  private applyVersionMarker(): void {
    document.title = `Projekt NoBrainer – Prototype v${APP_VERSION}`;
    const versionLabel = this.legacyHost.nativeElement.querySelector<HTMLElement>('.brand small');
    if (versionLabel) versionLabel.textContent = `Prototype v${APP_VERSION}`;
  }

  private installLegacyStyle(css: string): void {
    document.getElementById(LEGACY_STYLE_ID)?.remove();
    const style = document.createElement('style'); style.id = LEGACY_STYLE_ID; style.textContent = css; document.head.appendChild(style);
  }

  private installLegacyScript(source: string): void {
    if (document.getElementById(LEGACY_SCRIPT_ID)) return;
    const script = document.createElement('script'); script.id = LEGACY_SCRIPT_ID;
    script.textContent = `${source}\n//# sourceURL=NoBrainer_GitHub_v${APP_VERSION}.legacy.js`; document.body.appendChild(script);
  }
}

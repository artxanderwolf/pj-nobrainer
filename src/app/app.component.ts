import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

const LEGACY_PROTOTYPE_PATH = 'legacy/NoBrainer_GitHub_v0.12.2.html';
const LEGACY_STYLE_ID = 'nobrainer-legacy-style';
const LEGACY_SCRIPT_ID = 'nobrainer-legacy-script';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<div #legacyHost class="legacy-host" aria-live="polite"></div>'
})
export class AppComponent implements AfterViewInit {
  @ViewChild('legacyHost', { static: true })
  private legacyHost!: ElementRef<HTMLDivElement>;

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.mountLegacyPrototype();
    } catch (error: unknown) {
      console.error('Der NoBrainer-Prototyp konnte nicht geladen werden.', error);
      this.legacyHost.nativeElement.textContent =
        'Der NoBrainer-Prototyp konnte nicht geladen werden. Bitte Seite neu laden.';
    }
  }

  private async mountLegacyPrototype(): Promise<void> {
    const prototypeUrl = new URL(LEGACY_PROTOTYPE_PATH, document.baseURI);
    const response = await fetch(prototypeUrl);

    if (!response.ok) {
      throw new Error(`Legacy-Prototyp nicht erreichbar (${response.status}).`);
    }

    const source = await response.text();
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    const app = parsed.querySelector<HTMLElement>('body > .app');
    const legacyStyle = parsed.querySelector<HTMLStyleElement>('head > style');
    const legacyScript = parsed.querySelector<HTMLScriptElement>('body > script');

    if (!app || !legacyStyle || !legacyScript) {
      throw new Error('Legacy-Prototyp hat nicht die erwartete v0.12.2-Struktur.');
    }

    this.installLegacyStyle(legacyStyle.textContent ?? '');
    this.legacyHost.nativeElement.innerHTML = app.outerHTML;
    this.installLegacyScript(legacyScript.textContent ?? '');
  }

  private installLegacyStyle(css: string): void {
    document.getElementById(LEGACY_STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = LEGACY_STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  private installLegacyScript(source: string): void {
    if (document.getElementById(LEGACY_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement('script');
    script.id = LEGACY_SCRIPT_ID;
    script.textContent = `${source}\n//# sourceURL=NoBrainer_GitHub_v0.12.2.legacy.js`;
    document.body.appendChild(script);
  }
}

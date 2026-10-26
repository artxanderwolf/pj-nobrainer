import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { GameUpdateService } from './app/core/game-update.service';

const UPDATE_START_RETRY_MS = 50;
const UPDATE_START_MAX_ATTEMPTS = 200;

function startUpdaterAfterGameRender(updateService: GameUpdateService, attempt = 0): void {
  const gameShellReady = Boolean(document.querySelector('#index .grid'));
  if (!gameShellReady) {
    if (attempt >= UPDATE_START_MAX_ATTEMPTS) {
      console.warn('Android-Updater wurde nicht gestartet, weil die Spieloberfläche nicht rechtzeitig bereit war. Das Spiel läuft ohne Updateprüfung weiter.');
      return;
    }
    window.setTimeout(() => startUpdaterAfterGameRender(updateService, attempt + 1), UPDATE_START_RETRY_MS);
    return;
  }

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      void updateService.initialize().catch((error: unknown) => {
        console.warn('Android-Updater konnte nicht initialisiert werden. Das Spiel läuft normal weiter.', error);
      });
    }, 0);
  });
}

bootstrapApplication(AppComponent)
  .then(appRef => {
    startUpdaterAfterGameRender(appRef.injector.get(GameUpdateService));
  })
  .catch((error: unknown) => {
    console.error('Smiths of Eldravar konnte nicht gestartet werden.', error);
  });

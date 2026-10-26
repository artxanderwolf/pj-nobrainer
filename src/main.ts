import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { GameUpdateService } from './app/core/game-update.service';

bootstrapApplication(AppComponent)
  .then(appRef => {
    const updateService = appRef.injector.get(GameUpdateService);
    void updateService.initialize();
  })
  .catch((error: unknown) => {
    console.error('Smiths of Eldravar konnte nicht gestartet werden.', error);
  });

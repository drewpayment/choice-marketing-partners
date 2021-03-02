import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from 'choice/apps/clientapp/src/app/app.module';
import { environment } from 'choice/apps/clientapp/src/environments/environment';

import Bugsnag from '@bugsnag/js';

// configure Bugsnag asap
Bugsnag.start({ apiKey: environment.bugsnag });

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

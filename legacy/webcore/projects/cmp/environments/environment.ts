// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  api: '/api',
  apiV2: 'https://localhost:7004/api/v2',
  bugsnag: '541f3417fe6392a170dcb356e728e7fd',
  zipcode: 'dbd21640-36c1-11ec-8553-2d4d26a369c6',
  overrideZipcodeDevelopment: true,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

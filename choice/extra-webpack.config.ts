/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-restricted-syntax */
import * as fs from 'fs';
import * as webpack from 'webpack';
import { CustomWebpackBrowserSchema } from '@angular-builders/custom-webpack';
import * as path from 'path';

// eslint-disable-next-line no-undef
console.log('>>> Run extra Webpack Configuration');

export default (config: webpack.Configuration, options: CustomWebpackBrowserSchema) => {
  config.plugins.push({
    apply: (compiler) => {
      console.debug('>>> Relocate app.blade.php');

      compiler.hooks.done.tap('AfterDonePlugin', (stats) => {
        console.debug('Execute afterEmit hook');

        fs.renameSync(path.resolve('../public/dist/cmp/index.php'), path.resolve('../resources/views/layouts/app.blade.php'));
      });
    },
  });
  return config;
};


// eslint-disable-next-line no-undef,import/no-amd
define(['exports', 'vs/language/typescript/tsWorker'], function (e, _t) {
  const eslintPlugin = require('@typescript-eslint/eslint-plugin');

  e.Linter = require('eslint').Linter;
  e.analyze =
    require('@typescript-eslint/scope-manager/use-at-your-own-risk/analyze').analyze;
  e.visitorKeys =
    require('@typescript-eslint/visitor-keys/use-at-your-own-risk/visitor-keys').visitorKeys;
  e.astConverter =
    require('@typescript-eslint/typescript-estree/use-at-your-own-risk/ast-converter').astConverter;
  e.esquery = require('esquery');
  e.rules = eslintPlugin.rules;

  const configs = {};

  const eslintConfigs = require('@eslint/js').configs;

  for (const [key, value] of Object.entries(eslintConfigs)) {
    configs[`eslint:${key}`] = value;
  }
  for (const [key, value] of Object.entries(eslintPlugin.configs)) {
    configs[`plugin:@typescript-eslint/${key}`] = value;
  }

  e.configs = configs;
});

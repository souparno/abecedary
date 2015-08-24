/* global System */

System.config({
  'defaultJSExtensions': true,
  "transpiler": "babel",
  "babelOptions": {
    //"allowImportExportEverywhere": true,
    "optional": [
      "runtime"
    ]
  },
  'map': {
    'babel': "node_modules/babel-core/browser.js",
    'babel-runtime': "node_modules/babel-runtime/core-js.js",
    'runner': 'dist/mocha-runner.js',
    'mocha': 'node_modules/mocha/mocha.js',
    'chai': 'node_modules/chai/chai.js'
  },
  'meta': {
    'mocha': {
      'format': 'global',
      'exports': 'mocha'
    }
  }
});
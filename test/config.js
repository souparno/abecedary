System.config({
  'defaultJSExtensions': true,
  'map': {
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
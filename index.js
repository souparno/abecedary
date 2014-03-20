var component = require('./lib/component')
    stuff = component('adamfortuna-stuff.js'),
    emitter = component('component-emitter'),
    Promise = component('then-promise'),
    extend = component('segmentio-extend');

function Abecedary(iframeUrl, template, options) {
  this.options = options || {};
  this.iframeUrl = iframeUrl;
  this.template = template;
  this.options = extend({ ui: "bdd", bail: true, ignoreLeaks: true }, this.options);

  this.sandbox = new Promise(function (resolve, reject) {
    stuff(this.iframeUrl, function (context) {
      // Whenever we run tests in the sandbox, call runComplete
      context.on('finished', runComplete.bind(this));
      context.on('loaded', loaded.bind(this, { resolve: resolve, reject: reject }));

      // Contains the initial HTML and libraries needed to run tests,
      // as well as the tests themselves, but not the code
      context.load(this.template);

      this.context = context;
    }.bind(this));
  }.bind(this));

  //  Publicize the run is done
  var runComplete = function(report) {
    this.emit('complete', report);
  }

  // Setup Mocha upon completion
  var loaded = function(promise, report) {
    this.context.evaljs('mocha.setup('+ JSON.stringify(this.options) +');');
    promise.resolve(this.context);
  }
}
emitter(Abecedary.prototype);

// Public API to run tests against code
// Doesn't return anything, but emit a `complete` event when finished
Abecedary.prototype.run = function(code, tests) {
  var _this = this;

  this.sandbox.then(function(context) {
    console.log('running code')
    var runner = [
      'window.code = JSON.parse('+JSON.stringify(JSON.stringify(code))+');',
      'mocha.suite.suites.shift()',
      tests || _this.tests,
      'window.mocha.run();',
      true
    ].join('\n');

    try {
      context.evaljs(runner);
    } catch(e) {
      _this.emit('error', e);
    }
  });
}

// Public
//   Removes any iFrames that are lingering around
Abecedary.prototype.close = function(data) {
  stuff.clear();
}

module.exports = Abecedary;
var stuff = require('stuff.js');
var emitter = require('emitter');
var Promise = require('promise');
var extend = require('extend');

function Abecedary(iframeUrl, template, options) {
  this.options = options || {};
  this.iframeUrl = iframeUrl;
  this.template = template;
  this.options = extend({ ui: "bdd", bail: true, ignoreLeaks: false }, this.options);
  this.createSandbox();
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

// Private
//   Creates the stuff.js sandbox and returns a promise
Abecedary.prototype.createSandbox = function() {
  var _this = this;
  this.sandbox = new Promise(function (resolve, reject) {
    stuff(_this.iframeUrl, function (context) {
      // Whenever we run tests in the sandbox, call runComplete
      context.on('finished', runComplete.bind(_this));
      context.on('loaded', loaded.bind(_this, { resolve: resolve, reject: reject }));

      // Contains the initial HTML and libraries needed to run tests,
      // as well as the tests themselves, but not the code
      context.load(_this.template);

      _this.context = context;
    });
  });
  return this.sandbox;
}

//  Publicize the run is done
var runComplete = function(report) {
  this.emit('complete', report);
}

// Setup Mocha upon completion
var loaded = function(promise, report) {
  this.context.evaljs('mocha.setup('+ JSON.stringify(this.options) +');');
  promise.resolve(this.context);
}


module.exports = Abecedary;

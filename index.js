var stuff = require('stuff.js');
var emitter = require('emitter');
var Promise = require('promise');

function Abecedary(iframeUrl, template) {
  this.iframeUrl = iframeUrl;
  this.template = template;
  this.createSandbox();
}
emitter(Abecedary.prototype);

// Public API to run tests against code
// Doesn't return anything, but emit a `complete` event when finished
Abecedary.prototype.run = function(code, tests) {
  var _this = this;
  this.createSandbox().then(function(context) {
    _this.context = context;

    var runner = [
      'window.code = JSON.parse("' + JSON.stringify(code) + '");',
      'mocha.suite.suites.shift()',
      tests || _this.tests,
      'window.mocha.run();',
      true
    ].join('\n');
    context.evaljs(runner);
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
  if(this.sandbox) { return this.sandbox; }

  var _this = this;
  this.sandbox = new Promise(function (resolve, reject) {
    stuff(_this.iframeUrl, function (context) {
      // Whenever we run tests in the sandbox, call runComplete
      context.on('finished', _this.runComplete.bind(_this));

      // Contains the initial HTML and libraries needed to run tests,
      // as well as the tests themselves, but not the code
      context.load(_this.template);

      resolve(context);
    });
  });
  return this.sandbox;
}

// Private
//  Publicize the run is done
Abecedary.prototype.runComplete = function(report) {
  this.emit('complete', report);
}

module.exports = Abecedary;

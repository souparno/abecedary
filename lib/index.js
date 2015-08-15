var systemJsRunner = require('./systemjs-runner.js'),
    legacyRunner = require('./legacy-runner.js'),
    stuff = require('stuff.js'),
    EventEmitter = require('events').EventEmitter,
    Promise = require('promise/lib/es6-extensions'),
    extend = require('extend'),
    inherits = require('inherits');

function sanitize(obj) {
  return JSON.stringify(obj);
}

function Abecedary(iframeUrl, template, options) {
  var generateElement = function() {
    var element = document.createElement('div');
    element.style.cssText = 'display:none;';
    document.body.appendChild(element);
    return element;
  }

  this.options = options || {};
  this.iframeUrl = iframeUrl;
  this.template = template;
  this.options = extend({ ui: "bdd", bail: true, ignoreLeaks: true}, this.options);

  this.element = this.options.element || generateElement()
  delete(this.options.element);

  this.systemjs = this.options.systemjs;
  delete this.options.systemjs;

  this.sandbox = new Promise(function (resolve, reject) {
    var _this = this;
    stuff(this.iframeUrl, { el: this.element }, function (context) {
      // Whenever we run tests in the sandbox, call runComplete
      context.on('finished', runComplete.bind(this));
      context.on('error', error.bind(this));
      context.on('loaded', function() {
        var runner,
            setupCode;
        if (_this.systemjs) {
          runner = systemJsRunner.toString();
        } else {
          runner = legacyRunner.toString();
        }
        setupCode = [
          "var Runner = " + runner + ";",
          "var runner = new Runner();",
          "runner.setup(" + sanitize(_this.options) + ");"
        ]
        context.evaljs(setupCode.join('\n'));
        resolve(context);
      });

      // Contains the initial HTML and libraries needed to run tests,
      // as well as the tests themselves, but not the code
      context.load(this.template);
    }.bind(this));
  }.bind(this));

  //  Publicize the run is done
  var runComplete = function(report) {
    this.emit('complete', report);
  };

  // Emit the error
  var error = function(error) {
    this.emit('error', error, this);
  };
}
inherits(Abecedary, EventEmitter);

// Public API to run tests against code
// Doesn't return anything, but emit a `complete` event when finished
Abecedary.prototype.run = function(code, tests, globals) {
  var _this = this;

  //lineNumber || columnNumber
  this.sandbox.then(function(context) {
    try {
      context.evaljs('runner.run(' + sanitize(code) + ', ' + sanitize(tests) + ', ' + sanitize(globals) + ');');
    } catch(e) {
      _this.emit('error', e);
    }
  });
}

// Public
//   Removes any iFrames that are lingering around
Abecedary.prototype.close = function(data) {
  this.element.parentElement.removeChild(this.element);
}

module.exports = Abecedary;

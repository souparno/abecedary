var runner = require('./lib/systemjs-runner.js'),
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
  this.options.mocha = extend({bail: true}, this.options.mocha);
  this.options.systemjs = this.options.systemjs || {};
  this.element = this.options.element || generateElement()
  delete(this.options.element);

  this.sandbox = new Promise(function (resolve, reject) {
    var self = this;
    stuff(this.iframeUrl, { el: this.element }, function (context) {
      // Whenever we run tests in the sandbox, call runComplete
      context.on('finished', runComplete.bind(this));
      context.on('error', error.bind(this));
      context.on('loaded', function() {
        context.evaljs(runner.toString());
        context.evaljs('var runner = new Runner();');
        context.evaljs('runner.setup(' + sanitize(self.options) + ');');
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
  var self = this;

  //lineNumber || columnNumber
  this.sandbox.then(function(context) {
    try {
      context.evaljs('runner.run(' + sanitize(code) + ', ' + sanitize(tests) + ', ' + sanitize(globals) + ');');
    } catch(e) {
      self.emit('error', e);
    }
  });
}

// Public
//   Removes any iFrames that are lingering around
Abecedary.prototype.close = function(data) {
  this.element.parentElement.removeChild(this.element);
}

module.exports = Abecedary;

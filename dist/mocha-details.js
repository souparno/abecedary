require('mocha');

// Abecedary: Custom type for details
Mocha.Details = function(title, fn) {
  var self = this;
  var resultsFn = function() {
    self.results = fn.call();
  };
  Mocha.Runnable.call(this, title, resultsFn);
  this.pending = !resultsFn;
  this.type = 'details';
}
Mocha.Details.prototype.__proto__ = Mocha.Runnable.prototype;

module.exports = mocha;
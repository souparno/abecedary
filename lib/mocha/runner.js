var mocha = require('./details'),
    options = require('options'),
    extend = require('extend'),
    AbecedaryInterface = require('./interface'),
    AbecedaryReporter = require('./reporter');//,

module.exports = function() {
  // Clear suites between runs.
  mocha.suite.suites.splice(0, mocha.suite.suites.length);
  mocha.suite.tests.splice(0, mocha.suite.tests.length);

  // Setup mocha
  Mocha.interfaces['abecedary-interface'] = AbecedaryInterface;
  mocha.setup(extend({ui: 'abecedary-interface', reporter: AbecedaryReporter}, options.mocha));

  // Setup Tests
  try {
    require('tests')();
  }
  catch (error) {
    rethrow(error);
  }

  // Run Tests
  return mocha.run();
};

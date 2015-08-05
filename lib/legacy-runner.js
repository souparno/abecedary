module.exports = function Runner() {
  this.setup = function(options) {
    mocha.setup({ui: AbecedaryInterface, reporter: AbecedaryReporter});
    mocha.setup(options);
  };

  this.run = function(code, tests, globals) {
    // Clear suites between runs.
    mocha.suite.suites.splice(0, mocha.suite.suites.length);
    mocha.suite.tests.splice(0, mocha.suite.tests.length);

    for (var property in globals) {
      window[property] = globals[property];
    }

    // Setup Tests
    try {
      var tests = Function("require", "code", "globals", tests);
      tests(window.require, code, globals);
    }
    catch (error) {
      rethrow(error);
    }

    // Run Tests
    mocha.run();
  };
}
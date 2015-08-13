module.exports = function Runner() {
  function setupGlobals(code, globals) {
    window.code = code;
    for (var property in globals) {
      window[property] = globals[property];
    }
  }

  function tearDownGlobals(code, globals) {
    delete window.code;
    for (var property in globals) {
      delete window[property];
    }
  }

  this.setup = function(options) {
    mocha.setup(options);
  };

  this.run = function(code, tests, globals) {
    // Clear suites between runs.
    mocha.suite.suites.splice(0, mocha.suite.suites.length);
    mocha.suite.tests.splice(0, mocha.suite.tests.length);

    setupGlobals(code, globals)

    // Setup Tests
    try {
      var tests = Function("require", "code", "globals", tests);
      tests(window.require, code, globals);

      // Run Tests
      mocha.run(function() {
        tearDownGlobals(code, globals);
      });
    }
    catch (error) {
      tearDownGlobals(code, globals);
      rethrow(error);
    }

  };
}
// Need this object to be a single function since it'll be evaluated in the sandbox.
module.exports = function Runner() {
  var self = this;

  function deleteModule(name) {
    System.normalize(name).then(function(name) {
      System.delete(name);
    });
  }

  function tearDown() {
    deleteModule('code');
    deleteModule('globals');
    deleteModule('tests');
  }

  function generateTestWrapper(tests, globals) {
    var argumentList = ['"require"', '"code"', '"globals"'],
      argumentValues = ['require', 'code', 'globals'];
    for (var property in globals) {
      argumentList.push('"' + property + '"');
      argumentValues.push('globals.' + property);
    }
    return function() {
      return [
        'var testFunction = Function(' + argumentList.join(', ') + ', ' + JSON.stringify(tests) + ');',
        'var code = require("code"),',
        '    globals = require("globals");',
        'module.exports = function() {',
        '  testFunction.apply(null, [' + argumentValues.join(',') + ']);',
        '};'
      ].join('\n');
    }
  }

  this.setup = function(options) {
    System.config(options.systemjs);

    // Customizing System.normalize so it doesn't normalize tests.
    var systemNormalize = System.normalize;
    System.normalize = function(name, parentName, parentAddress) {
      if ("tests" == name) {
        return new Promise(function(resolve, reject) {
          resolve(name);
        });
      }
      return systemNormalize.apply(this, arguments);
    };

    // Customizing System.fetch so that we can inject the test code at runtime,
    // and have System.js evaluate it for dependencies.
    var systemFetch = System.fetch;
    System.fetch = function(load) {
      if ("tests" == load.name) {
        return new Promise(function(resolve, reject) {
          resolve(self.testWrapper());
        });
      }
      return systemFetch.apply(this, arguments);
    };

    System.registerDynamic('options', [], false, function(require, exports, module) {
      module.exports = options;
    });
  };

  this.run = function(code, tests, globals) {
    self.testWrapper = generateTestWrapper(tests, globals);

    System.registerDynamic('code', [], false, function(require, exports, module) {
      module.exports = code;
    });

    System.registerDynamic('globals', [], false, function(require, exports, module) {
      module.exports = globals;
    });

    Promise.all([
      System.import('runner'),
      System.import('tests')
    ])
    .then(function(modules) {
      var runner = modules[0],
          tests = modules[1];
      runner(tests);
      tearDown();
    })
    .catch(function(error) {
      tearDown();
    });
  };
};
// Need this object to be a single function since it'll be evaluated in the sandbox.
module.exports = function Runner() {
  var _this = this;

  function deleteModule(name) {
    System.delete(System.normalizeSync(name));
  }

  function tearDown() {
    deleteModule('code');
    deleteModule('globals');
    deleteModule('tests');
  }

  this.setup = function(options) {
    // Customizing System.fetch so that we can inject the test code at runtime,
    // and have System.js evaluate it for dependencies.
    var systemFetch = System.fetch;
    System.fetch = function(load) {
      if (System.normalizeSync('tests') == load.name) {
        return new Promise(function(resolve, reject) {
          resolve(_this._tests);
        });
      }
      return systemFetch.apply(this, arguments);
    };

    System.registerDynamic(System.normalizeSync('options'), [], false, function(require, exports, module) {
      module.exports = options;
    });
  };

  this.run = function(code, tests, globals) {
    _this._tests = tests;

    System.registerDynamic(System.normalizeSync('code'), [], false, function(require, exports, module) {
      module.exports = code;
    });

    System.registerDynamic(System.normalizeSync('globals'), [], false, function(require, exports, module) {
      module.exports = globals;
    });

    Promise.all([
      System.import('options'),
      System.import('runner')
    ])
    .then(function(modules) {
      var options = modules[0],
          runner = modules[1];
      return runner(options, code, globals)
    })
    .then(tearDown)
    .catch(tearDown);
  };
};
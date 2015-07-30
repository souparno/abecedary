System.registerDynamic("npm:extend@3.0.0/index.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var hasOwn = Object.prototype.hasOwnProperty;
  var toStr = Object.prototype.toString;
  var isArray = function isArray(arr) {
    if (typeof Array.isArray === 'function') {
      return Array.isArray(arr);
    }
    return toStr.call(arr) === '[object Array]';
  };
  var isPlainObject = function isPlainObject(obj) {
    if (!obj || toStr.call(obj) !== '[object Object]') {
      return false;
    }
    var hasOwnConstructor = hasOwn.call(obj, 'constructor');
    var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
    if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
      return false;
    }
    var key;
    for (key in obj) {}
    return typeof key === 'undefined' || hasOwn.call(obj, key);
  };
  module.exports = function extend() {
    var options,
        name,
        src,
        copy,
        copyIsArray,
        clone,
        target = arguments[0],
        i = 1,
        length = arguments.length,
        deep = false;
    if (typeof target === 'boolean') {
      deep = target;
      target = arguments[1] || {};
      i = 2;
    } else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
      target = {};
    }
    for (; i < length; ++i) {
      options = arguments[i];
      if (options != null) {
        for (name in options) {
          src = target[name];
          copy = options[name];
          if (target !== copy) {
            if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
              if (copyIsArray) {
                copyIsArray = false;
                clone = src && isArray(src) ? src : [];
              } else {
                clone = src && isPlainObject(src) ? src : {};
              }
              target[name] = extend(deep, clone, copy);
            } else if (typeof copy !== 'undefined') {
              target[name] = copy;
            }
          }
        }
      }
    }
    return target;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("lib/mocha/interface.js", ["lib/mocha/details.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("lib/mocha/details.js");
  function AbecedaryInterface(suite) {
    var bdd = Mocha.interfaces['bdd'];
    bdd(suite);
    var suites = [suite];
    suite.on('pre-require', function(context, file, mocha) {
      context.details = function(title, fn) {
        var suite = suites[0];
        suite = suite && suite.suites && suite.suites.length > 0 ? suite.suites[0] : suite;
        if (suite.pending)
          var fn = null;
        if (!fn) {
          fn = title;
          title = null;
        }
        var test = new Mocha.Details(title, fn);
        suite.addTest(test);
        return test;
      };
    });
  }
  module.exports = AbecedaryInterface;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("lib/mocha/reporter.js", ["lib/mocha/details.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("lib/mocha/details.js");
  function cleanObject(error, index, depth) {
    var response = {};
    if (error instanceof Error) {
      var error = JSON.parse(JSON.stringify(error, ['message', 'name', 'stack', 'line', 'column', 'description']));
      return generateStacktraceAndPosition(error);
    }
    for (var key in error) {
      try {
        if (key[0] == "_" || key[0] == "$" || key == 'ctx' || key == 'parent') {} else if (typeof(error[key]) == 'string' || typeof(error[key]) == 'number') {
          response[key] = error[key];
        } else if (typeof(error[key]) == 'object') {
          response[key] = cleanObject(error[key], index, depth + 1);
        }
      } catch (e) {
        response[key] = 'Unable to process this result.';
      }
    }
    ;
    return response;
  }
  function AbecedaryReporter(runner) {
    Mocha.reporters.Base.call(this, runner);
    var self = this,
        tests = [],
        failures = [],
        passes = [],
        details = {};
    runner.on('test end', function(test) {
      tests.push(test);
    });
    runner.on('pass', function(test) {
      if (test.type == 'details') {
        try {
          if (test.title) {
            details[test.title] = test.results;
          } else if (test.results) {
            for (var result in test.results) {
              details[result] = test.results[result];
            }
          }
        } catch (e) {}
      } else {
        passes.push(test);
      }
    });
    runner.on('fail', function(test) {
      failures.push(test);
    });
    runner.on('end', function() {
      var data = {
        stats: self.stats,
        tests: tests.map(cleanObject),
        failures: failures.map(cleanObject),
        passes: passes.map(cleanObject),
        details: details
      };
      stuffEmit('finished', data);
    });
  }
  function F() {}
  ;
  F.prototype = Mocha.reporters.Base.prototype;
  AbecedaryReporter.prototype = new F;
  AbecedaryReporter.prototype.constructor = AbecedaryReporter;
  module.exports = AbecedaryReporter;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("lib/mocha/details.js", ["npm:mocha@2.2.5.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("npm:mocha@2.2.5.js");
  Mocha.Details = function(title, fn) {
    var self = this;
    var resultsFn = function() {
      self.results = fn.call();
    };
    Mocha.Runnable.call(this, title, resultsFn);
    this.pending = !resultsFn;
    this.type = 'details';
  };
  Mocha.Details.prototype.__proto__ = Mocha.Runnable.prototype;
  module.exports = mocha;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:extend@3.0.0.js", ["npm:extend@3.0.0/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:extend@3.0.0/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("lib/mocha/runner.js", ["lib/mocha/details.js", "options.js", "npm:extend@3.0.0.js", "lib/mocha/interface.js", "lib/mocha/reporter.js", "tests.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var mocha = require("lib/mocha/details.js"),
      options = require("options.js"),
      extend = require("npm:extend@3.0.0.js"),
      AbecedaryInterface = require("lib/mocha/interface.js"),
      AbecedaryReporter = require("lib/mocha/reporter.js");
  module.exports = function() {
    mocha.suite.suites.splice(0, mocha.suite.suites.length);
    mocha.suite.tests.splice(0, mocha.suite.tests.length);
    Mocha.interfaces['abecedary-interface'] = AbecedaryInterface;
    mocha.setup(extend({
      ui: 'abecedary-interface',
      reporter: AbecedaryReporter
    }, options.mocha));
    try {
      require("tests.js")();
    } catch (error) {
      rethrow(error);
    }
    return mocha.run();
  };
  global.define = __define;
  return module.exports;
});

//# sourceMappingURL=mocha-runner.js.map
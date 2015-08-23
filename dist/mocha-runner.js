/* global Error, System, module */

var mocha = require('mocha');

Mocha.Details = function(title, fn) {
  var self = this;
  var resultsFn = function() {
    self.results = fn.apply(null, arguments);
  };
  Mocha.Runnable.call(this, title, resultsFn);
  this.pending = !resultsFn;
  this.type = 'details';
};
var DetailsCtor = function () {};
DetailsCtor.prototype = Mocha.Runnable.prototype;
Mocha.Details.prototype = new DetailsCtor();
Mocha.Details.prototype.constructor = Mocha.Details;

// Deep clone that only grabs strings and numbers
function cleanObject(error, index, depth) {
  var response = {};

  if(error instanceof Error) {
    var error = JSON.parse(JSON.stringify(error, ['message', 'name', 'stack', 'line', 'column', 'description']));
    return generateStacktraceAndPosition(error);
  }

  for(var key in error) {
    try {
      if(key[0] === "_" || key[0] === "$" || key === 'ctx' || key === 'parent') {
        // Skip underscored variables
      } else if(typeof(error[key]) === 'string' || typeof(error[key]) === 'number') {
        response[key] = error[key];
      } else if(typeof(error[key]) === 'object') {
        response[key] = cleanObject(error[key], index, depth + 1);
      }
    } catch(e) {
      response[key] = 'Unable to process this result.';
    }
  };

  return response;
}

function AbecedaryReporter(runner) {
  Mocha.reporters.Base.call(this, runner);

  var self = this,
    tests = [],
    failures = [],
    passes = [],
    details = {};

  runner.on('test end', function(test){
    tests.push(test);
  });

  runner.on('pass', function(test){
    if (test.type === 'details') {
      try {
        if(test.title) {
          details[test.title] = test.results;
        } else if(test.results) {
          for(var result in test.results) {
            details[result] = test.results[result];
          }
        }
      } catch(e) {}
    }
    else {
      passes.push(test);
    }
  });

  runner.on('fail', function(test){
    failures.push(test);
  });

  runner.on('end', function(){
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
function F(){};
F.prototype =  Mocha.reporters.Base.prototype;
AbecedaryReporter.prototype = new F;
AbecedaryReporter.prototype.constructor = AbecedaryReporter;

function AbecedaryInterface(suite) {
  var bdd = Mocha.interfaces['bdd'];
  bdd(suite);

  var suites = [suite];
  suite.on('pre-require', function(context, file, mocha) {
    /**
     Passes details up to the finalized report object
     with the given info key.
     */
    context.details = function(title, fn) {
      var suite = suites[0];
      suite = suite && suite.suites && suite.suites.length > 0 ? suite.suites[0] : suite;
      if (suite.pending) var fn = null;
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
Mocha.interfaces['abecedary-interface'] = AbecedaryInterface;

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

module.exports = function(options, code, globals) {
  return new Promise(function(resolve, reject){
    // Clear suites between runs.
    mocha.suite.suites.splice(0, mocha.suite.suites.length);
    mocha.suite.tests.splice(0, mocha.suite.tests.length);

    // Setup mocha
    mocha.setup({ui: 'abecedary-interface', reporter: AbecedaryReporter});
    mocha.setup(options);

    setupGlobals(code, globals);

    // Run Tests
    System.import('tests')
    .then(function() {
      mocha.run(function() {
        tearDownGlobals(code, globals);
        resolve();
      });
    })
    .catch(function(error) {
      tearDownGlobals(code, globals);
      reject(error);
    });
  });

};

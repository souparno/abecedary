require('./details');

// Deep clone that only grabs strings and numbers
function cleanObject(error, index, depth) {
  var response = {};

  if(error instanceof Error) {
    var error = JSON.parse(JSON.stringify(error, ['message', 'name', 'stack', 'line', 'column', 'description']));
    return generateStacktraceAndPosition(error);
  }

  for(var key in error) {
    try {
      if(key[0] == "_" || key[0] == "$" || key == 'ctx' || key == 'parent') {
        // Skip underscored variables
      } else if(typeof(error[key]) == 'string' || typeof(error[key]) == 'number') {
        response[key] = error[key];
      } else if(typeof(error[key]) == 'object') {
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
    if (test.type == 'details') {
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
AbecedaryReporter.prototype.constructor = AbecedaryReporter

module.exports = AbecedaryReporter;
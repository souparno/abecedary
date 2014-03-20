// This file should be included in the iFrame is running your mocha tests
// Include it after Mocha

if(!eval && execScript) {
  execScript("null");
}

// Deep clone that only grabs strings and numbers
function cleanObject(error, depth) {
  if(!error || depth > 5) { return null; }

  depth = depth || 0;

  var response = {};
  for(var key in error) {
    try {
      if(key[0] == "_" || key[0] == "$" || key == 'ctx' || key == 'parent') {
        // Skip underscored variables
      } else if(typeof(error[key]) == 'string' || typeof(error[key]) == 'number') {
        response[key] = error[key];
      } else if(typeof(error[key]) == 'object') {
        response[key] = cleanObject(error[key], depth + 1)
      }
    } catch(e) {
      response[key] = 'Unable to process this result.'
    }
  };

  return response;
}

function AbecedaryReporter(runner) {
  var self = this;
  Mocha.reporters.Base.call(this, runner);
  var tests = [], failures = [], passes = [];

  runner.on('test end', function(test){
    tests.push(test);
  });

  runner.on('pass', function(test){
    passes.push(test);
  });

  runner.on('fail', function(test){
    failures.push(test);
  });

  runner.on('end', function(){
    var data = {
        stats: self.stats, 
        tests: tests.map(cleanObject),
        failures: failures.map(cleanObject),
        passes: passes.map(cleanObject)
    };
    window.parent.stuffEmit('finished', data);
  });
}
function F(){};
F.prototype =  Mocha.reporters.Base.prototype;
AbecedaryReporter.prototype = new F;
AbecedaryReporter.prototype.constructor = AbecedaryReporter

mocha.globals(['code']);

window.parent.stuffEmit('loaded');

this.mocha.setup({ reporter: AbecedaryReporter });
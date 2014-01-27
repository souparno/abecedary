if(!eval && execScript) {
  execScript("null");
}

function clean(test) {
  return {
      title: test.title
    , fullTitle: test.fullTitle()
    , duration: test.duration
  }
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
        tests: tests.map(clean),
        failures: failures.map(clean),
        passes: passes.map(clean)
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
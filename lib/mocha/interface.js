require('./details');

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
    }
  });
}

module.exports = AbecedaryInterface;
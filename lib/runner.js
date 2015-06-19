// This runs the code in the stuff.js iframe
// There is some error handling in here in case the tests themselves throw an erorr

module.exports = function(code, tests, globals) {
  if (!globals) {
    globals = {};
  }
  return [
    'try {',
    '  window.code = JSON.parse('+JSON.stringify(JSON.stringify(code))+');',
    '  var globals = JSON.parse('+JSON.stringify(JSON.stringify(globals))+');',
    '  for (var property in globals) {',
    '    window[property] = globals[property];',
    '  }',
    '  mocha.suite.suites.splice(0, mocha.suite.suites.length)',
    '',
    '// Begin Tests',
    tests,
    '// End Tests',
    '',
    '  window.mocha.run();', 
    '} catch(e) {', 
    '  rethrow(e, JSON.parse('+JSON.stringify(JSON.stringify(tests))+'), 6);',
    '}',
    true
  ].join('\n');
}

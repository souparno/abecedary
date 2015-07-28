// This runs the code in the stuff.js iframe
// There is some error handling in here in case the tests themselves throw an erorr
function generateTestWrapper(globals, tests) {
  var argumentList = [],
      argumentValues = [];
  for (var property in globals) {
    argumentList.push(property);
    argumentValues.push('globals.' + property);
  }
  return [
    'var tests,',
    '    code = require("code"),',
    '    globals = require("globals");',
    '(function(' + argumentList.join(',') + ') {',
    '  tests = function() {',
    '    try {',
           tests,
    '    } catch(e) {',
    '      rethrow(e, ' + JSON.stringify(JSON.stringify(tests)) + ', 0);',
    '    }',
    '  };',
    '})(' + argumentValues.join(',') + ');',
    'module.exports = tests;'
  ].join('\n');
}
module.exports = function(options, code, tests, globals) {
  if (!globals) {
    globals = {};
  }
  return [
    'try {',
    '  window.define = System.amdDefine;',
    '  window.require = window.requirejs = System.amdRequire;',
    '',
    '  var systemNormalize = System.normalize;',
    '  System.normalize = function(name, parentName, parentAddress) {',
    '    if ("tests" == name) {',
    '      return name;',
    '    }',
    '    return systemNormalize.apply(this, arguments);',
    '  };',
    '  var systemFetch = System.fetch;',
    '  System.fetch = function(load) {',
    '    if ("tests" == load.name) {',
    '      return new Promise(function(resolve, reject) {',
    '        resolve(' + JSON.stringify(generateTestWrapper(globals, tests)) + ');',
    '      });',
    '    }',
    '    return systemFetch.apply(this, arguments);',
    '  };',
    '',
    '  var options = JSON.parse('+JSON.stringify(JSON.stringify(options))+');',
    '  System.config(options.systemjs);',
    '',
    '  define("options", function(require, exports, module) {',
    '    return options;',
    '  });',
    '',
    '  define("code", function(require, exports, module) {',
    '    return JSON.parse('+JSON.stringify(JSON.stringify(code))+');',
    '  });',
    '',
    '  define("globals", function(require, exports, module) {',
    '    return JSON.parse('+JSON.stringify(JSON.stringify(globals))+');',
    '  });',
    '',
    '  System.import("runner").then(function(runner) {',
    '    runner();',
    '    System.normalize = systemNormalize;',
    '    System.fetch = systemFetch;',
    '    System.normalize("runner").then(function(name) {',
    '      System.delete(name);',
    '    });',
    '    System.normalize("tests").then(function(name) {',
    '      System.delete(name);',
    '    });',
    '    System.normalize("code").then(function(name) {',
    '      System.delete(name);',
    '    });',
    '  });',
    '',
    '} catch(e) {',
    '  rethrow(e, JSON.parse('+JSON.stringify(JSON.stringify(tests))+'), 6);',
    '}'
  ].join('\n');
}

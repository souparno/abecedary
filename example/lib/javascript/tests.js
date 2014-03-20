module.exports = 'var assert = require(\'chai\').assert,\n    sinon = require(\'sinon\'),\n    Sandbox = require(\'javascript-sandbox\'),\n    jshint = require(\'jshint\').JSHINT;\n\ndescribe(\'add\', function() {\n  var sandbox;\n\n  beforeEach(function() {\n    try {\n      sandbox = new Sandbox();\n      sandbox.evaluate(code);\n    } catch(e) {}\n  });\n  \n  afterEach(function() {\n    sandbox.destroy();\n  });\n\n  it("Looks like there\'s a syntax error in your code.", function() {\n    if(!jshint(code)) { throw jshint.errors[0]; }\n  });\n\n  it(\'Be sure to define a function named `add`.\', function() {\n    assert(typeof sandbox.get(\'add\') === \'function\');\n  });\n\n  it(\'Your `add` function should take in two arguments.\', function() {\n    assert(sandbox.get(\'add\').length === 2);\n  });\n  \n  it(\'`add` should return the result of adding the two arguments.\', function() {\n    var result = sandbox.exec(function() { return this.add(40,2) });\n    assert(result === 42);\n  });\n});';
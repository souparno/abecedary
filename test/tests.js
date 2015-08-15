var assert = chai.assert,
    iframeUrl = "http://" + window.location.host + "/dist/iframe.html";

describe("Legacy Abecedary", function() {
  var iframeContent = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<title>Sandbox</title>',
        '<base href="http://' + window.location.host + '">',
        '<link rel="stylesheet" href="http://' + window.location.host + '/node_modules/mocha/mocha.css" />',
        '</head>',
        '<body>',
        '<script src="node_modules/mocha/mocha.js"></script>',
        '<script src="dist/reporter.js"></script>',
        '</body>',
        '</html>'
      ].join('\n');

  describe('new', function() {
    runTests(iframeUrl, iframeContent, beforeEach, afterEach, {});
  });

  describe('recycled', function() {
    runTests(iframeUrl, iframeContent, before, after, {});
  });
});

describe("SystemJS Abecedary", function() {
  var iframeContent = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<title>Sandbox</title>',
        '<base href="http://' + window.location.host + '">',
        '</head>',
        '<body>',
        '<script src="node_modules/systemjs/dist/system.src.js"></script>',
        '<script src="test/config.js"></script>',
        '<script src="dist/abecedary-support.js"></script>',
        '</body>',
        '</html>'
      ].join('\n'),
      options = {
        systemjs: true
      };

  describe('new', function() {
    runTests(iframeUrl, iframeContent, beforeEach, afterEach, options);
    checkErrors(iframeUrl, iframeContent, beforeEach, afterEach, options);
  });

  describe('recycled', function() {
    runTests(iframeUrl, iframeContent, before, after, options);
    checkErrors(iframeUrl, iframeContent, before, after, options);
  });

  describe('es2015', function() {
    var sandbox;

    before(function() {
      sandbox = new Abecedary(iframeUrl, iframeContent, options);
    });

    after(function() {
      sandbox.removeAllListeners();
      sandbox.close();
    });

    it('runs code', function(done) {
      var code = "5",
          tests = [
            "import chai from 'chai';",
            "if (!chai) throw new Error('Import fail!');",
            "if (!code) throw new Error('Code fail!');"
          ].join('\n');
      sandbox.once('complete', function(data) {
        assert(data)
        done();
      });
      sandbox.once('error', function(error) {
        done(error);
      });
      sandbox.run(code, tests);
    });
  });
});

function runTests(iframeUrl, iframeContent, setup, teardown, options) {
  describe('sandbox', function() {
    var sandbox;

    setup(function() {
      sandbox = new Abecedary(iframeUrl, iframeContent, options);
    });

    teardown(function() {
      sandbox.removeAllListeners();
      sandbox.close();
    });

    it('is created', function() {
      assert(sandbox);
    });

    it('runs code', function(done) {
      var code = "5";
      var tests = "if (code != 5) throw new Error('The code was not 5');";
      sandbox.once('complete', function(data) {
        assert(data)
        done();
      });
      sandbox.once('error', function(error) {
        done(error);
      });
      sandbox.run(code, tests);
    });

    it('runs code with error', function(done) {
      var code = "4";
      var tests = "if (code != 5) throw new Error('The code was not 5');";
      sandbox.once('error', function(error) {
        assert(error);
        done();
      });
      sandbox.run(code, tests);
    });

    it('runs code with globals', function(done) {
      var code = "5";
      var tests = "if (subjects.indexOf('test1') != 0) throw new Error('The subjects did not contain \\'test1\\'.');";
      tests += "if (subjects.indexOf('test2') != 1) throw new Error('The subjects did not contain \\'test2\\'.');";
      var globals = {
        subjects: ['test1', 'test2']
      };
      sandbox.once('complete', function() {
        done();
      });
      sandbox.once('error', function(error) {
        done(error);
      });
      sandbox.run(code, tests, globals);
    });

    it('runs code with globals and error', function(done) {
      var code = "5";
      var tests = "if (subjects.indexOf('test1') != 0) throw new Error('The subjects did not contain \\'test1\\'.');";
      tests += "if (subjects.indexOf('test2') != 1) throw new Error('The subjects did not contain \\'test2\\'.');";
      var globals = {
        subjects: ['test1', 'test3']
      };
      sandbox.once('error', function() {
        done();
      });
      sandbox.run(code, tests, globals);
    });

    it('returns early on failure', function(done) {
      var code = "",
        tests = [
          "it('test1', function() {",
          "  // passes",
          "});",
          "it('test2', function() {",
          "  throw new Error('fails');",
          "});",
          "it('test3', function() {",
          "  throw new Error('fails');",
          "});"
        ].join('\n')
      sandbox.once("complete", function(report) {
        assert(report);
        assert(report.failures.length == 1);
        assert(report.passes.length == 1);
        done()
      });
      sandbox.run(code, tests);
    });

    it('returns details', function(done) {
      var code = "",
        tests = [
          "it('test1', function() {",
          "  // passes",
          "});",
          "details('details', function() {",
          "  return 'details';",
          "});"
        ].join('\n');
      sandbox.once("complete", function(report) {
        assert(report);
        assert(report.passes.length == 1);
        assert(report.details.details == 'details');
        done();
      });
      sandbox.run(code, tests);
    });
  });

  describe('sandbox with bail:false', function() {
    var sandbox;

    setup(function() {
      options.bail = false;
      sandbox = new Abecedary(iframeUrl, iframeContent, options);
    });

    teardown(function() {
      delete options.bail;
      sandbox.removeAllListeners();
      sandbox.close();
    });

    it('returns multiple results', function(done) {
      var code = "",
        tests = [
          "it('test1', function() {",
          "  // passes",
          "});",
          "it('test2', function() {",
          "  throw new Error('fails');",
          "});",
          "it('test3', function() {",
          "  throw new Error('fails');",
          "});"
        ].join('\n');
      sandbox.once("complete", function(report) {
        assert(report);
        assert(report.failures.length == 2);
        assert(report.passes.length == 1);
        done()
      });
      sandbox.run(code, tests);
    });

    it('returns details with multiple results', function(done) {
      var code = "",
        tests = [
          "it('test1', function() {",
          "  // passes",
          "});",
          "it('test2', function() {",
          "  throw new Error('fails');",
          "});",
          "details('details', function() {",
          "  return 'details';",
          "});"
        ].join('\n');
      sandbox.once("complete", function(report) {
        assert(report);
        assert(report.passes.length == 1);
        assert(report.failures.length == 1);
        assert(report.details.details == 'details');
        done();
      });
      sandbox.run(code, tests);
    });
  });
}

function checkErrors(iframeUrl, iframeContent, setup, teardown, options) {
  setup(function() {
    sandbox = new Abecedary(iframeUrl, iframeContent, options);
  });

  teardown(function() {
    sandbox.removeAllListeners();
    sandbox.close();
  });

  it('captures errors outside tests', function(done) {
    var code = "4";
    var tests = "if (code != 5) throw new Error('The code was not 5');";
    sandbox.once('error', function(error) {
      assert.equal(error.message, "Uncaught Error: The code was not 5");
      /*
      assert.equal(1, error.position.line);
      switch(detectStackTraceStyle()) {
        case 'safari':
          assert.equal("Error: The code was not 5", error.message);
          assert.equal(53, error.position.ch);
          break;
        case 'ie':
          assert.equal(16, error.position.ch);
          break;
        case 'firefox':
          assert.equal("Error: The code was not 5", error.message);
          assert.equal(21, error.position.ch);
          break;
        default:
          assert.equal("Uncaught Error: The code was not 5", error.message);
          assert.equal("Error", error.name);
          assert.equal(16, error.position.ch);
      }
      */
      done();
    });
    sandbox.run(code, tests);
  });

  it('captures errors inside tests', function(done) {
    var code = "4",
      tests = [
        "var assert = require('chai').assert;",
        "it('test1', function() {",
        "  assert.equals(code, 4);",
        "});"
      ].join('\n');
    sandbox.once("complete", function(report) {
      assert(report);
      assert(report.failures.length == 1);
      assert(report.failures[0].err);
      assert(report.failures[0].err.message);
      assert(report.failures[0].err.position);
      assert.equal(3, report.failures[0].err.position.line);
      switch(detectStackTraceStyle()) {
        case 'chrome':
          assert.equal("assert.equals is not a function", report.failures[0].err.message);
          assert.equal(10, report.failures[0].err.position.ch);
          break;
        case 'firefox':
          assert.equal("assert.equals is not a function", report.failures[0].err.message);
          assert.equal(3, report.failures[0].err.position.ch);
          break;
        case 'safari':
          assert.equal("undefined is not a function (evaluating \'assert.equals(code, 4)\')", report.failures[0].err.message);
          assert.equal(16, report.failures[0].err.position.ch);
          break;
      }
      done();
    });
    sandbox.once('error', function(error) {
      done(error);
    });
    sandbox.run(code, tests);
  });

  it('captures errors inside details', function(done) {
    var code = "4",
      tests = [
        "var assert = require('chai').assert;",
        "details('test1', function() {",
        "  assert.equals(code, 4);",
        "});"
      ].join('\n');
    sandbox.once("complete", function(report) {
      assert(report);
      assert(report.failures.length == 1);
      assert(report.failures[0].err);
      assert(report.failures[0].err.message);
      assert(report.failures[0].err.position);
      assert.equal(3, report.failures[0].err.position.line);
      switch(detectStackTraceStyle()) {
        case 'chrome':
          assert.equal("assert.equals is not a function", report.failures[0].err.message);
          assert.equal(10, report.failures[0].err.position.ch);
          break;
        case 'firefox':
          assert.equal("assert.equals is not a function", report.failures[0].err.message);
          assert.equal(3, report.failures[0].err.position.ch);
          break;
        case 'safari':
          assert.equal("undefined is not a function (evaluating \'assert.equals(code, 4)\')", report.failures[0].err.message);
          assert.equal(16, report.failures[0].err.position.ch);
          break;
      }
      done();
    });
    sandbox.once('error', function(error) {
      done(error);
    });
    sandbox.run(code, tests);
  });
}

function detectStackTraceStyle() {
  var style = "chrome";
  try {
    throw new Error("This is an error.");
  }
  catch (e) {
    stackArray = e.stack.split('\n');
    if (e.line != undefined) {
      style = 'safari';
    }
    else if (e.description != undefined) {
      style = 'ie';
    }
    else if (/(.*)(\d+):(\d+)$/.test(stackArray[0])) {
      style = 'firefox';
    }
  }
  return style;
}
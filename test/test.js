var assert = chai.assert;

describe("Abecedary", function() {
  var iframeUrl = "stuff.js/dist/secure/index.html",
      iframeContent = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<title>Sandbox</title>',
        '<base href="http://localhost:4000">',
        '</head>',
        '<body>',
        '<script src="systemjs/dist/system.src.js"></script>',
        '<script src="abecedary-support.js"></script>',
        '</body>',
        '</html>'
      ].join('\n'),
      systemjs = {
        'defaultJSExtensions': true,
        'map': {
          'abecedary-interface': 'abecedary-interface.js',
          'abecedary-reporter': 'abecedary-reporter.js',
          'runner': 'mocha-runner.js',
          'mocha-details': 'mocha-details.js',
          'mocha': 'mocha/mocha.js',
          'extend': 'extend/index.js',
          'chai': 'chai/chai.js'
        },
        'meta': {
          'mocha': {
            'format': 'global',
            'exports': 'mocha'
          }
        }
      };


  describe('sandbox', function() {
    var sandbox;

    before(function() {
      sandbox = new Abecedary(iframeUrl, iframeContent, {
        systemjs: systemjs
      });
    });

    after(function() {
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
      var tests = "if (subjects.indexOf('test1') != 0) throw new Error('The subjects did not contain \\'test1\\'.');\n";
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
      var tests = "if (subjects.indexOf('test1') != 0) throw new Error('The subjects did not contain \\'test1\\'.');\n";
      tests += "if (subjects.indexOf('test2') != 1) throw new Error('The subjects did not contain \\'test2\\'.');";
      var globals = {
        subjects: ['test1', 'test3']
      };
      sandbox.once('error', function(error) {
        assert.equal("Error", error.name);
        assert.equal("The subjects did not contain 'test2'.", error.message);
        assert.equal(2, error.position.line);
        switch(detectStackTraceStyle()) {
          case 'safari':
            assert.equal(95, error.position.ch);
            break;
          case 'ie':
            assert.equal(37, error.position.ch);
            break;
          default:
            assert.equal(43, error.position.ch);
        }
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
      sandbox.once('error', function(error) {
        done(error);
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
      sandbox.once('error', function(error) {
        done(error);
      });
      sandbox.run(code, tests);
    });
  });

  describe('sandbox with bail:false', function() {
    var sandbox;

    before(function() {
      sandbox = new Abecedary(iframeUrl, iframeContent, {
        systemjs: systemjs,
        'mocha': {
          'bail': false
        }
      });
    });

    after(function() {
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
      sandbox.once('error', function(error) {
        done(error);
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
      sandbox.once('error', function(error) {
        done(error);
      });
      sandbox.run(code, tests);
    });
  });

  describe('reused sandbox', function() {
    var sandbox;

    before(function() {
      sandbox = new Abecedary(iframeUrl, iframeContent, {
        systemjs: systemjs
      });
    });

    after(function() {
      sandbox.close();
    });

    it('runs test the first time', function(done) {
      var code = "5",
        tests = [
          "var assert = require('chai').assert;",
          "it('test1', function() {",
          "  assert.equal(code, 5);",
          "});"
        ].join('\n')
      sandbox.once("complete", function(report) {
        assert(report);
        assert(report.passes.length == 1);
        done()
      });
      sandbox.once('error', function(error) {
        done(error);
      });
      sandbox.run(code, tests);
    });

    it('runs tests a second time', function(done) {
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
  });
});

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
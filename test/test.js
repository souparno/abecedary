var assert = chai.assert;

describe("Abecedary", function() {
  var iframeUrl = "http://localhost:4000/stuff.js/dist/secure/index.html",
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

    beforeEach(function() {
      sandbox = new Abecedary(iframeUrl, iframeContent, {
        systemjs: systemjs
      });
    });

    afterEach(function() {
      sandbox.removeAllListeners();
      sandbox.close();
    });

    it('is created', function() {
      assert(sandbox);
    });

    it('runs code', function(done) {
      var code = "5";
      var tests = "if (code != 5) throw new Error('The code was not 5');";
      sandbox.run(code, tests);
      sandbox.on('complete', function(data) {
        assert(data)
        done();
      });
      sandbox.on('error', function(error) {
        done(error);
      });
    });

    it('runs code with error', function(done) {
      var code = "4";
      var tests = "if (code != 5) throw new Error('The code was not 5');";
      sandbox.on('error', function(error) {
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
      sandbox.on('complete', function() {
        done();
      });
      sandbox.on('error', function(error) {
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
      sandbox.on('error', function() {
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
      sandbox.on("complete", function(report) {
        assert(report);
        assert(report.failures.length == 1);
        assert(report.passes.length == 1);
        done()
      });
      sandbox.on('error', function(error) {
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
      sandbox.on("complete", function(report) {
        assert(report);
        assert(report.passes.length == 1);
        assert(report.details.details == 'details');
        done();
      });
      sandbox.on('error', function(error) {
        done(error);
      });
      sandbox.run(code, tests);
    });
  });

  describe('sandbox with bail:false', function() {
    var sandbox;

    beforeEach(function() {
      sandbox = new Abecedary(iframeUrl, iframeContent, {
        systemjs: systemjs,
        'mocha': {
          'bail': false
        }
      });
    });

    afterEach(function() {
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
      sandbox.on("complete", function(report) {
        assert(report);
        assert(report.failures.length == 2);
        assert(report.passes.length == 1);
        done()
      });
      sandbox.on('error', function(error) {
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
      sandbox.on("complete", function(report) {
        assert(report);
        assert(report.passes.length == 1);
        assert(report.failures.length == 1);
        assert(report.details.details == 'details');
        done();
      });
      sandbox.on('error', function(error) {
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
      sandbox.removeAllListeners();
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
      sandbox.on("complete", function(report) {
        assert(report);
        assert(report.passes.length == 1);
        done()
      });
      sandbox.on('error', function(error) {
        done(error);
      });
      sandbox.run(code, tests);
    });

    it('runs tests a second time', function(done) {
      var code = "4",
        tests = [
          "var assert = require('chai').assert;",
          "it('test1', function() {",
          "  debugger;",
          "  assert.equal(code, 4);",
          "});"
        ].join('\n')
      sandbox.on("complete", function(report) {
        assert(report);
        assert(report.passes.length == 1);
        done()
      });
      sandbox.on('error', function(error) {
        done(error);
      });
      sandbox.run(code, tests);
    });
  });
});
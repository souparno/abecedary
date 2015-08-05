var assert = chai.assert;

describe("Legacy Abecedary", function() {
  var iframeUrl = "http://localhost:4000/dist/iframe.html",
      iframeContent = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<title>Sandbox</title>',
        '<link rel="stylesheet" href="http://localhost:4000/node_modules/mocha/mocha.css" />',
        '</head>',
        '<body>',
        '<script src="../node_modules/mocha/mocha.js"></script>',
        '<script src="http://localhost:4000/dist/reporter.js"></script>',
        '</body>',
        '</html>'
      ].join('\n');


  describe('sandbox', function() {
    var sandbox;

    beforeEach(function() {
      sandbox = new Abecedary(iframeUrl, iframeContent, {});
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
      sandbox.run(code, tests);
      sandbox.on('error', function(error) {
        assert(error);
        done();
      });
    });

    it('runs code with globals', function(done) {
      var code = "5";
      var tests = "if (subjects.indexOf('test1') != 0) throw new Error('The subjects did not contain \\'test1\\'.');";
      tests += "if (subjects.indexOf('test2') != 1) throw new Error('The subjects did not contain \\'test2\\'.');";
      var globals = {
        subjects: ['test1', 'test2']
      };
      sandbox.run(code, tests, globals);
      sandbox.on('complete', function() {
        done();
      });
      sandbox.on('error', function(error) {
        done(error);
      });
    });

    it('runs code with globals and error', function(done) {
      var code = "5";
      var tests = "if (subjects.indexOf('test1') != 0) throw new Error('The subjects did not contain \\'test1\\'.');";
      tests += "if (subjects.indexOf('test2') != 1) throw new Error('The subjects did not contain \\'test2\\'.');";
      var globals = {
        subjects: ['test1', 'test3']
      };
      sandbox.run(code, tests, globals);
      sandbox.on('error', function() {
        done();
      });
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
      sandbox.run(code, tests);
      sandbox.on("complete", function(report) {
        assert(report);
        assert(report.failures.length == 1);
        assert(report.passes.length == 1);
        done()
      });
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
      sandbox.run(code, tests);
      sandbox.on("complete", function(report) {
        assert(report);
        assert(report.passes.length == 1);
        assert(report.details.details == 'details');
        done();
      });
    });
  });

  describe('sandbox with bail:false', function() {
    var sandbox;

    beforeEach(function() {
      sandbox = new Abecedary(iframeUrl, iframeContent, {bail: false});
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
      sandbox.run(code, tests);
      sandbox.on("complete", function(report) {
        assert(report);
        assert(report.failures.length == 2);
        assert(report.passes.length == 1);
        done()
      });
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
      sandbox.run(code, tests);
      sandbox.on("complete", function(report) {
        assert(report);
        assert(report.passes.length == 1);
        assert(report.failures.length == 1);
        assert(report.details.details == 'details');
        done();
      });
    });
  });
});
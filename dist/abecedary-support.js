if(!eval && execScript) {
  execScript("null");
}

(function(window, parent) {
  window.stuffEmit = parent.stuffEmit;

  window.generateStacktraceAndPosition = function(error) {
    var safeError = {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        stack = error.stack.split('\n'),
        lineNumber = /(.*)(\d+):(\d+)\)$/;

    if (lineNumber.test(stack[1])) {
      // Rewrite the stack info.
      var matches = lineNumber.exec(stack[1]),
        fixedLineNumber = parseInt(matches[2], 10) - 2,
        linePosition = parseInt(matches[3], 10);
      stack[1] = stack[1].replace(lineNumber, "$1" + fixedLineNumber +":$3");

      safeError.position = {
        line: fixedLineNumber,
        ch: linePosition
      };
      safeError.stack = stack.join('\n');
    }
    return safeError;
  };

  window.onerror = function(error) {
    stuffEmit("error", generateStacktraceAndPosition(error));
  };

  window.rethrow = function(e) {
    stuffEmit("error", generateStacktraceAndPosition(e));
  };

  stuffEmit('loaded');
})(window, window.parent)
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
        matches,
        fixedLineNumber,
        linePosition,
        stack = error.stack.split('\n'),
        sansParensStack = /([^\d]*)(\d+):(\d+)$/,
        parensStack = /([^\d])(\d+):(\d+)\)$/,
        offset = 4;

    // Safari
    if (error.line != undefined) {
      fixedLineNumber = error.line - offset;
      linePosition = error.column;
    }
    // Firefox
    else if (sansParensStack.test(stack[0])) {
      matches = sansParensStack.exec(stack[0]);
      fixedLineNumber = parseInt(matches[2], 10) - offset;
      linePosition = parseInt(matches[3], 10);
      stack[0] = stack[0].replace(sansParensStack, "$1" + fixedLineNumber +":$3");
    }
    // IE
    else if (error.description != undefined) {
      matches = parensStack.exec(stack[1]);
      fixedLineNumber = parseInt(matches[2], 10) - offset;
      linePosition = parseInt(matches[3], 10);
      stack[1] = stack[1].replace(parensStack, "$1" + fixedLineNumber +":$3");
    }
    // Chrome
    else if (sansParensStack.test(stack[1])) {
      matches = sansParensStack.exec(stack[1]);
      fixedLineNumber = parseInt(matches[2], 10) - offset;
      linePosition = parseInt(matches[3], 10);
      stack[1] = stack[1].replace(sansParensStack, "$1" + fixedLineNumber +":$3");
    }
    // Also Chrome, depending on where the error happened.
    else if (parensStack.test(stack[1])) {
      matches = parensStack.exec(stack[1]);
      fixedLineNumber = parseInt(matches[2], 10) - offset;
      linePosition = parseInt(matches[3], 10);
      stack[1] = stack[1].replace(sansParensStack, "$1" + fixedLineNumber +":$3");
    }

    safeError.position = {
      line: fixedLineNumber,
      ch: linePosition
    };
    safeError.stack = stack.join('\n');
    return safeError;
  };

  window.rethrow =
  window.onerror = function(error) {
    stuffEmit("error", generateStacktraceAndPosition(error));
  };

  stuffEmit('loaded');
})(window, window.parent)
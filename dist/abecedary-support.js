if(!eval && execScript) {
  execScript("null");
}

function normalizeErrorInfo(positionRegex, stackLines, index) {
  var matches = positionRegex.exec(stackLines[index]),
      line = parseInt(matches[2], 10),
      ch = parseInt(matches[3], 10);

  // Rewrite stack lines
  stackLines[index] = stackLines[index].replace(positionRegex, "$1" + line +":$3")

  return {
    line: line,
    ch: ch,
    stack: stackLines.join('\n')
  }
}

(function(window, parent) {
  window.stuffEmit = parent.stuffEmit;

  window.generateStacktraceAndPosition = function(error) {
    var stack = error.stack.split('\n'),
        sansParensStack = /([^\d]*)(\d+):(\d+)$/,
        parensStack = /([^\d])(\d+):(\d+)\)$/,
        normalizedErrorInfo = {};

    // Safari
    if (error.line != undefined) {
      normalizedErrorInfo = {
        line: error.line,
        ch: error.column,
        stack: error.stack
      }
    }
    // Firefox
    else {
      if (sansParensStack.test(stack[0])) {
        normalizedErrorInfo = normalizeErrorInfo(sansParensStack, stack, 0);
      }
      // IE
      else if (error.description != undefined) {
        normalizedErrorInfo = normalizeErrorInfo(parensStack, stack, 1);
      }
      // Chrome
      else if (sansParensStack.test(stack[1])) {
        normalizedErrorInfo = normalizeErrorInfo(sansParensStack, stack, 1);
      }
      // Also Chrome, depending on where the error happened.
      else if (parensStack.test(stack[1])) {
        normalizedErrorInfo = normalizeErrorInfo(parensStack, stack, 1);
      }
    }

    return {
      name: error.name,
      message: error.message,
      stack: normalizedErrorInfo.stack,
      position: {
        line: normalizedErrorInfo.line,
        ch: normalizedErrorInfo.ch
      }
    };
  };

  window.systemjsError = function(error) {
    var tokens = error.split(/\n\t?/),
        message = tokens.shift(),
        stack = tokens,
        errorObject = new Error(message);

    errorObject.stack = stack.join('\n\t');

    stuffEmit("error", window.generateStacktraceAndPosition(errorObject))
  };

  window.onerror = function(message, url, lineNumber, column, error) {
    var name,
        stack;
    if (error) {
      name = error.name;
      stack = error.stack;
    }
    stuffEmit("error", {
      name: name,
      message: message,
      stack: stack,
      position: {
        line: lineNumber,
        ch: column
      }
    });
  };

  stuffEmit('loaded');
})(window, window.parent)
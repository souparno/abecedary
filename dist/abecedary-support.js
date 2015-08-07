if(!eval && execScript) {
  execScript("null");
}

function normalizeErrorInfo(positionRegex, stackLines, index, offset) {
  var matches = positionRegex.exec(stackLines[index]),
      line = parseInt(matches[2], 10) - offset,
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
        linesOffset = 4,
        normalizedErrorInfo = {};

    // Safari
    if (error.line != undefined) {
      normalizedErrorInfo = {
        line: error.line - linesOffset,
        ch: error.column,
        stack: error.stack
      }
    }
    // Firefox
    else {
      if (sansParensStack.test(stack[0])) {
        normalizedErrorInfo = normalizeErrorInfo(sansParensStack, stack, 0, linesOffset);
      }
      // IE
      else if (error.description != undefined) {
        normalizedErrorInfo = normalizeErrorInfo(parensStack, stack, 1, linesOffset);
      }
      // Chrome
      else if (sansParensStack.test(stack[1])) {
        normalizedErrorInfo = normalizeErrorInfo(sansParensStack, stack, 1, linesOffset);
      }
      // Also Chrome, depending on where the error happened.
      else if (parensStack.test(stack[1])) {
        normalizedErrorInfo = normalizeErrorInfo(parensStack, stack, 1, linesOffset);
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

  window.rethrow =
  window.onerror = function(error) {
    stuffEmit("error", generateStacktraceAndPosition(error));
  };

  stuffEmit('loaded');
})(window, window.parent)
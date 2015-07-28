if(!eval && execScript) {
  execScript("null");
}

(function(window, parent) {
  window.stuffEmit = parent.stuffEmit;

  window.onerror = function(error) {
    debugger;
    stuffEmit("error", error);
  }

  function generateStackstrace(error, code) {
    var lines = code.split("\n");
    return [
      "" + error.name + ": "+ error.message,
      "  at line " + error.lineNumber+1 + ":" + error.columnNumber,
      "",
      ""+[error.lineNumber-1]+" : " + lines[error.lineNumber-2],
      ""+[error.lineNumber]+" : " + lines[error.lineNumber-1],
      ""+[error.lineNumber+1]+">: " + lines[error.lineNumber],
      ""+[error.lineNumber+2]+" : " + lines[error.lineNumber+1],
      ""+[error.lineNumber+3]+" : " + lines[error.lineNumber+2]
    ].join("\n");
  }


  window.rethrow = function(e, tests, offset) {
    debugger;
    error = e;
    try {
      if(window[e.name]) {
        var error = new window[e.name](e.message);
        error.type = e.type;
        error["arguments"] = e["arguments"];

        // Firefox
        if(e.lineNumber) { error.lineNumber = e.lineNumber - offset; }
        if(e.columnNumber) { error.columnNumber = e.columnNumber; }

        // Others
        if(!e.lineNumber || !e.lineNumber) {
          var errorPosition = e.stack.split("\n")[1].match(/(\d+):(\d+)\)$/);
          error.lineNumber = errorPosition[1] - offset;
          error.columnNumber = +errorPosition[2];
        }

        if(error.lineNumber) {
          error.stack = generateStackstrace(error, tests);
        }
      }
    } catch(error) {
      error = e;
    } finally {
      stuffEmit("error", error);
    }
  }

  stuffEmit('loaded');
})(window, window.parent)
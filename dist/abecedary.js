(function(global) {

  var defined = {};

  // indexOf polyfill for IE8
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  function dedupe(deps) {
    var newDeps = [];
    for (var i = 0, l = deps.length; i < l; i++)
      if (indexOf.call(newDeps, deps[i]) == -1)
        newDeps.push(deps[i])
    return newDeps;
  }

  function register(name, deps, declare) {
    if (arguments.length === 4)
      return registerDynamic.apply(this, arguments);
    doRegister(name, {
      declarative: true,
      deps: deps,
      declare: declare
    });
  }

  function registerDynamic(name, deps, executingRequire, execute) {
    doRegister(name, {
      declarative: false,
      deps: deps,
      executingRequire: executingRequire,
      execute: execute
    });
  }

  function doRegister(name, entry) {
    entry.name = name;

    // we never overwrite an existing define
    if (!(name in defined))
      defined[name] = entry; 

    entry.deps = dedupe(entry.deps);

    // we have to normalize dependencies
    // (assume dependencies are normalized for now)
    // entry.normalizedDeps = entry.deps.map(normalize);
    entry.normalizedDeps = entry.deps;
  }


  function buildGroups(entry, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];

      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;

      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {

        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, groups);
    }
  }

  function link(name) {
    var startEntry = defined[name];

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry);
        else
          linkDynamicModule(entry);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(global, function(name, value) {
      module.locked = true;
      exports[name] = value;

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          var importerIndex = indexOf.call(importerModule.dependencies, module);
          importerModule.setters[importerIndex](exports);
        }
      }

      module.locked = false;
      return value;
    });

    module.setters = declaration.setters;
    module.execute = declaration.execute;

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      else if (depEntry && !depEntry.declarative) {
        depExports = depEntry.esModule;
      }
      // in the module registry
      else if (!depEntry) {
        depExports = load(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else
        module.dependencies.push(null);

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name) {
    var exports;
    var entry = defined[name];

    if (!entry) {
      exports = load(name);
      if (!exports)
        throw new Error("Unable to load dependency " + name + ".");
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, []);

      else if (!entry.evaluated)
        linkDynamicModule(entry);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];

    return exports;
  }

  function linkDynamicModule(entry) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i]);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);

    if (output)
      module.exports = output;

    // create the esModule object, which allows ES6 named imports of dynamics
    exports = module.exports;
 
    if (exports && exports.__esModule) {
      entry.esModule = exports;
    }
    else {
      var hasOwnProperty = exports && exports.hasOwnProperty;
      entry.esModule = {};
      for (var p in exports) {
        if (!hasOwnProperty || exports.hasOwnProperty(p))
          entry.esModule[p] = exports[p];
      }
      entry.esModule['default'] = exports;
      entry.esModule.__useDefault = true;
    }
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen) {
    var entry = defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!defined[depName])
          load(depName);
        else
          ensureEvaluated(depName, seen);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(global);
  }

  // magical execution function
  var modules = {};
  function load(name) {
    if (modules[name])
      return modules[name];

    var entry = defined[name];

    // first we check if this module has already been defined in the registry
    if (!entry)
      throw "Module " + name + " not present.";

    // recursively ensure that the module and all its 
    // dependencies are linked (with dependency group handling)
    link(name);

    // now handle dependency execution in correct order
    ensureEvaluated(name, []);

    // remove from the registry
    defined[name] = undefined;

    // return the defined module object
    return modules[name] = entry.declarative ? entry.module.exports : entry.esModule;
  };

  return function(mains, declare) {
    return function(formatDetect) {
      formatDetect(function() {
        var System = {
          _nodeRequire: typeof require != 'undefined' && require.resolve && typeof process != 'undefined' && require,
          register: register,
          registerDynamic: registerDynamic,
          get: load, 
          set: function(name, module) {
            modules[name] = module; 
          },
          newModule: function(module) {
            return module;
          },
          'import': function() {
            throw new TypeError('Dynamic System.import calls are not supported for SFX bundles. Rather use a named bundle.');
          }
        };
        System.set('@empty', {});

        declare(System);

        var firstLoad = load(mains[0]);
        if (mains.length > 1)
          for (var i = 1; i < mains.length; i++)
            load(mains[i]);

        return firstLoad;
      });
    };
  };

})(typeof self != 'undefined' ? self : global)
/* (['mainModule'], function(System) {
  System.register(...);
})
(function(factory) {
  if (typeof define && define.amd)
    define(factory);
  // etc UMD / module pattern
})*/

(['lib/index.js'], function(System) {

(function(__global) {
  var hasOwnProperty = __global.hasOwnProperty;
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  function readMemberExpression(p, value) {
    var pParts = p.split('.');
    while (pParts.length)
      value = value[pParts.shift()];
    return value;
  }

  // bare minimum ignores for IE8
  var ignoredGlobalProps = ['_g', 'sessionStorage', 'localStorage', 'clipboardData', 'frames', 'external'];

  var globalSnapshot;

  function forEachGlobal(callback) {
    if (Object.keys)
      Object.keys(__global).forEach(callback);
    else
      for (var g in __global) {
        if (!hasOwnProperty.call(__global, g))
          continue;
        callback(g);
      }
  }

  function forEachGlobalValue(callback) {
    forEachGlobal(function(globalName) {
      if (indexOf.call(ignoredGlobalProps, globalName) != -1)
        return;
      try {
        var value = __global[globalName];
      }
      catch (e) {
        ignoredGlobalProps.push(globalName);
      }
      callback(globalName, value);
    });
  }

  System.set('@@global-helpers', System.newModule({
    prepareGlobal: function(moduleName, exportName, globals) {
      // set globals
      var oldGlobals;
      if (globals) {
        oldGlobals = {};
        for (var g in globals) {
          oldGlobals[g] = globals[g];
          __global[g] = globals[g];
        }
      }

      // store a complete copy of the global object in order to detect changes
      if (!exportName) {
        globalSnapshot = {};

        forEachGlobalValue(function(name, value) {
          globalSnapshot[name] = value;
        });
      }

      // return function to retrieve global
      return function() {
        var globalValue;

        if (exportName) {
          globalValue = readMemberExpression(exportName, __global);
        }
        else {
          var singleGlobal;
          var multipleExports;
          var exports = {};

          forEachGlobalValue(function(name, value) {
            if (globalSnapshot[name] === value)
              return;
            if (typeof value == 'undefined')
              return;
            exports[name] = value;

            if (typeof singleGlobal != 'undefined') {
              if (!multipleExports && singleGlobal !== value)
                multipleExports = true;
            }
            else {
              singleGlobal = value;
            }
          });
          globalValue = multipleExports ? exports : singleGlobal;
        }

        // revert globals
        if (oldGlobals) {
          for (var g in oldGlobals)
            __global[g] = oldGlobals[g];
        }

        return globalValue;
      };
    }
  }));

})(typeof self != 'undefined' ? self : global);

System.registerDynamic("lib/systemjs-runner.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  module.exports = function Runner() {
    var self = this;
    function deleteModule(name) {
      System.normalize(name).then(function(name) {
        System.delete(name);
      });
    }
    ;
    function generateTestWrapper(tests, globals) {
      var argumentList = ['"require"', '"code"', '"globals"'],
          argumentValues = ['require', 'code', 'globals'];
      for (var property in globals) {
        argumentList.push('"' + property + '"');
        argumentValues.push('globals.' + property);
      }
      return function() {
        return ['var testFunction = Function(' + argumentList.join(', ') + ', ' + JSON.stringify(tests) + ');', 'var code = require(' + '"code"),', '    globals = require(' + '"globals");', 'module.exports = function() {', '  testFunction.apply(null, [' + argumentValues.join(',') + ']);', '};'].join('\n');
      };
    }
    this.setup = function(options) {
      System.config(options.systemjs);
      var systemNormalize = System.normalize;
      System.normalize = function(name, parentName, parentAddress) {
        if ("tests" == name) {
          return new Promise(function(resolve, reject) {
            resolve(name);
          });
        }
        return systemNormalize.apply(this, arguments);
      };
      var systemFetch = System.fetch;
      System.fetch = function(load) {
        if ("tests" == load.name) {
          return new Promise(function(resolve, reject) {
            resolve(self.testWrapper());
          });
        }
        return systemFetch.apply(this, arguments);
      };
      System.registerDynamic('options', [], false, function(require, exports, module) {
        module.exports = options;
      });
    };
    this.run = function(code, tests, globals) {
      self.testWrapper = generateTestWrapper(tests, globals);
      System.registerDynamic('code', [], false, function(require, exports, module) {
        module.exports = code;
      });
      System.registerDynamic('globals', [], false, function(require, exports, module) {
        module.exports = globals;
      });
      System.import('runner').then(function(runner) {
        runner();
        deleteModule('code');
        deleteModule('globals');
        deleteModule('tests');
        deleteModule('runner');
      });
    };
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:codeschool/stuff.js@0.3.0/lib/stuff.js", [], false, function(__require, __exports, __module) {
  var _retrieveGlobal = System.get("@@global-helpers").prepareGlobal(__module.id, null, null);
  (function() {
    ;
    (function(global) {
      'use strict';
      var iframes = [],
          noop = function() {};
      function stuff(url, options, cb) {
        if (typeof options === 'function') {
          cb = options;
          options = {};
        }
        if (!cb)
          cb = noop;
        var el = (options && options.nodeType === 1) ? options : options.el || document.querySelector('body');
        options.el = null;
        var iframe = document.createElement('iframe'),
            context = new Context(iframe, options);
        global.addEventListener('message', context.messageHandler.bind(context), false);
        iframes.push(iframe);
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('src', url);
        var once = false;
        function init() {
          context.handshake();
          if (!once) {
            cb(context);
            once = true;
          }
        }
        iframe.addEventListener('load', init, false);
        el.appendChild(iframe);
      }
      stuff.clear = function() {
        iframes.forEach(function(iframe) {
          var parent = iframe.parentElement;
          if (parent)
            parent.removeChild(iframe);
        });
        iframes = [];
      };
      function Context(iframe, options) {
        this.iframe = iframe;
        this.callbacks = {};
        this.eventQ = {
          load: [],
          evaljs: [],
          html: []
        };
        if (options.sandbox === true) {
          this.sandbox = 'allow-scripts allow-same-origin';
        } else if (typeof options.sandbox === 'string') {
          var sandbox = options.sandbox;
          if (sandbox.indexOf('allow-scripts') === -1)
            sandbox += ' allow-scripts';
          if (sandbox.indexOf('allow-same-origin') === -1)
            sandbox += ' allow-same-origin';
          this.sandbox = sandbox;
        } else {
          this.sandbox = null;
        }
        this.secret = Math.ceil(Math.random() * 999999999) + 1;
      }
      Context.prototype.handle = function(type, data) {
        var that = this,
            callbacks;
        if (type === 'custom') {
          var msg = data;
          callbacks = this.callbacks[msg.type] || [];
          callbacks.forEach(function(cb) {
            if (typeof cb === 'function')
              cb.call(cb.thisArg || that, msg.data);
          });
        } else {
          callbacks = this.eventQ[type];
          if (!callbacks)
            return;
          var cb = callbacks.shift();
          if (typeof cb === 'function')
            cb.call(cb.thisArg || that, data);
        }
      };
      Context.prototype.messageHandler = function(e) {
        var msg;
        try {
          msg = JSON.parse(e.data);
        } catch (err) {
          return;
        }
        if (msg.secret !== this.secret)
          return;
        var data = msg.data,
            type = msg.type;
        this.handle(type, data);
      };
      Context.prototype.post = function(type, data) {
        this.iframe.contentWindow.postMessage(JSON.stringify({
          type: type,
          data: data,
          secret: this.secret
        }), '*');
      };
      Context.prototype.evaljs = function(js, cb, thisArg) {
        var callback = function(d) {
          var e = d.error,
              error = e,
              Type;
          if (e && (Type = global[e.__errorType__])) {
            error = new Type(e.message);
            error.stack = e.stack;
            error.type = e.type;
            error['arguments'] = e['arguments'];
          }
          (cb || noop).call(this, error, d.result);
        };
        callback.thisArg = thisArg;
        this.eventQ.evaljs.push(callback);
        this.post('evaljs', js);
      };
      Context.prototype.load = function(html, cb, thisArg) {
        cb = cb || noop;
        cb.thisArg = thisArg;
        this.eventQ.load.push(cb);
        this.post('load', html);
      };
      Context.prototype.html = function(cb, thisArg) {
        cb = cb || noop;
        cb.thisArg = thisArg;
        this.eventQ.html.push(cb);
        this.post('html', null);
      };
      Context.prototype.handshake = function() {
        this.post('handshake', this.sandbox);
      };
      Context.prototype.on = function(event, cb, thisArg) {
        cb = cb || noop;
        cb.thisArg = thisArg;
        if (this.callbacks[event]) {
          this.callbacks[event].push(cb);
        } else {
          this.callbacks[event] = [cb];
        }
      };
      Context.prototype.off = function(event, cb) {
        var callbacks = this.callbacks[event];
        if (callbacks) {
          var i = callbacks.indexOf(cb);
          if (i !== -1)
            callbacks.splice(i, 1);
        } else {
          this.callbacks[event] = [];
        }
      };
      stuff.Context = Context;
      global.stuff = stuff;
    })(this);
  })();
  return _retrieveGlobal();
});

System.registerDynamic("npm:events@1.0.2/events.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function EventEmitter() {
    this._events = this._events || {};
    this._maxListeners = this._maxListeners || undefined;
  }
  module.exports = EventEmitter;
  EventEmitter.EventEmitter = EventEmitter;
  EventEmitter.prototype._events = undefined;
  EventEmitter.prototype._maxListeners = undefined;
  EventEmitter.defaultMaxListeners = 10;
  EventEmitter.prototype.setMaxListeners = function(n) {
    if (!isNumber(n) || n < 0 || isNaN(n))
      throw TypeError('n must be a positive number');
    this._maxListeners = n;
    return this;
  };
  EventEmitter.prototype.emit = function(type) {
    var er,
        handler,
        len,
        args,
        i,
        listeners;
    if (!this._events)
      this._events = {};
    if (type === 'error') {
      if (!this._events.error || (isObject(this._events.error) && !this._events.error.length)) {
        er = arguments[1];
        if (er instanceof Error) {
          throw er;
        }
        throw TypeError('Uncaught, unspecified "error" event.');
      }
    }
    handler = this._events[type];
    if (isUndefined(handler))
      return false;
    if (isFunction(handler)) {
      switch (arguments.length) {
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        default:
          len = arguments.length;
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          handler.apply(this, args);
      }
    } else if (isObject(handler)) {
      len = arguments.length;
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      listeners = handler.slice();
      len = listeners.length;
      for (i = 0; i < len; i++)
        listeners[i].apply(this, args);
    }
    return true;
  };
  EventEmitter.prototype.addListener = function(type, listener) {
    var m;
    if (!isFunction(listener))
      throw TypeError('listener must be a function');
    if (!this._events)
      this._events = {};
    if (this._events.newListener)
      this.emit('newListener', type, isFunction(listener.listener) ? listener.listener : listener);
    if (!this._events[type])
      this._events[type] = listener;
    else if (isObject(this._events[type]))
      this._events[type].push(listener);
    else
      this._events[type] = [this._events[type], listener];
    if (isObject(this._events[type]) && !this._events[type].warned) {
      var m;
      if (!isUndefined(this._maxListeners)) {
        m = this._maxListeners;
      } else {
        m = EventEmitter.defaultMaxListeners;
      }
      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
        if (typeof console.trace === 'function') {
          console.trace();
        }
      }
    }
    return this;
  };
  EventEmitter.prototype.on = EventEmitter.prototype.addListener;
  EventEmitter.prototype.once = function(type, listener) {
    if (!isFunction(listener))
      throw TypeError('listener must be a function');
    var fired = false;
    function g() {
      this.removeListener(type, g);
      if (!fired) {
        fired = true;
        listener.apply(this, arguments);
      }
    }
    g.listener = listener;
    this.on(type, g);
    return this;
  };
  EventEmitter.prototype.removeListener = function(type, listener) {
    var list,
        position,
        length,
        i;
    if (!isFunction(listener))
      throw TypeError('listener must be a function');
    if (!this._events || !this._events[type])
      return this;
    list = this._events[type];
    length = list.length;
    position = -1;
    if (list === listener || (isFunction(list.listener) && list.listener === listener)) {
      delete this._events[type];
      if (this._events.removeListener)
        this.emit('removeListener', type, listener);
    } else if (isObject(list)) {
      for (i = length; i-- > 0; ) {
        if (list[i] === listener || (list[i].listener && list[i].listener === listener)) {
          position = i;
          break;
        }
      }
      if (position < 0)
        return this;
      if (list.length === 1) {
        list.length = 0;
        delete this._events[type];
      } else {
        list.splice(position, 1);
      }
      if (this._events.removeListener)
        this.emit('removeListener', type, listener);
    }
    return this;
  };
  EventEmitter.prototype.removeAllListeners = function(type) {
    var key,
        listeners;
    if (!this._events)
      return this;
    if (!this._events.removeListener) {
      if (arguments.length === 0)
        this._events = {};
      else if (this._events[type])
        delete this._events[type];
      return this;
    }
    if (arguments.length === 0) {
      for (key in this._events) {
        if (key === 'removeListener')
          continue;
        this.removeAllListeners(key);
      }
      this.removeAllListeners('removeListener');
      this._events = {};
      return this;
    }
    listeners = this._events[type];
    if (isFunction(listeners)) {
      this.removeListener(type, listeners);
    } else {
      while (listeners.length)
        this.removeListener(type, listeners[listeners.length - 1]);
    }
    delete this._events[type];
    return this;
  };
  EventEmitter.prototype.listeners = function(type) {
    var ret;
    if (!this._events || !this._events[type])
      ret = [];
    else if (isFunction(this._events[type]))
      ret = [this._events[type]];
    else
      ret = this._events[type].slice();
    return ret;
  };
  EventEmitter.listenerCount = function(emitter, type) {
    var ret;
    if (!emitter._events || !emitter._events[type])
      ret = 0;
    else if (isFunction(emitter._events[type]))
      ret = 1;
    else
      ret = emitter._events[type].length;
    return ret;
  };
  function isFunction(arg) {
    return typeof arg === 'function';
  }
  function isNumber(arg) {
    return typeof arg === 'number';
  }
  function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
  }
  function isUndefined(arg) {
    return arg === void 0;
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-events@0.1.1/index.js", ["npm:events@1.0.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? System._nodeRequire('events') : require("npm:events@1.0.2.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:process@0.10.1/browser.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var process = module.exports = {};
  var queue = [];
  var draining = false;
  function drainQueue() {
    if (draining) {
      return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while (len) {
      currentQueue = queue;
      queue = [];
      var i = -1;
      while (++i < len) {
        currentQueue[i]();
      }
      len = queue.length;
    }
    draining = false;
  }
  process.nextTick = function(fun) {
    queue.push(fun);
    if (!draining) {
      setTimeout(drainQueue, 0);
    }
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = '';
  process.versions = {};
  function noop() {}
  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;
  process.binding = function(name) {
    throw new Error('process.binding is not supported');
  };
  process.cwd = function() {
    return '/';
  };
  process.chdir = function(dir) {
    throw new Error('process.chdir is not supported');
  };
  process.umask = function() {
    return 0;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:extend@3.0.0/index.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var hasOwn = Object.prototype.hasOwnProperty;
  var toStr = Object.prototype.toString;
  var isArray = function isArray(arr) {
    if (typeof Array.isArray === 'function') {
      return Array.isArray(arr);
    }
    return toStr.call(arr) === '[object Array]';
  };
  var isPlainObject = function isPlainObject(obj) {
    if (!obj || toStr.call(obj) !== '[object Object]') {
      return false;
    }
    var hasOwnConstructor = hasOwn.call(obj, 'constructor');
    var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
    if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
      return false;
    }
    var key;
    for (key in obj) {}
    return typeof key === 'undefined' || hasOwn.call(obj, key);
  };
  module.exports = function extend() {
    var options,
        name,
        src,
        copy,
        copyIsArray,
        clone,
        target = arguments[0],
        i = 1,
        length = arguments.length,
        deep = false;
    if (typeof target === 'boolean') {
      deep = target;
      target = arguments[1] || {};
      i = 2;
    } else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
      target = {};
    }
    for (; i < length; ++i) {
      options = arguments[i];
      if (options != null) {
        for (name in options) {
          src = target[name];
          copy = options[name];
          if (target !== copy) {
            if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
              if (copyIsArray) {
                copyIsArray = false;
                clone = src && isArray(src) ? src : [];
              } else {
                clone = src && isPlainObject(src) ? src : {};
              }
              target[name] = extend(deep, clone, copy);
            } else if (typeof copy !== 'undefined') {
              target[name] = copy;
            }
          }
        }
      }
    }
    return target;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:inherits@2.0.1/inherits_browser.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  if (typeof Object.create === 'function') {
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }});
    };
  } else {
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function() {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    };
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:codeschool/stuff.js@0.3.0.js", ["github:codeschool/stuff.js@0.3.0/lib/stuff.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:codeschool/stuff.js@0.3.0/lib/stuff.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:events@1.0.2.js", ["npm:events@1.0.2/events.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:events@1.0.2/events.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-events@0.1.1.js", ["github:jspm/nodelibs-events@0.1.1/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-events@0.1.1/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:process@0.10.1.js", ["npm:process@0.10.1/browser.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:process@0.10.1/browser.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:extend@3.0.0.js", ["npm:extend@3.0.0/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:extend@3.0.0/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:inherits@2.0.1.js", ["npm:inherits@2.0.1/inherits_browser.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:inherits@2.0.1/inherits_browser.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:domain-browser@1.1.4/index.js", ["github:jspm/nodelibs-events@0.1.1.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = (function() {
    var events = require("github:jspm/nodelibs-events@0.1.1.js");
    var domain = {};
    domain.createDomain = domain.create = function() {
      var d = new events.EventEmitter();
      function emitError(e) {
        d.emit('error', e);
      }
      d.add = function(emitter) {
        emitter.on('error', emitError);
      };
      d.remove = function(emitter) {
        emitter.removeListener('error', emitError);
      };
      d.bind = function(fn) {
        return function() {
          var args = Array.prototype.slice.call(arguments);
          try {
            fn.apply(null, args);
          } catch (err) {
            emitError(err);
          }
        };
      };
      d.intercept = function(fn) {
        return function(err) {
          if (err) {
            emitError(err);
          } else {
            var args = Array.prototype.slice.call(arguments, 1);
            try {
              fn.apply(null, args);
            } catch (err) {
              emitError(err);
            }
          }
        };
      };
      d.run = function(fn) {
        try {
          fn();
        } catch (err) {
          emitError(err);
        }
        return this;
      };
      d.dispose = function() {
        this.removeAllListeners();
        return this;
      };
      d.enter = d.exit = function() {
        return this;
      };
      return d;
    };
    return domain;
  }).call(this);
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-process@0.1.1/index.js", ["npm:process@0.10.1.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? process : require("npm:process@0.10.1.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:domain-browser@1.1.4.js", ["npm:domain-browser@1.1.4/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:domain-browser@1.1.4/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-process@0.1.1.js", ["github:jspm/nodelibs-process@0.1.1/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-process@0.1.1/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-domain@0.1.0/index.js", ["npm:domain-browser@1.1.4.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? System._nodeRequire('domain') : require("npm:domain-browser@1.1.4.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-domain@0.1.0.js", ["github:jspm/nodelibs-domain@0.1.0/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-domain@0.1.0/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:asap@2.0.3/raw.js", ["github:jspm/nodelibs-domain@0.1.0.js", "github:jspm/nodelibs-process@0.1.1.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    "use strict";
    var domain;
    var hasSetImmediate = typeof setImmediate === "function";
    module.exports = rawAsap;
    function rawAsap(task) {
      if (!queue.length) {
        requestFlush();
        flushing = true;
      }
      queue[queue.length] = task;
    }
    var queue = [];
    var flushing = false;
    var index = 0;
    var capacity = 1024;
    function flush() {
      while (index < queue.length) {
        var currentIndex = index;
        index = index + 1;
        queue[currentIndex].call();
        if (index > capacity) {
          for (var scan = 0,
              newLength = queue.length - index; scan < newLength; scan++) {
            queue[scan] = queue[scan + index];
          }
          queue.length -= index;
          index = 0;
        }
      }
      queue.length = 0;
      index = 0;
      flushing = false;
    }
    rawAsap.requestFlush = requestFlush;
    function requestFlush() {
      var parentDomain = process.domain;
      if (parentDomain) {
        if (!domain) {
          domain = require("github:jspm/nodelibs-domain@0.1.0.js");
        }
        domain.active = process.domain = null;
      }
      if (flushing && hasSetImmediate) {
        setImmediate(flush);
      } else {
        process.nextTick(flush);
      }
      if (parentDomain) {
        domain.active = process.domain = parentDomain;
      }
    }
  })(require("github:jspm/nodelibs-process@0.1.1.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:promise@7.0.3/lib/core.js", ["npm:asap@2.0.3/raw.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var asap = require("npm:asap@2.0.3/raw.js");
  function noop() {}
  var LAST_ERROR = null;
  var IS_ERROR = {};
  function getThen(obj) {
    try {
      return obj.then;
    } catch (ex) {
      LAST_ERROR = ex;
      return IS_ERROR;
    }
  }
  function tryCallOne(fn, a) {
    try {
      return fn(a);
    } catch (ex) {
      LAST_ERROR = ex;
      return IS_ERROR;
    }
  }
  function tryCallTwo(fn, a, b) {
    try {
      fn(a, b);
    } catch (ex) {
      LAST_ERROR = ex;
      return IS_ERROR;
    }
  }
  module.exports = Promise;
  function Promise(fn) {
    if (typeof this !== 'object') {
      throw new TypeError('Promises must be constructed via new');
    }
    if (typeof fn !== 'function') {
      throw new TypeError('not a function');
    }
    this._41 = 0;
    this._86 = null;
    this._17 = [];
    if (fn === noop)
      return;
    doResolve(fn, this);
  }
  Promise._1 = noop;
  Promise.prototype.then = function(onFulfilled, onRejected) {
    if (this.constructor !== Promise) {
      return safeThen(this, onFulfilled, onRejected);
    }
    var res = new Promise(noop);
    handle(this, new Handler(onFulfilled, onRejected, res));
    return res;
  };
  function safeThen(self, onFulfilled, onRejected) {
    return new self.constructor(function(resolve, reject) {
      var res = new Promise(noop);
      res.then(resolve, reject);
      handle(self, new Handler(onFulfilled, onRejected, res));
    });
  }
  ;
  function handle(self, deferred) {
    while (self._41 === 3) {
      self = self._86;
    }
    if (self._41 === 0) {
      self._17.push(deferred);
      return;
    }
    asap(function() {
      var cb = self._41 === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        if (self._41 === 1) {
          resolve(deferred.promise, self._86);
        } else {
          reject(deferred.promise, self._86);
        }
        return;
      }
      var ret = tryCallOne(cb, self._86);
      if (ret === IS_ERROR) {
        reject(deferred.promise, LAST_ERROR);
      } else {
        resolve(deferred.promise, ret);
      }
    });
  }
  function resolve(self, newValue) {
    if (newValue === self) {
      return reject(self, new TypeError('A promise cannot be resolved with itself.'));
    }
    if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
      var then = getThen(newValue);
      if (then === IS_ERROR) {
        return reject(self, LAST_ERROR);
      }
      if (then === self.then && newValue instanceof Promise) {
        self._41 = 3;
        self._86 = newValue;
        finale(self);
        return;
      } else if (typeof then === 'function') {
        doResolve(then.bind(newValue), self);
        return;
      }
    }
    self._41 = 1;
    self._86 = newValue;
    finale(self);
  }
  function reject(self, newValue) {
    self._41 = 2;
    self._86 = newValue;
    finale(self);
  }
  function finale(self) {
    for (var i = 0; i < self._17.length; i++) {
      handle(self, self._17[i]);
    }
    self._17 = null;
  }
  function Handler(onFulfilled, onRejected, promise) {
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.promise = promise;
  }
  function doResolve(fn, promise) {
    var done = false;
    var res = tryCallTwo(fn, function(value) {
      if (done)
        return;
      done = true;
      resolve(promise, value);
    }, function(reason) {
      if (done)
        return;
      done = true;
      reject(promise, reason);
    });
    if (!done && res === IS_ERROR) {
      done = true;
      reject(promise, LAST_ERROR);
    }
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:promise@7.0.3/lib/es6-extensions.js", ["npm:promise@7.0.3/lib/core.js", "npm:asap@2.0.3/raw.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var Promise = require("npm:promise@7.0.3/lib/core.js");
  var asap = require("npm:asap@2.0.3/raw.js");
  module.exports = Promise;
  var TRUE = valuePromise(true);
  var FALSE = valuePromise(false);
  var NULL = valuePromise(null);
  var UNDEFINED = valuePromise(undefined);
  var ZERO = valuePromise(0);
  var EMPTYSTRING = valuePromise('');
  function valuePromise(value) {
    var p = new Promise(Promise._1);
    p._41 = 1;
    p._86 = value;
    return p;
  }
  Promise.resolve = function(value) {
    if (value instanceof Promise)
      return value;
    if (value === null)
      return NULL;
    if (value === undefined)
      return UNDEFINED;
    if (value === true)
      return TRUE;
    if (value === false)
      return FALSE;
    if (value === 0)
      return ZERO;
    if (value === '')
      return EMPTYSTRING;
    if (typeof value === 'object' || typeof value === 'function') {
      try {
        var then = value.then;
        if (typeof then === 'function') {
          return new Promise(then.bind(value));
        }
      } catch (ex) {
        return new Promise(function(resolve, reject) {
          reject(ex);
        });
      }
    }
    return valuePromise(value);
  };
  Promise.all = function(arr) {
    var args = Array.prototype.slice.call(arr);
    return new Promise(function(resolve, reject) {
      if (args.length === 0)
        return resolve([]);
      var remaining = args.length;
      function res(i, val) {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          if (val instanceof Promise && val.then === Promise.prototype.then) {
            while (val._41 === 3) {
              val = val._86;
            }
            if (val._41 === 1)
              return res(i, val._86);
            if (val._41 === 2)
              reject(val._86);
            val.then(function(val) {
              res(i, val);
            }, reject);
            return;
          } else {
            var then = val.then;
            if (typeof then === 'function') {
              var p = new Promise(then.bind(val));
              p.then(function(val) {
                res(i, val);
              }, reject);
              return;
            }
          }
        }
        args[i] = val;
        if (--remaining === 0) {
          resolve(args);
        }
      }
      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };
  Promise.reject = function(value) {
    return new Promise(function(resolve, reject) {
      reject(value);
    });
  };
  Promise.race = function(values) {
    return new Promise(function(resolve, reject) {
      values.forEach(function(value) {
        Promise.resolve(value).then(resolve, reject);
      });
    });
  };
  Promise.prototype['catch'] = function(onRejected) {
    return this.then(null, onRejected);
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("lib/index.js", ["lib/systemjs-runner.js", "github:codeschool/stuff.js@0.3.0.js", "npm:events@1.0.2.js", "npm:promise@7.0.3/lib/es6-extensions.js", "npm:extend@3.0.0.js", "npm:inherits@2.0.1.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var runner = require("lib/systemjs-runner.js"),
      stuff = require("github:codeschool/stuff.js@0.3.0.js"),
      EventEmitter = require("npm:events@1.0.2.js").EventEmitter,
      Promise = require("npm:promise@7.0.3/lib/es6-extensions.js"),
      extend = require("npm:extend@3.0.0.js"),
      inherits = require("npm:inherits@2.0.1.js");
  function sanitize(obj) {
    return JSON.stringify(obj);
  }
  function Abecedary(iframeUrl, template, options) {
    var generateElement = function() {
      var element = document.createElement('div');
      element.style.cssText = 'display:none;';
      document.body.appendChild(element);
      return element;
    };
    this.options = options || {};
    this.iframeUrl = iframeUrl;
    this.template = template;
    this.options.mocha = extend({bail: true}, this.options.mocha);
    this.options.systemjs = this.options.systemjs || {};
    this.element = this.options.element || generateElement();
    delete(this.options.element);
    this.sandbox = new Promise(function(resolve, reject) {
      var self = this;
      stuff(this.iframeUrl, {el: this.element}, function(context) {
        context.on('finished', runComplete.bind(this));
        context.on('error', error.bind(this));
        context.on('loaded', function() {
          context.evaljs(runner.toString());
          context.evaljs('var runner = new Runner();');
          context.evaljs('runner.setup(' + sanitize(self.options) + ');');
          resolve(context);
        });
        context.load(this.template);
      }.bind(this));
    }.bind(this));
    var runComplete = function(report) {
      this.emit('complete', report);
    };
    var error = function(error) {
      this.emit('error', error, this);
    };
  }
  inherits(Abecedary, EventEmitter);
  Abecedary.prototype.run = function(code, tests, globals) {
    var self = this;
    this.sandbox.then(function(context) {
      try {
        context.evaljs('runner.run(' + sanitize(code) + ', ' + sanitize(tests) + ', ' + sanitize(globals) + ');');
      } catch (e) {
        self.emit('error', e);
      }
    });
  };
  Abecedary.prototype.close = function(data) {
    this.element.parentElement.removeChild(this.element);
  };
  module.exports = Abecedary;
  global.define = __define;
  return module.exports;
});

})
(function(factory) {
  factory();
});
//# sourceMappingURL=abecedary.js.map
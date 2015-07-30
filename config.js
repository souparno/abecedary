System.config({
  "baseURL": "/",
  "defaultJSExtensions": true,
  "transpiler": "none",
  "paths": {
    "github:*": "jspm_packages/github/*",
    "npm:*": "jspm_packages/npm/*"
  },
  "buildCSS": false
});

System.config({
  "meta": {
    "options": {
      "build": false
    },
    "tests": {
      "build": false
    },
    "npm:mocha@2.2.5.js": {
      "build": false
    }
  }
});

System.config({
  "map": {
    "chai": "github:chaijs/chai@3.2.0",
    "css": "github:systemjs/plugin-css@0.1.13",
    "events": "npm:events@1.0.2",
    "extend": "npm:extend@3.0.0",
    "inherits": "npm:inherits@2.0.1",
    "mocha": "npm:mocha@2.2.5",
    "promise": "npm:promise@7.0.3",
    "stuff.js": "github:codeschool/stuff.js@0.3.0",
    "github:jspm/nodelibs-domain@0.1.0": {
      "domain-browser": "npm:domain-browser@1.1.4"
    },
    "github:jspm/nodelibs-events@0.1.1": {
      "events": "npm:events@1.0.2"
    },
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "github:jspm/nodelibs-util@0.1.0": {
      "util": "npm:util@0.10.3"
    },
    "npm:asap@2.0.3": {
      "domain": "github:jspm/nodelibs-domain@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:domain-browser@1.1.4": {
      "events": "github:jspm/nodelibs-events@0.1.1"
    },
    "npm:inherits@2.0.1": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:mocha@2.2.5": {
      "css": "github:systemjs/plugin-css@0.1.13"
    },
    "npm:promise@7.0.3": {
      "asap": "npm:asap@2.0.3",
      "fs": "github:jspm/nodelibs-fs@0.1.2"
    },
    "npm:util@0.10.3": {
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.1"
    }
  }
});


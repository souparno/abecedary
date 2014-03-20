# abecedary-example

This includes a number of examples on how to use the [abecedary](https://github.com/codeschool/abecedary) library.


# Running

Install the `serve` gem, and run serve to serve this directory on port 4000.

```
$ gem install serve
$ serve
```

Open up [http://localhost:4000](http://localhost:4000) and you should see 2 CodeMirror panes up and running!

# Packaging

Each of the examples has its own packaged JavaScript file used for running its tests. These are packaged up using browserify and grunt.  To build one of these you can do the following:

```
$ cd lib/css
$ npm install -g browserify
$ npm install
$ grunt
```

This would generate the file `/build/demos/css.js` which includes the cssom library for parsing CSS for you to use in the tests.
module.exports = function(grunt) {

  grunt.initConfig({
    connect: {
      server: {
        options: {
          port: 4000
        }
      }
    },
    browserify: {
      abecedary: {
        src: ['lib/index.js'],
        dest: 'dist/abecedary.js',
        options: {
          browserifyOptions: {
            standalone: 'Abecedary'
          }
        }
      }
    },
    karma: {
      unit: {
        configFile: 'karma.conf.js',
        background: true
      },
      continuous: {
        configFile: 'karma.conf.js',
        singleRun: true,
        browsers: ['Chrome']
      }
    },
    watch: {
      //run unit tests with karma (server needs to be already running)
      karma: {
        files: ['lib/**/*.js', 'test/**/*.js'],
        tasks: ['browserify', 'karma:unit:run']
      },
      scripts: {
        files: ['index.js', 'lib/runner.js'],
        tasks: ['default']
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-karma');

  grunt.registerTask('default', ['browserify']);
  grunt.registerTask('develop', ['connect:server', 'karma:unit:start', 'watch']);
  grunt.registerTask('test', ['default', 'connect:server', 'karma:continuous']);
  grunt.registerTask('w', ['watch']);
};

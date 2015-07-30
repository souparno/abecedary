module.exports = function(grunt) {

  grunt.initConfig({
    connect: {
      server: {
        keepalive: true,
        options: {
          port: 4000
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('default', ['connect:server:keepalive']);
};

module.exports = function(grunt) {
  grunt.initConfig({
    shell: {
      browserify: {
        command: 'browserify -s Abecedary -t decomponentify -t brfs index.js > dist/abecedary.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-shell');
  grunt.registerTask('default', ['shell:browserify']);
};
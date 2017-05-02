'use strict';

module.exports = function(grunt){

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  grunt.initConfig({

    bump: {
      options: {
        files: ['src/manifest.json'],
        createTag: false,
        commit: false,
        push: false
      }
    },

    compress: {
      options: {
        mode: 'zip',
        archive: 'dist/brobo.zip'
      },
      files: {
        expand: true,
        cwd: 'src/',
        src: ['**/*']
      }
    }

  });

  grunt.registerTask('build', [
    'bump',
    'compress'
  ]);

};

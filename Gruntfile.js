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
        commit: false,
        push: false
      }
    },

    zip:{
      'dist/brobo'
    }

  });

  grunt.registerTask('build', [
    'bump',
    'compress'
  ]);

};

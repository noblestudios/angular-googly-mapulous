module.exports = function ( grunt ) {

  // Config ///////////////////////////////////////////////////////////////////

  grunt.initConfig({
    pkg: grunt.file.readJSON( 'package.json' ),

    // Task config ////////////////////////////////////////////////////////////

    clean: {
      options: { force: true },
      prebuild: {
        src: [ './dist/*', './tmp/*' ]
      },
      postbuild: {
        src: [ './tmp' ]
      }
    },

    concat: {
      core: {
        src: [
          './src/lib/GoogleMap.js',
          './src/lib/Marker.js',
          './src/lib/Cluster.js',
          './src/lib/utility.js'
        ],
        dest: './tmp/core.js',
        nonull: true
      },
      provider: {
        src: './src/googleMaps.provider.js',
        dest: './tmp/provider.js',
        options: {
          process: function ( src ) {
            return grunt.template.process( src, { data: {
              guts: grunt.file.read( './tmp/core.js' )
            }});
          }
        }
      },
      build: {
        src: [
          './src/googleMaps.module.js',
          './src/googleMaps.directive.js',
          './tmp/provider.js'
        ],
        dest: './dist/googly-mapulous.js',
        nonull: true
      }
    },

    uglify: {
      build: {
        src: './dist/googly-mapulous.js',
        dest: './dist/googly-mapulous.min.js'
      }
    },

    doxx: {
      build: {
        src: './src',
        target: './docs',
        options: {
          title: 'Angular Googly Mapulous',
          readme: './README.md'
        }
      }
    },

    watch: {
      build: {
        files: './src/**/*.js',
        tasks: 'build'
      }
    }

  });

  // Tasks ////////////////////////////////////////////////////////////////////

  // Automatically load default tasks from packages
  require('load-grunt-tasks')( grunt );

  // Build task

  var buildTasks = [
    'clean:prebuild',
    'concat:core',
    'concat:provider',
    'concat:build',
    'uglify:build',
    'clean:postbuild',
    'doxx'
  ];

  grunt.registerTask( 'build', buildTasks );
  grunt.registerTask( 'dev', 'watch' );

  // Default task - this just mirrors the build task
  grunt.registerTask( 'default', buildTasks );
};

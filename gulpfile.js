'usestrict';

const gulp = require('gulp'),
      zip = require('gulp-zip'),
      bump = require('gulp-bump'),
      json = require('jsonfile');

function addonVersion(){
  var manifest = json.readFileSync('./src/manifest.json');
  return manifest.version;
};

gulp.task('zip', (cb) => {
  gulp.src('src/**/*')
    .pipe(zip(`brobo-${addonVersion()}.zip`))
    .pipe(gulp.dest('dist'));

  cb();
});

gulp.task('bump', (cb) => {
  gulp.src('src/manifest.json')
    .pipe(bump({key:"version"}))
    .pipe(gulp.dest('src'));

  cb();
});

gulp.task('build', gulp.series('bump', 'zip'));

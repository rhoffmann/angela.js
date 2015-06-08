'use strict';

// TODO: modify

var g        = require('gulp-load-plugins')();
var argv     = require('yargs').argv;
var gulp     = require('gulp');

var browserify = require('browserify'),
    watchify = require('watchify'),
    runSequence = require('run-sequence'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    merge = require('merge-stream'),
    karma = require('karma'),
    del = require('del');
    //memRev = require('./utils/gulp-memrev');

// Check for --production flag
var isProduction = !!(argv.production);

var paths = {
  //templates: [
  //  './src/**/*.html',
  //  '!./src/index.html'
  //],
  //foundationTemplates: [
  //  './src/vendor/foundation/**/*.html'
  //],
  app: './src',
  scripts: './src/**/*.js',
  scriptsEntry: './src/index.js',
  html: './src/index.html',
  dist: './dist',
  temp: './.tmp',
  tests: './tests/**/*.js',
  target: isProduction ? './dist' : './.tmp',
  statics: [],
  sass: './src/scss/**/*.scss',
  sassEntry: './src/scss/app.scss',
  sassIncludes: [
    'node_modules/foundation-apps/scss'
  ]
};

gulp.task('default', ['watch']);

gulp.task('dist', function (done) {
  isProduction = true;
  paths.target = paths.dist;
  runSequence('clean', ['statics', 'scripts', 'sass', 'lint'], 'html', done);
});

gulp.task('watch', ['serve'], function () {
  gulp.watch(paths.html, function (evt) {
    gulp.src(evt.path).pipe(g.connect.reload());
  });
  gulp.watch(paths.sass, ['sass']);
  //gulp.watch(paths.templates, ['templates']);

  //gulp.watch([paths.tests, paths.scripts], ['lint', 'test']);
});

gulp.task('build', function (done) {
  runSequence('clean', ['scripts', 'sass', 'lint'], 'html', done);
});

//gulp.task('templates', function () {
//  var appTemplates = compileTemplates(paths.templates, {
//    moduleName: 'ZVA.epaper.templates',
//    stripPrefix: 'app/'
//  });
//  var foundationTemplates = compileTemplates(paths.foundationTemplates, {
//    moduleName: 'ZVA.epaper.foundationTemplates',
//    stripPrefix: 'vendor/foundation/',
//    prefix: 'components/'
//  });
//
//  return merge(appTemplates, foundationTemplates)
//    .pipe(gulp.dest(paths.temp));
//
//});

gulp.task('scripts', /*['templates'], */ function () {
  return browserifyShare();
});

gulp.task('lint', function () {
  return lintAllTheThings();
});

gulp.task('test', function(done) {
  karma.runner.run({port: 9876}, function(exitCode) {
    if (exitCode) return done('Karma tests failed');
    return done();
  });
});

gulp.task('html', function () {
  return gulp.src(paths.html)
    //.pipe(g.if(isProduction, memRev.replace()))
    .pipe(gulp.dest(paths.target));
});

gulp.task('statics', function () {
  return gulp.src(paths.statics)
    .pipe(gulp.dest(paths.dist));
});

gulp.task('clean', function (done) {
  del([paths.target, paths.temp], done);
});
gulp.task('sass', function () {
  return gulp.src(paths.sassEntry)
    .pipe(g.if(!isProduction, g.sourcemaps.init()))
    .pipe(g.sass({
      includePaths: paths.sassIncludes,
      errLogToConsole: true
    }))
    .pipe(g.autoprefixer({
      browsers: ['last 2 versions', 'ie 10']
    }))
    .pipe(g.if(!isProduction, g.sourcemaps.write()))
    .pipe(g.if(isProduction, g.minifyCss()))
    .pipe(g.if(isProduction, g.rev()))
    //.pipe(g.if(isProduction, memRev()))
    .pipe(gulp.dest(paths.target + '/css'))
    .pipe(g.if(!isProduction, g.connect.reload()));
});

gulp.task('serve', ['build'], function() {
  g.connect.server({
    root: isProduction ? paths.dist : [paths.temp, paths.app],
    port: 8080,
    livereload: true
  });
});

function browserifyShare() {
  var b = browserify(paths.scriptsEntry, {
    cache: {},
    packageCache: {},
    debug: !isProduction
  });

  var w;
  if (!isProduction) {
    w = watchify(b);

    w.on('update', function() {
      lintAllTheThings();
      bundleShare(b);
    });
  }

  b.on('log', g.util.log);

  return bundleShare(b);
}

function bundleShare(b) {
  return b.bundle()
    .pipe(g.plumber({errorHandler: g.notify.onError('<%= error.message %>')}))
    .pipe(source('index.js'))
    .pipe(buffer())
    .pipe(g.if(isProduction, g.uglify()))
    .pipe(g.if(isProduction, g.rev()))
    //.pipe(g.if(isProduction, memRev()))
    .pipe(gulp.dest(paths.target + '/js'))
    .pipe(g.if(!isProduction, g.connect.reload()));
}

function lintAllTheThings () {
  return gulp.src(paths.scripts)
    .pipe(g.cached('lint'))
    .pipe(g.eslint())
    .pipe(g.remember('lint'))
    .pipe(g.eslint.format())
    .pipe(g.eslint.failOnError())
    .on('error', g.notify.onError('Lint error: <%= error.message %>'));
}

function compileTemplates(path, opts) {
  return gulp.src(path)
    .pipe(g.ngHtml2js(opts))
    .pipe(g.concat(opts.moduleName + '.js'))
    .pipe(g.insert.append('module.exports = "' + opts.moduleName + '";'));
}

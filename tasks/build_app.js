'use strict';

var gulp = require('gulp');
var less = require('gulp-less');
var watch = require('gulp-watch');
var batch = require('gulp-batch');
var plumber = require('gulp-plumber');
var jetpack = require('fs-jetpack');
var bundle = require('./bundle');
var utils = require('./utils');

var projectDir = jetpack;
var srcDir = jetpack.cwd('./src');
var destDir = jetpack.cwd('./app');

gulp.global_hooks = [];

gulp.task('bundle', function () {
    return Promise.all([
        bundle(srcDir.path('background.js'), destDir.path('background.js')),
        bundle(srcDir.path('app.js'), destDir.path('app.js')),
        bundle(srcDir.path('taskbar.js'), destDir.path('taskbar.js')),
        bundle(srcDir.path('annotations.js'), destDir.path('annotations.js')),
        bundle(srcDir.path('alerts.js'), destDir.path('alerts.js')),
    ]);
});

gulp.task('less', function () {
    return gulp.src(srcDir.path('stylesheets/*.less'))
        .pipe(plumber())
        .pipe(less())
        .pipe(gulp.dest(destDir.path('stylesheets')));
});

gulp.task('environment', function () {
    var configFile = 'config/env_' + utils.getEnvName() + '.json';
    projectDir.copy(configFile, destDir.path('env.json'), { overwrite: true });
});

gulp.task('watch', function () {
    var beepOnError = function (done, events) {
        return function (err) {
            if (err) {
                utils.beepSound();
            }
            done(err);
        };
    };

    var onChange = function(file) {
        for (var i = 0; i < gulp.global_hooks.length; ++i) {
            gulp.global_hooks[i](file);
        }
    }

    watch('src/**/*.js', batch(function (events, done) {
        gulp.start('bundle', beepOnError(done, events));
    }))
        .on('change', onChange);

    watch('src/**/*.less', batch(function (events, done) {
        gulp.start('less', beepOnError(done, events));
    }))
        .on('change', onChange);

    watch('app/**/*.html').on('change', onChange);
});

gulp.task('build', ['bundle', 'less', 'environment']);

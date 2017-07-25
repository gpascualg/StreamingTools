'use strict';

var childProcess = require('child_process');
// var electron = require('electron');
var gulp = require('gulp');
var electron = require('electron-connect').server.create({stopOnClose: true, port: 30081});

gulp.task('start', ['build', 'watch'], function () {
    gulp.global_hooks.push(function(file) {
        var tokens = file.split('.');
        var ext = tokens[tokens.length - 1];
        tokens = file.split('\\');
        var fname = tokens[tokens.length - 1];

        console.log(fname);

        if (fname == 'background.js') {
            electron.restart();
        }
        else {
            electron.reload();
        }
    });

    var callback = function(electronProcState) {
        if (electronProcState == 'stopped') {
            process.exit();
        }
    };

    let argv = process.argv.slice(3, process.argv.length);
    console.log(argv);
    console.log("START!!");
    electron.start();
    //electron.start(argv, callback);
});

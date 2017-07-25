// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from 'path';
import url from 'url';
import tablet_pressure from 'tablet_pressure';
import { app, Menu, ipcMain, dialog, screen } from 'electron';
import { mainBroadcastListener } from 'electron-ipc-broadcast'
import { devMenuTemplate } from './menu/dev_menu_template';
import { editMenuTemplate } from './menu/edit_menu_template';
import { initializeGradients } from './gradient';
import createWindow from './helpers/window';
mainBroadcastListener();

import {gAPI} from './lib/gapi.js';
const gapi = new gAPI();
gapi.initialize();

console.log(tablet_pressure.initialize());
console.log(tablet_pressure.isInstalled());

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from './env';

var mainWindow;
var taskbarWindow;
var annotationsWindow;
var youtubeWindow;
var lastPressure = 0;

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== 'production') {
    var userDataPath = app.getPath('userData');
    app.setPath('userData', userDataPath + ' (' + env.name + ')');
}

ipcMain.on('radio:dialog', function (event, arg) {
    var folder = dialog.showOpenDialog({properties: ['openDirectory']});
    if (folder) {
        event.sender.send('radio:dialog-closed', folder);
    }
});

ipcMain.on('ignore-events', function(event, arg) {
    mainWindow.setIgnoreMouseEvents(true);
});

ipcMain.on('restore-events', function(event, arg) {
    mainWindow.setIgnoreMouseEvents(false);
});

ipcMain.on('query-cursor-position', function(event, arg) {
    var pressure = tablet_pressure.pressure();
    if (pressure <= 2048) {
        lastPressure = pressure;
    }

    let pos = screen.getCursorScreenPoint();
    let abs = screen.getCursorScreenPoint();
    let win = mainWindow.getPosition();
    pos.x -= win[0];
    pos.y -= win[1];
    event.returnValue = {relative: pos, absolute: abs};
});

ipcMain.on('get-pressure', function(event, arg) {
    event.returnValue = lastPressure;
});

for (let i = 0; i < 10; ++i) {
    ipcMain.on('gapi-query-queue' + i, function(event, arg) {
        arg['callback'] = function(data) {
            event.sender.send('gapi-response-queue' + i, data);
        };

        gapi.ready() && gapi.query(arg);
    });
}

function openWindow(name, url_options, options) {
    var win = createWindow(name, options);
    win.loadURL(url.format(url_options));
    if (options && options.alwaysOnTop) win.setAlwaysOnTop(true);
    if (options && options.skipTaskbar) win.setSkipTaskbar(true);
    return win;
}

app.on('ready', function () {
    mainWindow = openWindow('main', {
        pathname: path.join(__dirname, 'app.html'),
        protocol: 'file:',
        slashes: true
    }, {
        width: 500,
        height: 500,
        frame: false,
        thickFrame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false
    });

    youtubeWindow = openWindow('youtube', {
        pathname: path.join(__dirname, 'youtube.html'),
        protocol: 'file:',
        slashes: true
    }, {
        width: 650,
        height: 200,
        frame: false,
        thickFrame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false
    });

    var workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    taskbarWindow = openWindow('taskbar', {
        pathname: path.join(__dirname, 'taskbar.html'),
        protocol: 'file:',
        slashes: true
    }, {
        width: workAreaSize.width,
        height: 40,
        frame: false,
        thickFrame: false,
        transparent: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false
    });
    taskbarWindow.setPosition(0, workAreaSize.height - 40);

    annotationsWindow = openWindow('annotations', {
        pathname: path.join(__dirname, 'annotations.html'),
        protocol: 'file:',
        slashes: true
    }, {
        width: workAreaSize.width,
        height: workAreaSize.height,
        frame: false,
        thickFrame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false
    });
    annotationsWindow.setPosition(0, 0);

    if (env.name === 'development') {
        //youtubeWindow.openDevTools('undocked');
    }

    youtubeWindow.setIgnoreMouseEvents(true);
    annotationsWindow.hide();

    let checkKeys = function() {
        var timeout = 500;

        // 0x09 = TAB
        // 0x12 = ALT
        // 0x5B = LWIN
        // ALT + TAB
        if (tablet_pressure.keyState(0x12, 0x8000) && tablet_pressure.keyState(0x09, 0x8000))
        {
            annotationsWindow.setAlwaysOnTop(false);
            annotationsWindow.hide();
        }
        // ALT + WIN
        else if (tablet_pressure.keyState(0x12, 0x8000) && tablet_pressure.keyState(0x5B, 0x8000))
        {
            annotationsWindow.setAlwaysOnTop(!annotationsWindow.isAlwaysOnTop());
            if (annotationsWindow.isAlwaysOnTop()) {
              annotationsWindow.show();
            }
            else {
              annotationsWindow.hide();
            }
        }
        else {
            timeout = 50;
        }

        setTimeout(checkKeys, timeout);
    };
    setTimeout(checkKeys, 50);

    annotationsWindow.on('focus', function() {
        annotationsWindow.setAlwaysOnTop(true);
    })

    initializeGradients();
});

app.on('window-all-closed', function () {
    app.quit();
});

// Here is the starting point for your application code.
// All stuff below is just to show you how it works. You can delete all of it.

// Use new ES6 modules syntax for everything.
import os from 'os'; // native node.js module
import { remote, ipcRenderer } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import path from 'path';
const {desktopCapturer} = require('electron')
import broadcast from 'electron-ipc-broadcast';
import { greet } from './hello_world/hello_world'; // code authored by you in this project
import env from './env';
import { fadeIn, fadeOut, debounce } from './utils';
import jsmediatags from 'jsmediatags';
import tablet_pressure from 'tablet_pressure';

/*
try {
    import aks from 'asynckeystate';
}
catch(err) {
    var aks = {
        getAsyncKeyState: function(code) {

        }
    };
}
*/

var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());

// https://github.com/wayou/HTML5_Audio_Visualizer

function arrayBufferToBase64(ab) {
    var dView = new Uint8Array(ab);   //Get a byte view
    var arr = Array.prototype.slice.call(dView); //Create a normal array
    var arr1 = arr.map(function(item) {
        return String.fromCharCode(item);    //Convert
    });
    return window.btoa(arr1.join(''));   //Form a string
}


document.addEventListener('DOMContentLoaded', function () {
    var playlist = {
        root: null,
        songs: [],
        current: 0,
        context: null,
        source: null,
        isPlaying: false,
        loading: false,
        animationId: null,

        gradient: {
            update: false,
            values: [0,0]
        },
    };

    var DOM = {
        album: document.getElementById('album'),
        fft: document.getElementById('fft'),
        video_canvas: document.getElementsByClassName('video_canvas')[0],
        container: document.getElementsByClassName('container')[0],
        content: document.getElementsByClassName('content')[0],
        video: document.getElementById('video'),
        album: document.getElementById('album'),
        chat: document.getElementById('chat'),
        zoom: document.getElementById('zoom')
    };

    var mousePosition = {x: 0, y: 0};

    function drawSpectrum() {
        //stop the previous sound if any
        if (playlist.animationId !== null) {
            cancelAnimationFrame(playlist.animationId);
        }

        var canvas = DOM.fft,
            cwidth = canvas.width,
            cheight = canvas.height,
            meterWidth = 5, //width of the meters in the spectrum
            gap = 1.0, //gap between meters
            capHeight = 2,
            capStyle = '#fff',
            capYPositionArray = []; ////store the vertical position of hte caps for the preivous frame

        var ctx = canvas.getContext('2d');
        var video_canvas = DOM.video_canvas;
        var video = video_canvas.getContext('2d');
        var zoom_video = document.getElementById('zoom-video');
        var zoom_canvas = document.getElementById('zoom');
        var zoom = zoom_canvas.getContext('2d');
        var gradient = "#cccccc";
        var video_crop = null;

        var drawMeter = function() {
            if (playlist.video && !(playlist.video.paused || playlist.video.ended)) {
                if (!video_crop) {
                    var video_height = playlist.video.videoHeight;
                    var video_width = playlist.video.videoWidth;

                    if (video_height > 0 && video_width > 0) {
                        video_crop = {};

                        if (video_width > video_height) {
                            var r = video_height / playlist.video.height;
                            video_crop.y0 = 0;
                            video_crop.y1 = video_height;
                            video_crop.x0 = (video_width - video_height) / 2;
                            video_crop.x1 = video_width - (video_width - video_height) / 2;
                        }

                        console.log(video_crop);
                    }
                }
                else {
                    video.drawImage(playlist.video, video_crop.x0, video_crop.y0, video_crop.x1, video_crop.y1,
                                                    0, 0, video_canvas.width, video_canvas.height);
                }
            }

            // TODO: Not always redirect zoom
            zoom.save();
            zoom.scale(2, 2);
            var videox = mousePosition.x - 150 > 0 ? mousePosition.x - 150 : mousePosition.x;
            var videoy = mousePosition.y - 150 > 0 ? mousePosition.y - 150 : mousePosition.y;
            zoom.drawImage(zoom_video, videox, videoy, 600, 600,
                            0, 0, zoom_canvas.width, zoom_canvas.height);
            zoom.restore();

            if (playlist.context && playlist.source && 1 == 0)
            {
                if (playlist.gradient.update) {
                    playlist.gradient.update = false;
                    gradient = ctx.createRadialGradient(0, 0, cwidth / 2.0, 0, 0, cwidth / 3.0);
                    gradient.addColorStop(1, playlist.gradient.values[0]);
                    gradient.addColorStop(0, playlist.gradient.values[1]);
                }

                var array = new Uint8Array(playlist.analyser.frequencyBinCount);
                playlist.analyser.getByteFrequencyData(array);

                if (!playlist.isPlaying) {
                    //fix when some sounds end the value still not back to zero
                    for (var i = array.length - 1; i >= 0; i--) {
                        array[i] = 0;
                    };
                };

                var video_bounds = video_canvas.getBoundingClientRect();
                var bounds = canvas.getBoundingClientRect();
                var meterNum = video_bounds.width * 140 / 250;
                var rotation = -4.0 * Math.PI / 3.0;
                var rotation_step = Math.PI * 2 / meterNum;
                var step = Math.round(array.length / (meterNum + 20.0)); //sample limited data from the total array

                ctx.save();
                ctx.clearRect(0, 0, cwidth, cheight);
                ctx.translate((video_bounds.left - bounds.left) + video_bounds.width / 2.0, (video_bounds.top - bounds.top) + video_bounds.height / 2.0);
                for (var i = 0; i < meterNum; i++) {
                    var value = array[i * step] * (video_canvas.width / 4) / 255.0;
                    if (capYPositionArray.length < Math.round(meterNum)) {
                        capYPositionArray.push(value);
                    }

                    ctx.save();
                    ctx.rotate(rotation);
                    ctx.fillStyle = capStyle;

                    if (value < capYPositionArray[i]) {
                        capYPositionArray[i] -= 1;
                        if (capYPositionArray[i] < 0) capYPositionArray[i] = 0;
                    } else {
                        capYPositionArray[i] = value;
                    };
                    ctx.fillRect(video_canvas.width / 2 + capYPositionArray[i], -meterWidth / 2.0, capHeight, meterWidth);

                    ctx.fillStyle = gradient; //set the filllStyle to gradient for a better look
                    ctx.fillRect(video_canvas.width / 2, -meterWidth / 2.0, capYPositionArray[i] - capHeight, meterWidth);

                    rotation += rotation_step;
                    ctx.restore();
                }

                ctx.restore();
            }

            playlist.animationId = requestAnimationFrame(drawMeter);
        }

        playlist.animationId = requestAnimationFrame(drawMeter);
    }

    function _playNext(filename, playlist) {
        jetpack.readAsync(filename, 'buffer')
        .then(function(data) {
            data = new Uint8Array(data);
            playlist.context.decodeAudioData(data.buffer, function(buffer) {
                if (playlist.source) {
                    if (!playlist.isPlaying) {
                        playlist.context.resume();
                    }
                    playlist.source.onended = null;
                    playlist.source.stop();
                }

                playlist.source = playlist.context.createBufferSource();
                playlist.analyser = playlist.context.createAnalyser();
                playlist.source.buffer = buffer;
                //playlist.source.connect(playlist.context.destination);
                playlist.source.connect(playlist.analyser);
                playlist.analyser.connect(playlist.context.destination);
                playlist.source.start(0);
                playlist.isPlaying = true;
                playlist.loading = false;

                playlist.source.onended = function() {
                    playNext(playlist);
                }
            }, function(){});
        });
    }

    function playNext(playlist, internal) {
        if (playlist.loading && !internal) {
            return;
        }
        playlist.loading = true;

        var filename = playlist.root + path.sep + playlist.songs[playlist.current];
        console.log("Playing " + filename);
        playlist.current = (playlist.current + 1) % playlist.songs.length;

        jsmediatags.read(filename, {
            onSuccess: function(data) {
                if ('APIC' in data.tags) {
                    var pic = data.tags.APIC.data.data;
                    var b64 = arrayBufferToBase64(pic);
                    b64 = 'data:image/png;base64,' + b64;
                    DOM.album.src = b64;
                }

                fadeIn(DOM.album);
                setInterval(function() {
                    fadeOut(DOM.album);
                }, 5000);

                broadcast('radio:new-song', { message: data });

                _playNext(filename, playlist);
            },
            onError: function(error) {
                console.error(error);
                // Skip and play next
                playNext(playlist, true);
            }
        });
    }

    ipcRenderer.on('radio:play-pause', function () {
        if (playlist.source) {
            if (playlist.isPlaying) {
                playlist.context.suspend();
            }
            else {
                playlist.context.resume();
            }

            playlist.isPlaying = !playlist.isPlaying;
        }
    });

    ipcRenderer.on('radio:skip', function () {
        playNext(playlist);
    });

    ipcRenderer.on('radio:selected-folder', (event, { payload }) => {
        const { folder } = payload;

        jetpack.listAsync(folder[0]).then(function(files) {
            playlist.root = folder;
            playlist.songs = files;
            playlist.current = 0;

            playNext(playlist);
        });
    });

    ipcRenderer.on('gradient:new-gradient', (event, { payload }) => {
        const { message } = payload;
        playlist.gradient.values = message;
        playlist.gradient.update = true;
    });

    function setSize(el, width, height, skipNonCSS, left, top) {
        if (!skipNonCSS) {
            el.width = width;
            el.height = height;
        }
        el.style.width = width + 'px';
        el.style.height = height + 'px';

        if (typeof left != "undefined") el.style.left = left + 'px';
        if (typeof top != "undefined") el.style.top = top + 'px';
    }

    function getContainerBounds(scale) {
        var bounds = DOM.container.getBoundingClientRect();
        var width = parseInt(window.innerWidth) / scale;
        var height = parseInt(window.innerHeight) / scale;
        var left = parseInt(window.innerWidth) - width - width / scale - bounds.left;
        var top = parseInt(window.innerHeight) - height - height / scale - bounds.left;

        return {left: left, top: top, width: width, height: height};
    }

    function setupInitialSize() {
        setSize(DOM.fft, window.innerWidth, window.innerHeight);
        setSize(DOM.chat, window.innerWidth - 5, window.innerHeight - 5, true);
        setSize(DOM.container, window.innerWidth / 3, window.innerHeight / 3);
        setSize(DOM.video, window.innerWidth / 3, window.innerHeight / 3);
    }

    function restoreWebcam() {
        const {left, top, width, height} = getContainerBounds(3);
        setSize(DOM.video_canvas, width, height, false, left, top);
        setSize(DOM.album, width, height, false, left, top);

        DOM.fft.style.pointerEvents = '';
        DOM.content.style.pointerEvents = '';

        DOM.chat.className = 'hidden';
        DOM.zoom.className = 'hidden';
    }

    function smallCam() {
        const {left, top, width, height} = getContainerBounds(4);
        setSize(DOM.video_canvas, width, height, false, left, top);
        setSize(DOM.album, width, height, false, left, top);

        DOM.fft.style.pointerEvents = 'none';
        DOM.content.style.pointerEvents = 'none';

        DOM.chat.className = 'hidden';
        DOM.zoom.className = 'hidden';
    }

    // Setup sizes
    setupInitialSize();
    restoreWebcam();

    // AUDIO
    playlist.context = new AudioContext();

    // Show chat
    var showChat = debounce(function() {
        if (chat.className != '') {
            smallCam();
            DOM.chat.className = '';
        }
        else {
            restoreWebcam();
        }
    }, 500);

    var showZoom = debounce(function() {
        if (DOM.zoom.className != '') {
            smallCam();
            DOM.zoom.className = '';
        }
        else {
            restoreWebcam();
        }
    }, 500);

    let checkKeys = setInterval(function() {
        // SHIFT(0x10) + CTRL (0x11) + SPACE (0x20)
        // WIN(0x5B) + Z(0x5A) + C(0x43)
        if (tablet_pressure.keyState(0x5B, 0x8000) && tablet_pressure.keyState(0x43, 0x8000)) {
            showChat();
        }
        if (tablet_pressure.keyState(0x5B, 0x8000) && tablet_pressure.keyState(0x5A, 0x8000)) {
            captureVisualStudio();
            showZoom();
        }
    }, 100);

    let onmousemove = debounce(function(pos) {
        mousePosition = pos.absolute;
        var x = pos.relative.x, y = pos.relative.y;
        var element = document.elementFromPoint(x, y);
        let ignoreEvents = DOM.chat.className != '';

        if (!element) {
            return;
        }

        // console.log(element.tagName + '.' + element.className + '#' + element.id);

        if (element.className == 'video_canvas' || element.className == 'album') {
            var rect = element.getBoundingClientRect();

            // Calc radius
            var rx = Math.abs(x - (rect.left + parseInt(rect.width) / 2));
            var ry = Math.abs(y - (rect.top + parseInt(rect.height) / 2));
            var r = Math.sqrt(Math.pow(rx, 2) + Math.pow(ry, 2));

            if (r < rect.width / 2) {
                ignoreEvents = false;
            }
        }
        else if (element.id == 'zoom') {
            ignoreEvents = false;
        }
        else if (element.tagName == 'WEBVIEW') {
            ignoreEvents = false;
        }

        if (ignoreEvents) {
            ipcRenderer.send('ignore-events');
        }
        else {
            ipcRenderer.send('restore-events');
        }
    });

    setInterval(function() {
        onmousemove(ipcRenderer.sendSync('query-cursor-position'));
    }, 100);

    var video = DOM.video;
    var constraints = {
        audio: false,
        video: {
            width: { min: video.width, ideal: video.width, max: video.width * 2 },
            height: { min: video.height, ideal: video.height, max: video.height * 2 },
        }
    };

    navigator.getUserMedia(constraints, function(stream) {
        if (window.URL) {
            video.src = window.URL.createObjectURL(stream);
        } else {
            video.src = stream;
        }

        video.play();
        playlist.video = video;

        video.onplaying = function() {
            if (video.videoWidth && video.videoHeight) {
                video.width = video.videoWidth;
                video.height = video.videoHeight;
                video.onplaying = null;
                drawSpectrum();
            }
        }
    }, function(err) {
        console.error(err);
    });

    var oldStream = null;
    function captureVisualStudio() {
        if (oldStream) {
            for (let track of oldStream.getTracks()) {
                track.stop()
            }
            oldStream = null;
        }

        desktopCapturer.getSources({types: ['window', 'screen']}, (error, sources) => {
            if (error) throw error

            var match = " - Microsoft Visual Studio";
            for (let i = 0; i < sources.length; ++i) {
                if (sources[i].name.length > match.length &&
                    sources[i].name.substring(sources[i].name.length - match.length) == match) {

                    console.log(sources[i]);

                    navigator.webkitGetUserMedia({
                        audio: false,
                        video: {
                            mandatory: {
                                chromeMediaSource: 'desktop',
                                chromeMediaSourceId: sources[i].id,
                                minWidth: 1920,
                                maxWidth: 1920,
                                minHeight: 1080,
                                maxHeight: 1080
                            }
                        }
                    }, handleStream, handleError);
                    return
                }
            }
        });

        function handleStream (stream) {
            oldStream = stream;
            document.getElementById('zoom-video').src = URL.createObjectURL(stream)
        }

        function handleError (e) {
          console.log(e)
        }
    }
});

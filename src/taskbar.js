import { ipcRenderer } from 'electron';
import broadcast from 'electron-ipc-broadcast';


document.addEventListener('DOMContentLoaded', function () {
    let DOM = {
        eject: document.getElementById('eject'),
        play: document.getElementById('play'),
        pause: document.getElementById('pause'),
        skip: document.getElementById('skip'),
        title: document.getElementsByClassName('title')[0],
        artist: document.getElementsByClassName('artist')[0]
    };

    DOM.eject.addEventListener('click', function() { broadcast('radio:dialog'); });
    DOM.skip.addEventListener('click', function() { broadcast('radio:skip'); });

    DOM.play.addEventListener('click', function() {
        DOM.play.className = 'hidden';
        DOM.pause.className = '';
        broadcast('radio:play-pause');
    });

    DOM.pause.addEventListener('click', function() {
        DOM.play.className = '';
        DOM.pause.className = 'hidden';
        broadcast('radio:play-pause');
    });

    ipcRenderer.on('radio:dialog-closed', function(event, folder) {
        broadcast('radio:selected-folder', { folder: folder }) ;
    });

    ipcRenderer.on('gradient:new-gradient', (event, { payload }) => {
        var body = document.getElementsByTagName("BODY")[0];
        const { message } = payload;
        body.style.background = 'linear-gradient(to left, ' + message[0] + ' , ' + message[1] + ' )';
    });

    ipcRenderer.on('radio:new-song', (event, { payload }) => {
        const { message } = payload;

        DOM.play.className = 'hidden';
        DOM.pause.className = '';
        DOM.skip.className = '';
        DOM.title.innerHTML = message.tags.title;
        DOM.artist.innerHTML = message.tags.artist;
    });
});

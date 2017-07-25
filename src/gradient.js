import request from 'request';
import broadcast from 'electron-ipc-broadcast';
import { ipcMain } from 'electron';

export var initializeGradients = function(timeout) {
    let gradients = [];
    let currentGradient = 0;
    let switchInterval = null;

    // Defaults
    timeout = timeout || 1000 * 5 * 60; // 5 mins

    // Fallback colors
    gradients = [
        {colors: ['#000000', '#434343']},
        {colors: ['#4B79A1', '#283E51']},
        {colors: ['#8E0E00', '#1F1C18']},
        {colors: ['#BA8B02', '#181818']},
        {colors: ['#6A9113', '#141517']},
        {colors: ['#000000', '#53346D']},
        {colors: ['#606c88', '#3f4c6b']},
        {colors: ['#870000', '#190A05']}
    ];

    function swapGradient() {
        if (currentGradient >= gradients.length) {
            currentGradient = 0;
        }

        broadcast('gradient:new-gradient', {message: gradients[currentGradient]['colors'] });
        ++currentGradient;
    }

    function skipGradient() {
        if (switchInterval) clearInterval(switchInterval);
        switchInterval = setInterval(swapGradient, timeout);
        swapGradient();
    }

    // Request the whole gradients set
    request
        .get('https://raw.githubusercontent.com/Ghosh/uiGradients/master/gradients.json', function(error, response, content) {
            try {
                gradients = JSON.parse(content);
                currentGradient = Math.floor(Math.random() * gradients.length);
            } catch (err) {}

            skipGradient()
        });

    ipcMain.on('gradient:skip', skipGradient);
};

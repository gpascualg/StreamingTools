import { remote, ipcRenderer } from 'electron'; // native electron module


$(document).ready(function() {
    let pendingUsers = [];

    function pollSuscribers() {
      if (pendingUsers.length > 0) {
          newSubscriber();
      }
    }

    function newSubscriber() {
        let username = pendingUsers.pop();
        $('.alert-below').text(username);
        $('*:not(body):not(html)').each(function() {
            $(this).stop(true).animate({opacity: 1}, 2000);
        });

        setTimeout(hideNewSubscriber, 5000);
    }

    function hideNewSubscriber() {
        $('*:not(body):not(html)').each(function() {
            $(this).animate({opacity: 0}, 2000);
        });
    }

    function flagAsRead(thread)
    {
        ipcRenderer.send('gapi-query-queue0', {url: 'https://www.googleapis.com/gmail/v1/users/me/threads/' + thread.id + '?fields=messages%2Fpayload%2Fheaders'});
        ipcRenderer.send('gapi-query-queue0',
            {
                url: 'https://www.googleapis.com/gmail/v1/users/me/threads/' + thread.id + '/modify',
                method: 'post',
                body: JSON.stringify({removeLabelIds: ["UNREAD"]}),
                headers: {'content-type': 'application/json'}
            }
        );
    }

    hideNewSubscriber();
    setInterval(pollSuscribers, 7000);

    setInterval(function() {
        ipcRenderer.send('gapi-query-queue0', {url: 'https://www.googleapis.com/gmail/v1/users/me/threads?q=' + encodeURIComponent('is:unread suscrito')});
        //ipcRenderer.send('gapi-query-queue0', {url: 'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet,contentDetails&mySubscribers=true&maxResults=50&order=unread'});
    }, 15000);

    ipcRenderer.on('gapi-response-queue0', function(event, args) {
        console.log(args);
        if (args.messages && args.messages.length == 1 && args.messages[0].payload) {
            for (let i = 0; i < args.messages[0].payload.headers.length; ++i) {
                let header = args.messages[0].payload.headers[i];
                if (header.name == 'Subject') {
                    let username = /^.+?(?=se ha suscrito)/.exec(header.value);
                    pendingUsers.push(username);
                    break;
                }
            }
        }

        if (args.threads) {
            for (let i = 0; i < args.threads.length; ++i) {
                setTimeout(flagAsRead.bind(window, args.threads[i]), i*1000);
            }
        }
    });

    ipcRenderer.on('gradient:new-gradient', (event, { payload }) => {
        const { message } = payload;

        $('.alert-above').css({background: 'linear-gradient(to left, ' + message[0] + ' , ' + message[1] + ' )'});

        $('body').find('style').remove();
        $('body').append('<style type="text/css" scoped>' +
            '.knockout-around:before { ' +
            '-webkit-gradient(radial, left top, 100, 0% 52%, 390, from(' + message[1] + '), to(transparent)) !important' +
        '}');
    });
});

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import api from '../api';

window.Pusher = Pusher;

const reverbKey = import.meta.env.VITE_REVERB_APP_KEY || 'no-key-defined';

const host = window.location.hostname;
const token = localStorage.getItem('pos_token');

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: reverbKey,
    wsHost: host,
    wsPort: import.meta.env.VITE_REVERB_PORT || 8090,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8090,
    forceTLS: false,
    enabledTransports: ['ws'],
    authorizer: (channel) => {
        return {
            authorize: (socketId, callback) => {
                api.post('broadcasting/auth', {
                    socket_id: socketId,
                    channel_name: channel.name,
                }, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('pos_token')}`
                    }
                })
                .then(response => callback(null, response.data))
                .catch(error => callback(error, null));
            }
        };
    }
});

const echo = window.Echo;

export default echo;

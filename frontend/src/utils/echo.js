import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import toast from 'react-hot-toast';

import api from '../api';

window.Pusher = Pusher;

const reverbKey = import.meta.env.VITE_REVERB_APP_KEY || 'no-key-defined';

const host = window.location.hostname;
const token = localStorage.getItem('pos_token');

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: reverbKey,
    wsHost: import.meta.env.VITE_REVERB_HOST || host,
    wsPort: import.meta.env.VITE_REVERB_PORT || 8090,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8090,
    forceTLS: false,
    enabledTransports: ['ws'],
    activityTimeout: 120000,
    pongTimeout: 30000,
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

// Connection Status Listeners
echo.connector.pusher.connection.bind('state_change', (states) => {
    console.log(`[Echo] Connection state changed from ${states.previous} to ${states.current}`);
    if (states.current === 'unavailable' || states.current === 'disconnected') {
        toast.error('انقطع الاتصال بخادم الإشعارات. جاري المحاولة...', { id: 'echo-conn' });
    } else if (states.current === 'connected' && states.previous !== 'initialized') {
        toast.success('تمت استعادة الاتصال بنجاح.', { id: 'echo-conn' });
    }
});

export default echo;

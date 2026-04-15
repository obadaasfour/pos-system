// import Echo from 'laravel-echo';
// import Pusher from 'pusher-js';

// window.Pusher = Pusher;

// const echo = new Echo({
//     broadcaster: 'reverb',
//     key: import.meta.env.VITE_REVERB_APP_KEY || 'poskey123',
//     wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
//     wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
//     wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
//     forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
//     enabledTransports: ['ws', 'wss'],
// });

// Dummy echo to prevent errors in code
const echo = {
    channel: () => ({ listen: () => ({}) }),
    private: () => ({ listen: () => ({}) }),
    leaveChannel: () => {}
};

export default echo;

const RENDER_WS_URL = 'wss://webgl-portfolio-pong.onrender.com';

export const WS_URL = import.meta.env.PROD ? RENDER_WS_URL : 'ws://localhost:8080';

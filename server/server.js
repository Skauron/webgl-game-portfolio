import { WebSocketServer } from 'ws';
import { Match } from './match.js';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

let activeMatch = null;
const queue = [];

function tryPairNext() {
  if (activeMatch || queue.length < 2) return;
  const leftSocket = queue.shift();
  const rightSocket = queue.shift();
  activeMatch = new Match(leftSocket, rightSocket, () => {
    activeMatch = null;
    tryPairNext();
  });
}

function handleConnection(socket) {
  queue.push(socket);
  socket.send(JSON.stringify({ type: 'waiting' }));
  socket.on('close', () => {
    const index = queue.indexOf(socket);
    if (index !== -1) queue.splice(index, 1);
  });
  tryPairNext();
}

wss.on('connection', handleConnection);

console.log(`Pong server listening on port ${PORT}`);

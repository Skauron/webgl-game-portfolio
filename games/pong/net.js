export function connect(url, handlers) {
  const socket = new WebSocket(url);

  socket.addEventListener('open', () => {
    if (handlers.onOpen) handlers.onOpen();
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (handlers.onMessage) handlers.onMessage(message);
  });

  socket.addEventListener('close', () => {
    if (handlers.onClose) handlers.onClose();
  });

  socket.addEventListener('error', () => {
    if (handlers.onError) handlers.onError();
  });

  function sendInput(direction) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', direction }));
    }
  }

  return { sendInput };
}

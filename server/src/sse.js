const clients = new Set();
let heartbeatInterval;

export function addClient(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  clients.add(res);

  res.on('close', () => {
    clients.delete(res);
  });
}

export function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

export function getClientCount() {
  return clients.size;
}

export function startHeartbeat() {
  heartbeatInterval = setInterval(() => {
    broadcast('heartbeat', { time: new Date().toISOString() });
  }, 30_000);
}

export function stopHeartbeat() {
  clearInterval(heartbeatInterval);
}

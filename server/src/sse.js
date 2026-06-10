const clients = new Map(); // res → consecutive failed-write count
const MAX_FAILED_WRITES = 3;
let heartbeatInterval;

export function addClient(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  clients.set(res, 0);

  res.on('close', () => {
    clients.delete(res);
  });
  res.on('error', () => {
    clients.delete(res);
    res.destroy();
  });
}

function dropClient(client) {
  clients.delete(client);
  client.destroy();
}

export function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [client, failedWrites] of clients) {
    if (client.writableEnded || client.destroyed) {
      dropClient(client);
      continue;
    }
    if (client.write(payload)) {
      clients.set(client, 0);
    } else if (failedWrites + 1 >= MAX_FAILED_WRITES) {
      dropClient(client);
    } else {
      clients.set(client, failedWrites + 1);
    }
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

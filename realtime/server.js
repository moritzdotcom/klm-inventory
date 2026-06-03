const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT || 3001);
const INTERNAL_REALTIME_SECRET = process.env.INTERNAL_REALTIME_SECRET;

if (!INTERNAL_REALTIME_SECRET) {
  throw new Error('INTERNAL_REALTIME_SECRET is missing');
}

const app = express();
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: false,
  },
});

function getWaiterRoom(eventId) {
  return `waiter:${eventId}`;
}

io.on('connection', (socket) => {
  socket.on('waiter:join', ({ eventId }) => {
    if (typeof eventId !== 'string' || !eventId) return;

    socket.join(getWaiterRoom(eventId));
  });

  socket.on('waiter:leave', ({ eventId }) => {
    if (typeof eventId !== 'string' || !eventId) return;

    socket.leave(getWaiterRoom(eventId));
  });
});

/**
 * Nur aus dem internen Docker-Netz aufrufen.
 * Der Endpoint sendet keine Datenbankdaten an den Client,
 * sondern lediglich ein Invalidierungs-Signal.
 */
app.post('/internal/waiter/:eventId/changed', (req, res) => {
  const secret = req.header('x-realtime-secret');

  if (secret !== INTERNAL_REALTIME_SECRET) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  const { eventId } = req.params;

  io.to(getWaiterRoom(eventId)).emit('waiter:changed', {
    eventId,
    changedAt: new Date().toISOString(),
  });

  return res.status(204).end();
});

app.get('/health', (_req, res) => {
  return res.status(200).json({
    ok: true,
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Realtime service listening on port ${PORT}`);
});

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// --- Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, '../client');

// Debug: Check if client files exist
if (fs.existsSync(clientPath)) {
  console.log('Serving client files from:', clientPath);
} else {
  console.error('CRITICAL: Client folder missing at:', clientPath);
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.static(clientPath));

// Fallback: serve index.html for non-API routes (SPA support)
// But return 404 for missing assets (files with extensions)
app.get('*', (req, res) => {
  if (req.url.includes('.')) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;

// --- State ---
const rooms = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', ({ roomId, userName, color }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = socket.id;
    socket.data.userName = userName;
    socket.data.color = color;

    console.log(`${userName} joined room: ${roomId}`);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    socket.emit('sync-history', rooms[roomId]);

    socket.to(roomId).emit('user-joined', { userId: socket.id, userName, color });
  });

  socket.on('draw', (data) => {
    const { roomId } = socket.data;
    if (!roomId) return;

    const operation = {
      ...data,
      userId: socket.id,
      id: data.id || Date.now() + Math.random()
    };

    if (data.type === 'draw-end' || data.type === 'draw-full') {
      rooms[roomId].push(operation);
    }

    socket.to(roomId).emit('draw', operation);
  });

  socket.on('cursor-move', (data) => {
    const { roomId } = socket.data;
    if (!roomId) return;

    socket.to(roomId).emit('cursor-update', {
      userId: socket.id,
      userName: socket.data.userName,
      color: socket.data.color,
      x: data.x,
      y: data.y
    });
  });

  /**
   * Undo Logic
   * We find the user's last operation and mark it as 'undone'.
   * This preserves history (nothing is deleted) which is safer.
   */
  socket.on('undo', () => {
    const { roomId } = socket.data;
    if (!roomId || !rooms[roomId]) return;

    const roomOps = rooms[roomId];
    // Iterate backwards to find the LATEST action by this user
    for (let i = roomOps.length - 1; i >= 0; i--) {
      if (roomOps[i].userId === socket.id && !roomOps[i].undone) {
        roomOps[i].undone = true; // Soft delete
        // Broadcast specific undo instruction
        io.to(roomId).emit('undo', { opId: roomOps[i].id, userId: socket.id });
        return;
      }
    }
  });

  socket.on('clear', () => {
    const { roomId } = socket.data;
    if (!roomId || !rooms[roomId]) return;

    const roomOps = rooms[roomId];
    roomOps.forEach(op => {
      if (op.userId === socket.id) {
        op.undone = true;
      }
    });

    io.to(roomId).emit('clear', { userId: socket.id });
  });

  socket.on('disconnect', () => {
    const { roomId } = socket.data;
    if (roomId) {
      io.to(roomId).emit('user-left', { userId: socket.id });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

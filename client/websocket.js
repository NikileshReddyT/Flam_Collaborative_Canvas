import { io } from 'socket.io-client';

export class WebSocketClient {
  constructor(serverUrl, onStatusChange) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.connectorId = null; // assigned by server (socket.id)
    this.onStatusChange = onStatusChange;

    // Callbacks
    this.callbacks = {};
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  connect(roomId, userName) {
    console.log(`Connecting to ${this.serverUrl} [Room: ${roomId}]`);

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.connectorId = this.socket.id;
      this.onStatusChange(true);

      // Join Room immediately
      this.socket.emit('join-room', {
        roomId,
        userName,
        color: this.generateColor()
      });
    });

    this.socket.on('disconnect', () => this.onStatusChange(false));

    // --- Server Events ---

    this.socket.on('sync-history', (history) => {
      if (this.callbacks['sync']) this.callbacks['sync'](history);
    });

    this.socket.on('user-joined', (user) => {
      if (this.callbacks['user-joined']) this.callbacks['user-joined'](user);
    });

    this.socket.on('user-left', (data) => {
      if (this.callbacks['user-left']) this.callbacks['user-left'](data);
    });

    this.socket.on('draw', (data) => {
      if (this.callbacks['draw']) this.callbacks['draw'](data);
    });

    this.socket.on('cursor-update', (data) => {
      if (this.callbacks['cursor']) this.callbacks['cursor'](data);
    });

    this.socket.on('clear', (data) => {
      if (this.callbacks['clear']) this.callbacks['clear'](data);
    });

    this.socket.on('undo', (data) => {
      if (this.callbacks['undo']) this.callbacks['undo'](data);
    });
  }

  // --- Actions ---

  sendDrawStart(stroke) {
    this.emit('draw', { type: 'draw-start', stroke });
  }

  sendDrawPoint(strokeId, point) {
    this.emit('draw', { type: 'draw-point', strokeId, point });
  }

  sendDrawEnd(stroke) {
    this.emit('draw', { type: 'draw-end', stroke });
  }

  sendCursor(x, y) {
    this.emit('cursor-move', { x, y });
  }

  sendClear() {
    this.emit('clear', {});
  }

  sendUndo() {
    this.emit('undo', {});
  }

  generateColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getUserId() {
    return this.connectorId;
  }
}

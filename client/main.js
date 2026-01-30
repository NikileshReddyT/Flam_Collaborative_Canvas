import { CanvasDrawing } from './canvas.js';
import { WebSocketClient } from './websocket.js';

class App {
  constructor() {
    this.canvasDrawing = null;
    this.ws = null;
    this.userName = '';
    this.roomId = 'lobby';
    this.cursors = new Map(); // userId -> DOM Element

    this.initUI();
  }

  initUI() {
    // Modal Logic
    const modal = document.getElementById('nameModal');
    const nameInput = document.getElementById('nameInput');
    const roomInput = document.getElementById('roomInput');
    const joinBtn = document.getElementById('joinBtn');

    // Retrieve saved
    nameInput.value = localStorage.getItem('canvas_name') || '';
    roomInput.value = localStorage.getItem('canvas_room') || '';

    // URL Param override
    const params = new URLSearchParams(window.location.search);
    if (params.get('room')) roomInput.value = params.get('room');

    const joinAction = () => {
      const name = nameInput.value.trim();
      const room = roomInput.value.trim() || 'lobby';

      if (!name) {
        alert('Please enter a name');
        return;
      }

      this.userName = name;
      this.roomId = room;

      localStorage.setItem('canvas_name', name);
      localStorage.setItem('canvas_room', room);

      modal.style.display = 'none';
      if (!this.canvasDrawing) {
        this.start();
      } else {
        // Re-connect logic if implementing "Change Room" feature fully
        window.location.reload();
      }
    };

    joinBtn.addEventListener('click', joinAction);

    // Also allow changing name/room from within app
    const nameChangeModal = document.getElementById('nameChangeModal');
    const nameChangeInput = document.getElementById('nameChangeInput');
    const saveNameBtn = document.getElementById('saveNameBtn');

    saveNameBtn.addEventListener('click', () => {
      const newName = nameChangeInput.value.trim();
      if (newName) {
        this.userName = newName;
        localStorage.setItem('canvas_name', newName);
        // Refresh to re-join with new name (Simplest way to handle auth update)
        window.location.reload();
      }
    });

    document.getElementById('currentUser').addEventListener('click', () => {
      // Simple prompt for now, or reuse modal
      modal.style.display = 'flex';
      nameInput.value = this.userName;
      roomInput.value = this.roomId;
    });
  }

  start() {
    const canvas = document.getElementById('drawingCanvas');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    this.canvasDrawing = new CanvasDrawing(canvas);

    this.ws = new WebSocketClient('http://localhost:3000', (connected) => {
      const statusText = document.getElementById('connectionText');
      if (statusText) statusText.textContent = connected ? 'Connected' : 'Disconnected';
    });

    // --- Wire up WS events ---
    this.ws.on('sync', (history) => {
      this.canvasDrawing.loadHistory(history);
      this.updateUndoState();
    });

    this.ws.on('user-joined', (user) => {
      this.toast(`${user.userName} joined`);
    });

    this.ws.on('user-left', (data) => {
      this.removeCursor(data.userId);
    });

    this.ws.on('draw', (data) => {
      if (data.userId === this.ws.getUserId()) return;
      switch (data.type) {
        case 'draw-start': this.canvasDrawing.handleRemoteStart(data); break;
        case 'draw-point': this.canvasDrawing.handleRemotePoint(data); break;
        case 'draw-end': this.canvasDrawing.handleRemoteEnd(data); break;
      }
    });

    this.ws.on('cursor', (data) => {
      if (data.userId === this.ws.getUserId()) return;
      this.updateCursor(data);
    });

    this.ws.on('clear', (data) => {
      if (data.userId === this.ws.getUserId()) return;
      this.canvasDrawing.removeUserStrokes(data.userId);
      this.toast(`User cleared their canvas`);
    });

    this.ws.on('undo', (data) => {
      if (data.userId === this.ws.getUserId()) return;
      this.canvasDrawing.undoRemoteUser(data.userId);
    });

    // --- Wire up Canvas events to WS ---
    this.canvasDrawing.onDrawStart = (stroke) => {
      this.ws.sendDrawStart(stroke);
    };
    this.canvasDrawing.onDrawPoint = (strokeId, point) => {
      this.ws.sendDrawPoint(strokeId, point);
    };
    this.canvasDrawing.onDrawEnd = (stroke) => {
      this.ws.sendDrawEnd(stroke);
      this.updateUndoState();
    };

    // --- Wire up UI Controls ---
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
      btn.onclick = () => {
        this.selectTool(btn.dataset.tool);
      };
    });

    // --- Keyboard Shortcuts ---
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'b') this.selectTool('brush');
      if (key === 'e') this.selectTool('eraser');
      if (key === 'r') this.selectTool('rect');

      // Undo
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        document.getElementById('undoBtn').click();
      }
    });

    // Width
    document.getElementById('strokeWidth').oninput = (e) => {
      const w = parseInt(e.target.value);
      this.canvasDrawing.setWidth(w);
      document.getElementById('strokeValue').textContent = w + 'px';
    };

    // Clear
    document.getElementById('clearBtn').onclick = () => {
      if (confirm("Clear your drawings?")) {
        this.canvasDrawing.clearMy();
        this.ws.sendClear();
        this.updateUndoState();
      }
    };

    // Undo
    document.getElementById('undoBtn').onclick = () => {
      if (this.canvasDrawing.undoMyLast()) {
        this.ws.sendUndo();
        this.updateUndoState();
      }
    };

    // Color
    document.querySelectorAll('.preset-color').forEach(btn => {
      btn.onclick = () => {
        const color = btn.dataset.color;
        this.canvasDrawing.setColor(color);
        document.getElementById('currentColor').style.background = color;
        document.getElementById('colorPalette').classList.add('hidden');
      };
    });

    document.getElementById('colorPicker').onclick = (e) => {
      e.stopPropagation();
      document.getElementById('colorPalette').classList.toggle('hidden');
    };

    // Cursor tracking
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.ws.sendCursor(e.clientX - rect.left, e.clientY - rect.top);
    });

    // Connect!
    this.ws.connect(this.roomId, this.userName);

    // Set UI info
    document.getElementById('currentUser').textContent = `Profile: ${this.userName} (${this.roomId})`;
  }

  // --- Helpers ---

  updateUndoState() {
    const btn = document.getElementById('undoBtn');
    if (this.canvasDrawing.hasMyStrokes()) {
      btn.removeAttribute('disabled');
    } else {
      btn.setAttribute('disabled', 'true');
    }
  }

  updateCursor(data) {
    let cursor = this.cursors.get(data.userId);
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.className = 'remote-cursor';
      cursor.innerHTML = `
            <svg viewBox="0 0 18 24" fill="${data.color || '#000'}" stroke="white" stroke-width="2">
                <path d="M0 0 L18 12 L10 14 L6 24 L0 0"/>
            </svg>
            <div class="remote-cursor-label" style="background: ${data.color || '#000'}">${data.userName}</div>
        `;
      document.getElementById('cursorLayer').appendChild(cursor);
      this.cursors.set(data.userId, cursor);
    }
    cursor.style.transform = `translate3d(${data.x}px, ${data.y}px, 0)`;
  }

  removeCursor(userId) {
    const cursor = this.cursors.get(userId);
    if (cursor) {
      cursor.remove();
      this.cursors.delete(userId);
    }
  }

  selectTool(tool) {
    if (!this.canvasDrawing) return;
    this.canvasDrawing.setTool(tool);
    document.querySelectorAll('.tool-btn').forEach(btn => {
      if (btn.dataset.tool === tool) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  toast(msg) {
    console.log(msg); // simplified
  }
}

new App();

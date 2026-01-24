export class CanvasDrawing {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Smooth lines
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.myStrokes = [];
    this.remoteStrokes = new Map();

    this.activeRemoteStrokes = new Map();

    this.isDrawing = false;
    this.currentStroke = null;
    this.tool = 'brush';
    this.color = '#000000';
    this.width = 5;

    this.onDrawStart = null;
    this.onDrawPoint = null;
    this.onDrawEnd = null;

    this.initListeners();
  }

  initListeners() {
    // We bind 'this' to ensure the context remains the class instance
    this.canvas.addEventListener('mousedown', this.start.bind(this));
    this.canvas.addEventListener('mousemove', this.move.bind(this));
    this.canvas.addEventListener('mouseup', this.end.bind(this));
    this.canvas.addEventListener('mouseleave', this.end.bind(this));

    // Performance: Handle resize to prevent blurry canvas
    window.addEventListener('resize', this.redraw.bind(this));
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.redraw();
  }

  // --- Local Drawing ---

  start(e) {
    this.isDrawing = true;
    const { x, y } = this.getCoords(e);

    this.currentStroke = {
      id: Date.now() + Math.random().toString(),
      type: this.tool,
      color: this.color,
      width: this.width,
      points: [{ x, y }]
    };

    // Draw dot
    this.ctx.beginPath();
    this.ctx.fillStyle = this.color;
    this.ctx.arc(x, y, this.width / 2, 0, Math.PI * 2);
    this.ctx.fill();

    if (this.onDrawStart) this.onDrawStart(this.currentStroke);
  }

  move(e) {
    if (!this.isDrawing) return;
    const { x, y } = this.getCoords(e);
    this.currentStroke.points.push({ x, y });

    // Render
    if (this.currentStroke.type === 'rect') {
      this.redraw(); // Full redraw to animate rect stretching
    } else {
      // Optimization for brush: just draw latest segment
      const points = this.currentStroke.points;
      if (points.length >= 2) {
        this.renderSegment(points[points.length - 2], points[points.length - 1], this.currentStroke);
      }
    }

    if (this.onDrawPoint) this.onDrawPoint(this.currentStroke.id, { x, y });
  }

  end() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    // Save
    this.myStrokes.push(this.currentStroke);

    if (this.onDrawEnd) this.onDrawEnd(this.currentStroke);
    this.currentStroke = null;
  }

  // --- Sync Logic ---

  // Called when remote user starts
  handleRemoteStart(data) {
    this.activeRemoteStrokes.set(data.stroke.id, {
      ...data.stroke,
      points: [] // Start empty, fill as we get points
    });
  }

  // Called when remote user moves
  handleRemotePoint(data) {
    const stroke = this.activeRemoteStrokes.get(data.strokeId);
    if (stroke) {
      stroke.points.push(data.point);

      // Fix for Rectangle: Redraw full canvas to show expanding box live
      if (stroke.type === 'rect') {
        this.redraw();
        return;
      }

      const len = stroke.points.length;
      if (len >= 2) {
        this.renderSegment(stroke.points[len - 2], stroke.points[len - 1], stroke);
      } else {
        // First point dot
        this.ctx.beginPath();
        this.ctx.fillStyle = stroke.color;
        this.ctx.arc(data.point.x, data.point.y, stroke.width / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  // Called when remote user finishes
  handleRemoteEnd(data) {
    const strokeId = data.stroke.id;
    const strokeData = data.stroke;
    const userId = data.userId;

    // Check if we were tracking this live
    const wasTracking = this.activeRemoteStrokes.has(strokeId);

    // Finalize
    if (wasTracking) {
      this.activeRemoteStrokes.delete(strokeId);
    }

    // Add to permanent storage
    if (!this.remoteStrokes.has(userId)) {
      this.remoteStrokes.set(userId, []);
    }
    this.remoteStrokes.get(userId).push(strokeData);

    // If we missed the live drawing (e.g. joined mid-stroke), render it now
    if (!wasTracking) {
      this.renderStroke(strokeData);
    }
  }

  // Called on 'sync-history'
  loadHistory(ops) {
    ops.forEach(op => {
      if (op.type === 'draw-end') {
        const userId = op.userId;
        if (!this.remoteStrokes.has(userId)) {
          this.remoteStrokes.set(userId, []);
        }
        const moves = this.remoteStrokes.get(userId);
        // Check dupes
        if (!moves.find(m => m.id === op.stroke.id)) {
          moves.push(op.stroke);
        }
      } else if (op.undone) {
        // handle historical undo? 
        // In this simple model, we might just not load it?
        // But server sends everything. We should check 'undone' flag.
        // Simpler: Just don't draw it if 'undone' is true. 
        // But simplified store might push 'undone' as a property of the op.
      }
    });

    // Prune undone
    ops.forEach(op => {
      if (op.undone && op.type === 'draw-end') {
        // Remove from remoteStrokes
        const userId = op.userId;
        if (this.remoteStrokes.has(userId)) {
          const strokes = this.remoteStrokes.get(userId);
          const idx = strokes.findIndex(s => s.id === op.stroke.id);
          if (idx !== -1) strokes[idx].undone = true; // Mark locally
        }
      }
    });

    this.redraw();
  }

  // --- Manipulation ---

  undoMyLast() {
    if (this.myStrokes.length > 0) {
      this.myStrokes.pop();
      this.redraw();
      return true;
    }
    return false;
  }

  clearMy() {
    this.myStrokes = [];
    this.redraw();
  }

  removeUserStrokes(userId) {
    if (this.remoteStrokes.has(userId)) {
      this.remoteStrokes.set(userId, []); // Clear their strokes
    }
    this.redraw();
  }

  undoRemoteUser(userId) {
    if (this.remoteStrokes.has(userId)) {
      const strokes = this.remoteStrokes.get(userId);
      if (strokes.length > 0) {
        strokes.pop(); // Remove last
        this.redraw();
      }
    }
  }

  // --- Rendering ---

  renderSegment(p1, p2, stroke) {
    if (stroke.type === 'rect') {
      // For rectangle, we don't draw segments. We wait for redraw or handle it in move.
      // But for "live" preview in move(), we might want to clear and draw rect?
      // Actually, easiest is to handle rect drawing in redraw() or specific move logic.
      // for "active" remote strokes, we might need special handling.
      return;
    }

    this.ctx.beginPath();
    this.ctx.strokeStyle = stroke.type === 'eraser' ? '#FFFFFF' : stroke.color;
    this.ctx.lineWidth = stroke.width;
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);
    this.ctx.stroke();
  }

  // --- Rendering ---

  redraw() {
    // Clear
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Remote (Completed)
    for (const [userId, strokes] of this.remoteStrokes) {
      strokes.forEach(s => {
        if (!s.undone) this.renderStroke(s);
      });
    }

    // Draw Remote (Active/In-Progress) - Essential for seeing others drag Rectangles
    for (const [strokeId, stroke] of this.activeRemoteStrokes) {
      this.renderStroke(stroke);
    }

    // Draw Mine
    this.myStrokes.forEach(s => this.renderStroke(s));

    // Draw Current Active Stroke (if any, specifically for Rect preview)
    if (this.isDrawing && this.currentStroke && this.currentStroke.type === 'rect') {
      this.renderStroke(this.currentStroke);
    }
  }

  renderStroke(stroke) {
    // Handle Rectangle
    if (stroke.type === 'rect') {
      if (stroke.points.length < 1) return;
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1]; // Current end

      this.ctx.beginPath();
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = stroke.width;
      this.ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      return;
    }

    // Handle Brush/Eraser
    if (stroke.points.length < 1) return;

    this.ctx.beginPath();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = stroke.type === 'eraser' ? '#FFFFFF' : stroke.color;
    this.ctx.lineWidth = stroke.width;

    if (stroke.points.length === 1) {
      this.ctx.fillStyle = stroke.type === 'eraser' ? '#FFFFFF' : stroke.color;
      this.ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
      this.ctx.fill();
      return;
    }

    this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    this.ctx.stroke();
  }

  hasMyStrokes() {
    return this.myStrokes.length > 0;
  }

  getCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // --- Export ---
  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }

  setTool(t) { this.tool = t; }
  setColor(c) { this.color = c; }
  setWidth(w) { this.width = w; }
}

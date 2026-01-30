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
    // For Eraser, we MUST redraw to ensure layer isolation (otherwise we delete remote user pixels from main canvas!)
    // For Rect, we generally don't draw the initial dot.
    if (this.tool === 'eraser' || this.tool === 'rect') {
      this.redraw();
    } else {
      // For Brush, drawing directly to specific context is optimized and safe (additive)
      this.ctx.beginPath();
      this.ctx.fillStyle = this.color;
      this.ctx.arc(x, y, this.width / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

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
      // But we must draw to the CORRECT context.
      // Since 'move' is for local drawing, we ideally want to draw to the 'Layer' logic if we were strictly layered.
      // However, for performance, we often just draw to main ctx.
      // BUT if we are erasing, drawing to main ctx will erase remote strokes too!
      // So... we MUST fully redraw if erasing to maintain the layer illusion?
      // Or we can draw to a temp layer?
      // Simplest: If erasing, trigger full redraw. If brushing, direct draw is "okay" but might overlap remote until next redraw?
      // Actually, if we draw My Stroke on top, it covers remote. That's fine.
      // If we Erase, we MUST use layer logic.
      if (this.tool === 'eraser') {
        this.redraw();
      } else {
        const points = this.currentStroke.points;
        if (points.length >= 2) {
          this.renderSegment(points[points.length - 2], points[points.length - 1], this.currentStroke, this.ctx);
        }
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

    // For Eraser, we must redraw immediately to ensure proper layering of the initial state
    if (data.stroke.type === 'eraser') {
      this.redraw();
    }
  }

  // Called when remote user moves
  handleRemotePoint(data) {
    const stroke = this.activeRemoteStrokes.get(data.strokeId);
    if (stroke) {
      stroke.points.push(data.point);

      // Fix for Rectangle & Eraser: Redraw to ensure correct layering
      if (stroke.type === 'rect' || stroke.type === 'eraser') {
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
      if (strokeData.type === 'eraser') {
        this.redraw();
      } else {
        this.renderStroke(strokeData);
      }
    } else {
      // If we WERE tracking, we still need to redraw if it was an eraser/rect
      // because we just moved it from "Active" to "Static", and 'redraw' handles them differently?
      // Actually, redraw handles them same way.
      // BUT if the last 'move' event didn't fire (rare), updating it might be needed.
      // SAFE BET: Always redraw on Eraser End to ensure the cut is permanent and clean.
      if (strokeData.type === 'eraser') {
        this.redraw();
      }
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

  // --- Rendering ---

  renderSegment(p1, p2, stroke, targetCtx = this.ctx) {
    if (stroke.type === 'rect') return;

    targetCtx.save();
    if (stroke.type === 'eraser') {
      targetCtx.globalCompositeOperation = 'destination-out';
    }

    targetCtx.beginPath();
    targetCtx.strokeStyle = stroke.color;
    targetCtx.lineWidth = stroke.width;
    targetCtx.moveTo(p1.x, p1.y);
    targetCtx.lineTo(p2.x, p2.y);
    targetCtx.stroke();
    targetCtx.restore();
  }

  redraw() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Clear Main
    this.ctx.clearRect(0, 0, w, h);

    // Ensure Layer
    if (!this.layerCanvas) {
      this.layerCanvas = document.createElement('canvas');
    }
    if (this.layerCanvas.width !== w || this.layerCanvas.height !== h) {
      this.layerCanvas.width = w;
      this.layerCanvas.height = h;
    }
    const lCtx = this.layerCanvas.getContext('2d');
    // Important: Ensure layer settings match
    lCtx.lineCap = 'round';
    lCtx.lineJoin = 'round';

    // 2. Identify all Remote Users
    const remoteUsers = new Set(this.remoteStrokes.keys());
    this.activeRemoteStrokes.forEach(s => {
      if (s.userId) remoteUsers.add(s.userId);
    });

    // 3. Render Each Remote User (Isolated Layering)
    for (const userId of remoteUsers) {
      // Clear Layer
      lCtx.clearRect(0, 0, w, h);

      // Draw History
      const history = this.remoteStrokes.get(userId);
      if (history) {
        history.forEach(s => {
          if (!s.undone) this.renderStroke(s, lCtx);
        });
      }

      // Draw Active
      this.activeRemoteStrokes.forEach(s => {
        if (s.userId === userId) this.renderStroke(s, lCtx);
      });

      // Composite to Main
      this.ctx.drawImage(this.layerCanvas, 0, 0);
    }

    // 4. Render Me (Isolated Layering)
    if (this.myStrokes.length > 0 || (this.isDrawing && this.currentStroke)) {
      lCtx.clearRect(0, 0, w, h);

      this.myStrokes.forEach(s => this.renderStroke(s, lCtx));

      if (this.isDrawing && this.currentStroke) {
        this.renderStroke(this.currentStroke, lCtx);
      }

      this.ctx.drawImage(this.layerCanvas, 0, 0);
    }
  }

  renderStroke(stroke, targetCtx = this.ctx) {
    // Handle Rectangle
    if (stroke.type === 'rect') {
      if (stroke.points.length < 1) return;
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];

      targetCtx.beginPath();
      targetCtx.strokeStyle = stroke.color;
      targetCtx.lineWidth = stroke.width;
      targetCtx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      return;
    }

    // Handle Brush/Eraser
    if (stroke.points.length < 1) return;

    targetCtx.save();
    if (stroke.type === 'eraser') {
      targetCtx.globalCompositeOperation = 'destination-out';
    }

    targetCtx.beginPath();
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    targetCtx.strokeStyle = stroke.color;
    targetCtx.lineWidth = stroke.width;

    if (stroke.points.length === 1) {
      targetCtx.fillStyle = stroke.color;
      targetCtx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();
      return;
    }

    targetCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      targetCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    targetCtx.stroke();
    targetCtx.restore();
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

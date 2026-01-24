# Architecture Documentation

## System Overview

The application is a real-time collaborative drawing platform that uses a **Client-Server** architecture. Communication is handled via **WebSockets** (using Socket.io) to ensure low-latency updates for drawing operations, cursor movements, and state synchronization.

## Tech Stack

-   **Runtime**: Node.js
-   **Transport**: Socket.io (WebSockets with polling fallback)
-   **Frontend**: Vanilla JavaScript (ES Modules), HTML5 Canvas API, CSS3
-   **Storage**: In-memory (Server RAM)

## Data Flow

### 1. Connection Lifecycle
1.  Client connects to server (`ws://`).
2.  Client emits `join-room` with `roomId` and `userName`.
3.  Server adds socket to the Socket.io Room.
4.  Server sends `sync-history` (full array of past strokes in that room).
5.  Server broadcasts `user-joined` to other room members.

### 2. Drawing Operations
Drawing is event-driven to maximize performance. We do not sync the entire canvas state (pixels); instead, we sync the **vector operations**.

*   **`draw-start`**: Emitted when `mousedown`. Contains stroke ID, color, width, and start coordinates.
*   **`draw-point`**: Emitted on `mousemove`. Contains the new point. Clients continuously render line segments between points.
*   **`draw-end`**: Emitted on `mouseup`. Marks stroke as complete. The server adds this completed stroke to the persistent history.

### 3. Synchronization Strategy
The app uses an **Optimistic UI** with **Isolated User Histories**.

-   **Local**: The user draws immediately to the canvas (`myStrokes` array).
-   **Remote**: Remote events are rendered into a separate layer (`remoteStrokes` Map).
-   **Conflict Resolution**: There is no complex merging. Operations are additive.
-   **Undo/Redo**:
    -   Undoing triggers a "soft delete".
    -   The server marks the specific stroke ID as `undone: true`.
    -   All clients redraw the canvas, filtering out strokes marked as undone.

## Component Structure

### Client
-   **`main.js`**: Application entry point. Manages UI state (modal, toolbar), initializes the WebSocket connection, and routes events between the UI and Canvas logic.
-   **`canvas.js`**: Pure rendering engine. Manages the HTML5 Canvas context (`2d`). Handles coordinate mapping, line rendering (Bézier smoothing via lineJoin), and maintains the local state arrays.
-   **`websocket.js`**: Network abstraction layer. Handles connection retry logic and event listener bindings.

### Server
-   **`server.js`**: Express/Socket.io entry point.
-   **State**: `const rooms = { 'roomId': [ ...operations ] }`
-   **Events**: Listens for `draw`, `cursor`, `clear`, `undo`, `join-room`.

## Security & Performance
-   **Sanitization**: Basic input limitations on text fields.
-   **Performance**:
    -   Cursor updates are volatile and not stored in history.
    -   Only "completed" strokes (`draw-end`) are stored in server memory to reduce RAM usage.
    -   Canvas uses `requestAnimationFrame` implicitly via event loops, and `redraw()` is optimized to only run on state changes (Resize, Undo, Clear).

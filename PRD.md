# Product Requirements Document (PRD)
## Real-Time Collaborative Drawing Canvas

---

## 1. Product Overview

**Objective**: Build a multi-user drawing application with real-time synchronization where multiple users can draw simultaneously on a shared canvas.

**Core Technology Stack**:
- Frontend: HTML5 Canvas API (raw, no libraries)
- Backend: Node.js + Socket.io/native WebSockets
- No external drawing libraries

---

## 2. Functional Requirements

### 2.1 Drawing Tools
- **FR-1**: Brush tool for freehand drawing
- **FR-2**: Eraser tool to remove drawn content
- **FR-3**: Color picker for brush color selection
- **FR-4**: Stroke width adjustment (slider/input for brush thickness)
- **FR-5**: All tools must work with raw Canvas API only

### 2.2 Real-Time Synchronization
- **FR-6**: Broadcast drawing strokes to all connected users in real-time
- **FR-7**: Display strokes as they are being drawn (not after completion)
- **FR-8**: Synchronize canvas state for newly joined users
- **FR-9**: Handle network latency gracefully

### 2.3 User Indicators
- **FR-10**: Display cursor positions of other active users
- **FR-11**: Show visual indicator (cursor icon/circle) at remote user positions
- **FR-12**: Update cursor positions in real-time during drawing
- **FR-13**: Remove cursor indicators when users disconnect

### 2.4 Conflict Resolution
- **FR-14**: Allow multiple users to draw in overlapping areas simultaneously
- **FR-15**: Render strokes in chronological order of receipt
- **FR-16**: Maintain visual consistency across all clients

### 2.5 Global Undo/Redo
- **FR-17**: Implement undo functionality that works across all users
- **FR-18**: Implement redo functionality that works across all users
- **FR-19**: Maintain operation history shared across all connected clients
- **FR-20**: Handle undo/redo conflicts when User A undoes User B's action
- **FR-21**: Preserve canvas state consistency during undo/redo operations

### 2.6 User Management
- **FR-22**: Display list of currently online users
- **FR-23**: Assign unique color identifier to each user
- **FR-24**: Show user connection/disconnection events
- **FR-25**: Generate unique user identifiers (no authentication required)

---

## 3. Technical Requirements

### 3.1 Canvas Operations
- **TR-1**: Implement efficient path drawing for smooth lines
- **TR-2**: Optimize for high-frequency mouse events (mousemove)
- **TR-3**: Implement layer management for undo/redo functionality
- **TR-4**: Use efficient redrawing strategies (avoid full canvas clears when possible)
- **TR-5**: Handle canvas rendering performance

### 3.2 WebSocket Architecture
- **TR-6**: Establish WebSocket connection between client and server
- **TR-7**: Define message protocol for drawing events
- **TR-8**: Serialize drawing data efficiently
- **TR-9**: Implement event batching strategy for high-frequency events
- **TR-10**: Handle WebSocket connection failures and reconnection

### 3.3 State Synchronization
- **TR-11**: Maintain operation history data structure on server
- **TR-12**: Implement global operation stack for undo/redo
- **TR-13**: Broadcast state changes to all connected clients
- **TR-14**: Handle race conditions in concurrent operations
- **TR-15**: Ensure eventual consistency across all clients

### 3.4 Error Handling
- **TR-16**: Handle WebSocket disconnection gracefully
- **TR-17**: Handle invalid drawing data
- **TR-18**: Handle canvas rendering errors
- **TR-19**: Display user-friendly error messages
- **TR-20**: Implement fallback behavior for failed operations

---

## 4. Data Structures & Protocol

### 4.1 Drawing Event Structure
```javascript
{
  type: 'draw' | 'erase' | 'undo' | 'redo',
  userId: string,
  timestamp: number,
  data: {
    points: [{x: number, y: number}],
    color: string,
    width: number,
    tool: 'brush' | 'eraser'
  }
}
```

### 4.2 WebSocket Messages
- **Connection**: `{ type: 'connect', userId: string }`
- **Drawing**: `{ type: 'draw', ...drawingEvent }`
- **Cursor**: `{ type: 'cursor', userId: string, x: number, y: number }`
- **Undo**: `{ type: 'undo', userId: string }`
- **Redo**: `{ type: 'redo', userId: string }`
- **Sync**: `{ type: 'sync', operations: [] }`
- **UserJoin**: `{ type: 'user-join', userId: string, color: string }`
- **UserLeave**: `{ type: 'user-leave', userId: string }`

### 4.3 Operation History
- Server maintains array of all operations in chronological order
- Each operation has: `{ id, userId, type, data, timestamp, undone: boolean }`
- Undo marks operation as undone without removing from history
- Redo unmarks operation

---

## 5. File Structure Requirements

```
collaborative-canvas/
├── client/
│   ├── index.html           # Main HTML file
│   ├── style.css            # Styling
│   ├── canvas.js            # Canvas drawing logic
│   ├── websocket.js         # WebSocket client
│   └── main.js              # App initialization
├── server/
│   ├── server.js            # Express + WebSocket server
│   ├── rooms.js             # Room management (if implemented)
│   └── drawing-state.js     # Canvas state management
├── package.json
├── README.md
└── ARCHITECTURE.md
```

---

## 6. Documentation Requirements

### 6.1 README.md Must Include:
- Setup instructions (`npm install && npm start`)
- How to test with multiple users (multiple browser tabs/windows)
- Known limitations/bugs
- Time spent on project

### 6.2 ARCHITECTURE.md Must Include:
- **Data Flow Diagram**: Drawing event flow from user input → canvas rendering
- **WebSocket Protocol**: Complete message types and structure
- **Undo/Redo Strategy**: Global operation stack implementation
- **Performance Decisions**: Justification for batching, throttling, optimization choices
- **Conflict Resolution**: Strategy for handling simultaneous drawing

---

## 7. Edge Cases & Constraints

### 7.1 Network Edge Cases
- **EC-1**: User disconnects mid-stroke
- **EC-2**: High latency causing delayed events
- **EC-3**: WebSocket connection drop and reconnection
- **EC-4**: Out-of-order message delivery

### 7.2 Drawing Edge Cases
- **EC-5**: Rapid mouse movements creating gaps in strokes
- **EC-6**: User undoes while another user is drawing
- **EC-7**: Multiple users undo simultaneously
- **EC-8**: Redo stack invalidation when new operations occur
- **EC-9**: Canvas state sync for late-joining users

### 7.3 Performance Edge Cases
- **EC-10**: High-frequency drawing events (fast mouse movement)
- **EC-11**: Large number of operations in history
- **EC-12**: Multiple simultaneous users drawing
- **EC-13**: Canvas memory management for long sessions

---

## 8. Performance Requirements

- **PR-1**: Drawing latency < 50ms for local user
- **PR-2**: Synchronization latency < 200ms for remote users
- **PR-3**: Support minimum 5 concurrent users smoothly
- **PR-4**: Maintain 30+ FPS during active drawing
- **PR-5**: Efficient memory usage (no memory leaks)

---

## 9. Browser Compatibility

- **BC-1**: Chrome (latest 2 versions)
- **BC-2**: Firefox (latest 2 versions)
- **BC-3**: Safari (latest 2 versions)
- **BC-4**: No mobile support required (desktop focus)

---

## 10. Deployment Requirements

- **DR-1**: Application must be deployable (Heroku, Vercel, etc.)
- **DR-2**: Demo must work immediately without setup
- **DR-3**: Include test instructions for multiple users
- **DR-4**: Use `npm install && npm start` for local setup

---

## 11. Non-Requirements (Out of Scope)

- ❌ User authentication/login system
- ❌ Canvas persistence/save functionality (optional bonus)
- ❌ Mobile touch support (optional bonus)
- ❌ Multiple room system (optional bonus)
- ❌ Advanced shapes/text/images (optional bonus)
- ❌ Using any canvas drawing libraries
- ❌ Database integration

---

## 12. Acceptance Criteria

### Core Functionality
- ✅ Users can draw with brush and eraser
- ✅ Color and stroke width are adjustable
- ✅ Drawing appears in real-time on all connected clients
- ✅ Other users' cursors are visible during drawing
- ✅ Global undo/redo works correctly
- ✅ Online users are displayed with assigned colors
- ✅ Application handles disconnections gracefully

### Technical Quality
- ✅ Clean code organization with separation of concerns
- ✅ Raw Canvas API used (no libraries)
- ✅ WebSocket implementation functional
- ✅ Error handling implemented
- ✅ Documentation complete (README + ARCHITECTURE)

### Deployment
- ✅ Application deployed and accessible
- ✅ Works across multiple browser tabs
- ✅ Setup takes < 5 minutes

---

## 13. Success Metrics

- Application runs without crashes for 30+ minute session
- Undo/redo maintains state consistency across all clients
- Drawing synchronization works smoothly with 3+ concurrent users
- No visual artifacts or rendering issues during normal use

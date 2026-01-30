# Design Document
## Real-Time Collaborative Drawing Canvas (Figma-Style)

---

## 1. Design Philosophy

**Inspired by Figma's Collaborative Experience:**
- Seamless real-time collaboration without explicit "save" actions
- Visible presence of other users (cursors, selections, actions)
- Immediate feedback for all actions
- Non-blocking concurrent editing
- Subtle, non-intrusive collaboration indicators

---

## 2. Visual Design System

### 2.1 Color Palette

**Primary Interface Colors:**
```
Background: #FFFFFF (Canvas)
UI Background: #F5F5F5
Border: #E0E0E0
Text Primary: #2C2C2C
Text Secondary: #6B6B6B
Active/Hover: #0066FF
```

**User Assignment Colors (Auto-assigned):**
```javascript
[
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Orange
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B739', // Gold
  '#52C41A'  // Green
]
```

### 2.2 Typography
```
Primary Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
UI Elements: 14px regular
Labels: 12px medium
User Names: 13px medium
```

---

## 3. Layout Structure

### 3.1 Application Layout (Figma-like)

```
┌─────────────────────────────────────────────────────────────┐
│ Top Toolbar (60px height)                                   │
│ [Logo] [Drawing Tools] [Colors] [Stroke Width] [U/R] [User]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                    Canvas Area                              │
│                  (Infinite White)                           │
│                                                             │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Bottom Status Bar (32px height)                            │
│ [Active Users: 3] [Connection Status] [Latency: 45ms]     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Component Design Specifications

### 4.1 Top Toolbar Design

**Structure:**
```
┌──────────────────────────────────────────────────────────────────┐
│  🎨 Canvas   [🖌️] [🧹] [⚫] [━━━▓░░░░] [↶] [↷]    👥 Alice +2   │
│               ^     ^    ^      ^        ^   ^         ^         │
│            Brush  Erase Color  Width   Undo Redo    Users       │
└──────────────────────────────────────────────────────────────────┘
```

**Component Breakdown:**

1. **Logo/Brand** (Left-aligned)
   - App name: "Canvas"
   - Icon: 🎨
   - Size: 40px x 40px clickable area

2. **Tool Selector** (Left section)
   ```
   ┌────┬────┐
   │ 🖌️ │ 🧹 │  ← Icons with 40x40px hit area
   └────┴────┘
   Active tool: #0066FF background
   Inactive: transparent, hover: #F0F0F0
   ```

3. **Color Picker** (Center-left)
   ```
   ┌──────┐
   │  ⚫  │  ← Current color circle (32px diameter)
   └──────┘
   Click to open color palette dropdown
   ```
   
   **Color Palette Dropdown:**
   ```
   ┌─────────────────────────┐
   │ ⚫ ⚪ 🔴 🟠 🟡 🟢 🔵 🟣 │  ← Preset colors
   ├─────────────────────────┤
   │ Custom: [#______]  [✓] │  ← Hex input
   └─────────────────────────┘
   ```

4. **Stroke Width Slider** (Center)
   ```
   Width: [━━━━▓─────] 5px
          2         20
   
   Slider track: 120px width
   Thumb: 16px circle
   Shows current value below
   ```

5. **Undo/Redo Buttons** (Center-right)
   ```
   ┌────┬────┐
   │ ↶  │ ↷  │  
   └────┴────┘
   Disabled state: opacity 0.3
   Tooltip on hover: "Undo (Ctrl+Z)" / "Redo (Ctrl+Y)"
   ```

6. **Active Users Indicator** (Right-aligned)
   ```
   ┌─────────────────────┐
   │ 👤 👤 👤  Alice +2  │  ← Stacked avatars + count
   └─────────────────────┘
   
   Click to expand user list
   ```

---

### 4.2 Canvas Area Design

**Visual Specifications:**

1. **Base Canvas**
   - Background: Pure white (#FFFFFF)
   - Minimum size: 2000px x 2000px (expandable)
   - Infinite canvas feel (no visible boundaries)
   - Subtle grid (optional): 1px dots every 50px, #F0F0F0

2. **Drawing Layer**
   - Rendered strokes with anti-aliasing
   - Smooth bezier curves between points
   - Real-time rendering as points stream in

3. **Cursor Layer** (Overlay)
   - Positioned above drawing layer
   - Transparent background
   - Shows all remote cursors

---

### 4.3 User Cursor Design (Figma-Style)

**Remote User Cursor Components:**

```
     ┌─────────────────┐
     │  Alice          │  ← Name label
     └─────────────────┘
            ↓
           ╱│  ← Cursor pointer (SVG)
          ╱ │
         ╱  │
        ╱___│
        
Color: User's assigned color
```

**Specifications:**

1. **Cursor Pointer**
   ```html
   SVG Path (18px x 24px):
   - Arrow shape pointing top-left
   - Filled with user's color
   - 2px white stroke for visibility
   - Drop shadow: 0 2px 4px rgba(0,0,0,0.2)
   ```

2. **Name Label**
   ```
   Position: 8px above and 8px right of cursor tip
   
   ┌─────────────┐
   │   Alice     │  ← Rounded rectangle
   └─────────────┘
   
   Background: User's color
   Text: White, 13px medium
   Padding: 4px 8px
   Border radius: 4px
   Max width: 120px (truncate with ...)
   ```

3. **Cursor States:**
   - **Idle**: Full opacity (1.0), cursor visible
   - **Drawing**: Pulsing animation (opacity 0.8-1.0, 1s cycle)
   - **Inactive**: Fade out after 5 seconds of no movement
   - **Disconnected**: Fade out over 500ms, then remove

4. **Drawing Trail Effect** (Optional Enhancement)
   ```
   When user is actively drawing:
   - Show fading trail behind cursor
   - Trail color: User color at 30% opacity
   - Trail length: Last 5 cursor positions
   - Fade from 30% to 0% over positions
   ```

---

### 4.4 User List Panel

**Expanded User List (Dropdown from toolbar):**

```
┌────────────────────────────────────┐
│  Active Users (3)                  │
├────────────────────────────────────┤
│  ● Alice (You)            [Red]    │
│  ● Bob                    [Teal]   │
│  ● Charlie               [Blue]    │
└────────────────────────────────────┘
```

**User Item Specifications:**
```
┌────────────────────────────────────┐
│ ⬤ Username            [Color Dot] │
│ ^     ^                    ^       │
│ |     |                    |       │
│ |     Name (13px)          Color   │
│ Status indicator (8px)             │
└────────────────────────────────────┘

Status colors:
● Green: Active (drawing in last 10s)
● Gray: Idle
```

---

### 4.5 Bottom Status Bar

```
┌──────────────────────────────────────────────────────────┐
│ 👥 3 users online    🟢 Connected    📡 Latency: 45ms   │
└──────────────────────────────────────────────────────────┘
```

**Components:**

1. **Users Count**
   - Icon: 👥
   - Text: "X users online"
   - Updates in real-time

2. **Connection Status**
   - 🟢 Connected (green)
   - 🟡 Connecting... (yellow, pulsing)
   - 🔴 Disconnected (red)

3. **Latency Indicator**
   - Shows round-trip time
   - Color coded:
     - < 100ms: Green
     - 100-300ms: Yellow
     - > 300ms: Red

---

## 5. Interaction Design

### 5.1 Drawing Interaction Flow

**Mouse/Touch Events:**

```
User Action Flow:
┌─────────────┐
│ Mouse Down  │ → Start stroke
│   (click)   │   • Capture starting point
└─────────────┘   • Initialize stroke data
       ↓          • Broadcast stroke-start event
┌─────────────┐
│ Mouse Move  │ → Continue stroke
│  (drag)     │   • Collect points (throttle to 60fps)
└─────────────┘   • Draw locally (immediate)
       ↓          • Batch and broadcast points
┌─────────────┐
│  Mouse Up   │ → End stroke
│ (release)   │   • Finalize stroke
└─────────────┘   • Add to operation history
                  • Broadcast stroke-end event
```

**Visual Feedback Timeline:**
```
0ms:   User clicks → Immediate visual feedback (dot appears)
16ms:  First point rendered on canvas
16ms:  WebSocket message sent (stroke-start)
50ms:  Remote users receive stroke-start
66ms:  Remote users render first point
...
continuous: Points stream every 16ms (60fps)
...
User releases → stroke-end → operation added to history
```

### 5.2 Tool Switching Interaction

**Flow:**
```
1. User clicks tool button
   ↓
2. Visual feedback: Button highlights (#0066FF background)
   ↓
3. Previous tool deactivates (background → transparent)
   ↓
4. Cursor changes:
   • Brush: crosshair cursor + preview circle
   • Eraser: crosshair cursor + eraser icon
   ↓
5. Update internal state (currentTool variable)
```

**Cursor Preview:**
- Show circle at cursor position matching current stroke width
- Color: Current color with 50% opacity (brush) or white with border (eraser)
- Updates position on mousemove

### 5.3 Color Selection Interaction

**Flow:**
```
1. User clicks color circle
   ↓
2. Dropdown appears below (250ms fade-in animation)
   ↓
3. User clicks preset color
   ↓
4. Color circle updates immediately
   ↓
5. Dropdown closes (150ms fade-out)
   ↓
6. New strokes use selected color
```

**Custom Color Entry:**
```
1. User types hex value (#FF5733)
   ↓
2. Preview updates in real-time
   ↓
3. User clicks checkmark
   ↓
4. Color applies, dropdown closes
```

### 5.4 Undo/Redo Interaction

**Global Undo Flow:**
```
User clicks Undo (or Ctrl+Z)
   ↓
Client sends undo request to server
   ↓
Server processes:
   • Find last non-undone operation
   • Mark as undone (don't delete)
   • Broadcast undo event to all clients
   ↓
All clients receive undo event:
   • Redraw entire canvas from operation history
   • Skip operations marked as undone
   ↓
Visual result: Last operation disappears from all canvases
```

**Visual Feedback:**
```
0ms:   User clicks undo → Button press animation
50ms:  Canvas begins redraw
100ms: Canvas fully redrawn (operation removed)
200ms: Remote users see same update
```

**Button States:**
- **Enabled**: Full opacity, clickable
- **Disabled**: 30% opacity, not clickable (when no operations to undo/redo)
- **Hover**: Slight scale (1.05x) + background color

---

## 6. Real-Time Collaboration Features

### 6.1 Presence Indicators

**User Join Animation:**
```
New user connects:
   ↓
1. Cursor fades in at center (300ms)
2. Name label slides in from right (200ms)
3. User added to active users list
4. Toast notification: "Bob joined" (3s duration, bottom-right)
```

**User Leave Animation:**
```
User disconnects:
   ↓
1. Cursor fades out (500ms)
2. Name label fades out (500ms)
3. User removed from list
4. Toast notification: "Bob left" (3s duration)
```

### 6.2 Cursor Position Synchronization

**Update Frequency:**
- Send cursor position: Every 50ms (20 updates/second) when moving
- Stop sending: After 100ms of no movement
- Interpolation on receive: Smooth movement between positions (ease-out)

**Cursor Rendering:**
```javascript
Remote cursor update received:
   ↓
1. Calculate position delta from last position
2. Animate movement (100ms ease-out interpolation)
3. Update name label position
4. If drawing: Show drawing trail effect
```

### 6.3 Concurrent Drawing Handling

**Scenario: Two users draw in same area**

```
Visual Result:
┌─────────────────────┐
│                     │
│    ╱╲               │  ← Alice's red stroke
│   ╱  ╲  ─────       │  ← Bob's blue stroke (simultaneous)
│  ╱    ╲             │
│                     │
└─────────────────────┘

Rendering Order:
• Strokes rendered in order received by server
• No stroke blocks another
• Both fully visible (no z-index conflicts)
• No "locking" or "turn-taking" required
```

---

## 7. Animation & Micro-interactions

### 7.1 Button Interactions

**Hover State:**
```css
transition: all 150ms ease-out
transform: scale(1.05)
background: rgba(0, 102, 255, 0.1)
```

**Active/Pressed:**
```css
transform: scale(0.95)
transition: all 50ms ease-in
```

**Selection (Tool Buttons):**
```css
background: #0066FF
color: white
box-shadow: 0 2px 8px rgba(0, 102, 255, 0.3)
```

### 7.2 Toast Notifications

**Design:**
```
┌────────────────────────────┐
│  ℹ️  Bob joined            │  ← Info icon + message
└────────────────────────────┘

Position: Bottom-right, 20px from edges
Background: #2C2C2C
Text: White, 14px
Padding: 12px 16px
Border-radius: 8px
Box-shadow: 0 4px 12px rgba(0,0,0,0.15)
```

**Animation:**
```
Entry: Slide up + fade in (300ms ease-out)
Stay: 3 seconds
Exit: Fade out (200ms)
```

### 7.3 Loading States

**Initial Canvas Load:**
```
┌─────────────────────────────┐
│                             │
│      🎨                     │
│   Loading canvas...         │
│   [Progress spinner]        │
│                             │
└─────────────────────────────┘
```

**Reconnecting State:**
```
Top banner (yellow background):
┌──────────────────────────────────────┐
│ ⚠️ Connection lost. Reconnecting... │
└──────────────────────────────────────┘
```

---

## 8. Responsive Behavior

### 8.1 Canvas Scaling

**Viewport Adaptation:**
- Canvas fills available space (100vw - toolbar heights)
- Maintains aspect ratio
- Scales content proportionally on window resize
- Minimum size: 800px x 600px (shows scrollbars if needed)

### 8.2 Toolbar Responsive Breakpoints

**Desktop (> 1024px):** Full toolbar as designed

**Tablet (768px - 1024px):**
```
┌────────────────────────────────────┐
│ 🎨 [Tools] [Color] [Width] [U/R]  │  ← Compact spacing
│                       👥 Alice +2  │
└────────────────────────────────────┘
```

**Mobile (< 768px):** Not required (desktop-focused per requirements)

---

## 9. Performance Optimizations

### 9.1 Canvas Rendering Optimizations

**Dirty Rectangle Rendering:**
```javascript
// Only redraw changed regions
Instead of: clearRect(0, 0, width, height)
Use: clearRect(dirtyX, dirtyY, dirtyWidth, dirtyHeight)
```

**Request Animation Frame:**
```javascript
// Batch canvas updates to 60fps
let pendingRender = false;
function scheduleRender() {
  if (!pendingRender) {
    pendingRender = true;
    requestAnimationFrame(() => {
      render();
      pendingRender = false;
    });
  }
}
```

**Path Simplification:**
```javascript
// Reduce points in stroke using Douglas-Peucker algorithm
// Keep points that deviate > 2px from simplified path
// Reduces data size by ~60% without visible quality loss
```

### 9.2 Network Optimizations

**Event Batching:**
```javascript
// Batch cursor positions
Every 50ms: Send batched cursor updates
Format: { userId, positions: [{x,y,t}, {x,y,t}] }

// Batch drawing points
Every 16ms: Send batched drawing points
Format: { strokeId, points: [{x,y}, {x,y}] }
```

**Message Compression:**
```javascript
// Use short keys
Instead of: { type: 'draw', userId: 'abc', timestamp: 123 }
Use: { t: 'd', u: 'abc', ts: 123 }
```

---

## 10. Accessibility Considerations

### 10.1 Keyboard Navigation

**Shortcuts:**
- `B` - Switch to Brush
- `E` - Switch to Eraser
- `Ctrl + Z` - Undo
- `Ctrl + Y` or `Ctrl + Shift + Z` - Redo
- `Tab` - Navigate toolbar buttons
- `Enter` - Activate focused button

### 10.2 Screen Reader Support

**ARIA Labels:**
```html
<button aria-label="Brush tool, currently selected">
  🖌️
</button>

<div aria-live="polite" aria-atomic="true">
  Bob joined the canvas
</div>

<canvas aria-label="Collaborative drawing canvas with 3 active users">
</canvas>
```

### 10.3 Visual Feedback

**High Contrast Mode:**
- Ensure 4.5:1 contrast ratio for all text
- Use borders in addition to colors for tool selection
- Cursor names have white text on colored backgrounds

---

## 11. Error States & Edge Cases

### 11.1 Connection Error

**Visual State:**
```
┌──────────────────────────────────────────────┐
│ ⚠️ Connection lost                           │
│ Your changes are saved locally.              │
│ [Retry Connection]                           │
└──────────────────────────────────────────────┘

• Overlay appears over canvas (semi-transparent)
• Canvas remains visible but slightly dimmed
• Retry button prominently displayed
```

### 11.2 Sync Conflict Resolution

**Visual Indicator:**
```
When operations arrive out of order:
• No error shown to user
• Canvas redraws from operation history
• Smooth transition (200ms fade)
• Operations appear in correct chronological order
```

### 11.3 Empty Canvas State

**Initial State:**
```
┌─────────────────────────────┐
│                             │
│     ✏️                      │
│  Start drawing              │
│  or invite others!          │
│                             │
└─────────────────────────────┘

Centered text, light gray (#999)
Disappears on first stroke
```

---

## 12. Design Assets Required

### 12.1 Icons (SVG)
- Brush tool icon (24x24px)
- Eraser tool icon (24x24px)
- Undo arrow icon (20x20px)
- Redo arrow icon (20x20px)
- User avatar placeholder (32x32px)
- Connection status dots (12x12px)

### 12.2 Cursor Graphics
- Custom cursor pointer SVG (18x24px)
- Name label rounded rectangle (dynamic width)

### 12.3 Colors
- User color palette (10 predefined colors)
- UI theme colors (primary, secondary, backgrounds)

---

## 13. Figma-Specific Features Implementation

### 13.1 Multi-Cursor Awareness
- **Always visible**: Other users' cursors shown even when not drawing
- **Smooth movement**: Interpolated cursor position updates
- **Clear identification**: User names always visible above cursors
- **Fade on inactivity**: Cursors fade but don't disappear completely

### 13.2 Non-Blocking Collaboration
- **No locks**: Any user can draw anywhere anytime
- **No conflicts**: Strokes never block each other
- **Instant feedback**: Local drawing renders immediately (0 latency)
- **Eventual consistency**: Remote updates arrive within 200ms

### 13.3 Presence Indicators
- **Active users list**: Always visible in toolbar
- **Join/leave notifications**: Subtle toast messages
- **Color coding**: Each user has consistent color across cursor and list
- **Status indicators**: Show who's actively drawing vs idle

---

## 14. Implementation Priority

### Phase 1: Core Drawing (MVP)
1. Canvas setup and basic drawing
2. Tool selection (brush/eraser)
3. Color and stroke width controls
4. Local rendering optimization

### Phase 2: Real-Time Sync
1. WebSocket connection
2. Broadcasting drawing events
3. Receiving and rendering remote strokes
4. User join/leave handling

### Phase 3: Collaboration Features
1. Remote cursor display
2. User list and color assignment
3. Cursor position synchronization
4. Connection status indicators

### Phase 4: Advanced Features
1. Global undo/redo
2. Operation history management
3. Conflict resolution
4. Performance optimizations

---

This design document provides the complete visual and interaction specifications needed to build a Figma-like collaborative drawing experience with real-time presence, smooth synchronization, and intuitive multi-user awareness.

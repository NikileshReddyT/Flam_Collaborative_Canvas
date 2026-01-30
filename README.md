# Collaborative Canvas 🎨

A real-time collaborative drawing application built with **Node.js**, **Socket.io**, and **Modern Vanilla JS**.

![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Live Demo

**[Click here to open the Collaborative Canvas](https://flam-collaborative-canvas-6v9u.onrender.com/)**

**How to use:**
1.  Open the link.
2.  Enter a **Room ID** (e.g., `fun-room`) and your **Name**.
3.  Share the Room ID with a friend so they can join and draw with you!
    > **Tip for Testing:** Open the link in a second browser tab (or Incognito window) and join the same room to see the real-time sync in action!

## Features

-   **Real-time Collaboration**: Draw with multiple people instantly.
-   **Rooms**: Join specific rooms to collaborate with specific groups.
-   **Rectangle Tool**: Draw shapes easily.
-   **Presence**: See who is online and where their cursor is with smooth Figma-like tracking.
-   **Undo/Redo**: Mistake? Just Undo.
-   **Smart Sync**: Uses "Individual History" logic. If you clear your canvas, only *your* strokes disappear for others.

## How to Use Tools

-   **Brush (B)**: Freehand drawing.
-   **Rectangle (R)**: Drag to create boxes.
-   **Eraser (E)**: Erase parts of the drawing.
-   **Color Picker**: Click the circle to pick a color.
-   **Stroke Width**: Drag the slider to change thickness.
-   **Undo (Ctrl+Z)**: Remove your last stroke.
-   **Redo (Ctrl+Y)**: Restore your last stroke.
-   **Profile**: Click your name in the top right to change settings.

## Local Development

If you want to run this project locally on your machine:

1.  **Clone & Install**:
    ```bash
    git clone https://github.com/NikileshReddyT/Flam_Collaborative_Canvas.git
    cd collaborative-canvas
    npm install
    ```

2.  **Start Server**:
    ```bash
    npm start
    ```

3.  **Open App**:
    Visit `http://localhost:3000` in your browser.

## Architecture (For Interviewers)

-   **Backend (`server.js`)**: A lightweight Socket.io server. It uses `socket.join(roomId)` for isolation. It stores history in-memory (`Map<room, operations>`) and syncs it to new users on join.
-   **Frontend**: Native HTML5 Canvas API.
    -   `canvas.js`: Handles the rendering loop and stroke storage.
    -   `websocket.js`: Wraps the socket connection.
    -   `main.js`: Glues the UI and logic together.
-   **Sync Strategy**: I broadcast *operations* (start, point, end). Clients have two layers: `myStrokes` (local) and `remoteStrokes` (others). This separation makes implementation clean and "undo" logic straightforward.

# Collaborative Canvas 🎨

A real-time collaborative drawing application built with **Node.js**, **Socket.io**, and **Modern Vanilla JS**.

![License](https://img.shields.io/badge/license-MIT-blue)

## Features

-   **Real-time Collaboration**: Draw with multiple people instantly.
-   **Rooms**: Join specific rooms to collaborate with specific groups.
-   **Rectangle Tool**: Draw shapes easily.
-   **Presence**: See who is online and where their cursor is with smooth Figma-like tracking.
-   **Undo/Redo**: Mistake? Just Undo.
-   **Smart Sync**: Uses "Individual History" logic. If you clear your canvas, only *your* strokes disappear for others.

## How to Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Server**:
    ```bash
    npm start
    ```

3.  **Open App**:
    Visit `http://localhost:3000` in your browser.

## How to Use

1.  **Join**: Enter your **Name** and a **Room ID** (e.g., "DesignTeam").
2.  **Draw**:
    -   **Brush (B)**: Freehand drawing.
    -   **Rectangle (R)**: Drag to create boxes.
    -   **Eraser (E)**: Erase parts of the drawing.
3.  **Tools**:
    -   **Color**: Click the circle to pick a color.
    -   **Width**: Drag the slider to change thickness.
    -   **Undo/Redo**: Ctrl+Z / Ctrl+Y.
4.  **Profile**: Click your name in the top right to change your Name or switch Rooms.

## Architecture (For Interviewers)

-   **Backend (`server.js`)**: A lightweight Socket.io server. It uses `socket.join(roomId)` for isolation. It stores history in-memory (`Map<room, operations>`) and syncs it to new users on join.
-   **Frontend**: Native HTML5 Canvas API.
    -   `canvas.js`: Handles the rendering loop and stroke storage.
    -   `websocket.js`: Wraps the socket connection.
    -   `main.js`: Glues the UI and logic together.
-   **Sync Strategy**: I broadcast *operations* (start, point, end). Clients have two layers: `myStrokes` (local) and `remoteStrokes` (others). This separation makes implementation clean and "undo" logic straightforward.

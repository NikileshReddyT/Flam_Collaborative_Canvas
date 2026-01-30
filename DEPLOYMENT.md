# Deploying to Render

This guide explains how to deploy your Collaborative Canvas to [Render.com](https://render.com) for free.

## Prerequisites

1.  A [GitHub](https://github.com/) account.
2.  A [Render](https://render.com/) account (you can sign up with GitHub).
3.  Your code pushed to GitHub (You have already done this!).

## Steps to Deploy

1.  **Log in to Render**
    -   Go to your [Render Dashboard](https://dashboard.render.com/).

2.  **Create a New Web Service**
    -   Click the **"New +"** button in the top right.
    -   Select **"Web Service"**.

3.  **Connect Your Repository**
    -   You should see a list of your GitHub repositories.
    -   Find `Flam_Collaborative_Canvas` and click **"Connect"**.

4.  **Configure the Service**
    Render will detect the settings, but ensure they match this:

    | Setting | Value |
    | :--- | :--- |
    | **Name** | `collaborative-canvas` (or any name you like) |
    | **Region** | Singapore (or closest to you) |
    | **Branch** | `main` |
    | **Root Directory** | *(Leave blank)* |
    | **Runtime** | `Node` |
    | **Build Command** | `npm install` |
    | **Start Command** | `npm start` |

5.  **Deploy**
    -   Scroll down and select the **"Free"** instance type.
    -   Click **"Create Web Service"**.

## Verification

1.  Render will start building your app. This typically takes 1-2 minutes.
2.  Once complete, you will see `Server running on port...` in the logs.
3.  Click the URL provided at the top left (e.g., `https://collaborative-canvas.onrender.com`).
4.  Open the URL in two different tabs to test the real-time collaboration!

## Troubleshooting

-   **White Screen?** Check the "Logs" tab in Render to see if there are any errors.
-   **Connection Issues?** Ensure your network (or school/office firewall) allows WebSocket connections (`wss://`).

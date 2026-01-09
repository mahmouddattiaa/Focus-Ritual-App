# Focus Ritual (FR-NEW) 🎯

A comprehensive, full-stack learning management platform designed to optimize study habits through AI integration, spaced repetition, and social accountability.

![Project Status](https://img.shields.io/badge/Status-Active_Development-green)

## 📚 Overview

Focus Ritual combines powerful study tools with social motivation:
*   **AI Coach**: Analyze PDFs, generate summaries, and create flashcards automatically using Gemini AI.
*   **Spaced Repetition**: Scientifically proven flashcard scheduling to maximize retention.
*   **Social Study**: Connect with friends, join study rooms, and compete on leaderboards.
*   **Resource Library**: Securely store and organize your study materials with Google Cloud Storage.

## 🏗️ Architecture

The project is divided into two main parts:

*   **Frontend (`/Focuss`)**: Built with React, Vite, TypeScript, and Tailwind CSS.
*   **Backend (`/backend`)**: Built with Node.js, Express, MongoDB, and Socket.IO.

For a detailed visual map of the project, see [PROJECT_MAP.md](./PROJECT_MAP.md).

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+ recommended)
*   MongoDB (Atlas or local)
*   Google Cloud Platform Account (for Storage & Gemini AI)

### Installation

1.  **Backend Setup**
    ```bash
    cd backend
    npm install
    # Configure your .env file (see .env.example)
    npm run dev
    ```

2.  **Frontend Setup**
    ```bash
    cd Focuss
    npm install
    npm run dev
    ```

## 📖 Documentation

We have organized documentation in the `/docs` folder:

*   **[docs/QUICK_START.md](./docs/QUICK_START.md)**: Step-by-step guide to get up and running.
*   **[docs/PROJECT_MAP.md](./docs/PROJECT_MAP.md)**: Complete architectural overview and data flow.
*   **[docs/README_COMPLETE.md](./docs/README_COMPLETE.md)**: Detailed feature breakdown and optimization guide.
*   **[docs/architecture/](./docs/architecture/)**: Performance optimization guides and checklists.
*   **[docs/backend/](./docs/backend/)**: Backend-specific documentation (GCS setup, implementation details).
*   **[docs/frontend/](./docs/frontend/)**: Frontend-specific documentation (theme system, timer changes, task fixes).

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript, Vite, TailwindCSS, Framer Motion, Radix UI.
*   **Backend**: Node.js, Express, MongoDB, Socket.IO, Passport.js.
*   **Services**: Google Cloud Storage, Google Gemini AI.

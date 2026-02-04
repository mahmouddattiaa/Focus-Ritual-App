# Focus Ritual: AI-Powered Real-time LMS

**An enterprise-grade learning management platform engineered for flow state optimization.**
Focus Ritual integrates generative AI, real-time collaboration, and spaced repetition algorithms to transform passive study into active mastery.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_App-blue?style=for-the-badge&logo=vercel)](https://focus-ritual-app-web.vercel.app)
![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)

## 🛠️ Tech Stack

### **Frontend**
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### **Backend**
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

### **Infrastructure**
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

## 🏗️ Monorepo Architecture

This project is structured as a Monorepo using **NPM Workspaces** for efficient dependency management and type sharing.

```mermaid
graph TD
    subgraph Monorepo ["Focus Ritual Monorepo"]
        subgraph Apps
            Client[apps/web (React)]
            Server[apps/backend (Node/Express)]
        end
        
        subgraph Packages
            Shared[packages/shared (Types/Utils)]
        end
    end

    Client --> Shared
    Server --> Shared
    Client <-->|REST & WebSocket| Server
```

*   **`apps/web`**: The frontend application deployed on **Vercel**.
*   **`apps/backend`**: The backend API and WebSocket server deployed on **Render**.
*   **`packages/shared`**: Shared TypeScript interfaces (User, Auth) ensuring type safety across the stack.

## 🚀 Key Engineering Features

*   ⚡ **Real-time State Synchronization:** Implemented a sub-100ms latency WebSocket architecture using **Socket.IO** to synchronize study rooms, chat, and collaborative timers across distributed clients.
*   🤖 **Generative AI Engine:** Leverages **Google Gemini Pro** via a custom proxy service to analyze PDF documents, automatically generate summary flashcards, and provide context-aware study coaching.
*   🔒 **Enterprise-Grade Security:** Features comprehensive **RBAC**, JWT-based stateless authentication, and secure file handling with **Google Cloud Storage** signed URLs.
*   🧠 **Spaced Repetition Algorithm:** Custom scheduling algorithm based on the SM-2 model to optimize memory retention intervals for flashcards.
*   📊 **Performance Analytics:** Aggregates user behavior data into visualized dashboards using complex MongoDB aggregation pipelines for deep insights.

## 🏁 Getting Started

Follow these steps to deploy the application locally.

### Prerequisites
*   Node.js v18+
*   MongoDB Instance (Local or Atlas)
*   Google Cloud Service Account (Storage & AI)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/focus-ritual.git
    cd focus-ritual
    ```

2.  **Environment Setup**
    *   **Root:** Create `.env` for backend secrets (`MONGO_URI`, `JWT_SECRET`).
    *   **Frontend:** Create `apps/web/.env` for public config (`VITE_API_URL`).

3.  **One-Click Start (Windows)**
    Run the included startup script:
    ```bash
    .\start-dev.bat
    ```
    *This will install all dependencies for root, backend, and frontend, and start both servers concurrently.*

4.  **Manual Start**
    ```bash
    npm install
    npm run dev
    ```

## 🌍 Production Deployment

The project is configured for a distributed cloud deployment:

*   **Frontend (Vercel):** Connects to `apps/web`.
*   **Backend (Render/Railway):** Connects to `apps/backend`.
*   **Blueprint:** A `render.yaml` is included for Infrastructure-as-Code deployment on Render.

## 👥 Demo Access

Use the **"Try Demo Account"** button on the login screen to explore the platform immediately without registration.

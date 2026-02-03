# Focus Ritual: AI-Powered Real-time LMS

**An enterprise-grade learning management platform engineered for flow state optimization.**
Focus Ritual integrates generative AI, real-time collaboration, and spaced repetition algorithms to transform passive study into active mastery.

![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)

## 🛠️ Tech Stack

![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client ["Frontend (React + Vite)"]
        UI[User Interface]
        Auth[Auth Provider]
        WS_Client[Socket.IO Client]
        State[Context State]
    end

    subgraph Server ["Backend (Node.js + Express)"]
        API[REST API Gateway]
        WS_Server[Socket.IO Server]
        Controller[Business Logic]
        Queue[Job Scheduler]
    end

    subgraph Services ["External Services"]
        Gemini[Google Gemini AI]
        GCS[Google Cloud Storage]
    end

    subgraph Data ["Persistence"]
        Mongo[(MongoDB Atlas)]
    end

    UI --> Auth
    UI --> State
    State <--> WS_Client
    State <--> API

    WS_Client <-->|Real-time Events| WS_Server
    API --> Controller
    Controller --> Mongo
    Controller --> Gemini
    Controller --> GCS
    
    WS_Server <--> Mongo
```

## 🚀 Key Engineering Features

*   ⚡ **Real-time State Synchronization:** Implemented a sub-100ms latency WebSocket architecture using **Socket.IO** to synchronize study rooms, chat, and collaborative timers across distributed clients.
*   🤖 **Generative AI Engine:** Leverages **Google Gemini Pro** via a custom proxy service to analyze PDF documents, automatically generate summary flashcards, and provide context-aware study coaching.
*   🔒 **Enterprise-Grade Security:** Features comprehensive **RBAC** (Role-Based Access Control), JWT-based stateless authentication, and secure file handling with **Google Cloud Storage** signed URLs.
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

2.  **Backend Setup**
    ```bash
    cd backend
    npm install
    # Create .env file from .env.example and add your credentials
    npm run dev
    ```

3.  **Frontend Setup**
    ```bash
    cd ../Focuss
    npm install
    npm run dev
    ```

4.  **Access the Application**
    Open `http://localhost:5173` to view the application. Use the **"Try Demo Account"** button on the login screen to explore immediately.
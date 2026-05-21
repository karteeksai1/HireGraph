# HireGraph
An AI-driven technical interviewer built with LangGraph, FastAPI, and the PERN stack. Features agentic routing, RAG-based grading, and real-time feedback.

### Architectural Breakdown
* **Frontend:** Built with React, managing interactive web sockets for lower latency conversational updates and a dynamic dashboard for viewing candidate code execution and interview progress.
* **Core Application Server (Node.js/Express):** Manages user sessions, authentication, data persistence, and serves as the central API gateway.
* **AI Orchestration Server (FastAPI):** Hosts the LangGraph state machine. It handles multi-agent execution, conversational history management, and grading routing without blocking the application server threads.
* **Storage & Knowledge Base:** Uses PostgreSQL for operational storage and relational data, utilizing the `pgvector` extension to run semantic vector similarity lookups against interview grading rubrics.

---

## 🚀 Getting Started

Follow these steps to clone, configure, and spin up the complete local development environment.

### Prerequisites
* **Node.js** (v18+ recommended)
* **Python** (3.10+ recommended)
* **PostgreSQL** (with `pgvector` installed and enabled)

---

## 🏗️ System Architecture

```mermaid
graph TD
classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#333;
classDef express fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px,color:#333;
classDef fastapi fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#333;
classDef db fill:#eceff1,stroke:#263238,stroke-width:2px,color:#333;
classDef external fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px,stroke-dasharray: 5 5,color:#333;

User[User / Candidate]

subgraph Client_Tier [Client Tier]
    React[React Frontend<br/>UI & WebSocket Client]:::client
end

subgraph Backend_Tier [Backend Tier]
    Express[Express Backend<br/>Node.js/TS<br/>Auth & Sessions]:::express

    subgraph AI_Engine [AI Orchestration Engine]
        FastAPI[FastAPI<br/>Python]:::fastapi
        LangGraph[LangGraph<br/>Agent State Machine]:::fastapi
        RAG[RAG Evaluation Layer]:::fastapi

        FastAPI --> LangGraph
        LangGraph --> RAG
    end
end

subgraph Data_Tier [Data Tier]
    Postgres[(PostgreSQL<br/>with pgvector)]:::db
end

OpenAI[OpenAI GPT-4o API]:::external

User <==>|Interacts| React

React -- "HTTP REST (Auth/Data)" --> Express
React -- "WebSockets/REST (Interviewer Loop)" --> FastAPI

Express -- "CRUD Operations" --> Postgres

RAG -- "Semantic Query<br/>(Grading Rubrics)" --> Postgres
LangGraph <==>|Model Calls| OpenAI

linkStyle 2,3,4,5 stroke-width:2px,fill:none,stroke:#90a4ae;
linkStyle 6 stroke:#f57c00,stroke-width:2px;

linkStyle 7 stroke:#2e7d32,stroke-width:2px,stroke-dasharray: 5 5;
```

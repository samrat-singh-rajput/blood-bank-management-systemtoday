<div align="center">

# 🩸 Advanced Blood Bank & Donor Management System
### Enterprise Healthcare Portal with Semantic RAG & Model Context Protocol (MCP)

An ultra-modern, production-grade Healthcare & Life-Saving Portal powering blood donations, real-time inventory management, secure OTP authentication, and an autonomous **Gemini AI Health & Operational Assistant ("Samrat AI")** powered by **Semantic RAG** and the **Model Context Protocol (MCP)**.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://blood-bank-management-system-ecru.vercel.app/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Backend-Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/Vector_Database-MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Google Gemini](https://img.shields.io/badge/GenAI-Google_Gemini_3-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Model Context Protocol](https://img.shields.io/badge/Architecture-MCP_SDK-FF6B6B?style=for-the-badge&logo=anthropic&logoColor=white)](https://modelcontextprotocol.io/)

<br />

![Banner](./banner.jpg)

<br />

---

### 🌐 **Live Web Application**
👉 **[Click Here to Visit Live Application](https://blood-bank-management-system-ecru.vercel.app/)**  
*(Hosted URL: `https://blood-bank-management-system-ecru.vercel.app/`)*

---

</div>

## 📌 Table of Contents
- [🌟 Overview](#-overview)
- [🧠 Advanced AI & GenAI Architecture (What's New)](#-advanced-ai--genai-architecture-whats-new)
  - [1. Semantic RAG with MongoDB Atlas Vector Search](#1-semantic-rag-with-mongodb-atlas-vector-search)
  - [2. Model Context Protocol (MCP) Operational Tools](#2-model-context-protocol-mcp-operational-tools)
  - [3. Autonomous Gemini Function & Tool Calling](#3-autonomous-gemini-function--tool-calling)
  - [4. Hybrid Grounding (Clinical Knowledge + Live Inventory)](#4-hybrid-grounding-clinical-knowledge--live-inventory)
  - [5. Frontend Transparent UI Citations & Live Cards](#5-frontend-transparent-ui-citations--live-cards)
  - [6. Production AI Security & Boundary Defense](#6-production-ai-security--boundary-defense)
- [🚀 Core Healthcare Platform Features](#-core-healthcare-platform-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Repository Directory Structure](#-repository-directory-structure)
- [⚙️ Quick Start & Installation](#️-quick-start--installation)
- [🧪 AI Evaluation & CLI Testing Suite](#-ai-evaluation--cli-testing-suite)
- [🔑 Environment Variables (Sanitized)](#-environment-variables-sanitized)
- [🔒 Enterprise Security & Privacy](#-enterprise-security--privacy)
- [📜 License & Copyright](#-license--copyright)

---

## 🌟 Overview

The **Advanced Blood Bank & Donor Management System** is a full-stack healthcare web platform built to connect blood donors, recipients, hospital coordinators, and administrators in real time.

Beyond standard blood banking workflows, this platform integrates an enterprise-grade Generative AI ecosystem: **Samrat AI**. Rather than relying on generic LLM prompts prone to hallucinations, Samrat AI employs a dual-engine architecture:
1. **Semantic RAG**: Grounds medical eligibility, transfusion compatibility, and donation protocols in verified institutional standard operating procedures (SOPs) using 768-dimensional vector embeddings and MongoDB Atlas native `$vectorSearch`.
2. **Model Context Protocol (MCP)**: Equips the model with secure, read-only operational tools to query live application state (inventory units, verified donors, pending requests, and upcoming donation camps) directly from MongoDB Atlas without exposing raw database access.

---

## 🧠 Advanced AI & GenAI Architecture (What's New)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 REACT 19 CLIENT LAYER                                  │
│  SamratChatbot.tsx ──► geminiService.ts (chatWithSamrat)                               │
│  UI Indicators: <RagSourceBadge /> (📚 Citations) & <LiveDataCard /> (🔴 Live State)  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP POST /api/chat
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              EXPRESS CONTROLLER LAYER                                  │
│  backend/server.js: aiLimiter (30 req/min) ──► validateAiChatInput (2000 chars, 20 h)  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ generateGroundedChatResponse()
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              RAG & ORCHESTRATION LAYER                                 │
│  backend/services/ragService.js                                                        │
│  ├── 1. Vector Search: query ──► gemini-embedding-001 (768-dim)                        │
│  │   └── MongoDB Atlas $vectorSearch on 'knowledge_embeddings' (threshold >= 0.80)   │
│  ├── 2. Prompt Augmentation: Base Persona + Verified Context + Security Directives    │
│  └── 3. Gemini Generation (gemini-3-flash-preview / gemini-3-pro-preview with thinking)│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Autonomous Tool Call Dispatch
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MCP TOOL EXECUTION LAYER                                  │
│  backend/mcp/mcpClient.js (InMemoryTransport Bridge) ◄──► backend/mcp/mcpServer.js    │
│  ├── getBloodStock       ──► 'stocks' collection (Live Units, Capacity, Status)       │
│  ├── findAvailableDonors ──► 'users' collection (Verified Active Donors, PII Masked)   │
│  ├── getBloodRequests    ──► 'requests' collection (Emergency Requisitions, Urgency)   │
│  └── getCampaigns        ──► 'campaigns' collection (Public Donation Drives & Venues)  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Semantic RAG with MongoDB Atlas Vector Search
- **Curated Knowledge Base (`backend/data/knowledge_base/`)**:
  - `donor_eligibility.md`: Age (18–65), weight ($\ge 50$ kg), vitals, hemoglobin ($\ge 12.5$ g/dL), donation intervals (56 days male / 90 days female), and deferral protocols.
  - `blood_groups_and_compatibility.md`: ABO/Rh immunohematology, universal donor ($O-$) and recipient ($AB+$) definitions, component storage lifespans (RBCs 35–42 days, Platelets 5 days, FFP 1 year).
  - `blood_donation_process.md`: 5-step donor journey, mini-physical, phlebotomy SOPs, and post-care recovery.
  - `blood_bank_faq.md`: Pain and volume replenishment facts, infection guarantees, lifestyle guidelines, and emergency access keys.
- **Deterministic Structural Chunking (`embeddingService.js`)**:
  - Groups markdown headings, dividers, and bullet lists as coherent units.
  - Target chunk size: **750 characters** with a **120-character overlap** bounded by word boundaries.
  - Generates exactly **36 indexed chunks**.
- **Dense Vector Embeddings**:
  - Model: `gemini-embedding-001` via `@google/genai` SDK.
  - Output dimensionality explicitly constrained to **768 dimensions** for optimal search latency and memory efficiency.
- **Atlas Vector Aggregation (`vectorService.js`)**:
  - Index: `vector_index` over collection `knowledge_embeddings` in database `bloodbank_system`.
  - Similarity metric: **Cosine similarity**.
  - Dynamic HNSW exploration: `numCandidates = Math.min(Math.max(topK * 10, 50), 150)`.
  - Default retrieval: `topK = 3`.
  - Minimum similarity threshold: **`0.80`** (`RAG_MIN_SCORE`). Queries scoring $< 0.80$ (such as general greetings or out-of-domain topics) drop context to eliminate hallucination.

### 2. Model Context Protocol (MCP) Operational Tools
Built with the official `@modelcontextprotocol/sdk` (`backend/mcp/`):
- **Tool 1: `getBloodStock`**: Queries real-time inventory from `stocks`. Calculates status (`Critical`, `Low`, `Adequate`) based on stock thresholds.
- **Tool 2: `findAvailableDonors`**: Queries active verified donors from `users`. Enforces PII masking on phone numbers (`+91****210`) and emails (`do***@domain.com`).
- **Tool 3: `getBloodRequests`**: Queries pending and emergency requisitions from `requests`, sorted chronologically.
- **Tool 4: `getCampaigns`**: Queries scheduled community donation drives from `campaigns`.
- **Dual Transport Support**:
  - `InMemoryTransport`: Linked client-server pair running inside Express for sub-millisecond execution.
  - `StdioServerTransport`: Standard input/output transport enabling the MCP server to interface with CLI tools and external hosts (e.g., Claude Desktop).

### 3. Autonomous Gemini Function & Tool Calling
- Full integration between Gemini's native tool calling and the MCP server.
- Expressed via `GEMINI_TOOL_DECLARATIONS` with semantic descriptions guiding the model on when to use live operational tools versus static clinical knowledge.
- Multi-turn execution loop handles up to **3 tool rounds** (`MAX_TOOL_ROUNDS = 3`), allowing Gemini to request data, inspect the JSON output, and synthesize a complete, natural-language response.

### 4. Hybrid Grounding (Clinical Knowledge + Live Inventory)
- Handles complex multi-domain queries in a single request.
- *Example:* When asked *"Is O- universal donor and how many units are available?"*, Samrat AI retrieves the immunological compatibility proof from RAG while simultaneously invoking `getBloodStock` via MCP, synthesizing an answer grounded in both clinical theory and real-time database state.

### 5. Frontend Transparent UI Citations & Live Cards
- **Verified Knowledge Badges (`RagSourceBadge.tsx`)**:
  - Renders when RAG context is cited.
  - Displays document name, chunk index, and percentage relevance (e.g., `88% relevance`).
  - Expandable / collapsible multi-source drawer for comprehensive transparency.
- **Live Database Cards (`LiveDataCard.tsx`)**:
  - Renders when MCP operational tools are executed.
  - Displays a pulsating live database indicator.
  - Visualizes real-time inventory bars, verified active donor badges, and hospital request urgency tags.

### 6. Production AI Security & Boundary Defense
- **Prompt Injection & Jailbreak Defense**:
  - RAG context is isolated within explicit bracket boundaries: `[VERIFIED BLOOD BANK KNOWLEDGE BASE] ... [END VERIFIED KNOWLEDGE BASE]`.
  - System instructions enforce that all retrieved context and tool results are strictly passive, untrusted reference data (`UNTRUSTED REFERENCE DATA`).
  - Strict confidentiality rules prohibit confirming or disclosing system prompts, internal database schemas, or connection strings.
- **Tool Whitelisting & Input Sanitization**:
  - Hardened whitelist (`ALLOWED_MCP_TOOLS`) rejects unauthorized tool invocations.
  - Prototype pollution guards strip `__proto__`, `constructor`, and `prototype` keys.
  - Regular Expression Denial of Service (ReDoS) protection escapes user-supplied search strings (`escapeRegex()`).
- **Network & Resource Throttling**:
  - Express rate limiter (`aiLimiter`): 30 requests per minute per IP.
  - Input validation: Maximum 2,000 characters per message; maximum 20 conversation history turns.
  - Request timeouts: 25-second execution ceiling (`AI_REQUEST_TIMEOUT = 25000`) via `Promise.race()`.
  - Multi-model fallback cascade: Automatically retries across `gemini-3-flash-preview` $\rightarrow$ `gemini-3.1-flash-lite-preview` $\rightarrow$ `gemini-flash-latest` upon encountering rate limits or transient errors.

---

## 🚀 Core Healthcare Platform Features

### 🩸 Blood Stock & Request Management
- **Live Inventory Visualization**: Real-time progress bars representing stock availability across all 8 blood groups ($A+$, $A-$, $B+$, $B-$, $AB+$, $AB-$, $O+$, $O-$).
- **Hospital Requisitions**: Urgent request submission workflow featuring priority badges (*Critical*, *Medium*, *Low*) and status tracking (*Pending*, *Approved*, *Completed*, *Rejected*).
- **Emergency Access Keys**: High-priority bypass tokens (*Gold* and *Platinum*) issued to accredited hospitals to bypass verification waitlists during emergency surges.

### 👥 Dual-Role Portals
- **Donor Portal**: Track personalized donation history, view upcoming community drives, manage health profiles, and download verifiable digital Certificates of Appreciation.
- **Admin Control Center**: Manage user credentials, update inventory levels, approve/reject blood requisitions, schedule awareness campaigns, and inspect security audit logs.

### 🔐 Multi-Channel Authentication & Verification
- **Unified Brevo Service**: Dynamic OTP delivery supporting both Brevo REST API (v3) and SMTP fallback, complete with phone/SMS compatibility.
- **Bcrypt Salted Hashing**: 10-round salted password hashing protecting stored credentials.
- **JWT Session Security**: Secure token issuance with payload sanitization (passwords, OTPs, and secrets are permanently excluded from API responses).

---

## 🛠️ Tech Stack

| Layer | Technology | Version / Specification | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | `^19.0.0` / TypeScript `~5.7.2` | High-performance single-page application |
| **Client Bundler** | Vite | `^6.1.0` | Next-generation frontend tooling |
| **Styling & Icons** | Tailwind CSS + Lucide Icons | Glassmorphic design system | Responsive dark/light theme |
| **Backend Runtime** | Node.js + Express.js | `^4.21.2` (ES Modules) | RESTful API server with route modularity |
| **Vector Database** | MongoDB Atlas Vector Search | HNSW index (`vector_index`) | Cosine similarity semantic retrieval |
| **Generative LLMs** | Google Gemini GenAI SDK | `@google/genai` (`^0.1.2`) | `gemini-3-flash-preview`, `gemini-3-pro-preview` |
| **Embedding Model** | Gemini Embeddings | `gemini-embedding-001` | 768-dimensional dense vector representations |
| **Tool Protocol** | Model Context Protocol (MCP) | `@modelcontextprotocol/sdk` (`^1.20.2`) | Standardized tool server & client architecture |
| **Schema Validation** | Zod | `^3.24.2` | Strict runtime parameter validation |
| **Security & Rate Limits** | `express-rate-limit` + `bcryptjs` | 30 req/min AI limiter, 10-round bcrypt | Rate throttling, input validation & password security |
| **Email & OTP Delivery** | Brevo API & Nodemailer | REST API v3 + SMTP Relay | Transactional email & OTP delivery |
| **Hosting & Cloud** | Vercel (Client) + Render (API) | Cloud production deployments | High-availability serverless and microservice hosting |

---

## 📁 Repository Directory Structure

```text
blood-bank-management-system/
├── backend/                              # Express.js REST API & AI Microservices
│   ├── data/
│   │   └── knowledge_base/               # Curated RAG Medical SOP Documents
│   │       ├── donor_eligibility.md      # Age, weight, vitals, deferral intervals
│   │       ├── blood_groups_and_compatibility.md # ABO/Rh compatibility & shelf lives
│   │       ├── blood_donation_process.md # 5-step collection SOPs & recovery
│   │       └── blood_bank_faq.md         # Pain facts, lifestyle, infection safety
│   ├── mcp/                              # Model Context Protocol Implementation
│   │   ├── mcpServer.js                  # McpServer instance & tool registrations
│   │   ├── mcpClient.js                  # Gemini function-calling bridge & whitelist
│   │   └── tools/                        # Read-Only Operational Tool Implementations
│   │       ├── getBloodStock.js          # Live inventory queries from 'stocks'
│   │       ├── findAvailableDonors.js    # Verified active donor search (PII-masked)
│   │       ├── getBloodRequests.js       # Requisitions & emergency patient needs
│   │       └── getCampaigns.js           # Scheduled community donation camps
│   ├── services/                         # Core Business & AI Service Modules
│   │   ├── embeddingService.js           # Structural chunking & 768-dim embeddings
│   │   ├── vectorService.js              # MongoDB Atlas $vectorSearch pipeline
│   │   ├── ragService.js                 # RAG orchestration & Gemini tool loop
│   │   └── brevoService.js               # Multi-channel OTP delivery engine
│   ├── scripts/                          # Automated Ingestion & Evaluation CLI Tools
│   │   ├── ingestKnowledge.js            # Idempotent RAG document vectorizer
│   │   ├── testRAG.js                    # RAG retrieval & threshold evaluation
│   │   ├── testGeminiMCP.js              # Autonomous tool-calling verification
│   │   ├── testSecurity.js               # Adversarial prompt-injection test suite
│   │   └── runStep8Evaluation.js         # Comprehensive 52-test AI evaluation
│   ├── server.js                         # API routes, rate limiters & error handlers
│   └── package.json                      # Backend dependencies & scripts
│
├── frontend/                             # React 19 + TypeScript Client
│   ├── src/
│   │   ├── components/                   # UI Views & Core Modules
│   │   │   ├── chat/                     # Transparent AI UI Components
│   │   │   │   ├── RagSourceBadge.tsx    # 📚 Verified Knowledge citation badge
│   │   │   │   └── LiveDataCard.tsx      # 🔴 Live Database inventory cards
│   │   │   ├── SamratChatbot.tsx         # Floating conversational AI interface
│   │   │   ├── AdminPanel.tsx            # Inventory & user management control center
│   │   │   ├── DonorPanel.tsx            # Donor history & certificate generator
│   │   │   └── LandingPage.tsx           # Public discovery portal & stats
│   │   ├── services/
│   │   │   ├── api.ts                    # Backend API HTTP query client
│   │   │   └── geminiService.ts          # Client AI dispatcher & history builder
│   │   ├── types/                        # TypeScript type declarations & schemas
│   │   ├── App.tsx                       # Main application state controller
│   │   └── index.css                     # Design tokens & glassmorphic styles
│   ├── package.json                      # Frontend dependencies
│   └── vite.config.ts                    # Vite bundler configuration
│
├── .env.example                          # Sanitized environment variable template
├── vercel.json                           # Vercel deployment rewrite rules
└── README.md                             # Comprehensive project documentation
```

---

## ⚙️ Quick Start & Installation

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/samrat-singh-rajput/blood-bank-management-systemtoday.git
cd blood-bank-management-systemtoday
```

### 2️⃣ Install Workspace Dependencies
```bash
npm run setup
```
*(Runs `npm install` across root, backend, and frontend directories concurrently).*

### 3️⃣ Configure Environment Variables
Create your local environment file:
```bash
cp .env.example .env
```
Populate `.env` with your MongoDB Atlas URI, Gemini API key, and Brevo credentials (see [Environment Variables](#-environment-variables-sanitized)).

### 4️⃣ Ingest RAG Knowledge Vectors
Populate your MongoDB Atlas vector collection with the curated medical knowledge base:
```bash
node backend/scripts/ingestKnowledge.js
```
*(Splits the 4 markdown SOPs into 36 deterministic chunks, generates 768-dimensional embeddings, and indexes them in MongoDB Atlas).*

### 5️⃣ Launch the Application
Start both the backend API server and the frontend client concurrently:
```bash
npm run dev
```
- 🌐 **Frontend Client**: [`http://localhost:3000`](http://localhost:3000)
- ⚡ **Backend REST API**: [`http://localhost:5000`](http://localhost:5000)

---

## 🧪 AI Evaluation & CLI Testing Suite

The repository includes a comprehensive, automated test suite to verify RAG retrieval accuracy, MCP tool execution, adversarial security resilience, and database immutability:

| Test Script | Direct Execution Command | Purpose & Validated Scenarios |
|---|---|---|
| **RAG Retrieval Test** | `node backend/scripts/testRAG.js` | Validates vector search recall, cosine similarity scores, and the 0.80 threshold cutoff. |
| **MCP Tool Bridge Test** | `node backend/scripts/testGeminiMCP.js` | Tests Gemini function calling across all 4 operational tools with live database assertions. |
| **Adversarial Security Test** | `node backend/scripts/testSecurity.js` | Executes 11 penetration tests (direct jailbreaks, prompt extractions, ReDoS payloads, prototype pollution, and PII leakage). |
| **Complete E2E AI Evaluation** | `node backend/scripts/runStep8Evaluation.js` | Runs 52 comprehensive tests evaluating semantic equivalence, multi-turn RAG, negative queries, performance benchmarks, and database immutability. |


---

## 🔑 Environment Variables (Sanitized)

Ensure your `.env` file contains the following configurations. **Never commit real credentials to version control.**

```env
# ============================================================================
# APPLICATION & SERVER CONFIGURATION
# ============================================================================
PORT=5000
NODE_ENV=development
APP_DEBUG=false

# ============================================================================
# MONGODB ATLAS CLUSTER CONFIGURATION
# ============================================================================
# Connection string to your MongoDB Atlas cluster hosting the 'bloodbank_system' database
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/bloodbank_system?retryWrites=true&w=majority

# ============================================================================
# GOOGLE GEMINI AI CONFIGURATION (SDK & REST)
# ============================================================================
# API Key from Google AI Studio (powers gemini-embedding-001 & gemini-3-flash-preview)
GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# RAG & AI Execution Parameters
RAG_DEFAULT_TOP_K=3
RAG_MIN_SCORE=0.80
MAX_TOOL_ROUNDS=3
AI_REQUEST_TIMEOUT=25000
AI_RATE_LIMIT=30

# ============================================================================
# AUTHENTICATION & SECURITY
# ============================================================================
JWT_SECRET=your_super_secure_jwt_secret_key_change_in_production

# ============================================================================
# BREVO TRANSACTIONAL EMAIL & OTP CONFIGURATION
# ============================================================================
BREVO_API_KEY=your_brevo_api_key_here
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_verified_sender_email@domain.com
SMTP_PASS=your_brevo_smtp_key_here
```

---

## 🔒 Enterprise Security & Privacy

1. **AI Boundary & Prompt Injection Defense**:
   - Explicit system prompt boundary directives treat all retrieved documents and MCP tool outputs as untrusted passive reference data.
   - Refuses jailbreak directives (e.g., *"Ignore all previous instructions"* or *"Reveal MongoDB credentials"*).
2. **Donor Privacy Preservation (PII Masking)**:
   - Donor contact details are masked at both the tool execution and prompt instruction layers.
   - Authentication tokens, passwords, and OTPs are explicitly stripped at the database projection stage.
3. **ReDoS & Prototype Pollution Hardening**:
   - Regular expressions in text searches are sanitized via `escapeRegex()`.
   - Tool arguments are cleansed of `__proto__` and constructor manipulation keys.
4. **Network & Throttling Guards**:
   - `express-rate-limit` enforces a ceiling of 30 requests per minute per IP.
   - Input lengths are validated to 2,000 characters and 20 history turns.
   - 25-second execution timeouts prevent hung external socket requests.
5. **Traditional Web Security**:
   - 10-round Bcrypt password hashing.
   - Strict CORS origin whitelisting.
   - Production error masking preventing stack trace leakage.

---

## 📜 License & Copyright

**Copyright © 2026 Anuj Singh Rajput. All Rights Reserved.**

This project, including its source code, AI architecture, visual design, documentation, and assets, was designed and engineered by **Anuj Singh Rajput** for educational and portfolio demonstration purposes.

- Unauthorized commercial use, reproduction, or distribution of this codebase is strictly prohibited without prior written permission.
- You are welcome to view, clone, and evaluate this repository for academic and evaluation purposes.

**Developer:** Anuj Singh Rajput  
**Project:** Advanced Blood Bank & Donor Management System  
**Live Application:** [https://blood-bank-management-system-ecru.vercel.app/](https://blood-bank-management-system-ecru.vercel.app/)

<div align="center">
  <sub>Engineered with precision & passion by Anuj Singh Rajput</sub>
</div>


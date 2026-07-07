# 🩸 Advanced Blood Bank & Donor Management System

![Banner](./banner.jpg)

An ultra-modern, full-stack Blood Bank and Donor Management System built using a premium **Vite + React (TypeScript)** frontend, an **Express.js** API router service, and a **MongoDB Atlas Cloud Database**. The application features an integrated **Google Gemini AI** health assistant, secure **Bcrypt password hashing**, dynamic local **Base64 photo upload**, and advanced **OTP-verified authentication**.

---

## 🚀 Key Features

* **⚡ Express & MongoDB Atlas Cloud**: Live syncing of user records, stock requests, certificate listings, campaigns, and security audit logs on a high-availability cloud database.
* **🤖 Google Gemini AI Assistant**: "Samrat AI" conversational companion answering donor questions, analyzing credentials, and providing real-time personalized health recommendations.
* **🔒 Verified OTP Authentication**: Secure login system sending randomized verification codes dynamically to users' email addresses.
* **🖼️ Local Profile Image Browser**: Smooth profile image picker that encodes selected files into Base64 Data URLs and updates them instantly in your database.
* **🛡️ Password & Security Panel**: A dedicated Security settings tab providing password updates (secured with Bcrypt hashing) and simulated session-based Two-Factor Authentication (2FA).
* **💻 Admin & Donor Dashboards**:
  - **Donor Panel**: Track blood donations, make requests, download verified donation certificates, and browse upcoming donation campaigns.
  - **Admin Control Panel**: Real-time stock level bars, sync controls, user management toggles, database logs, and campaign creation.

---

## 📁 Repository Directory Structure

```text
blood-bank-management-system/
├── backend/                      # Node.js + Express API Backend
│   ├── server.js                 # Primary server entrypoint, seeder, & router
│   ├── package.json              # Backend dependencies (express, mongodb, bcryptjs, cors, dotenv)
│   └── .env                      # Local server secrets (database URIs, ports, email creds) [GIT-IGNORED]
│
├── frontend/                     # Vite + React Client App (TypeScript)
│   ├── src/
│   │   ├── components/           # UI Components (AdminPanel, DonorPanel, SettingsModal, LandingPage)
│   │   ├── services/
│   │   │   └── api.ts            # Client-side API fetch client & query layers
│   │   ├── types/                # TypeScript type & interface declarations
│   │   ├── App.tsx               # Main application controller, router, & navigation
│   │   ├── main.tsx              # React mounting root
│   │   └── index.css             # Premium custom global styling
│   ├── package.json              # Frontend package configuration
│   └── vite.config.ts            # Vite compiler configuration
│
├── .gitignore                    # Prevents credentials from leaking to GitHub
├── .env.example                  # Environment configuration template
├── package.json                  # Root npm scripts runner (concurrent dev setup)
└── README.md                     # Project documentation
```

---

## 🛠️ Tech Stack & Dependencies

| Layer | Technology / Library | Description |
| :--- | :--- | :--- |
| **Frontend** | React (v19) + TypeScript | Modern single-page interactive UI |
| **Styling** | Vanilla CSS + Tailwind CSS | Fluid layouts, animations, and dark-mode styling |
| **Compiler** | Vite | Ultra-fast hot-module reloading and production bundle builds |
| **Icons** | Lucide React | High-quality visual indicators |
| **Backend** | Node.js + Express.js | Secure server routing and REST API middleware |
| **Database** | MongoDB Atlas Cloud | Scalable NoSQL cloud database storing all collections |
| **Security** | BcryptJS | Salted password hashing on user creation and updates |
| **Variables** | Dotenv | Process environment variables management |

---

## ⚙️ Quick Start Guide

### 1. Configure Local Environment
Copy `.env.example` in the root directory to a new file named `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your MongoDB Atlas cloud URI and optional SMTP credentials:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/bloodbank_system
PORT=5000
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```
*(The `.env` file is git-ignored automatically to protect your database credentials).*

### 2. Boot Up Development Servers
Install dependencies and run both servers concurrently with a single command from the root directory:
```bash
# Install root, backend, and frontend packages
npm run setup

# Launch Vite (port 3000) and Express (port 5000) together
npm run dev
```

* Frontend Client Dashboard: `http://localhost:3000`
* Backend Router API: `http://localhost:5000`

---

## 🔒 Security Information

* All user passwords stored inside MongoDB Atlas are hashed using **Bcrypt (10 salt rounds)**.
* Database connection string credentials (`MONGODB_URI`) are strictly limited to the backend Express server environment to prevent client-side leaks.
* Request body sizes are configured with a limit of `50mb` to safely allow local Base64 profile picture uploads without triggering payload size limit errors.

---

## Copyright and License

© 2026 Anuj Singh Rajput. All Rights Reserved.

This project, including its source code, design, documentation, features, and related materials, was developed by Anuj Singh Rajput for educational and portfolio purposes.

Unauthorized copying, reproduction, modification, distribution, publication, or commercial use of this project, in whole or in part, is not permitted without prior written permission from the copyright owner.

You may view and study this project for educational and learning purposes. Any reuse, modification, distribution, or commercial use requires explicit permission from the author.

**Developer:** Anuj Singh Rajput  
**Project:** Blood Bank Management System  
**Copyright © 2026 Anuj Singh Rajput. All Rights Reserved.**

<div align="center">

# 🩸 Advanced Blood Bank & Donor Management System

An ultra-modern, full-stack Healthcare & Life-Saving Portal powering blood donations, real-time inventory management, OTP authentication, and AI-driven medical assistance.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://blood-bank-management-system-ecru.vercel.app/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Backend-Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

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
- [🚀 Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Repository Directory Structure](#-repository-directory-structure)
- [⚙️ Quick Start & Installation](#️-quick-start--installation)
- [🔑 Environment Variables](#-environment-variables)
- [🔒 Security & Authentication](#-security--authentication)
- [📜 License & Copyright](#-license--copyright)

---

## 🌟 Overview

The **Advanced Blood Bank & Donor Management System** is a production-ready, full-stack healthcare web application designed to bridge the gap between blood donors, recipients, and healthcare administrators. 

Featuring an elegant dark/light glassmorphic UI built with **React 19, Vite, and TypeScript**, a robust **Express.js API server**, and a **MongoDB Atlas Cloud database**, the platform delivers real-time stock monitoring, automated blood requests, digital donation certificates, and an integrated **Google Gemini AI Health Companion ("Samrat AI")** for instant donor support.

---

## 🚀 Key Features

### 🩸 **Blood Stock & Request Management**
* **Real-time Inventory Tracking**: Dynamic visual bars showing blood unit availability across all blood groups ($A+$, $A-$, $B+$, $B-$, $AB+$, $AB-$, $O+$, $O-$).
* **Instant Requests**: Streamlined request creation with priority badges, emergency tags, and real-time status updates (*Pending*, *Approved*, *Fulfilled*, *Rejected*).

### 🤖 **Google Gemini AI Assistant ("Samrat AI")**
* **24/7 Virtual Health Companion**: Answers donor eligibility questions, analyzes medical symptoms, and guides users on pre- and post-donation nutrition.
* **Smart Context Awareness**: Integrated directly into the user interface for personalized recommendations.

### 🔒 **Verification & Security**
* **OTP Email Verification**: Automated, secure dynamic OTP codes sent to users' registered email addresses via Brevo SMTP integration.
* **Bcrypt Password Security**: Industrial-grade salted hashing protecting all credentials stored in MongoDB Atlas.
* **Session & 2FA Security**: Simulated Two-Factor Authentication and password update management within user profile settings.

### 💻 **Dual Dashboard Ecosystem**
* 🩸 **Donor Panel**: Track donation history, place urgent blood requests, generate & download verified PDF donation certificates, and register for community donation drives.
* 🛡️ **Admin Control Center**: Monitor inventory levels, manage user accounts, approve/reject blood requests, launch new donation campaigns, and review real-time audit logs.

### 🖼️ **Profile & Media Management**
* **Instant Avatar Upload**: Smooth, client-side profile picture browser encoding images to Base64 Data URLs for instant database synchronization.

---

## 🛠️ Tech Stack

| Layer | Technology | Badge / Icon | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | ![React](https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react&logoColor=black) | Modern single-page responsive UI |
| **Build Tool** | Vite | ![Vite](https://img.shields.io/badge/-Vite-646CFF?style=flat-square&logo=vite&logoColor=white) | Lightning-fast HMR bundler |
| **Styling** | Vanilla CSS + Tailwind | ![CSS3](https://img.shields.io/badge/-CSS3-1572B6?style=flat-square&logo=css3&logoColor=white) | Custom glassmorphism, fluid animations & dark mode |
| **Backend API** | Node.js + Express.js | ![Express](https://img.shields.io/badge/-Express.js-000000?style=flat-square&logo=express&logoColor=white) | Scalable REST API routing middleware |
| **Cloud Database** | MongoDB Atlas | ![MongoDB](https://img.shields.io/badge/-MongoDB_Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white) | High-availability cloud NoSQL database |
| **Artificial Intelligence** | Google Gemini API | ![Gemini](https://img.shields.io/badge/-Google_Gemini-8E75B2?style=flat-square&logo=google&logoColor=white) | Conversational healthcare assistant |
| **Email Service** | Brevo SMTP | ![SMTP](https://img.shields.io/badge/-Brevo_SMTP-0092FF?style=flat-square&logo=sendinblue&logoColor=white) | Transactional OTP delivery |
| **Deployment** | Vercel | ![Vercel](https://img.shields.io/badge/-Vercel-000000?style=flat-square&logo=vercel&logoColor=white) | Cloud serverless hosting platform |

---

## 📁 Repository Directory Structure

```text
blood-bank-management-system/
├── backend/                      # Node.js + Express API Server
│   ├── server.js                 # API endpoints, MongoDB connection & seeder
│   ├── package.json              # Backend dependencies (express, mongodb, bcryptjs, cors)
│   └── .env                      # Server secrets & database URIs [GIT-IGNORED]
│
├── frontend/                     # React 19 + Vite Frontend Application
│   ├── src/
│   │   ├── components/           # UI Components (AdminPanel, DonorPanel, GeminiChat, LandingPage)
│   │   ├── services/
│   │   │   └── api.ts            # Client API fetch client & HTTP query handler
│   │   ├── types/                # TypeScript type definitions & interfaces
│   │   ├── App.tsx               # Primary app controller & router setup
│   │   ├── main.tsx              # React mounting root
│   │   └── index.css             # Custom global styles & responsive CSS
│   ├── package.json              # Client dependencies
│   └── vite.config.ts            # Vite build configuration
│
├── vercel.json                   # Vercel deployment configuration
├── banner.jpg                    # Application showcase banner
├── package.json                  # Root workspace script runner (concurrent startup)
└── README.md                     # Project documentation
```

---

## ⚙️ Quick Start & Installation

Follow these steps to run the application locally on your computer:

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/samrat-singh-rajput/blood-bank-management-systemtoday.git
cd blood-bank-management-systemtoday
```

### 2️⃣ Install Dependencies
Run the workspace setup script to install all root, backend, and frontend dependencies at once:
```bash
npm run setup
```

### 3️⃣ Configure Environment Variables
Create a `.env` file in the root directory (or inside `backend/` and `frontend/`) based on `.env.example`:
```bash
cp .env.example .env
```

### 4️⃣ Start Development Servers
Launch both the Vite frontend client and Express backend server concurrently:
```bash
npm run dev
```

* 🌐 **Frontend Client**: [`http://localhost:3000`](http://localhost:3000)
* ⚡ **Backend REST API**: [`http://localhost:5000`](http://localhost:5000)

---

## 🔑 Environment Variables

Make sure to populate your `.env` file with appropriate keys:

```env
# Database & Server Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/bloodbank_system
PORT=5000

# Google Gemini AI Integration
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Brevo SMTP Configuration for OTPs
BREVO_API_KEY=your_brevo_api_key
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_brevo_smtp_password
```

---

## 🔒 Security & Authentication

* **Bcrypt Password Encryption**: All user passwords are encrypted using Bcrypt with 10 salt rounds prior to storage.
* **Database Isolation**: Connection strings and credentials are restricted to environment variables and never exposed to the client bundle.
* **Payload Safety**: Express payload limits are tuned to `50mb` to facilitate seamless Base64 avatar uploads while mitigating Denial of Service (DoS) risks.
* **Dynamic OTP Expiration**: Verification codes expire automatically to ensure high authentication security.

---

## 📜 License & Copyright

**Copyright © 2026 Anuj Singh Rajput. All Rights Reserved.**

This project, including its source code, visual design, documentation, and assets, was created by **Anuj Singh Rajput** for educational and portfolio purposes.

* Unauthorized copying, reproduction, modification, distribution, or commercial use of this codebase, in whole or in part, is strictly prohibited without prior written permission from the author.
* You may view, clone, and study this repository for personal learning and educational evaluation.

**Developer:** Anuj Singh Rajput  
**Project:** Advanced Blood Bank Management System  
**Live App:** [https://blood-bank-management-system-ecru.vercel.app/](https://blood-bank-management-system-ecru.vercel.app/)

<div align="center">
  <sub>Made with ❤️ by Anuj Singh Rajput</sub>
</div>

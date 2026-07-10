# 🚀 Vercel Frontend + Render Backend Deployment Guide

This repository is pre-configured to host its **React Frontend on Vercel** and its **Node.js Express Backend & MongoDB Atlas connection on Render** (`blood-bank-management-systemtoday.onrender.com`).

---

## 🌟 Automatic Zero-Config Routing

When you host the frontend on Vercel (`https://your-app.vercel.app`):
1. **Automatic API Routing**: The frontend automatically detects when it is running on `.vercel.app` and sends all backend database and OTP requests directly to your live Render server (`https://blood-bank-management-systemtoday.onrender.com/api.php`).
2. **Built-in `vercel.json` Proxying**: Both `/vercel.json` and `/frontend/vercel.json` are pre-configured to handle React single-page routing (`/index.html`) and proxy `/api.php` to your Render backend.

---

## 🛠️ Step-by-Step Vercel Setup

1. **Import Repository into Vercel**:
   - Go to [vercel.com](https://vercel.com/) and click **Add New → Project**.
   - Select your GitHub repository (`blood-bank-management-systemtoday`).

2. **Framework Preset & Build Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` *(or leave as root `/` — `vercel.json` handles both!)*

3. **(Optional) Custom Backend Environment Variable**:
   - If you ever change your Render URL in the future, you can override the backend URL under **Vercel Project Settings → Environment Variables**:
     ```env
     VITE_API_URL=https://blood-bank-management-systemtoday.onrender.com/api.php
     ```
   - *Note: If `VITE_API_URL` is not set, it defaults automatically to `https://blood-bank-management-systemtoday.onrender.com/api.php` when running on Vercel!*

4. **Click Deploy**:
   - Your frontend on Vercel will instantly connect to your live Render backend & MongoDB Atlas database!

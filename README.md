# Advanced Blood Bank Management System

An advanced, full-stack Blood Bank Management System built with React, TypeScript, Vite, Tailwind CSS, and a PHP/MySQL backend powered by Google Gemini AI.

## Architecture & File Structure

The project follows a clean, modern full-stack separation:

- **`frontend/`**: Contains the client-side single-page application built with Vite and React.
  - **`src/`**: TypeScript components, API services, and application state.
  - **`index.html`**: Main HTML entry point.
- **`backend/`**: Contains the server-side API, email notifications, and database schemas.
  - **`api.php`**: Primary REST API controller handling CRUD operations and database persistence.
  - **`mail_config.php`**: PHPMailer SMTP configuration for automated alerts.
  - **`setup.sql`**: MySQL database creation schema.
  - **`vendor/`**: Composer dependencies (e.g., PHPMailer).

---

## Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **PHP** (v8+) & **MySQL** (via XAMPP, WAMP, or MAMP) if running in MySQL database mode.

### 2. Run Locally (Frontend Dev Server)

From the project root directory, you can run commands directly:

```bash
# 1. Install dependencies for the frontend
npm install --prefix frontend

# 2. Copy environment variables template
cp .env.example .env

# 3. Start the development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### 3. Backend Setup (MySQL Mode)
To connect to a live MySQL database:
1. Place the project inside your web server's htdocs directory (e.g., `C:/xampp/htdocs/blood-bank-management-system`).
2. Import `backend/setup.sql` into phpMyAdmin or your MySQL instance.
3. Configure your database credentials in `.env` or via the in-app settings modal.
4. Set the storage mode to `mysql` in the Settings panel or `.env`.

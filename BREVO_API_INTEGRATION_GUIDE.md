# 🩸 Brevo API Integration Guide — Transactional OTP (Email & SMS)

This comprehensive technical guide explains how to configure, test, and deploy **Brevo REST API v3** for sending One-Time Passwords (OTPs) via Email and SMS within the **Blood Bank Management System**.

---

## 1. Overview & Architecture

The Blood Bank Management System uses a **Unified Smart OTP Delivery Engine** (`backend/services/brevoService.js`). It automatically detects your environment configuration and selects the optimal delivery mechanism:

```mermaid
graph TD
    User["Donor / Patient Application"] -->|POST /api.php?action=send_otp| Server["Backend Server (Express)"]
    Server --> CheckKey{"Is BREVO_API_KEY configured?"}
    
    CheckKey -->|Yes (xkeysib-...)| BrevoAPI["Brevo REST API v3<br>(POST /v3/smtp/email)"]
    CheckKey -->|No| CheckSMTP{"Is SMTP configured?"}
    
    BrevoAPI -->|Success| Delivered["Responsive HTML OTP Email / SMS Delivered"]
    BrevoAPI -->|API Error / Fallback| CheckSMTP
    
    CheckSMTP -->|Yes| SMTP["Nodemailer SMTP Delivery"]
    CheckSMTP -->|No| Sim["Console Simulation (Local Dev Mode)"]
```

### Key Advantages of Brevo REST API v3
- **High Deliverability & Speed:** Direct HTTPS REST calls bypass local SMTP firewalls and port blocks (e.g., ports 25/587 blocked on cloud instances).
- **Responsive HTML Template:** Built-in mobile-friendly HTML card template with security tips and countdown timer.
- **Unified Channel Support:** Supports both Email OTP (`/v3/smtp/email`) and SMS OTP (`/v3/transactionalSMS/sms`) via the same API key.
- **Message Tracking:** Returns unique `messageId` and tags for analytics in the Brevo dashboard.

---

## 2. Step-by-Step Account & API Key Setup

### Step 1: Create a Brevo Account
1. Visit [https://www.brevo.com/](https://www.brevo.com/) and create a free account (up to 300 free emails/day).
2. Complete your profile and verify your account email address.

### Step 2: Add & Verify Sender Email
1. Go to **Senders, Domains & Dedicated IPs** -> **Senders** ([https://app.brevo.com/settings/senders](https://app.brevo.com/settings/senders)).
2. Add your sender email (e.g., `admin@yourbloodbank.com` or your verified Gmail address).
3. Check your inbox and click the verification link from Brevo.
4. *(Recommended for Production)* Add and authenticate your domain name (SPF, DKIM, and DMARC records) under the **Domains** tab to achieve 99.9% inbox placement.

### Step 3: Generate an API v3 Key
1. Navigate to **SMTP & API** -> **API Keys** ([https://app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api)).
2. Click **Generate a new API key**.
3. Name the key (e.g., `BloodBank-Production-Key`).
4. Copy your API Key securely. It begins with `xkeysib-`.

### Step 4: Configure Environment Variables
Copy your key into your `.env` file in the project root:

```env
# ==============================================================================
# 8. BREVO API CONFIGURATION (Transactional Email & SMS OTP)
# ==============================================================================
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=your_verified_sender@example.com
BREVO_SENDER_NAME="Blood Bank Management System"
BREVO_SMS_SENDER=BLDBNK
BREVO_ENABLED=true
```

---

## 3. Supporting Code Structure

| File Path | Description |
| :--- | :--- |
| `backend/services/brevoService.js` | Core Brevo API service module containing REST API v3 fetch helpers, responsive HTML template generator, SMS OTP sender, and account verifier. |
| `backend/server.js` | Main backend server integrating unified OTP sender on `action=send_otp` and diagnostic endpoint `action=test_brevo`. |
| `backend/examples/testBrevoOTP.js` | Standalone CLI testing tool for instant command-line verification of API keys and OTP delivery. |

---

## 4. API Reference & Postman / cURL Examples

### A. Send Transactional HTML Email OTP
- **Endpoint:** `POST https://api.brevo.com/v3/smtp/email`
- **Headers:**
  - `accept: application/json`
  - `content-type: application/json`
  - `api-key: <YOUR_BREVO_API_KEY>`

#### cURL Command Example:
```bash
curl -X POST "https://api.brevo.com/v3/smtp/email" \
  -H "accept: application/json" \
  -H "content-type: application/json" \
  -H "api-key: your_brevo_api_key_here" \
  -d '{
    "sender": {
      "name": "Blood Bank Management System",
      "email": "sender@yourdomain.com"
    },
    "to": [
      {
        "email": "donor@example.com",
        "name": "Anuj Donor"
      }
    ],
    "subject": "Your OTP for Blood Bank Registration",
    "htmlContent": "<html><body><h2>Blood Bank Verification Code</h2><p>Your OTP is: <strong>849201</strong></p></body></html>",
    "tags": ["bloodbank_otp"]
  }'
```

#### Success Response (`HTTP 201 Created`):
```json
{
  "messageId": "<202607100930.987654321@brevo.com>"
}
```

---

### B. Send Transactional SMS OTP
- **Endpoint:** `POST https://api.brevo.com/v3/transactionalSMS/sms`
- **Headers:** Same as Email endpoint.

#### cURL Command Example:
```bash
curl -X POST "https://api.brevo.com/v3/transactionalSMS/sms" \
  -H "accept: application/json" \
  -H "content-type: application/json" \
  -H "api-key: your_brevo_api_key_here" \
  -d '{
    "sender": "BLDBNK",
    "recipient": "+919876543210",
    "content": "Blood Bank System verification OTP is 849201. Valid for 5 mins. Do not share with anyone.",
    "type": "transactional",
    "tag": "bloodbank_otp_sms"
  }'
```

---

### C. Verify API Key & Account Info
- **Endpoint:** `GET https://api.brevo.com/v3/account`

#### cURL Command Example:
```bash
curl -X GET "https://api.brevo.com/v3/account" \
  -H "accept: application/json" \
  -H "api-key: your_brevo_api_key_here"
```

---

## 5. How to Test Your Integration

### Method 1: Using the Standalone CLI Diagnostic Script
You can test your Brevo credentials directly from the command line without starting the full web server:

```powershell
# Verify Brevo account and API Key connectivity
node backend/examples/testBrevoOTP.js --verify

# Test sending an HTML OTP Email
node backend/examples/testBrevoOTP.js --email user@example.com --otp 849201 --name "Surendra Singh"

# Test sending an SMS OTP
node backend/examples/testBrevoOTP.js --phone "+919876543210" --otp 849201 --sms
```

### Method 2: Using the Backend REST API (`action=test_brevo`)
When `backend/server.js` is running (`npm start`), you can send an HTTP request to test delivery:

```powershell
# Using PowerShell Invoke-RestMethod
Invoke-RestMethod -Uri "http://localhost:5000/api.php?action=test_brevo" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"email": "donor@example.com", "otp": "456789", "name": "Donor Test"}'
```

---

## 6. Responsive HTML Email OTP Template Design

When sent via `brevoService.js`, recipients receive a polished, visually stunning HTML email designed specifically for medical & healthcare security:

- **Header Banner:** Vibrant red gradient (`#dc2626` to `#991b1b`) with a clean Blood Bank emblem.
- **OTP Callout Card:** Dashed highlighted box featuring large monospace numerals (`36px`) for effortless reading and copy-pasting.
- **Countdown Badge:** Clear notification indicating the 5-minute security expiration window.
- **Security Notice Card:** Blue advisory box reminding users never to disclose verification codes to third parties.

---

## 7. Troubleshooting & Common Status Codes

| Status Code | Error Meaning | Solution |
| :--- | :--- | :--- |
| **201 Created** | Email / SMS queued successfully | Check recipient inbox. Message ID is returned in response. |
| **400 Bad Request** | Sender email not verified | Ensure `BREVO_SENDER_EMAIL` matches an active/verified sender in your Brevo dashboard. |
| **401 Unauthorized** | Invalid or missing API Key | Verify `BREVO_API_KEY` in `.env` starts with `xkeysib-` with no leading/trailing spaces. |
| **402 Payment Required**| Insufficient SMS or Email credits | Check credit quota in Brevo account dashboard. |
| **429 Too Many Requests**| Rate limit exceeded | Implement backoff retry or upgrade Brevo tier. |

---

## 8. Summary of Added & Modified Files
- **[NEW] [brevoService.js](file:///c:/Users/Surendra%20Singh/Downloads/blood-bank-management-systemtoday/backend/services/brevoService.js)**: Full-featured Brevo REST API v3 service.
- **[NEW] [testBrevoOTP.js](file:///c:/Users/Surendra%20Singh/Downloads/blood-bank-management-systemtoday/backend/examples/testBrevoOTP.js)**: CLI diagnostic tool.
- **[MODIFY] [server.js](file:///c:/Users/Surendra%20Singh/Downloads/blood-bank-management-systemtoday/backend/server.js)**: Integrated smart OTP engine + added `test_brevo` endpoint.
- **[MODIFY] [.env.example](file:///c:/Users/Surendra%20Singh/Downloads/blood-bank-management-systemtoday/.env.example) & [.env](file:///c:/Users/Surendra%20Singh/Downloads/blood-bank-management-systemtoday/.env)**: Added Brevo API configuration keys.

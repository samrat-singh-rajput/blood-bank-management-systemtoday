/**
 * ============================================================================
 * BREVO API SERVICE MODULE (Transactional Email & SMS OTP)
 * ============================================================================
 * This module integrates the official Brevo REST API v3 (https://api.brevo.com/v3)
 * for sending high-deliverability one-time passwords (OTPs) via Email and SMS.
 *
 * Supported Features:
 *   1. REST API v3 Transactional Email Sending (HTML & Plain Text)
 *   2. Responsive, modern HTML Email Template with vibrant aesthetics
 *   3. REST API v3 Transactional SMS Sending
 *   4. Account & API Key verification utility
 *   5. Seamless fallback to Nodemailer SMTP when Brevo API Key is unconfigured
 * ============================================================================
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const BREVO_API_BASE_URL = 'https://api.brevo.com/v3';

/**
 * Generates a responsive, visually stunning HTML email template for OTP delivery.
 * Uses modern card aesthetics, clear callouts, and security advice.
 *
 * @param {Object} params
 * @param {string} params.otp - The 6-digit one-time password
 * @param {string} [params.name] - Recipient name
 * @param {number} [params.expiryMinutes=5] - Expiry time in minutes
 * @returns {string} HTML string
 */
export function generateOTPEmailHTML({ otp, name = 'Valued User', expiryMinutes = 5 }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blood Bank Management System - Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333333;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 32px 24px; text-align: center;">
              <div style="width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: rgba(255, 255, 255, 0.18); display: inline-block; margin-bottom: 12px; font-size: 28px;">
                🩸
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
                Blood Bank System
              </h1>
              <p style="margin: 6px 0 0 0; color: #fecaca; font-size: 14px;">
                Secure Identity Verification
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #1f2937;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
                We received a request to register or access your account on the Blood Bank Management System. Please use the verification code below to complete your authentication:
              </p>

              <!-- OTP Highlight Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background-color: #fef2f2; border: 2px dashed #f87171; border-radius: 12px; padding: 24px;">
                    <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #991b1b; font-weight: 600; margin-bottom: 8px;">
                      Your One-Time Password (OTP)
                    </div>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #dc2626; font-family: monospace;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry Alert Badge -->
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; text-align: center;">
                ⏳ This verification code will expire in <strong style="color: #dc2626;">${expiryMinutes} minutes</strong>.
              </p>

              <!-- Security Notice -->
              <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-top: 24px;">
                <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
                  <strong>Security Advisory:</strong> Never share this code with anyone, including Blood Bank staff. If you did not initiate this request, please ignore this email or contact support immediately.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                &copy; ${new Date().getFullYear()} Blood Bank Management System. Saving Lives Together.
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">
                Automated notification sent via Brevo API &bull; Do not reply directly to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Verify Brevo API Key & Account details
 * @returns {Promise<{success: boolean, account?: Object, error?: string}>}
 */
export async function verifyBrevoAccount() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey.includes('your_brevo_api_key_here')) {
    return { success: false, error: 'BREVO_API_KEY is not configured in environment variables.' };
  }

  try {
    const response = await fetch(`${BREVO_API_BASE_URL}/account`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey
      }
    });

    const data = await response.json();
    if (response.ok) {
      return { success: true, account: data };
    }
    return { success: false, error: data.message || `Brevo API error (${response.status})`, details: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Sends a Transactional Email OTP via Brevo REST API v3
 *
 * @param {Object} options
 * @param {string} options.email - Recipient email address
 * @param {string} [options.name] - Recipient display name
 * @param {string} options.otp - 6-digit OTP code
 * @param {string} [options.subject] - Custom email subject
 * @returns {Promise<{success: boolean, messageId?: string, provider: string, error?: string}>}
 */
export async function sendBrevoEmailOTP({ email, name = 'Donor/Patient', otp, subject = 'Your OTP for Blood Bank Registration' }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM_EMAIL || 'sasrajputchauhan@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || process.env.SMTP_FROM_NAME || 'Blood Bank Management System';

  if (!apiKey || apiKey.includes('your_brevo_api_key_here')) {
    console.warn('[Brevo Service] BREVO_API_KEY missing. Falling back to SMTP.');
    return null; // Signals caller to fall back
  }

  const htmlContent = generateOTPEmailHTML({ otp, name });
  const textContent = `Your One-Time Password (OTP) for Blood Bank registration is: ${otp}. It will expire in 5 minutes. Do not share this code with anyone.`;

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      {
        email: email,
        name: name
      }
    ],
    subject: subject,
    htmlContent: htmlContent,
    textContent: textContent,
    tags: ['bloodbank_otp', 'verification']
  };

  try {
    const response = await fetch(`${BREVO_API_BASE_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && (data.messageId || data.messageIds)) {
      console.log(`[Brevo API] OTP email successfully dispatched to ${email} (MessageID: ${data.messageId || data.messageIds[0]})`);
      return {
        success: true,
        messageId: data.messageId || (Array.isArray(data.messageIds) ? data.messageIds[0] : null),
        provider: 'brevo_api'
      };
    } else {
      console.error('[Brevo API Error]', response.status, data);
      return {
        success: false,
        error: data.message || `HTTP ${response.status}: Failed to send Brevo transactional email`,
        details: data,
        provider: 'brevo_api'
      };
    }
  } catch (error) {
    console.error('[Brevo API Exception]', error.message);
    return {
      success: false,
      error: error.message,
      provider: 'brevo_api'
    };
  }
}

/**
 * Sends a Transactional SMS OTP via Brevo REST API v3
 *
 * @param {Object} options
 * @param {string} options.phone - Recipient mobile number (e.g., "+919876543210")
 * @param {string} options.otp - 6-digit OTP code
 * @param {string} [options.sender] - Alphanumeric Sender ID (max 11 chars)
 * @returns {Promise<{success: boolean, reference?: string, provider: string, error?: string}>}
 */
export async function sendBrevoSMSOTP({ phone, otp, sender = 'BLDBNK' }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey || apiKey.includes('your_brevo_api_key_here')) {
    return { success: false, error: 'BREVO_API_KEY is not configured', provider: 'brevo_sms' };
  }

  // Ensure phone has international prefix (+)
  let formattedPhone = phone.trim();
  if (!formattedPhone.startsWith('+')) {
    // Default to India (+91) if 10 digits
    const cleanDigits = formattedPhone.replace(/[^0-9]/g, '');
    if (cleanDigits.length === 10) {
      formattedPhone = '+91' + cleanDigits;
    } else {
      formattedPhone = '+' + cleanDigits;
    }
  }

  const content = `Blood Bank System verification OTP is ${otp}. Valid for 5 mins. Do not share with anyone.`;

  const payload = {
    sender: (process.env.BREVO_SMS_SENDER || sender || 'BLDBNK').slice(0, 11),
    recipient: formattedPhone,
    content: content,
    type: 'transactional',
    tag: 'bloodbank_otp_sms'
  };

  try {
    const response = await fetch(`${BREVO_API_BASE_URL}/transactionalSMS/sms`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[Brevo SMS API] SMS OTP sent to ${formattedPhone} (Ref: ${data.reference})`);
      return {
        success: true,
        reference: data.reference,
        provider: 'brevo_sms'
      };
    } else {
      console.error('[Brevo SMS Error]', response.status, data);
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
        details: data,
        provider: 'brevo_sms'
      };
    }
  } catch (error) {
    console.error('[Brevo SMS Exception]', error.message);
    return {
      success: false,
      error: error.message,
      provider: 'brevo_sms'
    };
  }
}

/**
 * Fallback SMTP OTP sender using Nodemailer
 */
async function sendSMTPOTP({ email, name, otp }) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user || 'sasrajputchauhan@gmail.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Blood Bank Project';

  if (!user || !pass) {
    console.error('[SMTP Fallback Error] SMTP credentials (SMTP_USER or SMTP_PASS) not configured in environment variables.');
    return {
      success: false,
      error: 'SMTP credentials (SMTP_USER/SMTP_PASS) not configured in environment variables.',
      provider: 'smtp_nodemailer'
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: 'Your OTP for Blood Bank Registration',
    html: generateOTPEmailHTML({ otp, name }),
    text: `Your OTP for registration is: ${otp}\n\nIt will expire in 5 minutes.\n\nPlease do not share this code with anyone.`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Fallback] OTP sent to ${email} via ${host} (MessageID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      provider: 'smtp_nodemailer'
    };
  } catch (error) {
    console.error('[SMTP Fallback Error]', error.message);
    return {
      success: false,
      error: error.message,
      provider: 'smtp_nodemailer'
    };
  }
}

/**
 * Unified smart OTP delivery function.
 * Prioritizes Brevo REST API v3 -> Falls back to Nodemailer SMTP -> Logs console simulation if both fail.
 *
 * @param {Object} options
 * @param {string} options.email
 * @param {string} [options.phone]
 * @param {string} options.otp
 * @param {string} [options.name]
 * @returns {Promise<{success: boolean, provider: string, details?: Object}>}
 */
export async function sendUnifiedOTP({ email, phone, otp, name = 'User' }) {
  let lastBrevoError = null;
  // 1. Try Brevo REST API v3 first if API key is present
  if (process.env.BREVO_API_KEY && !process.env.BREVO_API_KEY.includes('your_brevo_api_key_here')) {
    const brevoResult = await sendBrevoEmailOTP({ email, name, otp });
    if (brevoResult && brevoResult.success) {
      return {
        success: true,
        provider: 'brevo_api',
        messageId: brevoResult.messageId
      };
    }
    lastBrevoError = brevoResult?.error || 'Brevo API request failed';
    console.warn('[Brevo Service] Brevo API attempt returned error:', lastBrevoError);
  }

  // 2. Fallback to Nodemailer SMTP
  const smtpResult = await sendSMTPOTP({ email, name, otp });
  if (smtpResult && smtpResult.success) {
    return {
      success: true,
      provider: 'smtp_nodemailer',
      messageId: smtpResult.messageId
    };
  }

  // If Brevo API key was present but failed, return the exact Brevo error message
  if (lastBrevoError) {
    return {
      success: false,
      error: `Brevo Email Delivery Failed: ${lastBrevoError}. Ensure BREVO_SENDER_EMAIL is verified in Brevo Dashboard.`
    };
  }

  // 3. Simulated delivery (keeps app working during local development without credentials)
  console.log(`\n===============================================================`);
  console.log(`[SIMULATED OTP DELIVERY] To: ${email} | Phone: ${phone}`);
  console.log(`[OTP CODE]: ${otp}  (Valid for 5 minutes)`);
  console.log(`===============================================================\n`);

  return {
    success: true,
    provider: 'simulation',
    message: 'OTP delivered via console simulation (configure BREVO_API_KEY or SMTP in .env for live sending)'
  };
}

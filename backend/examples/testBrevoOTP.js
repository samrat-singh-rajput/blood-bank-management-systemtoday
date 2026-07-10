/**
 * ============================================================================
 * CLI TEST SCRIPT: BREVO API OTP SENDER
 * ============================================================================
 * Usage:
 *   node backend/examples/testBrevoOTP.js --email user@example.com --otp 849201
 *   node backend/examples/testBrevoOTP.js --phone "+919876543210" --otp 849201 --sms
 *   node backend/examples/testBrevoOTP.js --verify
 * ============================================================================
 */

import dotenv from 'dotenv';
import { verifyBrevoAccount, sendBrevoEmailOTP, sendBrevoSMSOTP, sendUnifiedOTP } from '../services/brevoService.js';

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    email: null,
    phone: null,
    otp: '654321',
    name: 'Test Recipient',
    sms: false,
    verifyOnly: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) options.email = args[++i];
    else if (args[i] === '--phone' && args[i + 1]) options.phone = args[++i];
    else if (args[i] === '--otp' && args[i + 1]) options.otp = args[++i];
    else if (args[i] === '--name' && args[i + 1]) options.name = args[++i];
    else if (args[i] === '--sms') options.sms = true;
    else if (args[i] === '--verify') options.verifyOnly = true;
  }
  return options;
}

async function runTest() {
  const opts = parseArgs();

  console.log('==================================================================');
  console.log('🩸 BLOOD BANK MANAGEMENT SYSTEM - BREVO API DIAGNOSTICS');
  console.log('==================================================================');
  console.log('API Key Status:', process.env.BREVO_API_KEY ? `${process.env.BREVO_API_KEY.slice(0, 15)}... (Present)` : 'Missing');
  console.log('Sender Email  :', process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM_EMAIL || 'Not configured');
  console.log('Sender Name   :', process.env.BREVO_SENDER_NAME || process.env.SMTP_FROM_NAME || 'Blood Bank System');

  console.log('\n[1/2] Verifying Brevo API Account & Credentials...');
  const accountRes = await verifyBrevoAccount();
  if (accountRes.success) {
    console.log('✅ Brevo Account Verified!');
    console.log(`   Account Email : ${accountRes.account.email}`);
    console.log(`   Company Name  : ${accountRes.account.companyName || 'N/A'}`);
  } else {
    console.warn('⚠️ Brevo Account Verification Notice:', accountRes.error);
  }

  if (opts.verifyOnly) {
    console.log('\nExiting (--verify mode flag specified).');
    process.exit(0);
  }

  if (!opts.email && !opts.phone) {
    console.log('\nℹ️ No --email or --phone provided. Running self-test simulation mode.');
    const result = await sendUnifiedOTP({
      email: 'testdonor@bloodbank.org',
      phone: '+919999999999',
      otp: opts.otp,
      name: opts.name
    });
    console.log('\nSelf-Test Delivery Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  }

  console.log('\n[2/2] Dispatching Transactional OTP...');
  if (opts.sms && opts.phone) {
    console.log(`Sending SMS OTP to ${opts.phone}...`);
    const smsResult = await sendBrevoSMSOTP({ phone: opts.phone, otp: opts.otp });
    console.log('SMS Delivery Result:', JSON.stringify(smsResult, null, 2));
  } else if (opts.email) {
    console.log(`Sending Email HTML OTP to ${opts.email}...`);
    const emailResult = await sendBrevoEmailOTP({ email: opts.email, name: opts.name, otp: opts.otp });
    console.log('Email Delivery Result:', JSON.stringify(emailResult, null, 2));
  }
}

runTest().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});

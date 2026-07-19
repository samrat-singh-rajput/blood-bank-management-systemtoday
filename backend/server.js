import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import { GoogleGenAI } from '@google/genai';
import { sendUnifiedOTP, verifyBrevoAccount, sendBrevoEmailOTP, sendBrevoSMSOTP } from './services/brevoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey.includes('your_gemini_api_key')) {
    throw new Error("Gemini API key is not configured in backend .env");
  }
  return new GoogleGenAI({ apiKey });
};

const allowedOrigins = [
  'https://blood-bank-management-system-ecru.vercel.app',
  'https://blood-bank-management-system-git-main-rajput6.vercel.app',
  'https://blood-bank-management-system-61whl3217-rajput6.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

let dbClient = null;
let db = null;

// Connect to MongoDB Atlas (with Render / OpenSSL 3 cloud compatibility)
async function connectDB() {
  try {
    if (!MONGODB_URI || MONGODB_URI.includes('your_username')) {
      throw new Error("Invalid MONGODB_URI");
    }
    const clientOptions = {
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true
      },
      connectTimeoutMS: 20000,
      socketTimeoutMS: 45000
    };
    dbClient = new MongoClient(MONGODB_URI, clientOptions);
    await dbClient.connect();
    db = dbClient.db('bloodbank_system');
    console.log("✅ Connected to MongoDB Atlas successfully.");
    await seedDatabase();
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB Atlas:", error.message);

    if (error.message.includes('alert number 80') || error.message.includes('tlsv1 alert internal error') || error.message.includes('SSL routines')) {
      console.warn("\n=================================================================================");
      console.warn("🚨 MONGODB ATLAS SSL ALERT 80 (IP ACCESS LIST / TLS HANDSHAKE BLOCKED)");
      console.warn("=================================================================================");
      console.warn("MongoDB Atlas rejected the TLS connection from your Render server IP.");
      console.warn("TO FIX THIS ON MONGODB ATLAS:");
      console.warn("  1. Log into MongoDB Atlas (https://cloud.mongodb.com/)");
      console.warn("  2. In the left sidebar under 'Security', click 'Network Access'");
      console.warn("  3. Click '+ ADD IP ADDRESS'");
      console.warn("  4. Click 'ALLOW ACCESS FROM ANYWHERE' (sets IP address to 0.0.0.0/0)");
      console.warn("  5. Click 'Confirm' and wait 1-2 minutes for Atlas to deploy the rule.");
      console.warn("=================================================================================\n");
    } else {
      console.warn("\n========================================================");
      console.warn("WARNING: MONGODB_URI environment variable is not configured correctly.");
      console.warn("Please configure your actual MongoDB Atlas connection string in Render Environment Variables.");
      console.warn("Server is running, but database operations will fail.");
      console.warn("========================================================\n");
    }
  }
}

// Seeder function
async function seedDatabase() {
  if (!db) return;
  try {
    // 1. Seed Users
    const usersColl = db.collection('users');
    const userCount = await usersColl.countDocuments();
    if (userCount === 0) {
      console.log("Seeding default users...");
      const adminHash = bcrypt.hashSync('rajput', 10);
      const donorHash = bcrypt.hashSync('singh', 10);
      const userHash = bcrypt.hashSync('anuj', 10);
      
      await usersColl.insertMany([
        { _id: 'admin_default', username: 'rajput', password: adminHash, role: 'ADMIN', name: 'System Admin', email: 'admin@bloodbank.com', status: 'Active', joinDate: '2023-10-01', is_verified: 1, createdAt: new Date() },
        { _id: 'donor_default', username: 'anuj', password: donorHash, role: 'DONOR', name: 'Anuj Donor', email: 'anuj_donor@example.com', bloodType: 'A+', status: 'Active', joinDate: '2023-10-01', is_verified: 1, createdAt: new Date() },
        { _id: 'user_default', username: 'anuj', password: userHash, role: 'USER', name: 'Anuj User', email: 'anuj_user@example.com', bloodType: 'B-', status: 'Active', joinDate: '2023-10-01', is_verified: 1, createdAt: new Date() }
      ]);
    }

    // 2. Seed Stocks
    const stocksColl = db.collection('stocks');
    const stocksCount = await stocksColl.countDocuments();
    if (stocksCount === 0) {
      console.log("Seeding default blood stocks...");
      await stocksColl.insertMany([
        { bloodGroup: 'O+', units: 120, maxCapacity: 500, lastUpdated: new Date() },
        { bloodGroup: 'A+', units: 85, maxCapacity: 400, lastUpdated: new Date() },
        { bloodGroup: 'B+', units: 95, maxCapacity: 400, lastUpdated: new Date() },
        { bloodGroup: 'AB+', units: 45, maxCapacity: 250, lastUpdated: new Date() },
        { bloodGroup: 'O-', units: 30, maxCapacity: 200, lastUpdated: new Date() },
        { bloodGroup: 'A-', units: 25, maxCapacity: 200, lastUpdated: new Date() },
        { bloodGroup: 'B-', units: 20, maxCapacity: 200, lastUpdated: new Date() },
        { bloodGroup: 'AB-', units: 15, maxCapacity: 150, lastUpdated: new Date() }
      ]);
    }

    // 3. Seed Hospitals
    const hospitalsColl = db.collection('hospitals');
    const hospitalsCount = await hospitalsColl.countDocuments();
    if (hospitalsCount === 0) {
      console.log("Seeding default hospitals...");
      await hospitalsColl.insertMany([
        { name: 'AIIMS Super Speciality Hospital', city: 'New Delhi', address: 'Ansari Nagar East, New Delhi', phone: '+91 11 2658 8500', email: 'aiims_blood@example.com', status: 'Active' },
        { name: 'Apollo Super Speciality Care', city: 'Mumbai', address: '66 Mathura Road, Sarita Vihar', phone: '+91 22 2692 5000', email: 'apollo_mumbai@example.com', status: 'Active' },
        { name: 'Fortis Health Center', city: 'Bangalore', address: '154/9 Bannerghatta Road', phone: '+91 80 6621 4444', email: 'fortis_blr@example.com', status: 'Active' },
        { name: 'Max Care Hospital', city: 'Kolkata', address: 'Plot No 34, Salt Lake City', phone: '+91 33 2355 6000', email: 'max_kol@example.com', status: 'Active' }
      ]);
    }

    // 4. Seed Security Logs
    const logsColl = db.collection('security_logs');
    const logsCount = await logsColl.countDocuments();
    if (logsCount === 0) {
      console.log("Seeding default security logs...");
      await logsColl.insertMany([
        { event: 'System initialized and DB synchronized', user: 'System Admin', ip: '127.0.0.1', severity: 'info', timestamp: new Date() },
        { event: 'Default administrator account login verified', user: 'rajput', ip: '192.168.1.100', severity: 'info', timestamp: new Date() },
        { event: 'Automatic inventory check completed', user: 'System Admin', ip: '127.0.0.1', severity: 'info', timestamp: new Date() }
      ]);
    }

    // 5. Seed Campaigns
    const campaignsColl = db.collection('campaigns');
    const campaignsCount = await campaignsColl.countDocuments();
    if (campaignsCount === 0) {
      console.log("Seeding default campaigns...");
      await campaignsColl.insertMany([
        { title: 'Mega Drive', description: 'Saving lives.', date: 'Dec 2024', location: 'City Hall', imageUrl: 'https://images.unsplash.com/photo-1615461066841-6116ecaaba7f', attendees: 50 }
      ]);
    }
    console.log("Seeding verified successfully.");
  } catch (err) {
    console.error("Seeding database failed:", err.message);
  }
}

// Helper: robust ID query builder
function toIdQuery(id) {
  if (!id) return { _id: 'NON_EXISTENT_ID_SAFE_FALLBACK' };
  if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
    return { _id: new ObjectId(id) };
  }
  return { _id: id };
}

// Smart Brevo API / SMTP OTP sender
async function sendOTPEmail(email, otp, phone = null, name = 'Valued User') {
  const result = await sendUnifiedOTP({ email, phone, otp, name });
  return result;
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Standalone secure chat endpoint (POST /api/chat)
app.post('/api/chat', async (req, res) => {
  const { message, context, useThinking, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }
  try {
    const ai = getAiClient();
    const model = useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    const systemInstruction = `You are Samrat AI, a friendly, intelligent, and 24/7 AI assistant for the Blood Bank Management System.
Your goal is to help Admins, Donors, and Recipients with their queries about blood donation, health, or navigating the system.

You are equipped with specialized knowledge about:
1. General conversation and greeting users warmly.
2. Blood donation information (preparation, recovery, guidelines).
3. Blood group compatibility (O-, O+, A+, A-, B+, B-, AB+, AB- Universal donor/recipient facts).
4. Blood donation eligibility criteria (age 18-65, weight > 50kg, hemoglobin levels, waiting intervals of 56/90 days between donations).
5. Emergency blood guidance (how to request blood urgently, using emergency access keys, finding nearby hospitals).
6. Project-related assistance (navigating the dashboard, registering requests, booking appointments, uploading certificates, using peer messenger).
7. Health-related general guidance (hydration, iron-rich diet, rest). Always include a clear disclaimer when giving health guidance: "Disclaimer: This AI guidance is for general informational purposes and is not a replacement for professional medical advice. Always consult a qualified doctor for personal health diagnosis or treatment."

Current User Context: ${context || 'General Visitor'}

Keep answers clear, concise, professional, and empathetic. Use markdown formatting with bullet points or bold text where helpful for readability.`;

    const config = {
      systemInstruction,
      tools: [{ googleSearch: {} }]
    };
    if (useThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    let contents = message;
    if (Array.isArray(history) && history.length > 0) {
      contents = [
        ...history.map(item => ({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config
    });

    let text = response.text || "I didn't quite catch that. Could you rephrase your question?";
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && Array.isArray(chunks)) {
      const links = chunks
        .map(chunk => chunk.web?.uri || chunk.maps?.uri)
        .filter(Boolean);
      if (links.length > 0) {
        const uniqueLinks = Array.from(new Set(links));
        text += "\n\nSources:\n" + uniqueLinks.map(link => `- ${link}`).join("\n");
      }
    }

    res.json({ response: text, text });
  } catch (error) {
    console.error("Samrat AI Standalone Chat Error:", error);
    res.status(500).json({ error: "Samrat AI service is temporarily unavailable. Please try again in a moment." });
  }
});

// Universal API.php endpoint router handler
app.all(['/api.php', '/backend/api.php', '/api'], async (req, res) => {
  if (!db) {
    await connectDB();
  }
  if (!db) {
    return res.status(503).json({ error: "Database not connected. Please check server MONGODB_URI configuration." });
  }

  // Extract action query or body
  const action = req.query.action || req.body.action || '';

  try {
    switch (action) {
      case 'login': {
        const { username, password, role } = req.body;
        const user = await db.collection('users').findOne({
          $or: [{ username }, { email: username }, { phone: username }],
          role
        });
        
        if (user && (bcrypt.compareSync(password, user.password) || password === user.password)) {
          const userResponse = { ...user };
          delete userResponse.password;
          res.json({ user: userResponse });
        } else {
          res.json({ error: "Invalid credentials or role mismatch" });
        }
        break;
      }

      case 'login_google': {
        const { idToken, role } = req.body;
        if (!idToken) return res.json({ error: "idToken is required for Google Sign-In" });
        
        try {
          const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Google token validation returned status ${response.status}: ${errText}`);
          }
          
          const profile = await response.json();
          
          let clientID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
          if (clientID) {
            clientID = clientID.trim().replace(/^['"]|['"]$/g, '');
            if (profile.aud !== clientID && profile.azp !== clientID) {
              throw new Error(`Google token audience mismatch. Expected: ${clientID}, Aud: ${profile.aud}, Azp: ${profile.azp}`);
            }
          }
          
          const email = profile.email;
          const name = profile.name;
          const avatarUrl = profile.picture;
          const googleId = profile.sub;
          
          if (!email) return res.json({ error: "Email not provided in Google profile" });
          
          let user = await db.collection('users').findOne({ email: email.toLowerCase() });
          if (!user) {
            const id = 'BB_G_' + Date.now();
            const jd = new Date().toISOString().split('T')[0];
            user = {
              _id: id,
              username: email.split('@')[0],
              role: (role === 'ADMIN') ? 'USER' : (role || 'USER'),
              name: name || email.split('@')[0],
              email: email.toLowerCase(),
              googleId: googleId,
              phone: 'N/A',
              avatarUrl: avatarUrl || '',
              joinDate: jd,
              status: 'Active',
              is_verified: 1,
              createdAt: new Date()
            };
            await db.collection('users').insertOne(user);
          } else {
            const updates = {};
            if (!user.googleId) updates.googleId = googleId;
            if (avatarUrl && avatarUrl !== user.avatarUrl) updates.avatarUrl = avatarUrl;
            
            if (Object.keys(updates).length > 0) {
              await db.collection('users').updateOne({ email: email.toLowerCase() }, { $set: updates });
              Object.assign(user, updates);
            }
          }
          
          const userResponse = { ...user };
          delete userResponse.password;
          res.json({ user: userResponse });
        } catch (err) {
          console.error("Secure Google authentication error:", err.message);
          res.json({ error: "Google authentication failed: " + err.message });
        }
        break;
      }

      case 'send_otp': {
        const { phone, email } = req.body;
        if (!phone || !email) return res.json({ error: "Phone number and email required" });

        const check = await db.collection('users').findOne({
          $or: [{ phone }, { email }],
          is_verified: 1
        });
        if (check) {
          return res.json({ error: "Mobile number or Email already registered." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        const existing = await db.collection('users').findOne({ phone });
        if (existing) {
          await db.collection('users').updateOne(
            { phone },
            { $set: { otp, otp_expiry: expiry, email } }
          );
        } else {
          const id = 'PENDING_' + Date.now();
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          const pendingUser = "pending_" + cleanPhone;
          await db.collection('users').insertOne({
            _id: id,
            phone,
            otp,
            otp_expiry: expiry,
            status: 'Pending',
            is_verified: 0,
            role: 'USER',
            username: '',
            password: '',
            name: 'Pending User',
            email,
            createdAt: new Date()
          });
        }

        console.log(`[OTP DEBUG] Sent OTP ${otp} to phone ${phone} / email ${email}`);

        const deliveryResult = await sendOTPEmail(email, otp, phone);
        if (deliveryResult && deliveryResult.success && deliveryResult.provider !== 'simulation') {
          res.json({
            success: true,
            message: `OTP has been sent to ${email}. Please check your inbox and spam folder.`,
            provider: deliveryResult.provider,
            messageId: deliveryResult.messageId
          });
        } else if (deliveryResult && deliveryResult.success && deliveryResult.provider === 'simulation') {
          // If neither Brevo nor SMTP is configured on Render, warn clearly
          res.json({
            success: true,
            message: `OTP sent to ${email}. (Note: Configure BREVO_API_KEY on Render for live email delivery).`
          });
        } else {
          res.status(400).json({
            error: deliveryResult?.error || `Failed to deliver OTP email to ${email}. Please verify BREVO_SENDER_EMAIL in Brevo.`
          });
        }
        break;
      }

      case 'test_brevo': {
        const { email, phone, otp = '123456', mode = 'email', name = 'Test Recipient' } = req.body;
        const accountCheck = await verifyBrevoAccount();
        if (mode === 'sms' && phone) {
          const smsRes = await sendBrevoSMSOTP({ phone, otp });
          return res.json({ account: accountCheck, delivery: smsRes });
        } else if (email) {
          const emailRes = await sendBrevoEmailOTP({ email, name, otp });
          return res.json({ account: accountCheck, delivery: emailRes });
        }
        res.json({
          account: accountCheck,
          message: "Pass email or phone in JSON body ({ action: 'test_brevo', email: 'test@example.com', otp: '123456' }) to test Brevo OTP delivery."
        });
        break;
      }

      case 'verify_otp': {
        const { phone, otp } = req.body;
        const user = await db.collection('users').findOne({
          phone,
          otp,
          otp_expiry: { $gt: new Date() }
        });
        if (user) {
          await db.collection('users').updateOne({ phone }, { $set: { is_verified: 1 } });
          res.json({ success: true, message: "OTP verified" });
        } else {
          res.json({ error: "Invalid or expired OTP" });
        }
        break;
      }

      case 'check_email': {
        const email = (req.body.email || '').toLowerCase();
        if (!email) return res.json({ error: "Email required" });
        const check = await db.collection('users').findOne({ email });
        if (check) {
          res.json({ error: "Email already registered." });
        } else {
          res.json({ success: true, message: "Email available" });
        }
        break;
      }

      case 'complete_signup': {
        const { phone, username, password, role, name, email } = req.body;
        const pass = bcrypt.hashSync(password, 10);
        const id = 'BB_' + Date.now();
        const jd = new Date().toISOString().split('T')[0];

        const check = await db.collection('users').findOne({ phone, status: 'Pending' });
        if (!check) {
          return res.json({ error: "Verification required." });
        }

        const uCheck = await db.collection('users').findOne({ username });
        if (uCheck) {
          return res.json({ error: "Username already taken." });
        }

        await db.collection('users').deleteOne({ phone, status: 'Pending' });
        const newUser = {
          _id: id,
          username,
          password: pass,
          role: (role === 'ADMIN') ? 'USER' : (role || 'USER'),
          name: username,
          email: email.toLowerCase(),
          phone,
          joinDate: jd,
          status: 'Active',
          is_verified: 1,
          createdAt: new Date()
        };
        await db.collection('users').insertOne(newUser);
        
        const userResponse = { ...newUser };
        delete userResponse.password;
        res.json({ user: userResponse });
        break;
      }

      case 'get_users': {
        const users = await db.collection('users').find({}).toArray();
        const sanitized = users.map(u => {
          const copy = { ...u };
          delete copy.password;
          return copy;
        });
        res.json({ users: sanitized });
        break;
      }

      case 'get_stocks': {
        const stocks = await db.collection('stocks').find({}).toArray();
        res.json({ stocks });
        break;
      }

      case 'get_logs': {
        const logs = await db.collection('security_logs').find({}).sort({ timestamp: -1 }).toArray();
        res.json({ logs });
        break;
      }

      case 'get_requests': {
        const requests = await db.collection('requests').find({}).sort({ date: -1 }).toArray();
        res.json({ requests });
        break;
      }

      case 'get_hospitals': {
        const hospitals = await db.collection('hospitals').find({}).toArray();
        res.json({ hospitals });
        break;
      }

      case 'get_feedbacks': {
        const feedback = await db.collection('feedback').find({}).sort({ date: -1 }).toArray();
        res.json({ feedback });
        break;
      }

      case 'get_campaigns': {
        const campaigns = await db.collection('campaigns').find({}).toArray();
        res.json({ campaigns });
        break;
      }

      case 'add_hospital': {
        const { name, city, address, phone, email } = req.body;
        await db.collection('hospitals').insertOne({
          name, city, address, phone, email, status: 'Active'
        });
        res.json({ success: true });
        break;
      }

      case 'delete_hospital': {
        const { hospitalId } = req.body;
        await db.collection('hospitals').deleteOne(toIdQuery(hospitalId));
        res.json({ success: true });
        break;
      }

      case 'add_request': {
        const { donorName, bloodType, urgency, hospital, location, phone, type, date, units } = req.body;
        await db.collection('requests').insertOne({
          donorName,
          bloodType,
          urgency: urgency || 'Medium',
          hospital: hospital || 'N/A',
          location,
          phone,
          type,
          date: date || new Date().toISOString().split('T')[0],
          units: parseInt(units || 1),
          status: 'Pending',
          createdAt: new Date()
        });
        res.json({ success: true });
        break;
      }

      case 'update_request_status': {
        const { requestId, status } = req.body;
        await db.collection('requests').updateOne(
          toIdQuery(requestId),
          { $set: { status } }
        );
        res.json({ success: true });
        break;
      }

      case 'add_feedback': {
        const { userId, userRole, message } = req.body;
        await db.collection('feedback').insertOne({
          userId,
          userRole,
          message,
          date: new Date().toISOString(),
          reply: ''
        });
        res.json({ success: true });
        break;
      }

      case 'reply_feedback': {
        const { feedbackId, reply } = req.body;
        await db.collection('feedback').updateOne(
          toIdQuery(feedbackId),
          { $set: { reply } }
        );
        res.json({ success: true });
        break;
      }

      case 'send_message': {
        const { senderId, senderName, receiverId, receiverName, text } = req.body;
        await db.collection('messages').insertOne({
          senderId,
          senderName,
          receiverId,
          receiverName,
          text,
          timestamp: new Date()
        });
        res.json({ success: true });
        break;
      }

      case 'get_chat_history': {
        const { user1Id, user2Id } = req.body;
        const history = await db.collection('messages').find({
          $or: [
            { senderId: user1Id, receiverId: user2Id },
            { senderId: user2Id, receiverId: user1Id }
          ]
        }).sort({ timestamp: 1 }).toArray();
        res.json({ history });
        break;
      }

      case 'get_all_chats': {
        const { userId } = req.body;
        const chats = await db.collection('messages').find({
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }).sort({ timestamp: -1 }).toArray();
        res.json({ chats });
        break;
      }

      case 'add_key': {
        const { code, ownerId, type, issuedDate } = req.body;
        await db.collection('emergency_keys').insertOne({
          code,
          ownerId,
          type,
          issuedDate,
          status: 'Active',
          usesRemaining: 1
        });
        res.json({ success: true });
        break;
      }

      case 'get_keys': {
        const { userId } = req.body;
        const keys = await db.collection('emergency_keys').find({ ownerId: userId }).toArray();
        res.json({ keys });
        break;
      }

      case 'toggle_user_status': {
        const { userId } = req.body;
        const user = await db.collection('users').findOne(toIdQuery(userId));
        if (!user) return res.json({ error: "User not found" });
        const newStatus = user.status === 'Active' ? 'Blocked' : 'Active';
        await db.collection('users').updateOne(
          toIdQuery(userId),
          { $set: { status: newStatus } }
        );
        res.json({ success: true, newStatus });
        break;
      }

      case 'get_certificates': {
        const { donorId } = req.body;
        const certificates = await db.collection('certificates').find({ donorId }).toArray();
        res.json({ certificates });
        break;
      }

      case 'add_certificate': {
        const { donorId, date, hospitalName, imageUrl } = req.body;
        await db.collection('certificates').insertOne({
          donorId, date, hospitalName, imageUrl
        });
        res.json({ success: true });
        break;
      }

      case 'get_appointments': {
        const { userId } = req.body;
        const appointments = await db.collection('appointments').find({ donorId: userId }).toArray();
        res.json({ appointments });
        break;
      }

      case 'add_appointment': {
        const { hospitalName, date, time, donorId } = req.body;
        await db.collection('appointments').insertOne({
          hospitalName, date, time, donorId, status: 'Scheduled'
        });
        res.json({ success: true });
        break;
      }

      case 'update_profile': {
        const { userId } = req.body;
        const updates = {};
        for (const [key, val] of Object.entries(req.body)) {
          if (key !== 'userId' && key !== 'action' && key !== '_id' && typeof val !== 'object') {
            if (key === 'password') {
              updates[key] = bcrypt.hashSync(val, 10);
            } else if (key === 'role') {
              if (val !== 'ADMIN') {
                updates[key] = val;
              }
            } else {
              updates[key] = val;
            }
          }
        }
        if (Object.keys(updates).length === 0) {
          return res.json({ error: "No valid fields to update" });
        }
        await db.collection('users').updateOne(
          toIdQuery(userId),
          { $set: updates }
        );
        const updatedUser = await db.collection('users').findOne(toIdQuery(userId));
        if (updatedUser) {
          const userResponse = { ...updatedUser };
          delete userResponse.password;
          res.json({ user: userResponse });
        } else {
          res.json({ error: "User not found after update." });
        }
        break;
      }

      case 'chat_samrat':
      case 'chat_with_samrat': {
        const { message, context, useThinking, history = [] } = req.body;
        if (!message) {
          return res.status(400).json({ error: "Message is required." });
        }
        try {
          const ai = getAiClient();
          const model = useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
          const systemInstruction = `You are Samrat AI, a friendly, intelligent, and 24/7 AI assistant for the Blood Bank Management System.
Your goal is to help Admins, Donors, and Recipients with their queries about blood donation, health, or navigating the system.

You are equipped with specialized knowledge about:
1. General conversation and greeting users warmly.
2. Blood donation information (preparation, recovery, guidelines).
3. Blood group compatibility (O-, O+, A+, A-, B+, B-, AB+, AB- Universal donor/recipient facts).
4. Blood donation eligibility criteria (age 18-65, weight > 50kg, hemoglobin levels, waiting intervals of 56/90 days between donations).
5. Emergency blood guidance (how to request blood urgently, using emergency access keys, finding nearby hospitals).
6. Project-related assistance (navigating the dashboard, registering requests, booking appointments, uploading certificates, using peer messenger).
7. Health-related general guidance (hydration, iron-rich diet, rest). Always include a clear disclaimer when giving health guidance: "Disclaimer: This AI guidance is for general informational purposes and is not a replacement for professional medical advice. Always consult a qualified doctor for personal health diagnosis or treatment."

Current User Context: ${context || 'General Visitor'}

Keep answers clear, concise, professional, and empathetic. Use markdown formatting with bullet points or bold text where helpful for readability.`;

          const config = {
            systemInstruction,
            tools: [{ googleSearch: {} }]
          };
          if (useThinking) {
            config.thinkingConfig = { thinkingBudget: 32768 };
          }

          let contents = message;
          if (Array.isArray(history) && history.length > 0) {
            contents = [
              ...history.map(item => ({
                role: item.role === 'user' ? 'user' : 'model',
                parts: [{ text: item.text }]
              })),
              { role: 'user', parts: [{ text: message }] }
            ];
          }

          const response = await ai.models.generateContent({
            model,
            contents,
            config
          });

          let text = response.text || "I didn't quite catch that. Could you rephrase your question?";
          
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks && Array.isArray(chunks)) {
            const links = chunks
              .map(chunk => chunk.web?.uri || chunk.maps?.uri)
              .filter(Boolean);
            if (links.length > 0) {
              const uniqueLinks = Array.from(new Set(links));
              text += "\n\nSources:\n" + uniqueLinks.map(link => `- ${link}`).join("\n");
            }
          }

          res.json({ response: text, text });
        } catch (error) {
          console.error("Samrat AI Chat Error:", error);
          res.status(500).json({ error: "Samrat AI service is temporarily unavailable. Please try again in a moment." });
        }
        break;
      }

      case 'get_health_tips': {
        const { userRole = 'Donor' } = req.body;
        try {
          const ai = getAiClient();
          const model = 'gemini-3-flash-preview';
          const dateStr = new Date().toDateString();
          const prompt = `Provide exactly 3 short, inspiring, distinct health tips or facts specifically for a blood bank system donor/user (${userRole}) for today, ${dateStr}. 
Each tip should be a single sentence. Focus on hydration, nutrition, and the positive impact of donation. 
Return them as a simple list separated by newlines.`;

          const response = await ai.models.generateContent({
            model,
            contents: prompt,
          });

          const text = response.text || "";
          const tips = text.split('\n').map(t => t.replace(/^\d+\.\s*/, '').trim()).filter(t => t.length > 5);
          
          if (tips.length >= 3) {
            res.json({ tips: tips.slice(0, 3) });
          } else {
            res.json({
              tips: [
                "Stay hydrated by drinking plenty of water throughout the day.",
                "Eat iron-rich foods like spinach and lentils to keep your levels high.",
                "Every single blood donation can save up to three lives."
              ]
            });
          }
        } catch (error) {
          console.error("Gemini Health Tips Error:", error);
          res.json({
            tips: [
              "Drink extra fluids before and after your donation.",
              "Maintain a healthy iron level in your diet.",
              "Your donation makes a real difference in your community."
            ]
          });
        }
        break;
      }

      case 'analyze_medical_image': {
        const { base64Data, mimeType } = req.body;
        try {
          const ai = getAiClient();
          const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: mimeType || 'image/jpeg'
                  }
                },
                {
                  text: "Analyze this medical certificate or document for a blood bank system. Extract the blood type, date of donation, and hospital name if visible. Format the output clearly: Hospital Name: [name], Date: [date], Blood Type: [type]."
                }
              ]
            }
          });
          res.json({ text: response.text || "Could not analyze the image." });
        } catch (error) {
          console.error("Image Analysis Error:", error);
          res.status(500).json({ error: "Failed to process image." });
        }
        break;
      }

      case 'transcribe_audio': {
        const { base64Audio } = req.body;
        try {
          const ai = getAiClient();
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
              parts: [
                {
                  inlineData: {
                    data: base64Audio,
                    mimeType: 'audio/wav'
                  }
                },
                {
                  text: "Transcribe the following audio precisely."
                }
              ]
            }
          });
          res.json({ text: response.text || "" });
        } catch (error) {
          console.error("Transcription Error:", error);
          res.status(500).json({ error: "Failed to transcribe audio." });
        }
        break;
      }

      default:
        res.json({ error: `Invalid action: ${action}` });
    }
  } catch (error) {
    console.error(`API Error on action '${action}':`, error);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});

// Serve frontend build static files in production / single-server deployment
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuildPath));

// SPA catch-all route (serves React app for non-API routes)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.includes('api.php')) {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Blood Bank Express Backend Server is running.');
    }
  });
});

// Start Express Server
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  await connectDB();
});

export default app;

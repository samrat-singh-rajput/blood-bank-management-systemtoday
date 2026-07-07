import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

let dbClient = null;
let db = null;

// Connect to MongoDB
async function connectDB() {
  try {
    if (!MONGODB_URI || MONGODB_URI.includes('your_username')) {
      throw new Error("Invalid MONGODB_URI");
    }
    dbClient = new MongoClient(MONGODB_URI);
    await dbClient.connect();
    db = dbClient.db('bloodbank_system');
    console.log("Connected to MongoDB Atlas successfully.");
    await seedDatabase();
  } catch (error) {
    console.error("Failed to connect to MongoDB Atlas:", error.message);
    console.warn("\n========================================================");
    console.warn("WARNING: MONGODB_URI environment variable is not configured correctly.");
    console.warn("Please configure your actual MongoDB Atlas connection string in .env");
    console.warn("Server is running, but database operations will fail.");
    console.warn("========================================================\n");
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
  if (!id) return {};
  if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
    return { _id: new ObjectId(id) };
  }
  return { _id: id };
}

// Nodemailer SMTP OTP sender
async function sendOTPEmail(email, otp) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || 'sasrajputchauhan@gmail.com';
  const pass = process.env.SMTP_PASS || 'jqkv wdxb mepj bpfh';
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'sasrajputchauhan@gmail.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Blood Bank Project';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: 'Your OTP for Blood Bank Registration',
    html: `Your one-time password (OTP) for registration is: <b>${otp}</b><br><br>It will expire in 5 minutes.<br><br>Please do not share this code with anyone.`,
    text: `Your one-time password (OTP) for registration is: ${otp}\n\nIt will expire in 5 minutes.\n\nPlease do not share this code with anyone.`
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Nodemailer failed to send OTP:", error.message);
    return false;
  }
}

// Universal API.php endpoint router handler
app.all(['/api.php', '/backend/api.php', '/api'], async (req, res) => {
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

        const mailResult = await sendOTPEmail(email, otp);
        if (mailResult) {
          res.json({ success: true, message: "OTP sent successfully to your email." });
        } else {
          res.json({ success: true, message: "OTP sent (Simulated - check server console log).", debug_otp: otp });
        }
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
          role: role || 'USER',
          name: name || username,
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
            updates[key] = val;
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

      default:
        res.json({ error: `Invalid action: ${action}` });
    }
  } catch (error) {
    console.error(`API Error on action '${action}':`, error);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});

// Root check route
app.get('/', (req, res) => {
  res.send('Blood Bank Express Backend Server is running.');
});

// Start Express Server
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  await connectDB();
});

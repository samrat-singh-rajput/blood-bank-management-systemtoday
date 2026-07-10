
import { User, UserRole, BloodStock, DonationRequest, Appointment, Feedback, SecurityLog, Hospital, ChatMessage, DonorCertificate, EmergencyKey, Campaign } from "../types";
import { db } from "./mongoClient";

const getBaseUrl = () => {
  if (import.meta && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const customIp = localStorage.getItem('bloodbank_server_ip');
  if (customIp && customIp !== 'localhost:5000') {
    if (customIp.includes('api.php')) return customIp.startsWith('http') ? customIp : `http://${customIp}`;
    const path = customIp.includes(':5000') ? customIp : (customIp.includes('/backend') ? customIp : `${customIp}/backend`);
    return path.startsWith('http') ? `${path}/api.php` : `http://${path}/api.php`;
  }
  // Default to live Render backend for Vercel, Localhost, and all browsers
  return 'https://blood-bank-management-systemtoday.onrender.com/api.php';
};

const getStorageMode = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'mongodb';
  }
  const mode = localStorage.getItem('bloodbank_storage_mode') || 'mongodb';
  return mode === 'mysql' ? 'mongodb' : mode;
};

const fetchAPI = async (action: string, method: string = 'GET', data: any = null, retries: number = 2): Promise<any> => {
  const baseUrl = getBaseUrl();
  
  // If mode is 'local', skip the network entirely
  if (getStorageMode() === 'local') return null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = new URL(baseUrl);
      url.searchParams.append('action', action);
      
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      
      if (data && method !== 'GET') options.body = JSON.stringify(data);
      
      const response = await fetch(url.toString(), options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText.substring(0, 100)}`);
      }
      
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result;
    } catch (error: any) {
      console.warn(`API Error (${action}) [attempt ${attempt + 1}/${retries + 1}]:`, error.message);
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
};

export const API = {
  login: async (username: string, pass: string, role: UserRole): Promise<User> => {
    const mode = getStorageMode();

    // 1. Try Express Backend if mode is 'mongodb'
    if (mode === 'mongodb') {
      try {
        const res = await fetchAPI('login', 'POST', { username, password: pass, role });
        if (res && res.user) return res.user;
      } catch (err: any) {
        console.warn("MongoDB Atlas Login failed, checking simulation.", err.message);
      }
    }

    // 2. Use simulation (Local Storage) if mode is 'local' OR if MongoDB fails
    const user = await db.users.findOne({ username, password: pass, role });
    if (user) return user;
    
    throw new Error("Invalid credentials or role mismatch. Please check your MongoDB Atlas setup if using that mode.");
  },

  loginWithGoogle: async (credential: string, role?: string): Promise<User> => {
    const mode = getStorageMode();

    if (mode === 'mongodb') {
      try {
        const res = await fetchAPI('login_google', 'POST', { idToken: credential, role });
        if (res && res.user) return res.user;
      } catch (err: any) {
        console.warn("MongoDB Atlas Google Login failed, checking simulation.", err.message);
        throw err;
      }
    }

    // Local Simulation Fallback (Decode JWT client-side for mock database)
    try {
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const profile = JSON.parse(jsonPayload);
      const email = profile.email;
      const name = profile.name;
      const avatarUrl = profile.picture;
      const googleId = profile.sub;

      let user = await db.users.findOne({ email });
      if (!user) {
        const newUser = {
          _id: 'BB_G_' + Date.now(),
          username: email.split('@')[0],
          role: (role as UserRole) || UserRole.USER,
          name: name,
          email: email,
          googleId: googleId,
          phone: 'N/A',
          avatarUrl: avatarUrl || '',
          joinDate: new Date().toISOString().split('T')[0],
          status: 'Active',
          is_verified: true,
          createdAt: new Date().toISOString()
        };
        await db.users.insertOne(newUser);
        user = newUser;
      } else {
        const updates: any = {};
        if (!user.googleId) updates.googleId = googleId;
        if (avatarUrl && avatarUrl !== user.avatarUrl) updates.avatarUrl = avatarUrl;
        if (Object.keys(updates).length > 0) {
          await db.users.updateOne({ email }, updates);
          Object.assign(user, updates);
        }
      }
      return user;
    } catch (e: any) {
      throw new Error("Failed to parse Google ID token: " + e.message);
    }
  },

  sendOTP: async (phone: string, email: string) => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('send_otp', 'POST', { phone, email });
        if (res && res.success) return res;
        if (res && res.error) throw new Error(res.error);
      } catch (err: any) {
        throw new Error(err.message);
      }
    }

    // Local Simulation
    if (getStorageMode() === 'local') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 5 * 60000).toISOString();
      
      // Store in a temporary "pending" user record in local storage
      const existing = await db.users.findOne({ phone });
      if (existing && existing.is_verified) {
        throw new Error("Mobile number already registered.");
      }

      if (existing) {
        await db.users.updateOne({ phone }, { otp, otp_expiry: expiry, email });
      } else {
        await db.users.insertOne({
          _id: `PENDING_${Date.now()}`,
          phone,
          otp,
          otp_expiry: expiry,
          status: 'Pending',
          is_verified: false,
          role: UserRole.USER,
          username: '',
          password: '',
          name: 'Pending User',
          email
        });
      }
      return { success: true, debug_otp: otp };
    }
    
    throw new Error("Failed to send OTP. Please check your storage settings.");
  },

  verifyOTP: async (phone: string, otp: string) => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('verify_otp', 'POST', { phone, otp });
        if (res && res.success) return res;
        if (res && res.error) throw new Error(res.error);
      } catch (err: any) {
        throw new Error(err.message);
      }
    }

    // Local Simulation
    if (getStorageMode() === 'local') {
      const user = await db.users.findOne({ phone, otp });
      if (user && user.otp_expiry && new Date(user.otp_expiry) > new Date()) {
        await db.users.updateOne({ phone }, { is_verified: true });
        return { success: true };
      }
      throw new Error("Invalid or expired OTP");
    }

    throw new Error("Invalid or expired OTP.");
  },

  checkEmail: async (email: string) => {
    const res = await fetchAPI('check_email', 'POST', { email });
    if (res) return res;

    const user = await db.users.findOne({ email });
    if (user) return { error: "Email already registered." };
    return { success: true, message: "Email available" };
  },

  completeSignup: async (data: any) => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('complete_signup', 'POST', data);
        if (res && !res.error) return res;
        if (res && res.error) throw new Error(res.error);
      } catch (err: any) {
        throw new Error(err.message);
      }
    }

    // Local Simulation
    const { phone, ...details } = data;
    const existing = await db.users.findOne({ phone, is_verified: true, status: 'Pending' });
    if (existing) {
      await db.users.updateOne({ phone }, { ...details, status: 'Active' });
      return await db.users.findOne({ phone });
    }

    const newUser = await db.users.insertOne(data);
    return newUser;
  },

  getCampaigns: async (): Promise<Campaign[]> => {
    try {
      const res = await fetchAPI('get_campaigns');
      if (res && res.campaigns) return res.campaigns;
    } catch (err) {
      console.warn("Fetch campaigns failed, using local simulation");
    }

    const campaigns = await db.campaigns.find();
    if (campaigns.length > 0) return campaigns;
    return [{ _id: 'c1', title: 'Mega Drive', description: 'Saving lives.', date: 'Dec 2024', location: 'City Hall', imageUrl: 'https://images.unsplash.com/photo-1615461066841-6116ecaaba7f', attendees: 50 }];
  },

  getUsers: async (): Promise<User[]> => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('get_users');
        if (res && Array.isArray(res.users)) return res.users;
      } catch (e) {
        console.error("MongoDB Atlas Users fetch failed:", e);
      }
      return [];
    }
    return db.users.find();
  },

  getDonationRequests: async (): Promise<DonationRequest[]> => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('get_requests');
        if (res && Array.isArray(res.requests)) return res.requests;
      } catch (e) {
        console.error("MongoDB Atlas Request fetch failed:", e);
      }
      return [];
    }
    return db.requests.find();
  },

  getHospitals: async (): Promise<Hospital[]> => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('get_hospitals');
        if (res && Array.isArray(res.hospitals)) return res.hospitals;
      } catch (e) {
        console.error("MongoDB Atlas Hospitals fetch failed:", e);
      }
      return [];
    }
    return db.hospitals.find();
  },

  getFeedbacks: async (): Promise<Feedback[]> => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('get_feedbacks');
        if (res && Array.isArray(res.feedback)) return res.feedback;
      } catch (e) {
        console.error("MongoDB Atlas Feedbacks fetch failed:", e);
      }
      return [];
    }
    return db.feedback.find();
  },

  getBloodStocks: async (): Promise<BloodStock[]> => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('get_stocks');
        if (res && Array.isArray(res.stocks)) return res.stocks;
      } catch (e) {
        console.error("MongoDB Atlas Stocks fetch failed:", e);
      }
      return [];
    }
    return db.stocks.find();
  },

  getSecurityLogs: async (): Promise<SecurityLog[]> => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('get_logs');
        if (res && Array.isArray(res.logs)) return res.logs;
      } catch (e) {
        console.error("MongoDB Atlas Security Logs fetch failed:", e);
      }
      return [];
    }
    return db.logs.find();
  },
  
  sendMessage: async (msg: any) => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('send_message', 'POST', msg);
        if (res && res.success) return res;
      } catch (err: any) {
        throw new Error(`MongoDB Atlas Message Error: ${err.message}`);
      }
    }
    return db.messages.insertOne(msg);
  },
  getChatHistory: async (u1: string, u2: string) => {
    const res = await fetchAPI('get_chat_history', 'POST', { user1Id: u1, user2Id: u2 });
    if (res && res.history) return res.history;
    
    const all = await db.messages.find();
    return all.filter((m: any) => 
      (m.senderId === u1 && m.receiverId === u2) || 
      (m.senderId === u2 && m.receiverId === u1)
    );
  },
  getAllUserChats: async (uid: string) => {
    const res = await fetchAPI('get_all_chats', 'POST', { userId: uid });
    if (res && res.chats) return res.chats;

    const all = await db.messages.find();
    return all.filter((m: any) => m.senderId === uid || m.receiverId === uid);
  },
  
  addDonationRequest: async (req: any) => {
    if (getStorageMode() === 'mongodb') {
      try {
        const res = await fetchAPI('add_request', 'POST', req);
        if (res && res.success) return res;
      } catch (err: any) {
        throw new Error(`MongoDB Atlas Save Failed: ${err.message}`);
      }
    }
    return db.requests.insertOne(req);
  },
  updateDonationRequestStatus: async (id: string, s: string) => {
    if (getStorageMode() === 'mongodb') {
      const res = await fetchAPI('update_request_status', 'POST', { requestId: id, status: s });
      if (res && res.success) return res;
      throw new Error("MongoDB Atlas Update Failed: Could not update request status.");
    }
    return db.requests.updateOne({ _id: id }, { status: s });
  },
  
  addHospital: async (h: any) => {
    if (getStorageMode() === 'mongodb') {
      const res = await fetchAPI('add_hospital', 'POST', h);
      if (res && res.success) return res;
      throw new Error("MongoDB Atlas Save Failed: Could not add hospital.");
    }
    return db.hospitals.insertOne(h);
  },
  deleteHospital: async (id: string) => {
    await fetchAPI('delete_hospital', 'POST', { hospitalId: id });
    return db.hospitals.deleteOne({ _id: id });
  },
  
  issueEmergencyKey: async (uid: string) => {
    const code = `KEY-${Math.floor(1000 + Math.random() * 8999)}`;
    const keyData = { code, ownerId: uid, type: 'Gold', issuedDate: new Date().toISOString().split('T')[0], status: 'Active', usesRemaining: 1 };
    await fetchAPI('add_key', 'POST', keyData);
    await db.keys.insertOne(keyData);
    return code;
  },

  getEmergencyKeys: async (uid: string): Promise<EmergencyKey[]> => {
    const res = await fetchAPI('get_keys', 'POST', { userId: uid });
    if (res && res.keys) return res.keys;
    return db.keys.find({ ownerId: uid });
  },
  
  addFeedback: async (f: any) => {
    if (getStorageMode() === 'mongodb') {
      const res = await fetchAPI('add_feedback', 'POST', f);
      if (res && res.success) return res;
      throw new Error("MongoDB Atlas Save Failed: Could not send feedback.");
    }
    return db.feedback.insertOne(f);
  },
  replyToFeedback: async (id: string, r: string) => {
    if (getStorageMode() === 'mongodb') {
      const res = await fetchAPI('reply_feedback', 'POST', { feedbackId: id, reply: r });
      if (res && res.success) return res;
      throw new Error("MongoDB Atlas Update Failed: Could not reply to feedback.");
    }
    return db.feedback.updateOne({ _id: id }, { reply: r });
  },
  
  toggleUserStatus: async (uid: string) => {
    if (getStorageMode() === 'mongodb') {
      const res = await fetchAPI('toggle_user_status', 'POST', { userId: uid });
      if (res && res.newStatus) {
        await db.users.updateOne({ _id: uid }, { status: res.newStatus });
        return res.newStatus;
      }
      throw new Error(res?.error || "Failed to toggle user status in MongoDB Atlas");
    }
    await fetchAPI('toggle_user_status', 'POST', { userId: uid });
    const user = await db.users.findOne({ _id: uid });
    const newStatus = user?.status === 'Active' ? 'Blocked' : 'Active';
    await db.users.updateOne({ _id: uid }, { status: newStatus });
    return newStatus;
  },

  getCertificates: async (uid: string) => {
    const res = await fetchAPI('get_certificates', 'POST', { donorId: uid });
    if (res && res.certificates) return res.certificates;
    return db.certificates.find({ donorId: uid });
  },
  addCertificate: async (c: any) => {
    await fetchAPI('add_certificate', 'POST', c);
    return db.certificates.insertOne(c);
  },
  
  getAppointments: async (uid: string) => {
    const res = await fetchAPI('get_appointments', 'POST', { userId: uid });
    if (res && res.appointments) return res.appointments;
    return db.appointments.find({ donorId: uid });
  },
  scheduleAppointment: async (a: any) => {
    await fetchAPI('add_appointment', 'POST', a);
    return db.appointments.insertOne(a);
  },
  
  updateUserProfile: async (uid: string, data: any) => {
    if (getStorageMode() === 'mongodb') {
      const res = await fetchAPI('update_profile', 'POST', { userId: uid, ...data });
      if (res && res.user) {
        await db.users.updateOne({ _id: uid }, data);
        return res.user;
      }
      throw new Error(res?.error || "Failed to update profile in MongoDB Atlas");
    }
    await fetchAPI('update_profile', 'POST', { userId: uid, ...data });
    await db.users.updateOne({ _id: uid }, data);
    return await db.users.findOne({ _id: uid });
  }
};

import { User, UserRole, BloodStock, DonationRequest, Appointment, Feedback, SecurityLog, Hospital, ChatMessage, DonorCertificate, EmergencyKey, Campaign } from "../types";

const getBaseUrl = () => {
  let url = '';
  if (import.meta && import.meta.env && import.meta.env.VITE_API_URL) {
    url = import.meta.env.VITE_API_URL;
  } else {
    const customIp = localStorage.getItem('bloodbank_server_ip');
    if (customIp && customIp !== 'localhost:5000') {
      if (customIp.includes('api.php')) {
        url = customIp.startsWith('http') ? customIp : `http://${customIp}`;
      } else {
        const path = customIp.includes(':5000') ? customIp : (customIp.includes('/backend') ? customIp : `${customIp}/backend`);
        url = path.startsWith('http') ? `${path}/api.php` : `http://${path}/api.php`;
      }
    }
  }
  
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return 'https://blood-bank-management-systemtoday.onrender.com/api.php';
  }
  return url;
};

export const fetchAPI = async (action: string, method: string = 'GET', data: any = null, retries: number = 2): Promise<any> => {
  const baseUrl = getBaseUrl();
  const token = localStorage.getItem('bloodbank_token');
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = new URL(baseUrl);
      url.searchParams.append('action', action);
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const options: RequestInit = {
        method,
        headers,
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
    const res = await fetchAPI('login', 'POST', { username, password: pass, role });
    if (res && res.user) {
      if (res.token) {
        localStorage.setItem('bloodbank_token', res.token);
      }
      localStorage.setItem('bloodbank_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error("Invalid credentials or role mismatch.");
  },

  loginWithGoogle: async (credential: string, role?: string): Promise<User> => {
    const res = await fetchAPI('login_google', 'POST', { idToken: credential, role });
    if (res && res.user) {
      if (res.token) {
        localStorage.setItem('bloodbank_token', res.token);
      }
      localStorage.setItem('bloodbank_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error("Google authentication failed.");
  },

  sendOTP: async (phone: string, email: string) => {
    const res = await fetchAPI('send_otp', 'POST', { phone, email });
    if (res && res.success) return res;
    if (res && res.error) throw new Error(res.error);
    throw new Error("Failed to send OTP email.");
  },

  verifyOTP: async (phone: string, otp: string) => {
    const res = await fetchAPI('verify_otp', 'POST', { phone, otp });
    if (res && res.success) return res;
    if (res && res.error) throw new Error(res.error);
    throw new Error("Invalid or expired OTP.");
  },

  checkEmail: async (email: string) => {
    const res = await fetchAPI('check_email', 'POST', { email });
    if (res) return res;
    return { success: true, message: "Email available" };
  },

  completeSignup: async (data: any) => {
    const res = await fetchAPI('complete_signup', 'POST', data);
    if (res && res.user) {
      if (res.token) {
        localStorage.setItem('bloodbank_token', res.token);
      }
      localStorage.setItem('bloodbank_user', JSON.stringify(res.user));
      return res.user;
    }
    if (res && res.error) throw new Error(res.error);
    throw new Error("Failed to complete signup.");
  },

  getCampaigns: async (): Promise<Campaign[]> => {
    try {
      const res = await fetchAPI('get_campaigns');
      if (res && res.campaigns) return res.campaigns;
    } catch (err) {
      console.warn("Fetch campaigns failed");
    }
    return [{ _id: 'c1', title: 'Mega Drive', description: 'Saving lives.', date: 'Dec 2024', location: 'City Hall', imageUrl: 'https://images.unsplash.com/photo-1615461066841-6116ecaaba7f', attendees: 50 }];
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const res = await fetchAPI('get_users');
      if (res && Array.isArray(res.users)) return res.users;
    } catch (e) {
      console.error("Users fetch failed:", e);
    }
    return [];
  },

  getDonationRequests: async (): Promise<DonationRequest[]> => {
    try {
      const res = await fetchAPI('get_requests');
      if (res && Array.isArray(res.requests)) return res.requests;
    } catch (e) {
      console.error("Request fetch failed:", e);
    }
    return [];
  },

  getHospitals: async (): Promise<Hospital[]> => {
    try {
      const res = await fetchAPI('get_hospitals');
      if (res && Array.isArray(res.hospitals)) return res.hospitals;
    } catch (e) {
      console.error("Hospitals fetch failed:", e);
    }
    return [];
  },

  getFeedbacks: async (): Promise<Feedback[]> => {
    try {
      const res = await fetchAPI('get_feedbacks');
      if (res && Array.isArray(res.feedback)) return res.feedback;
    } catch (e) {
      console.error("Feedbacks fetch failed:", e);
    }
    return [];
  },

  getBloodStocks: async (): Promise<BloodStock[]> => {
    try {
      const res = await fetchAPI('get_stocks');
      if (res && Array.isArray(res.stocks)) return res.stocks;
    } catch (e) {
      console.error("Stocks fetch failed:", e);
    }
    return [];
  },

  getSecurityLogs: async (): Promise<SecurityLog[]> => {
    try {
      const res = await fetchAPI('get_logs');
      if (res && Array.isArray(res.logs)) return res.logs;
    } catch (e) {
      console.error("Security Logs fetch failed:", e);
    }
    return [];
  },
  
  sendMessage: async (msg: any) => {
    const res = await fetchAPI('send_message', 'POST', msg);
    if (res && res.success) return res;
    throw new Error("Message delivery failed.");
  },

  getChatHistory: async (u1: string, u2: string) => {
    const res = await fetchAPI('get_chat_history', 'POST', { user1Id: u1, user2Id: u2 });
    if (res && res.history) return res.history;
    return [];
  },

  getAllUserChats: async (uid: string) => {
    const res = await fetchAPI('get_all_chats', 'POST', { userId: uid });
    if (res && res.chats) return res.chats;
    return [];
  },
  
  addDonationRequest: async (req: any) => {
    const res = await fetchAPI('add_request', 'POST', req);
    if (res && res.success) return res;
    throw new Error("Failed to submit request.");
  },

  updateDonationRequestStatus: async (id: string, s: string) => {
    const res = await fetchAPI('update_request_status', 'POST', { requestId: id, status: s });
    if (res && res.success) return res;
    throw new Error("Could not update request status.");
  },
  
  addHospital: async (h: any) => {
    const res = await fetchAPI('add_hospital', 'POST', h);
    if (res && res.success) return res;
    throw new Error("Could not add hospital.");
  },

  deleteHospital: async (id: string) => {
    return await fetchAPI('delete_hospital', 'POST', { hospitalId: id });
  },
  
  issueEmergencyKey: async (uid: string) => {
    const code = `KEY-${Math.floor(1000 + Math.random() * 8999)}`;
    const keyData = { code, ownerId: uid, type: 'Gold', issuedDate: new Date().toISOString().split('T')[0], status: 'Active', usesRemaining: 1 };
    await fetchAPI('add_key', 'POST', keyData);
    return code;
  },

  getEmergencyKeys: async (uid: string): Promise<EmergencyKey[]> => {
    const res = await fetchAPI('get_keys', 'POST', { userId: uid });
    if (res && res.keys) return res.keys;
    return [];
  },
  
  addFeedback: async (f: any) => {
    const res = await fetchAPI('add_feedback', 'POST', f);
    if (res && res.success) return res;
    throw new Error("Could not send feedback.");
  },

  replyToFeedback: async (id: string, r: string) => {
    const res = await fetchAPI('reply_feedback', 'POST', { feedbackId: id, reply: r });
    if (res && res.success) return res;
    throw new Error("Could not reply to feedback.");
  },
  
  toggleUserStatus: async (uid: string) => {
    const res = await fetchAPI('toggle_user_status', 'POST', { userId: uid });
    if (res && res.newStatus) return res.newStatus;
    throw new Error(res?.error || "Failed to toggle user status.");
  },

  getCertificates: async (uid: string) => {
    const res = await fetchAPI('get_certificates', 'POST', { donorId: uid });
    if (res && res.certificates) return res.certificates;
    return [];
  },

  addCertificate: async (c: any) => {
    return await fetchAPI('add_certificate', 'POST', c);
  },
  
  getAppointments: async (uid: string) => {
    const res = await fetchAPI('get_appointments', 'POST', { userId: uid });
    if (res && res.appointments) return res.appointments;
    return [];
  },

  scheduleAppointment: async (a: any) => {
    return await fetchAPI('add_appointment', 'POST', a);
  },
  
  updateUserProfile: async (uid: string, data: any) => {
    const res = await fetchAPI('update_profile', 'POST', { userId: uid, ...data });
    if (res && res.user) {
      localStorage.setItem('bloodbank_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error(res?.error || "Failed to update profile.");
  }
};

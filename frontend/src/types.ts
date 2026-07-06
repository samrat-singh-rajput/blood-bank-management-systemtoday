
export enum UserRole {
  ADMIN = 'ADMIN',
  DONOR = 'DONOR',
  USER = 'USER', // Recipient
  GUEST = 'GUEST'
}

export interface User {
  _id: string; // MongoDB Identifier
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  bloodType?: string;
  location?: string;
  isVerified?: boolean;
  avatarUrl?: string;
  joinDate?: string;
  phone?: string;
  email?: string;
  address?: string;
  level?: number;
  xp?: number;
  status?: 'Active' | 'Blocked' | 'Inactive';
  accentColor?: 'blood' | 'blue' | 'green' | 'purple';
  fontSize?: 'small' | 'medium' | 'large';
  language?: 'en' | 'hi';
  timeFormat?: '12' | '24';
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  _id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  text: string;
  timestamp: string;
}

export interface BloodStock {
  _id: string;
  bloodType: string;
  units: number;
  maxCapacity: number;
  hospitalName: string;
  city: string;
  contactNumber: string;
}

export interface DonationRequest {
  _id: string;
  donorName: string;
  bloodType: string;
  status: 'Pending' | 'Approved' | 'Completed' | 'Rejected';
  date: string;
  urgency: 'Low' | 'Medium' | 'Critical';
  hospital?: string;
  location?: string;
  phone?: string;
  type?: 'Donation' | 'Request';
  isMedicallyFit?: boolean;
  units?: number;
}

export interface DonorCertificate {
  _id: string;
  donorId: string;
  date: string;
  hospitalName: string;
  imageUrl: string;
}

export interface Feedback {
  _id: string;
  userId: string;
  userRole: string;
  message: string;
  date: string;
  reply?: string;
}

export interface Hospital {
  _id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  status?: 'Active' | 'Inactive';
}

export interface EmergencyKey {
  _id: string;
  code: string;
  type: 'Gold' | 'Platinum';
  usesRemaining: number;
  issuedDate: string;
  status: 'Active' | 'Expired';
  ownerId?: string;
}

export interface SecurityLog {
  _id: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  message: string;
  timestamp: string;
  user?: string;
}

export interface Appointment {
  _id: string;
  hospitalName: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Completed';
  donorId: string;
}

export interface Campaign {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  imageUrl: string;
  attendees: number;
}

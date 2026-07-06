import React, { useState, useEffect, useRef } from 'react';
import { Heart, Calendar, CheckCircle, Lock, MapPin, Award, Clock, CreditCard, Share2, FileText, Upload, Eye, Activity, Trophy, Building2, User as UserIcon, Users, ArrowRight, AlertCircle, Search, Phone, MessageCircle, X, Key, UserCheck, Send, Droplet, Plus, Sparkles, Loader2, Database, Copy, ExternalLink, ShieldAlert } from 'lucide-react';
import { User, Appointment, DonorCertificate, EmergencyKey, DonationRequest, ChatMessage, UserRole } from '../types';
import { API } from '../services/api';
import { Button } from './Button';
import { getHealthTips, analyzeMedicalImage } from '../services/geminiService';
import { realtime } from '../services/realTimeService';

interface DonorPanelProps {
  user: User;
}

type ActiveTab = 'dashboard' | 'requests' | 'medical_certificate' | 'emergency' | 'chat';

export const DonorPanel: React.FC<DonorPanelProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Data States
  const [isVerified, setIsVerified] = useState(user.isVerified);
  const [healthTips, setHealthTips] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [certificates, setCertificates] = useState<DonorCertificate[]>([]);
  const [emergencyKeys, setEmergencyKeys] = useState<EmergencyKey[]>([]);
  
  // Search & Filter States for Requests Feed
  const [searchBloodType, setSearchBloodType] = useState('All');
  const [searchCity, setSearchCity] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Chat States
  const [activeChatPartner, setActiveChatPartner] = useState<User | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [recentChats, setRecentChats] = useState<{user: User, lastMsg: string}[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Donation Form State
  const [donationForm, setDonationForm] = useState({
    username: user.username,
    city: user.location || '',
    contact: user.phone || '',
    bloodType: user.bloodType || 'O+',
    dateToGive: '',
    isMedicallyFit: false,
    units: 1
  });
  const [isSubmittingDonation, setIsSubmittingDonation] = useState(false);

  // Appointment Modal
  const [showAppointmentModal, setShowAppointmentModal] = useState<User | null>(null);
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isBooking, setIsBooking] = useState(false);

  // Certificate Add State
  const [showAddCert, setShowAddCert] = useState(false);
  const [isScanningCert, setIsScanningCert] = useState(false);
  const [newCert, setNewCert] = useState({ hospitalName: '', date: '', imageUrl: '' });
  const [isSavingCert, setIsSavingCert] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const refreshKeys = async () => {
    try {
      const myKeys = await API.getEmergencyKeys(user._id);
      setEmergencyKeys(myKeys);
    } catch (err) {
      console.error("Failed to refresh emergency keys", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setHealthTips(await getHealthTips('Donor'));
        const apps = await API.getAppointments(user._id);
        setAppointments(apps);
        const myCerts = await API.getCertificates(user._id);
        setCertificates(myCerts);
        await refreshKeys();
        loadRecentChats();
      } catch (err) {
        console.error("Failed to load donor data", err);
      }
    };
    loadData();

    // Listen for new emergency keys issued by admin
    const handleNewKey = (data: { userId: string, key: EmergencyKey }) => {
      if (data.userId === user._id) {
        setEmergencyKeys(prev => [data.key, ...prev]);
      }
    };
    realtime.on('NEW_EMERGENCY_KEY', handleNewKey);
    return () => realtime.off('NEW_EMERGENCY_KEY', handleNewKey);
  }, [user._id]);

  useEffect(() => {
    if (activeChatPartner) {
      loadChatHistory(activeChatPartner._id);
    }
  }, [activeChatPartner]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSearchUsers = async () => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const allUsers = await API.getUsers();
      // Filter users (excluding self and admins) by blood type and city
      const results = allUsers.filter(u => {
        if (u._id === user._id) return false;
        if (u.role === UserRole.ADMIN) return false;
        const typeMatch = searchBloodType === 'All' || u.bloodType === searchBloodType;
        const cityMatch = !searchCity || (u.location && u.location.toLowerCase().includes(searchCity.toLowerCase()));
        return typeMatch && cityMatch;
      });
      setSearchResults(results);
    } catch (err) {
      alert("Failed to search users.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadRecentChats = async () => {
    try {
      const allChats = await API.getAllUserChats(user._id);
      const partnersMap = new Map<string, {user: User, lastMsg: string}>();
      const allUsers = await API.getUsers();

      allChats.reverse().forEach(c => {
        const partnerId = c.senderId === user._id ? c.receiverId : c.senderId;
        if (!partnersMap.has(partnerId)) {
          const partner = allUsers.find(u => u._id === partnerId);
          if (partner) {
            partnersMap.set(partnerId, { user: partner, lastMsg: c.text });
          }
        }
      });
      setRecentChats(Array.from(partnersMap.values()));
    } catch (e) {
      console.error(e);
    }
  };

  const loadChatHistory = async (partnerId: string) => {
    try {
      const history = await API.getChatHistory(user._id, partnerId);
      setChatHistory(history);
    } catch (err) {
      console.error("Failed to load chat history", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatPartner) return;

    const newMsg: Omit<ChatMessage, '_id'> = {
      senderId: user._id,
      senderName: user.name,
      receiverId: activeChatPartner._id,
      receiverName: activeChatPartner.name,
      text: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    try {
      await API.sendMessage(newMsg);
      setChatInput('');
      loadChatHistory(activeChatPartner._id);
      loadRecentChats();
    } catch (err) {
      alert("Failed to send message.");
      console.error(err);
    }
  };

  const startChatWithUser = (target: User) => {
    setActiveChatPartner(target);
    setActiveTab('chat');
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAppointmentModal) return;
    setIsBooking(true);
    try {
      const app: Omit<Appointment, '_id'> = {
        hospitalName: `Local Medical Center (For ${showAppointmentModal.name})`,
        date: appointmentDate,
        time: appointmentTime,
        status: 'Scheduled',
        donorId: user._id
      };
      await API.scheduleAppointment(app);
      
      // Update local state to show immediately in Overview
      // For immediate display, we simulate the _id for the new item.
      const displayApp = { ...app, _id: `temp-${Date.now()}` } as Appointment;
      setAppointments(prev => [displayApp, ...prev]);
      setShowAppointmentModal(null);
      
      alert(`Donation Appointment with ${showAppointmentModal.name} has been scheduled.`);
      setActiveTab('dashboard'); // Redirect to Overview
    } catch (err) {
      alert("Failed to schedule appointment.");
      console.error(err);
    } finally {
      setIsBooking(false);
    }
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationForm.isMedicallyFit) return;
    setIsSubmittingDonation(true);
    try {
      const reg: Omit<DonationRequest, '_id'> = {
        donorName: donationForm.username,
        bloodType: donationForm.bloodType,
        status: 'Pending',
        date: donationForm.dateToGive,
        urgency: 'Medium',
        location: donationForm.city,
        phone: donationForm.contact,
        type: 'Donation',
        isMedicallyFit: donationForm.isMedicallyFit,
        units: donationForm.units
      };
      await API.addDonationRequest(reg);
      alert("Donation registered! Thank you for your contribution.");
      setDonationForm(prev => ({ ...prev, dateToGive: '', isMedicallyFit: false }));
    } catch (err) {
      alert("Failed to register donation.");
    } finally {
      setIsSubmittingDonation(false);
    }
  };

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningCert(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      setNewCert(prev => ({ ...prev, imageUrl: result }));
      const base64 = result.split(',')[1];
      try {
        const analysis = await analyzeMedicalImage(base64, file.type);
        const hospMatch = analysis.match(/Hospital Name:\s*([^\n\r]*)/i);
        const dateMatch = analysis.match(/Date:\s*([^\n\r]*)/i);
        setNewCert(prev => ({
          ...prev,
          hospitalName: hospMatch?.[1]?.trim() || prev.hospitalName,
          date: dateMatch?.[1]?.trim() || new Date().toISOString().split('T')[0]
        }));
      } catch (err) {
        console.error("AI Scan failed", err);
      } finally {
        setIsScanningCert(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCert.hospitalName || !newCert.imageUrl) return;
    setIsSavingCert(true);
    try {
      const cert: Omit<DonorCertificate, '_id'> = {
        donorId: user._id,
        date: newCert.date || new Date().toISOString().split('T')[0],
        hospitalName: newCert.hospitalName,
        imageUrl: newCert.imageUrl
      };
      await API.addCertificate(cert);
      const displayCert = { ...cert, _id: `temp-cert-${Date.now()}` } as DonorCertificate;
      setCertificates(prev => [displayCert, ...prev]);
      setShowAddCert(false);
      setNewCert({ hospitalName: '', date: '', imageUrl: '' });
      alert("Medical Certificate registered successfully.");
    } catch (err) {
      alert("Failed to save certificate.");
    } finally {
      setIsSavingCert(false);
    }
  };

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      alert("Key code copied to clipboard.");
    } catch (err) {
      alert("Failed to copy to clipboard.");
    }
  };

  const renderOverview = () => (
    <div className="space-y-8 animate-fade-in-up">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="space-y-8 text-left">
            <div className="relative h-56 rounded-3xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] cursor-pointer">
               <div className="absolute inset-0 bg-gradient-to-br from-blood-600 to-blood-900"></div>
               <div className="relative z-10 p-6 flex flex-col justify-between h-full text-white">
                 <div className="flex justify-between items-start">
                   <div className="text-left">
                     <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Blood Bank Member</p>
                     <h3 className="font-bold text-xl tracking-wider flex items-center gap-2"><CreditCard size={20} /> {user._id.toUpperCase()}</h3>
                   </div>
                   {isVerified ? <CheckCircle className="text-green-400" /> : <Lock className="text-white/50" />}
                 </div>
                 <div className="flex items-end gap-4">
                   <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 text-center min-w-[60px]">
                     <p className="text-xs opacity-70 uppercase">Type</p>
                     <p className="text-2xl font-bold">{user.bloodType || 'N/A'}</p>
                   </div>
                   <div className="flex-1 text-left">
                     <p className="text-sm font-medium opacity-90">{user.name}</p>
                     <p className="text-xs opacity-60">Joined {user.joinDate || '2023'}</p>
                   </div>
                 </div>
               </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 transition-colors">
               <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                 <Droplet size={20} className="text-blood-600" /> Register Donation
               </h3>
               <form onSubmit={handleDonationSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Username</label>
                      <input type="text" readOnly value={user.username} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border-none outline-none text-gray-900 dark:text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Blood Type</label>
                      <select 
                        value={donationForm.bloodType} 
                        onChange={e => setDonationForm({...donationForm, bloodType: e.target.value})}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border-none outline-none text-gray-900 dark:text-white"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">City / Region</label>
                    <input type="text" required value={donationForm.city} onChange={e => setDonationForm({...donationForm, city: e.target.value})} placeholder="e.g. New York" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border-none outline-none text-gray-900 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Contact Phone</label>
                    <input type="tel" required value={donationForm.contact} onChange={e => setDonationForm({...donationForm, contact: e.target.value})} placeholder="Mobile number" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border-none outline-none text-gray-900 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Date to Give</label>
                    <input type="date" required value={donationForm.dateToGive} onChange={e => setDonationForm({...donationForm, dateToGive: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border-none outline-none text-gray-900 dark:text-white" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl transition-colors">
                    <input type="checkbox" id="medicalFit" checked={donationForm.isMedicallyFit} onChange={e => setDonationForm({...donationForm, isMedicallyFit: e.target.checked})} className="w-4 h-4 text-blood-600 rounded" />
                    <label htmlFor="medicalFit" className="text-[11px] font-bold text-gray-600 dark:text-gray-400 cursor-pointer">I am medically fit & healthy to donate</label>
                  </div>
                  <Button type="submit" isLoading={isSubmittingDonation} disabled={!donationForm.isMedicallyFit} className="w-full py-3 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg">
                    <Send size={14} className="mr-2" /> Submit Donation
                  </Button>
               </form>
            </div>
         </div>

         <div className="lg:col-span-2 space-y-6 text-left">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 transition-colors relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5"><Activity size={100} /></div>
               <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase mb-6 flex items-center gap-2"><Trophy size={20} className="text-orange-500" /> Daily Health Suite</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                 {healthTips.map((tip, idx) => (
                   <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 shadow-inner group hover:bg-blood-50 dark:hover:bg-blood-900/10 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blood-100 dark:bg-blood-900 text-blood-600 dark:text-blood-400 flex items-center justify-center font-black text-xs mb-3 group-hover:scale-110 transition-transform">{idx+1}</div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-bold leading-relaxed">"{tip}"</p>
                   </div>
                 ))}
               </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 transition-colors">
               <div className="flex justify-between items-center mb-6">
                 <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase flex items-center gap-2"><Calendar size={20} className="text-blood-600" /> My Donation Schedule</h4>
               </div>
               <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {appointments.length > 0 ? appointments.map(app => (
                    <div key={app._id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex justify-between items-center group hover:border-blood-200 transition-all">
                       <div className="flex gap-4 items-center">
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                             <Building2 size={24} className="text-blood-600" />
                          </div>
                          <div>
                             <p className="font-black text-gray-900 dark:text-white text-sm">{app.hospitalName}</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                                <Calendar size={12} /> {app.date} @ {app.time}
                             </p>
                          </div>
                       </div>
                       <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                         app.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700'
                       }`}>
                         {app.status}
                       </span>
                    </div>
                  )) : (
                    <div className="py-12 text-center opacity-30 flex flex-col items-center gap-2">
                       <Calendar size={48} className="text-gray-400" />
                       <p className="font-black uppercase tracking-[0.2em] text-[10px]">No appointments on record</p>
                    </div>
                  )}
               </div>
            </div>
         </div>
       </div>
    </div>
  );

  const renderRequests = () => (
    <div className="space-y-8 animate-fade-in-up">
       <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 transition-colors text-left">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight mb-8">
            <Users className="text-blood-600" /> Member Directory
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-10">
             <div className="flex-1 relative">
                <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-600" size={18}/>
                <select 
                  value={searchBloodType} 
                  onChange={(e) => setSearchBloodType(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-gray-50 dark:bg-gray-800 shadow-inner focus:ring-2 focus:ring-blood-500 appearance-none font-bold text-gray-800 dark:text-white"
                >
                  <option value="All">All Blood Types</option>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
             </div>
             <div className="flex-[2] relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-600" size={18}/>
                <input 
                  type="text" 
                  placeholder="Filter by city..." 
                  value={searchCity} 
                  onChange={(e) => setSearchCity(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-gray-50 dark:bg-gray-800 shadow-inner focus:ring-2 focus:ring-blood-500 font-bold dark:text-white"
                />
             </div>
             <Button onClick={handleSearchUsers} className="rounded-2xl font-black uppercase tracking-widest px-8">
               Search Database
             </Button>
          </div>

          <div className="min-h-[400px]">
             {isSearching ? (
               <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-blood-600" size={48} />
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">Querying Network Registry...</p>
               </div>
             ) : searchResults.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {searchResults.map(target => (
                   <div key={target._id} className="bg-white dark:bg-gray-950 p-6 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 transition-all hover:scale-[1.02] flex flex-col items-start relative overflow-hidden group">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blood-50 dark:bg-blood-900/10 rounded-full blur-2xl opacity-50 group-hover:scale-125 transition-transform"></div>
                      
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-blood-50 dark:bg-blood-900/20 flex items-center justify-center text-blood-600 dark:text-blood-400 font-black text-xl shadow-inner border border-blood-100 dark:border-blood-800">
                           {target.bloodType || 'N/A'}
                        </div>
                        <div className="text-left">
                           <h4 className="font-black text-gray-900 dark:text-white text-lg tracking-tight leading-tight">{target.name}</h4>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                              <MapPin size={10} className="text-blood-400" /> {target.location || 'Local Registry'}
                           </p>
                        </div>
                        <div className="absolute top-6 right-6 opacity-5 group-hover:opacity-10 transition-opacity">
                           <Droplet size={40} />
                        </div>
                      </div>

                      <div className="flex gap-2 w-full mt-auto">
                        <Button 
                          onClick={() => setShowAppointmentModal(target)}
                          className="flex-1 bg-blood-600 hover:bg-blood-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blood-500/20 active:scale-95 transition-all"
                        >
                          Book Appointment
                        </Button>
                        <button 
                          onClick={() => startChatWithUser(target)}
                          className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400 hover:text-blood-600 hover:bg-blood-50 dark:hover:bg-blood-900/20 border border-gray-100 dark:border-gray-700 transition-all active:scale-90"
                          title="Message this user"
                        >
                          <MessageCircle size={22} />
                        </button>
                      </div>
                   </div>
                 ))}
               </div>
             ) : hasSearched ? (
               <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
                  <Search size={64} className="text-gray-300" />
                  <p className="font-black uppercase tracking-[0.2em] text-sm text-gray-500">No matching members found</p>
               </div>
             ) : (
               <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20">
                  <Database className="text-gray-300" size={80} />
                  <p className="font-black uppercase tracking-[0.2em] text-xs text-gray-500">Database Search Engine Idle</p>
               </div>
             )}
          </div>
       </div>

       {/* Appointment Booking Modal */}
       {showAppointmentModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 backdrop-blur-sm bg-black/40 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-800 relative text-left">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-blood-600 rounded-t-full"></div>
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Schedule Donation</h3>
                  <button onClick={() => setShowAppointmentModal(null)} className="p-2 text-gray-400 hover:text-blood-600 transition-colors"><X /></button>
               </div>
               <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center gap-4 border border-gray-100 dark:border-gray-700">
                  <div className="w-12 h-12 bg-blood-600 text-white rounded-xl flex items-center justify-center font-black text-lg">{showAppointmentModal.bloodType}</div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white">{showAppointmentModal.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{showAppointmentModal.location}</p>
                  </div>
               </div>
               <form onSubmit={handleBookAppointment} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Proposed Donation Date</label>
                    <input required type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold dark:text-white focus:ring-2 focus:ring-blood-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Proposed Time Slot</label>
                    <input required type="time" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold dark:text-white focus:ring-2 focus:ring-blood-500 transition-all" />
                  </div>
                  <div className="flex gap-4 pt-4">
                     <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAppointmentModal(null)}>Discard</Button>
                     <Button type="submit" isLoading={isBooking} className="flex-[2] font-black uppercase tracking-widest shadow-xl shadow-blood-500/20">Confirm Appointment</Button>
                  </div>
               </form>
            </div>
         </div>
       )}
    </div>
  );

  const renderMedicalCertificates = () => (
    <div className="space-y-8 animate-fade-in-up text-left">
       <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center transition-all gap-4">
          <div className="text-left w-full">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
              <FileText className="text-blood-600" /> Medical Certificates
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">Manage and upload your verified donation history records.</p>
          </div>
          <Button onClick={() => setShowAddCert(true)} className="gap-2 font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blood-500/20 whitespace-nowrap px-8">
            <Plus size={18} /> Add New Record
          </Button>
       </div>

       {showAddCert && (
         <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl border border-blood-100 dark:border-gray-800 animate-fade-in-up relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-blood-600"></div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Register New Medical Record</h3>
              <button onClick={() => setShowAddCert(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"><X/></button>
            </div>
            
            <form onSubmit={handleSaveCert} className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group overflow-hidden relative shadow-inner"
                  >
                    {newCert.imageUrl ? (
                      <img src={newCert.imageUrl} className="w-full h-full object-cover" alt="Cert Preview" />
                    ) : (
                      <>
                        <Upload size={48} className="text-gray-300 group-hover:text-blood-600 transition-colors mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Upload Certificate Image</p>
                      </>
                    )}
                    {isScanningCert && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-blood-600 mb-2" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blood-600 animate-pulse">AI Scanning Record...</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleCertUpload} />
               </div>

               <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Medical Facility / Hospital</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        required 
                        type="text" 
                        value={newCert.hospitalName} 
                        onChange={e => setNewCert({...newCert, hospitalName: e.target.value})} 
                        placeholder="e.g. City General Hospital" 
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blood-500 transition-all text-gray-900 dark:text-white" 
                      />
                      {newCert.hospitalName && !isScanningCert && <Sparkles size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-blood-400 animate-pulse" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Donation Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        required 
                        type="date" 
                        value={newCert.date} 
                        onChange={e => setNewCert({...newCert, date: e.target.value})} 
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blood-500 transition-all text-gray-900 dark:text-white" 
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowAddCert(false)} className="rounded-xl px-8 dark:border-gray-700 dark:text-gray-400">Cancel</Button>
                    <Button type="submit" isLoading={isSavingCert} disabled={!newCert.imageUrl || !newCert.hospitalName} className="px-12 font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blood-500/20">Register Record</Button>
                  </div>
               </div>
            </form>
         </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {certificates.length > 0 ? (
            certificates.map(cert => (
              <div key={cert._id} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all border border-gray-100 dark:border-gray-800 group overflow-hidden relative text-left">
                 <div className="aspect-video w-full rounded-2xl overflow-hidden mb-4 relative shadow-inner">
                    <img src={cert.imageUrl} alt="Certificate" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-3 right-3">
                       <span className="px-2 py-1 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg flex items-center gap-1">
                         <CheckCircle size={10} /> Verified
                       </span>
                    </div>
                 </div>
                 <h4 className="font-black text-gray-900 dark:text-white text-lg mb-1 leading-tight truncate tracking-tight">{cert.hospitalName}</h4>
                 <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={12} className="text-blood-400" /> {new Date(cert.date).toLocaleDateString()}
                 </p>
                 <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
                    <button className="text-[10px] font-black text-blood-600 dark:text-blood-400 uppercase tracking-widest flex items-center gap-1 hover:underline">
                      <Eye size={12} /> View Document
                    </button>
                    <button className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-400 hover:text-blood-600 transition-colors">
                      <Share2 size={16} />
                    </button>
                 </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center opacity-30 flex flex-col items-center justify-center space-y-4">
               <FileText size={56} className="text-gray-400" />
               <p className="font-black uppercase tracking-[0.2em] text-sm text-gray-500">No medical records on file</p>
            </div>
          )}
       </div>
    </div>
  );

  const renderEmergencyAccess = () => (
    <div className="space-y-8 animate-fade-in-up text-left">
       <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 transition-all flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-left w-full">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
              <Key className="text-red-600" /> Emergency Grant Keys
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">Special priority keys issued by Administrators for emergency medical access.</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 rounded-2xl border border-red-100 dark:border-red-900/30">
             <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black uppercase text-[10px] tracking-widest">
               <ShieldAlert size={16} /> Restricted Access
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {emergencyKeys.length > 0 ? (
            emergencyKeys.map(key => (
              <div key={key._id} className="relative group overflow-hidden bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-2xl hover:border-blood-200">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Key size={120} />
                </div>
                
                <div className="relative z-10">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                         <div className={`p-3 rounded-xl shadow-lg ${key.type === 'Gold' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                           <Key size={24} />
                         </div>
                         <div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${key.type === 'Gold' ? 'bg-yellow-500 text-white' : 'bg-gray-800 text-white'}`}>
                              {key.type} Tier
                            </span>
                            <h4 className="font-black text-gray-900 dark:text-white text-lg mt-0.5">Emergency Voucher</h4>
                         </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${key.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                         {key.status}
                      </div>
                   </div>

                   <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 mb-6 flex flex-col items-center justify-center relative group-hover:bg-blood-50/50 transition-colors">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mb-2">Unique Access Code</p>
                      <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-widest font-mono select-all">
                        {key.code}
                      </h2>
                      <button 
                        onClick={() => copyToClipboard(key.code)}
                        className="absolute right-4 bottom-4 p-2 bg-white dark:bg-gray-700 rounded-lg text-gray-400 hover:text-blood-600 shadow-sm border border-gray-100 dark:border-gray-600 transition-all"
                        title="Copy to Clipboard"
                      >
                         <Copy size={16} />
                      </button>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                         <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                           <Clock size={10} /> Issued Date
                         </p>
                         <p className="font-black text-gray-900 dark:text-white text-sm">{key.issuedDate}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                         <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                           <Activity size={10} /> Uses Left
                         </p>
                         <p className="font-black text-gray-900 dark:text-white text-sm">{key.usesRemaining} Time(s)</p>
                      </div>
                   </div>

                   <button className="w-full mt-6 py-4 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blood-600 transition-all shadow-xl shadow-gray-900/10">
                      Learn How to Use <ExternalLink size={14} />
                   </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center bg-white dark:bg-gray-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
               <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Key size={40} className="text-gray-200 dark:text-gray-700" />
               </div>
               <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-sm">No Emergency Keys Issued</p>
               <p className="text-gray-400 text-xs font-medium mt-2 max-w-xs mx-auto">Admin issues these keys to verified donors for critical emergency assistance.</p>
            </div>
          )}
       </div>
    </div>
  );

  const renderChat = () => (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex h-[700px] animate-fade-in-up transition-colors">
       <div className="w-80 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-950/50">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
             <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-sm flex items-center gap-2">
                <MessageCircle size={18} className="text-blood-600" /> Peer Inbox
             </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
             {recentChats.length > 0 ? (
               recentChats.map(chat => (
                 <button 
                  key={chat.user._id}
                  onClick={() => setActiveChatPartner(chat.user)}
                  className={`w-full p-5 text-left flex items-center gap-4 transition-all hover:bg-white dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-800 ${activeChatPartner?._id === chat.user._id ? 'bg-white dark:bg-gray-800 shadow-inner' : ''}`}
                 >
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center font-black text-lg">
                      {chat.user.name.charAt(0)}
                    </div>
                    <div className="flex-1 overflow-hidden text-left">
                       <p className="font-bold text-gray-900 dark:text-white truncate">{chat.user.name}</p>
                       <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{chat.lastMsg}</p>
                    </div>
                 </button>
               ))
             ) : <div className="p-10 text-center opacity-30 text-gray-500 h-full flex items-center justify-center">Inbox is empty.</div>}
          </div>
       </div>

       <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {activeChatPartner ? (
             <>
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                         {activeChatPartner.name.charAt(0)}
                      </div>
                      <div className="text-left">
                         <h4 className="font-black text-gray-900 dark:text-white tracking-tight">{activeChatPartner.name}</h4>
                         <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Active Connection</span>
                      </div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-gray-950/30 custom-scrollbar">
                   {chatHistory.map(msg => (
                     <div key={msg._id} className={`flex ${msg.senderId === user._id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm text-sm ${msg.senderId === user._id ? 'bg-blood-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                           <p className="leading-relaxed font-medium text-left">{msg.text}</p>
                           <p className={`text-[9px] mt-2 font-bold uppercase tracking-tighter ${msg.senderId === user._id ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                     </div>
                   ))}
                   <div ref={chatEndRef} />
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                   <form onSubmit={handleSendMessage} className="flex gap-4">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type response..."
                        className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blood-500 transition-all text-gray-900 dark:text-white shadow-inner"
                      />
                      <Button type="submit" disabled={!chatInput.trim()} className="px-8 rounded-2xl shadow-xl shadow-blood-500/20 gap-2 font-black uppercase tracking-widest">
                         <Send size={18} /> Send
                      </Button>
                   </form>
                </div>
             </>
          ) : <div className="flex-1 flex items-center justify-center opacity-30 text-gray-500 h-full">Select a member to start a secure conversation.</div>}
       </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white dark:bg-[#111827] p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 inline-flex flex-wrap gap-2 w-full md:w-auto transition-colors">
         <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gray-900 dark:bg-gray-700 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Overview</button>
         <button onClick={() => setActiveTab('requests')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-blood-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Requests Feed</button>
         <button onClick={() => setActiveTab('chat')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Messages</button>
         <button onClick={() => setActiveTab('medical_certificate')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'medical_certificate' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Medical Certificate</button>
         <button onClick={() => setActiveTab('emergency')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'emergency' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Emergency Access</button>
      </div>
      <div className="min-h-[500px]">
         {activeTab === 'dashboard' && renderOverview()}
         {activeTab === 'requests' && renderRequests()}
         {activeTab === 'chat' && renderChat()}
         {activeTab === 'medical_certificate' && renderMedicalCertificates()}
         {activeTab === 'emergency' && renderEmergencyAccess()}
      </div>
    </div>
  );
};
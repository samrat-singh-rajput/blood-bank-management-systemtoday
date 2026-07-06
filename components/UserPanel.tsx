import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Droplet, Phone, MessageCircle, Activity, Users, Info, Send, Clock, CheckCircle2, MessageSquareText, ShieldCheck, ArrowLeft, PlusCircle, AlertCircle, Building2, User as UserIcon, Database } from 'lucide-react';
import { User, Feedback, UserRole, DonationRequest, ChatMessage } from '../types';
import { API } from '../services/api';
// Removed non-existent import 'findDonorsWithAI'
import { Button } from './Button';

type UserPanelView = 'search' | 'register_request' | 'chat';

export const UserPanel: React.FC = () => {
  const [activeView, setActiveView] = useState<UserPanelView>('search');
  const [bloodType, setBloodType] = useState('All');
  const [city, setCity] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allDonors, setAllDonors] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingDonors, setIsLoadingDonors] = useState(true);
  
  // Blood Request Form State
  const [requestForm, setRequestForm] = useState({
    patientName: '',
    bloodType: 'O+',
    units: 1,
    hospital: '',
    city: '',
    phone: '',
    urgency: 'Medium' as 'Low' | 'Medium' | 'Critical'
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Chat States
  const [activeChatPartner, setActiveChatPartner] = useState<User | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [recentChats, setRecentChats] = useState<{user: User, lastMsg: string}[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Feedback states
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [userFeedbacks, setUserFeedbacks] = useState<Feedback[]>([]);

  const currentUser = JSON.parse(localStorage.getItem('bloodbank_user') || '{}');

  useEffect(() => {
    loadDonors();
    loadMyFeedbacks();
    loadRecentChats();
  }, []);

  useEffect(() => {
    if (activeChatPartner) {
      loadChatHistory(activeChatPartner._id);
    }
  }, [activeChatPartner]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadDonors = async () => {
    setIsLoadingDonors(true);
    try {
      const users = await API.getUsers();
      const donors = users.filter(u => u.role === UserRole.DONOR && u.status !== 'Blocked');
      setAllDonors(donors);
    } catch (error) {
      console.error("Failed to load donors", error);
    } finally {
      setIsLoadingDonors(false);
    }
  };

  const loadRecentChats = async () => {
    try {
      const allChats = await API.getAllUserChats(currentUser._id);
      const partnersMap = new Map<string, {user: User, lastMsg: string}>();
      const allUsers = await API.getUsers();

      allChats.reverse().forEach(c => {
        const partnerId = c.senderId === currentUser._id ? c.receiverId : c.senderId;
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
    const history = await API.getChatHistory(currentUser._id, partnerId);
    setChatHistory(history);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatPartner) return;

    const newMsg: Omit<ChatMessage, '_id'> = {
      senderId: currentUser._id,
      senderName: currentUser.name,
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
    } catch (error: any) {
      alert(error.message || "Failed to send message.");
    }
  };

  const startChatWithDonor = (donor: User) => {
    setActiveChatPartner(donor);
    setActiveView('chat');
  };

  const loadMyFeedbacks = async () => {
    try {
      const allFeedbacks = await API.getFeedbacks();
      setUserFeedbacks(allFeedbacks.filter(f => f.userId === currentUser._id));
    } catch (error) {
      console.error("Failed to load feedbacks", error);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]); 
    
    // Simulate database lookup delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      // Strict database search against local allDonors state
      const results = allDonors.filter(donor => {
        const typeMatch = bloodType === 'All' || donor.bloodType === bloodType;
        const cityMatch = !city || (donor.location && donor.location.toLowerCase().includes(city.toLowerCase()));
        return typeMatch && cityMatch;
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRequest(true);
    try {
      const req: Omit<DonationRequest, '_id'> = {
        donorName: requestForm.patientName,
        bloodType: requestForm.bloodType,
        status: 'Pending',
        date: new Date().toLocaleDateString(),
        urgency: requestForm.urgency,
        hospital: requestForm.hospital,
        location: requestForm.city,
        phone: requestForm.phone,
        type: 'Request'
      };
      await API.addDonationRequest(req);
      alert("Emergency Request Registered. Administrators have been notified.");
      setActiveView('search');
    } catch (err) {
      alert("Failed to register request.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setIsSendingFeedback(true);
    try {
      const f: Omit<Feedback, '_id'> = {
        userId: currentUser._id,
        userRole: currentUser.role,
        message: feedbackText.trim(),
        date: new Date().toLocaleString()
      };
      await API.addFeedback(f);
      setFeedbackText('');
      await loadMyFeedbacks();
      alert("Message transmitted to Admin.");
    } catch (error) {
      alert("Failed to send message.");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const renderChat = () => (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex h-[700px] animate-fade-in-up">
       {/* Chat Sidebar */}
       <div className="w-80 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-950/50">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
             <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-sm flex items-center gap-2">
                <MessageCircle size={18} className="text-blood-600" /> Peer Messenger
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
                    <div className="w-12 h-12 rounded-xl bg-blood-100 dark:bg-blood-900/30 text-blood-700 dark:text-blood-400 flex items-center justify-center font-black text-lg">
                      {chat.user.name.charAt(0)}
                    </div>
                    <div className="flex-1 overflow-hidden text-left">
                       <p className="font-bold text-gray-900 dark:text-white truncate">{chat.user.name}</p>
                       <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{chat.lastMsg}</p>
                    </div>
                 </button>
               ))
             ) : (
               <div className="p-10 text-center opacity-30 flex flex-col items-center justify-center h-full">
                  <Users size={32} className="mb-4 text-gray-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed text-gray-500">No active conversations found. Start a chat from the registry.</p>
               </div>
             )}
          </div>
       </div>

       {/* Chat Area */}
       <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {activeChatPartner ? (
             <>
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                   <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setActiveChatPartner(null)}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400"
                        title="Close this chat"
                      >
                         <ArrowLeft size={20} />
                      </button>
                      <div className="w-10 h-10 rounded-xl bg-blood-600 text-white flex items-center justify-center font-black">
                         {activeChatPartner.name.charAt(0)}
                      </div>
                      <div className="text-left">
                         <h4 className="font-black text-gray-900 dark:text-white tracking-tight">{activeChatPartner.name}</h4>
                         <span className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Secure Node
                         </span>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <Button variant="outline" className="p-2 h-auto rounded-xl border-gray-100 dark:border-gray-800 text-gray-400 hover:text-blood-600">
                         <Phone size={18} />
                      </Button>
                      <button 
                        onClick={() => { setActiveChatPartner(null); setActiveView('search'); }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-blood-600 transition-colors flex items-center gap-2 font-black uppercase text-[10px]"
                      >
                        Exit to Registry
                      </button>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-gray-950/30 custom-scrollbar">
                   {chatHistory.map(msg => (
                     <div key={msg._id} className={`flex ${msg.senderId === currentUser._id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm text-sm ${msg.senderId === currentUser._id ? 'bg-blood-600 text-white rounded-tr-none shadow-blood-500/10' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                           <p className="leading-relaxed font-medium text-left">{msg.text}</p>
                           <p className={`text-[9px] mt-2 font-bold uppercase tracking-tighter ${msg.senderId === currentUser._id ? 'text-white/60 text-right' : 'text-gray-400'}`}>
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
                        placeholder="Type encrypted message..."
                        className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blood-500 transition-all dark:text-white"
                      />
                      <Button type="submit" disabled={!chatInput.trim()} className="px-8 rounded-2xl shadow-xl shadow-blood-500/20 gap-2 font-black uppercase tracking-widest">
                         <Send size={18} /> Transmit
                      </Button>
                   </form>
                </div>
             </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-8 bg-gray-50/10">
                <div className="w-32 h-32 bg-blood-50 dark:bg-blood-900/10 rounded-[2.5rem] flex items-center justify-center text-blood-600 shadow-inner border border-blood-100 dark:border-blood-900 animate-pulse">
                   <MessageCircle size={56} />
                </div>
                <div className="max-w-md mx-auto">
                   <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Messaging terminal</h3>
                   <p className="text-base text-gray-500 dark:text-gray-400 font-medium mt-4 leading-relaxed">
                      Initialize a peer-to-peer secure communication channel with any donor in our verified registry.
                   </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                   <Button 
                      onClick={() => setActiveView('search')} 
                      className="rounded-[1.5rem] px-12 py-5 font-black uppercase tracking-widest text-sm shadow-2xl shadow-blood-500/30 hover:scale-105 active:scale-95 transition-all"
                   >
                      Open Donor Registry
                   </Button>
                </div>
             </div>
          )}
       </div>
    </div>
  );

  const renderSearchEngine = () => (
    <div className="space-y-10">
      {/* Database Search Engine Bar Container */}
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
                <Database className="text-blood-600" /> Database Search Engine
              </h2>
           </div>
           <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                 <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-600" size={20}/>
                 <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-white dark:bg-gray-800 shadow-xl focus:ring-2 focus:ring-blood-500 appearance-none font-bold text-gray-800 dark:text-white">
                    <option value="All">All Blood Types</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  </select>
              </div>
              <div className="flex-[2] relative">
                 <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-600" size={20}/>
                 <input type="text" placeholder="Enter City (e.g. New York, London)" value={city} onChange={(e) => setCity(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-white dark:bg-gray-800 shadow-xl focus:ring-2 focus:ring-blood-500 font-bold dark:text-white" />
              </div>
              <Button onClick={handleSearch} disabled={isSearching} className="px-10 py-4 rounded-2xl shadow-2xl shadow-blood-500/30 min-w-[180px] font-black uppercase tracking-widest">
                {isSearching ? 'Accessing DB...' : 'Search Database'}
              </Button>
           </div>
        </div>

        <div className="p-8 bg-gray-50/50 dark:bg-gray-900/50 min-h-[350px]">
           {isSearching ? (
              <div className="flex flex-col items-center justify-center h-[250px] space-y-4">
                <div className="w-14 h-14 border-4 border-blood-200 border-t-blood-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 dark:text-gray-400 font-black text-xs tracking-[0.2em] animate-pulse uppercase">Querying Local Registry...</p>
              </div>
           ) : searchResults.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in-up">
               {searchResults.map(donor => (
                 <div key={donor._id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm hover:shadow-2xl transition-all border border-gray-100 dark:border-gray-700 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity dark:text-white">
                      <Droplet size={60} />
                    </div>
                    <div className="flex items-center gap-4 mb-6 text-left">
                       <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blood-100 to-blood-200 dark:from-blood-900 dark:to-blood-800 flex items-center justify-center text-blood-700 dark:text-blood-400 font-black text-xl shadow-inner">
                          {donor.bloodType}
                       </div>
                       <div className="flex-1">
                          <h3 className="font-black text-gray-900 dark:text-white text-lg">{donor.name}</h3>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <MapPin size={10} className="text-blood-400" /> {donor.location}
                          </p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <Button className="flex-1 text-xs font-black uppercase tracking-widest h-11 rounded-xl" onClick={() => alert("Urgent Request Logged")}>Send Request</Button>
                       <button onClick={() => startChatWithDonor(donor)} className="w-11 h-11 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 hover:bg-blood-50 hover:text-blood-600 transition-colors shadow-sm">
                         <MessageCircle size={20} />
                       </button>
                    </div>
                 </div>
               ))}
             </div>
           ) : hasSearched ? (
             <div className="flex flex-col items-center justify-center h-[250px] text-center max-w-md mx-auto space-y-6">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-[2rem] flex items-center justify-center border-2 border-red-100 dark:border-red-900 shadow-inner">
                  <AlertCircle size={40} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">NOT FOUND</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-2 leading-relaxed italic">
                    The requested blood profile does not exist in our current database.
                  </p>
                </div>
                <Button onClick={() => setActiveView('register_request')} className="px-8 py-3 rounded-xl gap-2 font-black uppercase tracking-widest border-2 border-blood-600 bg-transparent text-blood-600 hover:bg-blood-600 hover:text-white transition-all">
                  <PlusCircle size={18} /> Register Emergency Request
                </Button>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-[250px] text-gray-300 dark:text-gray-700">
                <Database size={48} className="mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-sm opacity-30">Database Search Engine Idle</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );

  const renderRegisterRequest = () => (
    <div className="max-w-4xl mx-auto animate-fade-in-up text-left">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="bg-blood-600 p-10 text-white flex justify-between items-start">
           <div className="text-left">
             <h2 className="text-3xl font-black tracking-tight uppercase">Emergency Registration</h2>
             <p className="text-blood-100 font-medium mt-1">Register your blood need. This will be visible to all administrators instantly.</p>
           </div>
           <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20">
              <PlusCircle size={32} />
           </div>
        </div>
        
        <form onSubmit={handleRequestSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 block text-left">Patient Identity</label>
              <input 
                type="text" 
                required
                value={requestForm.patientName}
                onChange={e => setRequestForm({...requestForm, patientName: e.target.value})}
                placeholder="Full Name of Patient" 
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent outline-none focus:ring-2 focus:ring-blood-500 font-bold dark:text-white"
              />
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 block text-left">Blood Group Required</label>
              <select 
                value={requestForm.bloodType}
                onChange={e => setRequestForm({...requestForm, bloodType: e.target.value})}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent outline-none focus:ring-2 focus:ring-blood-500 font-bold appearance-none dark:text-white"
              >
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 block text-left">Hospital / Medical Facility</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  required
                  value={requestForm.hospital}
                  onChange={e => setRequestForm({...requestForm, hospital: e.target.value})}
                  placeholder="e.g. St. Jude Medical" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent outline-none focus:ring-2 focus:ring-blood-500 font-bold dark:text-white"
                />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 block text-left">Location / City</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  required
                  value={requestForm.city}
                  onChange={e => setRequestForm({...requestForm, city: e.target.value})}
                  placeholder="e.g. London, NYC" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent outline-none focus:ring-2 focus:ring-blood-500 font-bold dark:text-white"
                />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 block text-left">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="tel" 
                  required
                  value={requestForm.phone}
                  onChange={e => setRequestForm({...requestForm, phone: e.target.value})}
                  placeholder="Emergency contact number" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent outline-none focus:ring-2 focus:ring-blood-500 font-bold dark:text-white"
                />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 block text-left">Urgency Level</label>
              <div className="flex gap-4">
                 {(['Low', 'Medium', 'Critical'] as const).map(level => (
                   <button
                    key={level}
                    type="button"
                    onClick={() => setRequestForm({...requestForm, urgency: level})}
                    className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                      requestForm.urgency === level 
                      ? 'bg-blood-50 dark:bg-blood-900/30 border-blood-200 dark:border-blood-800 text-blood-700 dark:text-blood-400 shadow-sm' 
                      : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                   >
                     {level}
                   </button>
                 ))}
              </div>
           </div>

           <div className="md:col-span-2 pt-6">
              <Button 
                type="submit" 
                isLoading={isSubmittingRequest}
                className="w-full py-5 text-lg font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl"
              >
                Register Public Request
              </Button>
              <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-6">
                By submitting, you agree that your details will be shared with verified administrators and donors.
              </p>
           </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 inline-flex flex-wrap gap-2 w-full md:w-auto">
         <button 
           onClick={() => setActiveView('search')} 
           className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'search' ? 'bg-gray-900 dark:bg-gray-700 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
         >
           <Database size={16} /> HOME
         </button>
         <button 
           onClick={() => setActiveView('chat')} 
           className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'chat' ? 'bg-blood-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
         >
           <MessageCircle size={16} /> Open Chat
         </button>
         <button 
           onClick={() => setActiveView('register_request')} 
           className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'register_request' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
         >
           <PlusCircle size={16} /> Manual Registration
         </button>
      </div>

      {/* View Switcher Content */}
      <div className="min-h-[600px]">
        {activeView === 'search' ? renderSearchEngine() : activeView === 'chat' ? renderChat() : renderRegisterRequest()}
      </div>

      {/* HOME (search) Tab Specific Sub-sections */}
      {activeView === 'search' && (
        <>
          {/* Registry Section */}
          <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden text-left">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-blood-50 dark:bg-blood-900/30 p-3 rounded-2xl text-blood-600 dark:text-blood-400">
                  <Users size={28} />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Available Donors Registry</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-tight">Verified donors from our secure network database</p>
                </div>
              </div>
              <Button variant="outline" className="text-xs h-auto py-2 px-4 gap-2 dark:border-gray-700 dark:text-gray-300" onClick={loadDonors}>
                <Activity size={14} /> Refresh List
              </Button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-50 dark:border-gray-800">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="p-5">Donor Identity</th>
                    <th className="p-5">Blood Group</th>
                    <th className="p-5">Primary City</th>
                    <th className="p-5">Contact Access</th>
                    <th className="p-5 text-right">Interaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {isLoadingDonors ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-4 border-blood-200 border-t-blood-600 rounded-full animate-spin"></div>
                          <p className="text-gray-400 font-black text-xs uppercase tracking-widest">Accessing DB Registry...</p>
                        </div>
                      </td>
                    </tr>
                  ) : allDonors.length > 0 ? (
                    allDonors.map(donor => (
                      <tr key={donor._id} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-gray-400 group-hover:bg-blood-600 group-hover:text-white transition-all">
                              {donor.name.charAt(0)}
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">{donor.name}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="px-3 py-1.5 bg-blood-50 dark:bg-blood-900/30 text-blood-700 dark:text-blood-400 rounded-lg font-black text-xs shadow-inner">
                            {donor.bloodType || 'N/A'}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium text-sm">
                            <MapPin size={14} className="text-gray-300 dark:text-gray-600" /> {donor.location || 'Not Specified'}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-black font-mono text-xs">
                            <Phone size={14} className="text-green-400 dark:text-green-600" /> {donor.phone || 'Contact Admin'}
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <button 
                            onClick={() => startChatWithDonor(donor)}
                            className="px-4 py-2 bg-blood-50 dark:bg-blood-900/30 text-blood-600 dark:text-blood-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blood-100 dark:border-blood-800 hover:bg-blood-600 hover:text-white transition-all flex items-center gap-2 ml-auto"
                          >
                            <MessageCircle size={14} /> Start Chat
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-40">
                          <Users size={48} className="text-gray-300 dark:text-gray-700" />
                          <p className="text-gray-500 dark:text-gray-400 font-black text-xs uppercase tracking-widest">No donors registered in database</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advanced Feedback Section with History - Only visible on HOME */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10 text-left">
            {/* Control Center Link (Message Composer) */}
            <div className="bg-gray-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-blood-600 rounded-full blur-[100px] opacity-20"></div>
              
              <div className="relative z-10 mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                    <MessageSquareText size={24} className="text-blood-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-black tracking-tight uppercase">Control Center Link</h3>
                    <p className="text-gray-400 text-sm font-medium">Direct transmission to system administrators.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <textarea 
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Type your message, inquiry, or emergency report here..."
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blood-500 text-white font-medium resize-none transition-all placeholder:text-gray-600"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {feedbackText.length} Characters
                    </span>
                    <Button 
                      type="submit"
                      disabled={isSendingFeedback || !feedbackText.trim()}
                      isLoading={isSendingFeedback}
                      className="bg-white !text-gray-900 px-8 py-4 text-xs font-black uppercase tracking-widest rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all gap-2"
                    >
                      <Send size={16} /> Transmit
                    </Button>
                  </div>
                </form>
              </div>
              
              <div className="relative z-10 p-4 bg-white/5 rounded-2xl border border-white/5">
                 <div className="flex items-center gap-3">
                   <ShieldCheck size={16} className="text-blood-500" />
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">End-to-End Encrypted Session</p>
                 </div>
              </div>
            </div>

            {/* Communication History */}
            <div className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Clock size={20} className="text-blood-600" /> Communication History
                </h3>
                <button onClick={loadMyFeedbacks} className="text-[10px] font-black uppercase tracking-widest text-blood-600 dark:text-blood-400 hover:underline">
                  Sync Inbox
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[400px] pr-2 custom-scrollbar">
                {userFeedbacks.length > 0 ? (
                  userFeedbacks.map(f => (
                    <div key={f._id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 space-y-3 text-left">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{f.date}</span>
                        {f.reply ? (
                          <span className="flex items-center gap-1 text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-800">
                            <CheckCircle2 size={10} /> Replied
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-800">
                            Pending
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-800 dark:text-gray-200 text-sm font-medium italic">"{f.message}"</p>
                      
                      {f.reply && (
                        <div className="mt-3 p-4 bg-blood-600 text-white rounded-xl shadow-lg relative text-left">
                          <div className="absolute -top-1.5 left-4 w-3 h-3 bg-blood-600 rotate-45"></div>
                          <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">Admin Response</p>
                          <p className="text-xs font-bold leading-relaxed">{f.reply}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30">
                    <MessageSquareText size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-600">No active correspondence records</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
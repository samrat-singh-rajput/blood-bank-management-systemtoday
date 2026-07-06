import React, { useState, useEffect } from 'react';
import { Users, Activity, MessageSquare, ShieldCheck, TrendingUp, BarChart2, Ban, CheckCircle, Trophy, MapPin, RefreshCcw, Send, X, Phone, Building2, Plus, Mail, Trash2, HeartHandshake, CheckCircle2, Key, Gift, Search } from 'lucide-react';
import { User, DonationRequest, Feedback, BloodStock, SecurityLog, Hospital, UserRole } from '../types';
import { API } from '../services/api';
import { Button } from './Button';

type AdminTab = 'dashboard' | 'users' | 'feedback' | 'hospitals';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stocks, setStocks] = useState<BloodStock[]>([]);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hospital Form State
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [newHospital, setNewHospital] = useState({ name: '', city: '', address: '', phone: '', email: '' });
  const [isAddingHospital, setIsAddingHospital] = useState(false);
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');

  // UI States for Feedback
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Search State for Users
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [u, r, f, s, l, h] = await Promise.all([
        API.getUsers(),
        API.getDonationRequests(),
        API.getFeedbacks(),
        API.getBloodStocks(),
        API.getSecurityLogs(),
        API.getHospitals()
      ]);
      setUsers(u);
      setRequests(r);
      setFeedbacks(f);
      setStocks(s);
      setLogs(l);
      setHospitals(h);
    } catch (e) {
      console.error("Failed to sync admin data", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: 'Pending' | 'Approved' | 'Completed' | 'Rejected') => {
    try {
      await API.updateDonationRequestStatus(requestId, newStatus);
      await refreshData();
    } catch (e) {
      alert("Failed to update status");
    }
  };

  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospital.name || !newHospital.city) return;
    setIsAddingHospital(true);
    try {
      await API.addHospital(newHospital);
      setNewHospital({ name: '', city: '', address: '', phone: '', email: '' });
      setShowAddHospital(false);
      await refreshData();
    } catch (error) {
      alert("Failed to add hospital.");
    } finally {
      setIsAddingHospital(false);
    }
  };

  const handleDeleteHospital = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to REMOVE ${name} from the network?`)) {
      try {
        await API.deleteHospital(id);
        await refreshData();
      } catch (error: any) {
        alert(error.message || "Failed to delete hospital.");
      }
    }
  };

  const handleBlockUser = async (id: string, name: string) => {
    const message = `Are you sure you want to toggle ACCESS status for ${name}?`;
    if (confirm(message)) {
      try {
        await API.toggleUserStatus(id);
        await refreshData();
      } catch (error: any) {
        alert(error.message || "Failed to toggle user status.");
      }
    }
  };

  const handleIssueKey = async (id: string, name: string) => {
    try {
      const key = await API.issueEmergencyKey(id);
      alert(`Emergency Key Gifted to ${name}: ${key}`);
    } catch (error: any) {
      alert(error.message || "Failed to issue emergency key.");
    }
  };

  const submitReply = async (fId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await API.replyToFeedback(fId, replyText.trim());
      setReplyText('');
      setReplyingTo(null);
      // This will refresh the feedbacks state, updating the unread count
      await refreshData();
    } catch (error) {
      alert("Failed to send reply.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const getDonatedUnits = (userName: string) => {
    return requests
      .filter(r => r.donorName === userName && r.type === 'Donation' && r.status === 'Completed')
      .reduce((acc, curr) => acc + (curr.units || 1), 0);
  };

  const renderDashboard = () => {
    // Calculate unread (unreplied) feedbacks
    const unrepliedCount = feedbacks.filter(f => !f.reply).length;

    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blood-600 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Control Center</h1>
              <p className="text-gray-300">System status: <span className="text-green-400 font-bold tracking-widest uppercase text-xs ml-1">Optimal</span></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" isLoading={isRefreshing} className="border-white/20 text-white hover:bg-white dark:bg-gray-900/10 gap-2" onClick={refreshData}><RefreshCcw size={16}/> Sync Now</Button>
              <Button className="bg-blood-600 text-white border-none gap-2" onClick={() => setActiveTab('hospitals')}><Building2 size={16}/> Manage Hospitals</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all cursor-pointer" onClick={() => setActiveTab('users')}>
             <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
               <span className="text-xs font-bold text-green-500 flex items-center gap-1"><TrendingUp size={12} /> Live</span>
             </div>
             <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{users.length}</h3>
             <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Registered Users</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
             <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-blood-50 text-blood-600 rounded-xl"><Activity size={24} /></div>
             </div>
             <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{requests.filter(r => r.status === 'Pending').length}</h3>
             <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Queue Length</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all cursor-pointer" onClick={() => setActiveTab('hospitals')}>
             <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Building2 size={24} /></div>
             </div>
             <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{hospitals.length}</h3>
             <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Hospitals Enrolled</p>
          </div>
           <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all cursor-pointer" onClick={() => setActiveTab('feedback')}>
             <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><MessageSquare size={24} /></div>
             </div>
             <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{unrepliedCount}</h3>
             <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Unread Feedback</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active System Donor Feed */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                  <HeartHandshake className="text-blood-600" /> Active System Donor Feed
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" isLoading={isRefreshing} className="text-xs py-1 h-auto gap-2" onClick={refreshData}>
                    <RefreshCcw size={12} /> Refresh Scan
                  </Button>
                </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                     <th className="p-4">Username / Identity</th>
                     <th className="p-4">City / Region</th>
                     <th className="p-4">Contact</th>
                     <th className="p-4 text-center">Group</th>
                     <th className="p-4 text-center">Date to Give</th>
                     <th className="p-4 text-right">Status</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm">
                   {requests.filter(r => r.type === 'Donation').length > 0 ? (
                     requests.filter(r => r.type === 'Donation').map(req => (
                      <tr key={req._id} className="group hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800">
                        <td className="p-4 font-black text-gray-900 dark:text-white">{req.donorName}</td>
                        <td className="p-4 text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">{req.location || 'Local'}</td>
                        <td className="p-4">
                          <span className="flex items-center gap-2 text-green-600 font-black font-mono text-xs">
                            <Phone size={12} /> {req.phone}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-3 py-1 bg-blood-50 text-blood-700 rounded-lg font-black text-xs">
                            {req.bloodType}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-gray-600 dark:text-gray-300">{req.date}</td>
                        <td className="p-4 text-right">
                          {req.status === 'Pending' ? (
                            <button 
                              onClick={() => handleStatusUpdate(req._id, 'Completed')}
                              className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                            >
                              Pending
                            </button>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-800 flex items-center justify-end gap-1 ml-auto w-fit">
                              <CheckCircle2 size={10} /> Done
                            </span>
                          )}
                        </td>
                      </tr>
                     ))
                   ) : (
                     <tr><td colSpan={6} className="py-20 text-center text-gray-300 font-black uppercase text-xs tracking-[0.2em] opacity-30">No active donor registrations</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>

          {/* Active System Requests Feed */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg flex items-center gap-2 uppercase tracking-tight">
                  <Activity className="text-blood-600" /> Active System Patient Feed
                </h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                     <th className="pb-4">Identity / Type</th>
                     <th className="pb-4">Medical Facility</th>
                     <th className="pb-4">City / Region</th>
                     <th className="pb-4">Contact Info</th>
                     <th className="pb-4 text-center">Group</th>
                     <th className="pb-4 text-center">Urgency</th>
                     <th className="pb-4 text-right">Action / Status</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm">
                   {requests.filter(r => r.type === 'Request' || !r.type).length > 0 ? requests.filter(r => r.type === 'Request' || !r.type).map(req => (
                     <tr key={req._id} className="group hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/80 transition-colors border-b border-gray-50 dark:border-gray-800">
                       <td className="py-5 pr-4">
                         <div>
                           <p className="font-black text-gray-900 dark:text-white">{req.donorName}</p>
                           <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${req.type === 'Request' ? 'text-orange-500' : 'text-blue-500'}`}>
                             {req.type || 'Request'}
                           </p>
                         </div>
                       </td>
                       <td className="py-5 pr-4">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
                            <Building2 size={14} className="text-gray-300" /> {req.hospital || 'General'}
                          </div>
                       </td>
                       <td className="py-5 pr-4">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
                            <MapPin size={14} className="text-gray-300" /> {req.location || 'N/A'}
                          </div>
                       </td>
                       <td className="py-5 pr-4">
                          <div className="flex items-center gap-2 text-green-600 font-black font-mono text-xs">
                            <Phone size={14} className="text-green-400" /> {req.phone || 'System Admin'}
                          </div>
                       </td>
                       <td className="py-5 text-center">
                         <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-[10px] font-black shadow-inner">
                           {req.bloodType}
                         </span>
                       </td>
                       <td className="py-5 text-center">
                         <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                           req.urgency === 'Critical' ? 'text-red-600 bg-red-50 border border-red-100' : 
                           req.urgency === 'Medium' ? 'text-orange-600 bg-orange-50 border border-orange-100' : 
                           'text-green-600 bg-green-50 border border-green-100'
                         }`}>
                           {req.urgency}
                         </span>
                       </td>
                       <td className="py-5 text-right">
                         {req.status === 'Pending' ? (
                           <button 
                            onClick={() => handleStatusUpdate(req._id, 'Completed')}
                            className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-green-600 hover:text-white hover:border-green-700 transition-all shadow-sm"
                           >
                             Pending
                           </button>
                         ) : (
                           <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-800 flex items-center justify-end gap-1 ml-auto w-fit">
                             <CheckCircle2 size={10} /> Done
                           </span>
                         )}
                       </td>
                     </tr>
                   )) : (
                     <tr><td colSpan={7} className="py-20 text-center">
                       <div className="flex flex-col items-center gap-3 opacity-30">
                          <Activity size={48} />
                          <p className="text-gray-400 dark:text-gray-500 font-black text-xs uppercase tracking-widest">No patient requests found</p>
                       </div>
                     </td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>

          <div className="lg:col-span-3 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-md border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2 uppercase tracking-widest text-xs"><ShieldCheck size={16} className="text-blue-600"/> Security Audit Logs</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
              {logs.length > 0 ? logs.map(log => (
                <div key={log._id} className={`p-4 rounded-xl border-l-4 text-sm ${log.severity === 'Critical' ? 'bg-red-50 border-red-500' : log.severity === 'High' ? 'bg-orange-50 border-orange-500' : 'bg-gray-50 dark:bg-gray-800 border-gray-300'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${log.severity === 'Critical' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>{log.severity}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{log.timestamp}</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-200 font-medium">{log.message}</p>
                </div>
              )) : (
                <p className="text-center py-10 text-gray-300 font-bold uppercase tracking-widest text-xs">Access Logs are empty.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
         <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">User Registry</h2>
         <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search user registry..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2 w-64 focus:ring-2 focus:ring-blood-500 font-bold"
            />
         </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
         <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
               <tr>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-300">Identity</th>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-300">Role</th>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-300">Donated</th>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-300">Gift</th>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-300">Status</th>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-300 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.role.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors group">
                     <td className="p-4">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 group-hover:bg-blood-600 group-hover:text-white transition-colors">
                              {user.name.charAt(0)}
                           </div>
                           <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
                        </div>
                     </td>
                     <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'DONOR' ? 'bg-red-100 text-red-700' : user.role === 'ADMIN' ? 'bg-gray-800 text-white' : 'bg-blue-100 text-blue-700'}`}>
                           {user.role}
                        </span>
                     </td>
                     <td className="p-4">
                        {user.role === UserRole.DONOR ? (
                           <div className="flex items-center gap-2">
                             <span className="text-xs font-black text-blood-600">{getDonatedUnits(user.name)} Units</span>
                           </div>
                        ) : (
                           <span className="text-gray-300 text-[10px] font-black tracking-widest uppercase">N/A</span>
                        )}
                     </td>
                     <td className="p-4">
                        {user.role === UserRole.DONOR ? (
                          <button 
                            onClick={() => handleIssueKey(user._id, user.name)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-[10px] font-black uppercase border border-yellow-100 hover:bg-yellow-600 hover:text-white transition-all shadow-sm"
                          >
                            <Gift size={12} /> Gift Key
                          </button>
                        ) : (
                          <span className="text-gray-300 text-[10px] font-black tracking-widest uppercase pl-4">N/A</span>
                        )}
                     </td>
                     <td className="p-4">
                        {user.status === 'Blocked' ? (
                           <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Ban size={10}/> Blocked</span>
                        ) : (
                           <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><CheckCircle size={10}/> Active</span>
                        )}
                     </td>
                     <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                           {user.role !== UserRole.ADMIN && (
                             <button 
                                onClick={() => handleBlockUser(user._id, user.name)} 
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border ${
                                  user.status === 'Blocked' 
                                  ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-600 hover:text-white' 
                                  : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-600 hover:text-white'
                                }`}
                             >
                                {user.status === 'Blocked' ? 'Unblock' : 'Block'}
                             </button>
                           )}
                           {user.role === UserRole.ADMIN && (
                             <span className="text-gray-300 text-[10px] font-black tracking-widest uppercase px-4">Immune</span>
                           )}
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );

  const renderFeedback = () => (
    <div className="space-y-6 animate-fade-in-up">
       <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Support Communications</h2>
          <span className="bg-blood-100 text-blood-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{feedbacks.length} Messages</span>
       </div>
       <div className="grid grid-cols-1 gap-6">
          {feedbacks.length > 0 ? feedbacks.map(f => (
             <div key={f._id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-blood-200 transition-all group">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center font-bold text-gray-400 dark:text-gray-500 group-hover:bg-blood-600 group-hover:text-white transition-colors">
                         {f.userRole.charAt(0)}
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.2em] ${f.userRole === 'DONOR' ? 'bg-red-100 text-red-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>
                           {f.userRole}
                        </span>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-mono uppercase">{f.date}</p>
                      </div>
                   </div>
                   {!f.reply && replyingTo !== f._id && (
                     <Button variant="outline" className="text-[9px] h-7 px-3 gap-2 font-black uppercase tracking-[0.1em]" onClick={() => setReplyingTo(f._id)}>
                        <MessageSquare size={12} /> Reply
                     </Button>
                   )}
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-4">
                  <p className="text-gray-800 dark:text-gray-100 font-medium italic text-sm">"{f.message}"</p>
                </div>
                
                {f.reply ? (
                  <div className="bg-blood-50 p-4 rounded-xl border border-blood-100 border-l-4 border-l-blood-600">
                    <p className="text-[9px] font-black text-blood-600 uppercase tracking-[0.2em] mb-1">Administrative Transmission</p>
                    <p className="text-blood-900 text-sm font-bold leading-relaxed">"{f.reply}"</p>
                  </div>
                ) : replyingTo === f._id ? (
                  <div className="mt-4 space-y-3 animate-fade-in-up">
                    <textarea 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Compose secure response..."
                      className="w-full h-24 p-4 bg-white dark:bg-gray-900 border border-blood-200 rounded-xl outline-none focus:ring-2 focus:ring-blood-500 font-medium text-sm transition-all"
                    />
                    <div className="flex justify-end gap-2">
                       <Button variant="outline" className="text-xs px-4" onClick={() => { setReplyingTo(null); setReplyText(''); }}>
                          Cancel
                       </Button>
                       <Button 
                        onClick={() => submitReply(f._id)} 
                        isLoading={isSubmittingReply}
                        disabled={!replyText.trim()}
                        className="text-xs px-6 gap-2 font-black uppercase tracking-widest"
                       >
                          <Send size={14} /> Send Reply
                       </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 opacity-30">
                     <RefreshCcw size={10} className="animate-spin" />
                     <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest italic">Awaiting Response</p>
                  </div>
                )}
             </div>
          )) : (
            <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
              <MessageSquare className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em] text-xs">Inbox Cleared</p>
            </div>
          )}
       </div>
    </div>
  );

  const renderHospitals = () => {
    const filteredHospitals = hospitals.filter(h => 
      h.name.toLowerCase().includes(hospitalSearchQuery.toLowerCase()) || 
      h.city.toLowerCase().includes(hospitalSearchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-lg border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="w-full md:w-auto">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
              <Building2 className="text-blood-600" /> Hospital Network
            </h2>
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm font-medium tracking-tight mt-1">Enroll and manage medical facilities across the secure system.</p>
          </div>
          <Button onClick={() => setShowAddHospital(true)} className="gap-2 font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blood-500/20 w-full md:w-auto px-8">
            <Plus size={18} /> Register Facility
          </Button>
        </div>

        {/* Dedicated Search Row Above The List */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blood-600" size={20} />
            <input 
              type="text" 
              placeholder="Quick Filter: Type hospital name or city to search database..." 
              value={hospitalSearchQuery}
              onChange={(e) => setHospitalSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blood-500 font-bold outline-none transition-all shadow-inner placeholder:text-gray-400 dark:text-gray-500 text-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        {showAddHospital && (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl border border-blood-100 animate-fade-in-up relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-blood-600"></div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">New Facility Registry</h3>
              <button onClick={() => setShowAddHospital(false)} className="p-2 hover:bg-gray-100 dark:bg-gray-800 rounded-full transition-colors text-gray-400 dark:text-gray-500"><X/></button>
            </div>
            <form onSubmit={handleAddHospital} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Legal Entity Name</label>
                <input 
                  required
                  type="text" 
                  value={newHospital.name} 
                  onChange={e => setNewHospital({...newHospital, name: e.target.value})}
                  placeholder="e.g. Biratnagar Specialty Care"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blood-500 transition-all" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Primary Region/City</label>
                <input 
                  required
                  type="text" 
                  value={newHospital.city} 
                  onChange={e => setNewHospital({...newHospital, city: e.target.value})}
                  placeholder="e.g. New York"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blood-500 transition-all" 
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Physical Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                  <input 
                    type="text" 
                    value={newHospital.address} 
                    onChange={e => setNewHospital({...newHospital, address: e.target.value})}
                    placeholder="Block, Street, Landmark"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blood-500 transition-all" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Authorized Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                  <input 
                    type="tel" 
                    value={newHospital.phone} 
                    onChange={e => setNewHospital({...newHospital, phone: e.target.value})}
                    placeholder="Official hotline"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blood-500 transition-all" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Verified Email Domain</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                  <input 
                    type="email" 
                    value={newHospital.email} 
                    onChange={e => setNewHospital({...newHospital, email: e.target.value})}
                    placeholder="admin@hospital-domain.com"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blood-500 transition-all" 
                  />
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-50 dark:border-gray-800">
                <Button type="button" variant="outline" onClick={() => setShowAddHospital(false)} className="rounded-xl px-8">Discard</Button>
                <Button type="submit" isLoading={isAddingHospital} className="px-12 font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blood-500/20">Register to Database</Button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredHospitals.length > 0 ? filteredHospitals.map(hospital => (
            <div key={hospital._id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:-translate-y-1 transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-all group-hover:scale-110 pointer-events-none">
                <Building2 size={80} />
              </div>
              
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-blood-50 text-blood-600 rounded-2xl group-hover:bg-blood-600 group-hover:text-white transition-colors shadow-inner">
                  <Building2 size={24} />
                </div>
                <button 
                  onClick={() => handleDeleteHospital(hospital._id, hospital.name)}
                  className="p-2 text-gray-300 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                  title="Remove Facility"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <h4 className="font-black text-gray-900 dark:text-white text-xl mb-2 group-hover:text-blood-600 transition-colors leading-tight">{hospital.name}</h4>
              <div className="space-y-3 mb-8">
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 flex items-center gap-2 font-bold uppercase tracking-widest">
                  <MapPin size={14} className="text-blood-400"/> {hospital.city}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium leading-relaxed italic line-clamp-2">
                  {hospital.address}
                </p>
              </div>

              <div className="pt-6 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
                 <div className="flex gap-4">
                   <a href={`tel:${hospital.phone}`} className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-blood-50 hover:text-blood-600 transition-all border border-transparent hover:border-blood-100 shadow-sm"><Phone size={18}/></a>
                   <a href={`mailto:${hospital.email}`} className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-blood-50 hover:text-blood-600 transition-all border border-transparent hover:border-blood-100 shadow-sm"><Mail size={18}/></a>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2.5 py-1 rounded-full border border-green-100">Verified</span>
                 </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-32 text-center bg-white dark:bg-gray-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                 {hospitalSearchQuery ? <Search size={40} className="text-gray-200" /> : <Building2 size={40} className="text-gray-200" />}
              </div>
              <p className="text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em] text-sm">{hospitalSearchQuery ? 'No Results Found' : 'Registry is Empty'}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs font-medium mt-2">{hospitalSearchQuery ? 'Try adjusting your search criteria.' : 'Initialize the network by registering the first hospital facility.'}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 inline-flex flex-wrap gap-2 w-full md:w-auto">
         <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>Dashboard</button>
         <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>Users</button>
         <button onClick={() => setActiveTab('feedback')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'feedback' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>Feedback</button>
         <button onClick={() => setActiveTab('hospitals')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'hospitals' ? 'bg-blood-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>Hospital List</button>
      </div>
      <div className="min-h-[500px]">
         {activeTab === 'dashboard' && renderDashboard()}
         {activeTab === 'users' && renderUsers()}
         {activeTab === 'feedback' && renderFeedback()}
         {activeTab === 'hospitals' && renderHospitals()}
      </div>
    </div>
  );
};

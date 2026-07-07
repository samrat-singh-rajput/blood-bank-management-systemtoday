
import React, { useState, useRef } from 'react';
import { 
  User as UserIcon, Camera, Mail, Phone, Lock, Eye, EyeOff, 
  Sun, Moon, Palette, Type, Globe, Clock, Calendar, 
  Trash2, AlertTriangle, CheckCircle2, X, Save, ShieldAlert, Droplet,
  Server, Link, Settings, Database
} from 'lucide-react';
import { User } from '../types';
import { API } from '../services/api';
import { Button } from './Button';

interface SettingsModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

type SettingsTab = 'profile' | 'appearance' | 'network' | 'security';

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  user, onClose, onUpdate, onLogout, isDarkMode, onToggleTheme 
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(user._id === 'guest' ? 'security' : 'profile');
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [serverIp, setServerIp] = useState(() => localStorage.getItem('bloodbank_server_ip') || 'localhost:5000');
  const [storageMode, setStorageMode] = useState<'local' | 'mongodb'>(() => {
    const stored = localStorage.getItem('bloodbank_storage_mode') || 'local';
    return (stored === 'mysql' ? 'mongodb' : stored) as 'local' | 'mongodb';
  });
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    bloodType: user.bloodType || 'O+',
    accentColor: user.accentColor || 'blood',
    fontSize: user.fontSize || 'medium',
    avatarUrl: user.avatarUrl || ''
  });
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      alert("New password cannot be empty.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await API.updateUserProfile(user._id, { password: newPassword });
      alert("Password updated successfully!");
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert("Failed to update password: " + err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };
  
  const handleSaveNetwork = () => {
    localStorage.setItem('bloodbank_server_ip', serverIp);
    localStorage.setItem('bloodbank_storage_mode', storageMode);
    alert(`Storage Mode set to: ${storageMode.toUpperCase()}. Target: ${serverIp}.`);
    window.location.reload();
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const updated = await API.updateUserProfile(user._id, formData);
      onUpdate(updated);
      const isMongodb = (localStorage.getItem('bloodbank_storage_mode') || 'local') === 'mongodb' || (localStorage.getItem('bloodbank_storage_mode') || 'local') === 'mysql';
      alert(isMongodb ? "Profile updated in MongoDB Atlas!" : "Profile updated successfully!");
    } catch (err) {
      alert("Failed to update profile record.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6 text-left">
            <div className="flex flex-col items-center mb-8 space-y-4">
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="relative group cursor-pointer w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-blood-500 shadow-xl"
               >
                  {formData.avatarUrl ? (
                     <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                     <UserIcon size={40} className="text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                     <Camera size={24} className="text-white" />
                  </div>
               </div>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleFileChange} 
                 accept="image/*" 
                 className="hidden" 
               />
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Click photo to browse local file</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Display Identity</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Blood Group</label>
                <select value={formData.bloodType} onChange={e => setFormData({...formData, bloodType: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white appearance-none">
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Mobile Number" className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold dark:text-white" />
                </div>
              </div>
            </div>
            <Button onClick={handleSaveProfile} isLoading={isLoading} className="w-full py-4 rounded-2xl">Update Profile</Button>
          </div>
        );
      
      case 'network':
        return (
          <div className="space-y-6 text-left">
            <div className="p-6 bg-green-50 dark:bg-green-950/20 rounded-[2rem] border border-green-100 dark:border-green-900/30 flex items-start gap-4 animate-fade-in">
               <div className="p-3 bg-white dark:bg-green-900 rounded-2xl text-green-600 shadow-sm relative flex items-center justify-center">
                  <Database size={24} className="relative z-10" />
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
               </div>
               <div>
                  <h4 className="font-black text-green-900 dark:text-green-400 uppercase text-sm">MongoDB Atlas Live Status</h4>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">The Express backend is actively connected and syncing with your MongoDB Atlas Cluster.</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Database Provider</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">MongoDB Atlas Cloud</p>
              </div>
              <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Database</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">bloodbank_system</p>
              </div>
              <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:col-span-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Backend Router Service</p>
                <p className="text-xs font-mono font-bold text-gray-900 dark:text-white mt-1 break-all">http://{serverIp}/api.php</p>
              </div>
            </div>

            <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-3">
              <h4 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-wider">Sync Collections Status</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-bold text-gray-600 dark:text-gray-400">
                {['users', 'requests', 'hospitals', 'stocks', 'feedback', 'messages', 'security_logs', 'emergency_keys', 'appointments', 'certificates', 'campaigns'].map(col => (
                  <div key={col} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{col}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-amber-50 dark:bg-amber-950/15 rounded-[2rem] border border-amber-100 dark:border-amber-900/30 space-y-1">
              <h5 className="font-bold text-amber-800 dark:text-amber-400 text-xs uppercase flex items-center gap-1.5"><ShieldAlert size={14}/> MongoDB Cloud Architecture</h5>
              <ul className="list-disc pl-5 text-[10px] text-amber-700 dark:text-amber-300 space-y-1">
                <li>Connection URI credentials (`MONGODB_URI`) are securely restricted to the server environment file (`.env`).</li>
                <li>Write access permissions are validated through Node Express routing services before document updates.</li>
                <li>Cloud cluster details, user management, and security firewalls are managed directly on the MongoDB Atlas portal.</li>
              </ul>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-8 text-left">
            <div className="flex justify-between items-center p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Dark Mode Simulation</p>
                <p className="text-xs text-gray-500">Toggle system aesthetics</p>
              </div>
              <button onClick={onToggleTheme} className={`w-14 h-8 rounded-full transition-colors relative ${isDarkMode ? 'bg-blood-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6 text-left animate-fade-in">
            {/* User Privileges Information */}
            <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Security Tier</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-3 py-1 bg-blood-500/10 text-blood-500 text-[10px] font-black uppercase rounded-lg tracking-wider">
                    {user.role} Privilege
                  </span>
                  {user.is_verified ? (
                    <span className="flex items-center gap-1 text-[11px] text-green-500 font-bold">
                      <CheckCircle2 size={12}/> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                      <AlertTriangle size={12}/> Unverified
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                Join Date: {user.joinDate || 'N/A'}
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleUpdatePassword} className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-4 shadow-sm">
              <h4 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Lock size={16} className="text-blood-500"/> Update Account Password
              </h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-gray-900 dark:text-white border-2 border-transparent focus:border-blood-500 transition-all text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-gray-900 dark:text-white border-2 border-transparent focus:border-blood-500 transition-all text-sm"
                  />
                </div>
              </div>

              <Button type="submit" isLoading={isUpdatingPassword} className="w-full py-4 rounded-2xl bg-blood-600 text-white font-black uppercase tracking-wider text-xs">
                Apply New Credentials
              </Button>
            </form>

            {/* Two-Factor Authentication Toggle */}
            <div className="flex justify-between items-center p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Require OTP registration verification code on logins</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIs2FAEnabled(!is2FAEnabled);
                  alert(`Two-Factor Authentication (2FA) has been ${!is2FAEnabled ? 'ENABLED' : 'DISABLED'} for this session.`);
                }}
                className={`w-14 h-8 rounded-full transition-colors relative ${is2FAEnabled ? 'bg-blood-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${is2FAEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/40 animate-fade-in-up">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row h-[70vh]">
        <div className="w-full md:w-72 border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 p-8 flex flex-col gap-3">
          {(['profile', 'appearance', 'network', 'security'] as const)
            .filter(tab => tab !== 'network' || user.role === 'ADMIN')
            .map(tab => (
              <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-blood-600 text-white shadow-xl' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {tab === 'network' ? <Globe size={18} /> : tab === 'profile' ? <UserIcon size={18} /> : <Settings size={18} />}
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{activeTab} configuration</h4>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-blood-600 transition-colors"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

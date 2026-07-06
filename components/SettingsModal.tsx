
import React, { useState, useRef } from 'react';
import { 
  User as UserIcon, Camera, Mail, Phone, Lock, Eye, EyeOff, 
  Sun, Moon, Palette, Type, Globe, Clock, Calendar, 
  Trash2, AlertTriangle, CheckCircle2, X, Save, ShieldAlert, Droplet,
  Server, Link, Settings
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
  const [activeTab, setActiveTab] = useState<SettingsTab>(user._id === 'guest' ? 'network' : 'profile');
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [serverIp, setServerIp] = useState(() => localStorage.getItem('bloodbank_server_ip') || 'localhost');
  const [storageMode, setStorageMode] = useState<'local' | 'mysql'>(() => (localStorage.getItem('bloodbank_storage_mode') as 'local' | 'mysql') || 'local');
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    bloodType: user.bloodType || 'O+',
    accentColor: user.accentColor || 'blood',
    fontSize: user.fontSize || 'medium',
    avatarUrl: user.avatarUrl || ''
  });
  
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
      alert("Profile updated in MySQL!");
    } catch (err) {
      alert("Failed to update MySQL record.");
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
               <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-blood-500 shadow-xl">
                     {formData.avatarUrl ? (
                        <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                        <UserIcon size={40} className="text-gray-400" />
                     )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <Camera size={24} className="text-white" />
                  </div>
               </div>
               <div className="w-full max-w-xs">
                 <input 
                   type="text" 
                   value={formData.avatarUrl} 
                   onChange={e => setFormData({...formData, avatarUrl: e.target.value})} 
                   placeholder="Image URL (e.g. https://.../pic.jpg)" 
                   className="w-full p-3 text-xs bg-gray-50 dark:bg-gray-800 rounded-xl outline-none text-center font-bold dark:text-white focus:ring-2 focus:ring-blood-500" 
                 />
               </div>
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
        const testConnection = async () => {
          setTestStatus('testing');
          try {
            const response = await fetch(`http://${serverIp}/api.php?action=get_users`);
            if (response.ok) setTestStatus('success');
            else setTestStatus('error');
          } catch (e) {
            setTestStatus('error');
          }
        };

        return (
          <div className="space-y-8 text-left">
            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 flex items-start gap-4">
               <div className="p-3 bg-white dark:bg-blue-900 rounded-2xl text-blue-600 shadow-sm"><Globe size={24}/></div>
               <div>
                  <h4 className="font-black text-blue-900 dark:text-blue-400 uppercase text-sm">XAMPP Centralized Storage</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">To see data on other laptops, enter the IP address of the laptop running XAMPP.</p>
               </div>
            </div>

            <div className="space-y-4">
               {user.role === 'ADMIN' && (
                 <div className="flex justify-between items-center p-6 bg-blood-50 dark:bg-blood-900/10 rounded-[2rem] border border-blood-100 dark:border-blood-900/30 mb-4">
                    <div>
                      <h4 className="font-black text-blood-900 dark:text-blood-400 uppercase text-sm">Storage Mode</h4>
                      <p className="text-[10px] text-blood-700 dark:text-blood-300 mt-1">
                        {storageMode === 'mysql' ? 'Currently saving to MySQL (phpMyAdmin)' : 'Currently saving to Local Storage (Browser)'}
                      </p>
                    </div>
                    <button 
                      onClick={() => setStorageMode(storageMode === 'local' ? 'mysql' : 'local')}
                      className={`w-14 h-8 rounded-full transition-colors relative ${storageMode === 'mysql' ? 'bg-blood-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${storageMode === 'mysql' ? 'translate-x-7' : 'translate-x-1'}`}></div>
                    </button>
                 </div>
               )}

               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2"><Server size={12}/> Host IP Address</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={serverIp} 
                      onChange={e => setServerIp(e.target.value)}
                      placeholder="e.g. localhost/bloodbank"
                      className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-mono font-bold text-gray-900 dark:text-white border-2 border-transparent focus:border-blood-500 transition-all"
                    />
                    <button 
                      onClick={testConnection}
                      className={`px-6 rounded-2xl font-black uppercase text-[10px] transition-all ${
                        testStatus === 'success' ? 'bg-green-500 text-white' : 
                        testStatus === 'error' ? 'bg-red-500 text-white' : 
                        'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {testStatus === 'testing' ? '...' : testStatus === 'success' ? 'OK!' : testStatus === 'error' ? 'Fail' : 'Test'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium px-1">Default: 'localhost' (for same machine). Use IPv4 for network sync.</p>
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2"><Link size={12}/> API Endpoint</label>
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-[10px] font-mono text-gray-500 break-all">
                    http://{serverIp}/api.php
                  </div>
               </div>

               <Button onClick={handleSaveNetwork} className="w-full py-5 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest">
                  Establish Network Link
               </Button>
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

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/40 animate-fade-in-up">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row h-[70vh]">
        <div className="w-full md:w-72 border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 p-8 flex flex-col gap-3">
          {(['profile', 'appearance', 'network', 'security'] as const).map(tab => (
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

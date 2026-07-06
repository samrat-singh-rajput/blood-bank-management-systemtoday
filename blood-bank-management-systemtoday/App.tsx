
import React, { useState, useEffect } from 'react';
import { 
  Droplet, LogOut, ArrowLeft, Settings, Mail, ShieldCheck, 
  Lock, UserPlus, LogIn, CheckCircle2, AlertTriangle, User as UserIcon,
  ChevronRight, Globe, Shield, Phone
} from 'lucide-react';
import { User, UserRole } from './types';
import { API } from './services/api';
import { AdminPanel } from './components/AdminPanel';
import { DonorPanel } from './components/DonorPanel';
import { UserPanel } from './components/UserPanel';
import { LandingPage } from './components/LandingPage';
import { Button } from './components/Button';
import { SettingsModal } from './components/SettingsModal';

type ViewState = 'landing' | 'login' | 'register' | 'dashboard';
type SignupStep = 'role' | 'mobile' | 'otp' | 'credentials';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bloodbank_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('bloodbank_theme') === 'dark');

  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const saved = localStorage.getItem('bloodbank_user');
    return saved ? 'dashboard' : 'landing';
  });

  // Multi-Step Registration States
  const [regStep, setRegStep] = useState<SignupStep>('role');
  const [regPhone, setRegPhone] = useState('');
  const [regOTP, setRegOTP] = useState('');
  const [regDetails, setRegDetails] = useState({ username: '', password: '', role: UserRole.USER, name: '', email: '' });
  const [debugOTP, setDebugOTP] = useState('');

  const [loginForm, setLoginForm] = useState({ username: '', password: '', role: UserRole.USER });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('bloodbank_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPhone.length < 10) {
      setAuthError('Please enter a valid mobile number');
      return;
    }
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const res = await API.sendOTP(regPhone);
      if (res.debug_otp) setDebugOTP(res.debug_otp);
      setRegStep('otp');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');
    try {
      await API.verifyOTP(regPhone, regOTP);
      setRegStep('credentials');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const user = await API.login(loginForm.username, loginForm.password, loginForm.role);
      setCurrentUser(user);
      localStorage.setItem('bloodbank_user', JSON.stringify(user));
      setCurrentView('dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Login failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const user = await API.completeSignup({
        phone: regPhone,
        ...regDetails
      });
      setCurrentUser(user);
      localStorage.setItem('bloodbank_user', JSON.stringify(user));
      setCurrentView('dashboard');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bloodbank_user');
    setCurrentView('landing');
    setRegStep('role');
    setRegPhone('');
    setRegOTP('');
  };

  const renderRegisterContent = () => {
    switch(regStep) {
      case 'role':
        return (
          <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Select Your Role</h2>
            <p className="text-sm text-gray-500 font-medium">Choose how you want to participate in the network</p>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => { setRegDetails({...regDetails, role: UserRole.DONOR}); setRegStep('mobile'); }}
                className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-transparent hover:border-blood-500 transition-all text-left flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blood-100 dark:bg-blood-900/30 text-blood-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Droplet size={24} />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white uppercase text-sm">Blood Donor</h4>
                  <p className="text-xs text-gray-500">I want to donate blood and save lives</p>
                </div>
              </button>
              <button 
                onClick={() => { setRegDetails({...regDetails, role: UserRole.USER}); setRegStep('mobile'); }}
                className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-transparent hover:border-blue-500 transition-all text-left flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white uppercase text-sm">General User</h4>
                  <p className="text-xs text-gray-500">I am looking for blood or medical help</p>
                </div>
              </button>
            </div>
          </div>
        );
      case 'mobile':
        return (
          <form onSubmit={handleSendOTP} className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Mobile Verification</h2>
            <p className="text-sm text-gray-500 font-medium">Enter your number to receive a 6-digit OTP</p>
            
            <div className="text-left space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="tel" required placeholder="10-digit mobile number" 
                  value={regPhone} onChange={e => setRegPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blood-500 outline-none font-bold" 
                />
              </div>
            </div>

            {authError && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-left">{authError}</div>}
            
            <div className="pt-4 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setRegStep('role')} className="flex-1 rounded-2xl">Back</Button>
              <Button isLoading={isAuthLoading} className="flex-[2] bg-blood-600 text-white rounded-2xl shadow-xl">Send OTP</Button>
            </div>
          </form>
        );
      case 'otp':
        return (
          <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Enter OTP</h2>
            <p className="text-sm text-gray-500 font-medium">We've sent a code to <span className="text-blood-600 font-bold">{regPhone}</span></p>
            
            <div className="text-left space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">6-Digit Code</label>
              <input 
                type="text" required maxLength={6} placeholder="000000" 
                value={regOTP} onChange={e => setRegOTP(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blood-500 outline-none text-center text-3xl font-black tracking-[0.5em]" 
              />
              {debugOTP && <p className="text-[10px] text-green-600 font-bold mt-2">Debug OTP: {debugOTP}</p>}
            </div>

            {authError && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-left">{authError}</div>}
            
            <div className="pt-4 space-y-3">
              <Button isLoading={isAuthLoading} className="w-full bg-blood-600 text-white py-5 rounded-2xl shadow-xl">Verify & Continue</Button>
              <button type="button" onClick={handleSendOTP} className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-blood-600 transition-colors">Resend OTP</button>
            </div>
          </form>
        );
      case 'credentials':
        return (
          <form onSubmit={handleCompleteSignup} className="space-y-5 animate-fade-in-up text-left">
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Finalize Profile</h3>
            <p className="text-xs text-gray-500 font-medium mb-4">Set your account credentials to complete registration.</p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                <input 
                  type="text" placeholder="Your Name" required 
                  value={regDetails.name} onChange={e => setRegDetails({...regDetails, name: e.target.value})} 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl border-none font-bold shadow-inner focus:ring-2 focus:ring-blood-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                <input 
                  type="email" placeholder="email@example.com" required 
                  value={regDetails.email} onChange={e => setRegDetails({...regDetails, email: e.target.value})} 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl border-none font-bold shadow-inner focus:ring-2 focus:ring-blood-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Username</label>
                <input 
                  type="text" placeholder="Choose Username" required 
                  value={regDetails.username} onChange={e => setRegDetails({...regDetails, username: e.target.value})} 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl border-none font-bold shadow-inner focus:ring-2 focus:ring-blood-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Password</label>
                <input 
                  type="password" placeholder="Create Password" required 
                  value={regDetails.password} onChange={e => setRegDetails({...regDetails, password: e.target.value})} 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl border-none font-bold shadow-inner focus:ring-2 focus:ring-blood-500 outline-none" 
                />
              </div>
            </div>
            
            {authError && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{authError}</div>}
            
            <Button isLoading={isAuthLoading} className="w-full py-5 rounded-2xl bg-blood-600 text-white font-black uppercase tracking-widest shadow-xl mt-4">Complete Registration</Button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <nav className={`fixed w-full z-40 transition-all ${currentView === 'landing' ? 'bg-gray-900/95 border-b border-white/10 py-5' : 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b dark:border-gray-800 shadow-sm py-4'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-6" onClick={() => !currentUser && setCurrentView('landing')}>
            <div className="bg-blood-600 text-white p-2.5 rounded-2xl shadow-xl cursor-pointer hover:scale-105 transition-transform"><Droplet size={26} fill="currentColor"/></div>
            <span className={`text-2xl font-black tracking-tighter cursor-pointer ${currentView === 'landing' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>BloodBank</span>
          </div>
          <div className="flex items-center gap-4">
             {!currentUser ? (
               <div className="flex items-center gap-4">
                  <Button onClick={() => setCurrentView('login')} variant="outline" className={`border-none ${currentView === 'landing' ? 'text-white' : 'text-gray-600'}`}>Login</Button>
                  <Button onClick={() => setCurrentView('register')} className="bg-blood-600 text-white px-8 rounded-xl shadow-xl">Sign Up</Button>
               </div>
             ) : (
               <div className="flex items-center gap-3">
                  <button onClick={() => setShowSettings(true)} className="p-2 text-gray-400 hover:text-blood-600 transition-colors"><Settings size={22}/></button>
                  <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><LogOut size={22}/></button>
               </div>
             )}
          </div>
        </div>
      </nav>

      <div className="pt-24 lg:pt-32">
        {currentView === 'landing' && <LandingPage onNavigate={setCurrentView} />}

        {currentView === 'login' && (
          <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 relative overflow-hidden text-center">
              <div className="absolute top-0 left-0 w-full h-2 bg-gray-900"></div>
              <button onClick={() => setCurrentView('landing')} className="mb-8 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2 font-bold text-sm transition-colors group">
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back
              </button>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-8 uppercase tracking-tight">Access Node</h2>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4">
                  {(['ADMIN', 'DONOR', 'USER'] as UserRole[]).map(r => (
                    <button key={r} type="button" onClick={() => setLoginForm({...loginForm, role: r})} className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${loginForm.role === r ? 'bg-white dark:bg-gray-700 text-blood-600 shadow-sm' : 'text-gray-500'}`}>{r}</button>
                  ))}
                </div>
                <input 
                  type="text" placeholder="Username / Email" 
                  value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl border-none font-bold shadow-inner focus:ring-2 focus:ring-blood-500 outline-none" required 
                />
                <input 
                  type="password" placeholder="Password" 
                  value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl border-none font-bold shadow-inner focus:ring-2 focus:ring-blood-500 outline-none" required 
                />
                {authError && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{authError}</div>}
                <Button isLoading={isAuthLoading} className="w-full py-5 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest shadow-xl">Authorize Access</Button>
              </form>
            </div>
          </div>
        )}

        {currentView === 'register' && (
          <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-800 relative overflow-hidden text-center transition-all">
              {regStep !== 'credentials' && <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500"></div>}
              {regStep === 'credentials' && <div className="absolute top-0 left-0 w-full h-1.5 bg-blood-600"></div>}
              
              {renderRegisterContent()}

              <p className="mt-8 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                Secure OTP Verification Protocol 
              </p>
            </div>
          </div>
        )}

        {currentView === 'dashboard' && currentUser && (
          <main className="container mx-auto px-6 py-12 animate-fade-in-up">
            {currentUser.role === UserRole.ADMIN ? <AdminPanel /> : currentUser.role === UserRole.DONOR ? <DonorPanel user={currentUser} /> : <UserPanel />}
          </main>
        )}
      </div>

      {showSettings && (
        <SettingsModal 
          user={currentUser || { _id: 'guest', role: UserRole.GUEST, name: 'Guest', username: 'guest' } as User} 
          onClose={() => setShowSettings(false)} 
          onUpdate={(updated) => { if(currentUser) setCurrentUser(updated); }}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        />
      )}
    </div>
  );
};

export default App;


import React, { useState, useEffect } from 'react';
import { 
  Droplet, LogOut, ArrowLeft, Settings, Mail, ShieldCheck, 
  Lock, UserPlus, LogIn, CheckCircle2, AlertTriangle, User as UserIcon,
  ChevronRight, Globe, Shield, Phone, Sun, Moon, Database, ChevronDown, X
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
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
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

  useEffect(() => {
    if (regStep === 'mobile' && currentView === 'register') {
      const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientID || clientID.includes('dummy')) return;

      const timer = setTimeout(() => {
        const g = (window as any).google;
        const container = document.getElementById('google-register-btn-container');
        if (g && g.accounts && g.accounts.id && container) {
          g.accounts.id.initialize({
            client_id: clientID,
            ux_mode: "popup",
            callback: async (response: any) => {
              try {
                setIsAuthLoading(true);
                setAuthError('');
                const user = await API.loginWithGoogle(response.credential, regDetails.role);
                setCurrentUser(user);
                localStorage.setItem('bloodbank_user', JSON.stringify(user));
                setCurrentView('dashboard');
              } catch (e: any) {
                setAuthError("Google Sign-In failed: " + e.message);
              } finally {
                setIsAuthLoading(false);
              }
            }
          });
          
          g.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            width: 320
          });
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [regStep, currentView, regDetails.role]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDetails.name || !regDetails.email || regPhone.length < 10) {
      setAuthError('Please enter valid name, email, and mobile number');
      return;
    }
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const res = await API.sendOTP(regPhone, regDetails.email);
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

  const handleGoogleLogin = (signupRole?: UserRole) => {
    const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientID || clientID.includes('dummy')) {
      setAuthError("Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.");
      return;
    }

    const g = (window as any).google;
    if (g && g.accounts && g.accounts.id) {
      g.accounts.id.initialize({
        client_id: clientID,
        ux_mode: "popup",
        callback: async (response: any) => {
          try {
            setIsAuthLoading(true);
            setAuthError('');
            const user = await API.loginWithGoogle(response.credential, signupRole);
            setCurrentUser(user);
            localStorage.setItem('bloodbank_user', JSON.stringify(user));
            setCurrentView('dashboard');
          } catch (e: any) {
            setAuthError("Google Sign-In failed: " + e.message);
          } finally {
            setIsAuthLoading(false);
          }
        }
      });
      g.accounts.id.prompt();
    } else {
      setAuthError("Google Identity Services not loaded. Please verify your connection.");
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
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Registration Details</h2>
            <p className="text-sm text-gray-500 font-medium">Enter your details to receive an OTP via email</p>
            
            <div className="space-y-4 text-left">
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
            </div>

            {authError && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-left">{authError}</div>}
            
            <div className="pt-4 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setRegStep('role')} className="flex-1 rounded-2xl">Back</Button>
              <Button isLoading={isAuthLoading} className="flex-[2] bg-blood-600 text-white rounded-2xl shadow-xl">Send OTP</Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-6">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Or</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
            </div>

            {/* Google Sign In */}
            <div className="mt-4 flex justify-center w-full">
              {import.meta.env.VITE_GOOGLE_CLIENT_ID && !import.meta.env.VITE_GOOGLE_CLIENT_ID.includes('dummy') ? (
                <div id="google-register-btn-container" className="w-full flex justify-center"></div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthError("Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.")}
                  className="w-full py-4 mt-2 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Continue with Google
                </button>
              )}
            </div>
          </form>
        );
      case 'otp':
        return (
          <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Enter OTP</h2>
            <p className="text-sm text-gray-500 font-medium">We've sent a code to your email: <span className="text-blood-600 font-bold">{regDetails.email}</span></p>
            
            <div className="text-left space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">6-Digit Code</label>
              <input 
                type="text" required maxLength={6} placeholder="000000" 
                value={regOTP} onChange={e => setRegOTP(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blood-500 outline-none text-center text-3xl font-black tracking-[0.5em]" 
              />
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
                  <Button 
                    onClick={() => {
                      setCurrentView('login');
                    }} 
                    className="bg-blood-600 text-white hover:bg-blood-700 px-8 rounded-xl shadow-xl border-b-2 border-blood-800"
                  >
                    Sign Up
                  </Button>
             ) : (
                <div className="flex items-center gap-6">
                  {/* Profile Dropdown */}
                  <div className="relative">
                    <div 
                      className="flex items-center gap-2 cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-1 pr-2.5 rounded-full transition-colors border border-transparent dark:border-gray-700"
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    >
                      <div className="w-11 h-11 rounded-full bg-blood-100 dark:bg-blood-900/30 text-blood-600 flex items-center justify-center font-bold overflow-hidden border border-blood-200 dark:border-blood-800">
                        {currentUser.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          (currentUser.name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 dark:text-white leading-tight">{currentUser.name || 'User'}</span>
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 tracking-widest uppercase">{currentUser.role}</span>
                      </div>
                      <ChevronDown size={14} className="text-gray-400 ml-1" />
                    </div>

                    {showProfileDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 py-2">
                          <button 
                            onClick={() => { setShowSettings(true); setShowProfileDropdown(false); }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3"
                          >
                            <Settings size={16} className="text-gray-400" /> Settings
                          </button>
                          <div className="h-px w-full bg-gray-100 dark:bg-gray-700/50 my-1"></div>
                          <button 
                            onClick={() => { handleLogout(); setShowProfileDropdown(false); }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-3"
                          >
                            <LogOut size={16} /> Logout
                          </button>
                        </div>
                      </>
                    )}
                  </div>
               </div>
             )}
          </div>
        </div>
      </nav>

      <div className={`pt-24 lg:pt-32 ${currentView === 'landing' ? 'bg-gray-900' : ''}`}>
        {currentView === 'landing' && <LandingPage onNavigate={setCurrentView} />}

        {currentView === 'login' && (
          <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 relative text-left animate-fade-in">
              <button onClick={() => setCurrentView('landing')} className="mb-6 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2 font-bold text-xs transition-colors group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
              </button>
              
              <h2 className="text-3xl font-bold text-[#0d5c3a] dark:text-emerald-400 mb-1 tracking-tight">
                Log in to your account
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 font-medium">
                Don't have an account?{' '}
                <button 
                  onClick={() => {
                    setRegStep('role');
                    setCurrentView('register');
                  }} 
                  className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                >
                  Sign Up
                </button>
              </p>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* 1. Account Access Role (directly below Sign Up section) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Account Access Role</label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    {(['ADMIN', 'DONOR', 'USER'] as UserRole[]).map(r => (
                      <button 
                        key={r} 
                        type="button" 
                        onClick={() => setLoginForm({...loginForm, role: r})} 
                        className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${loginForm.role === r ? 'bg-white dark:bg-gray-700 text-blood-600 shadow-sm' : 'text-gray-500'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Username (below Account Access Role) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Username</label>
                  <input 
                    type="text" 
                    value={loginForm.username}
                    onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                    placeholder="Enter username"
                    className="w-full p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border border-gray-300 dark:border-gray-700 outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm"
                    required
                  />
                </div>

                {/* 3. Password (below Username) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Password</label>
                  <input 
                    type="password" 
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                    placeholder="Enter password"
                    className="w-full p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border border-gray-300 dark:border-gray-700 outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm"
                    required
                  />
                </div>

                {authError && <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/30">{authError}</div>}

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setCurrentView('landing')}
                    className="px-6 py-2.5 rounded-lg font-bold border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                  >
                    Back
                  </button>
                  <Button isLoading={isAuthLoading} className="flex-1 py-4 rounded-xl bg-blood-600 text-white font-black uppercase tracking-wider text-xs border-b-2 border-blood-800">
                    Sign In
                  </Button>
                </div>

              </form>
            </div>
          </div>
        )}

        {currentView === 'register' && (
          <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-800 relative overflow-hidden text-center transition-all">
              {regStep !== 'credentials' && <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500"></div>}
              {regStep === 'credentials' && <div className="absolute top-0 left-0 w-full h-1.5 bg-blood-600"></div>}
              
              <button 
                onClick={() => {
                  setRegStep('role');
                  setCurrentView('landing');
                }} 
                className="mb-8 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2 font-bold text-sm transition-colors group"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back
              </button>

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
      )}</div>
  );
};

export default App;

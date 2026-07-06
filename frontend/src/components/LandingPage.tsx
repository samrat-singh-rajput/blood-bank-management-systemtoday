import React, { useEffect, useState } from 'react';
import { Heart, Activity, Users, ChevronRight, Info, Droplet, Calendar, MapPin, ShieldCheck, Phone, Mail } from 'lucide-react';
import { Button } from './Button';
import { API } from '../services/api';
import { Campaign } from '../types';

interface LandingPageProps {
  onNavigate: (view: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ donors: 0, lives: 0, hospitals: 0 });

  useEffect(() => {
    const loadCampaigns = async () => {
      const data = await API.getCampaigns();
      setCampaigns(data);
    };
    loadCampaigns();
    
    // Animate stats on mount
    const interval = setInterval(() => {
      setStats(prev => ({
        donors: Math.min(prev.donors + 120, 15000),
        lives: Math.min(prev.lives + 350, 45000),
        hospitals: Math.min(prev.hospitals + 1, 120),
      }));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const scrollToLearnMore = () => {
    const element = document.getElementById('learn-more');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const showFeatureAlert = (feature: string) => {
    alert(`Mock Data: Loading details for ${feature}...`);
  };

  const handleLinkClick = (link: string) => {
    if (link === 'Donor Login' || link === 'Blood Center Login') {
      onNavigate('login');
    } else {
      showFeatureAlert(link);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {/* Hero Section - Premium Gradient & Glassmorphism */}
      <div className="relative min-h-[700px] flex items-center justify-center overflow-hidden bg-gray-900">
        {/* Animated Background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-blood-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-1/4 -right-24 w-[400px] h-[400px] bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <img 
          src="https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&q=80&w=2000" 
          alt="Medical Hero" 
          className="absolute inset-0 w-full h-full object-cover opacity-20 z-0"
        />

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 animate-fade-in-up cursor-pointer hover:bg-white/20 transition-colors" onClick={() => showFeatureAlert('Live Status Monitor')}>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blood-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blood-500"></span>
            </span>
            <span className="text-sm font-medium text-white tracking-wide">Saving Lives 24/7</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-extrabold text-white leading-tight tracking-tight mb-6 animate-fade-in-up delay-100">
            Be the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blood-400 to-orange-400">Hero</span> <br />
            Someone Needs.
          </h1>
          
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200">
            The Blood Bank connects you to a network of hope. Whether you give or receive, you are part of a powerful community dedicated to life.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-300">
            <Button 
              onClick={() => onNavigate('register')} 
              className="px-10 py-5 text-lg !bg-white !text-blood-900 hover:!bg-gray-100 shadow-lg rounded-full transition-all hover:scale-110 border-2 border-white"
            >
              Donate Now
            </Button>
            <Button 
              onClick={scrollToLearnMore}
              className="px-10 py-5 text-lg bg-transparent text-white hover:bg-white/10 border-2 border-white/30 shadow-lg rounded-full transition-all hover:scale-110"
            >
              Explore Impact
            </Button>
          </div>

          {/* Live Stats Strip */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-white border-t border-white/10 pt-10">
             <div className="cursor-pointer hover:scale-110 transition-transform" onClick={() => showFeatureAlert('Real-time Donor Stats')}>
                <p className="text-4xl font-bold mb-1">{stats.donors.toLocaleString()}+</p>
                <p className="text-gray-400 text-sm uppercase tracking-widest font-black">Donors</p>
             </div>
             <div className="cursor-pointer hover:scale-110 transition-transform" onClick={() => showFeatureAlert('Lives Saved Report')}>
                <p className="text-4xl font-bold mb-1">{stats.lives.toLocaleString()}+</p>
                <p className="text-gray-400 text-sm uppercase tracking-widest font-black">Lives Saved</p>
             </div>
             <div className="cursor-pointer hover:scale-110 transition-transform" onClick={() => showFeatureAlert('Partner Hospitals Map')}>
                <p className="text-4xl font-bold mb-1">{stats.hospitals}+</p>
                <p className="text-gray-400 text-sm uppercase tracking-widest font-black">Partners</p>
             </div>
             <div className="cursor-pointer hover:scale-110 transition-transform" onClick={() => showFeatureAlert('Security Audit Certificate')}>
                <p className="text-4xl font-bold mb-1">100%</p>
                <p className="text-gray-400 text-sm uppercase tracking-widest font-black">Secure</p>
             </div>
          </div>
        </div>
      </div>

      {/* Campaign Carousel Section */}
      <div className="bg-gray-50 py-24">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight uppercase">Upcoming <span className="text-blood-600">Campaigns</span></h2>
              <p className="text-gray-500 text-lg">Join our community events and make a difference together.</p>
            </div>
            <Button variant="outline" className="hidden md:flex items-center gap-2 rounded-xl" onClick={() => showFeatureAlert('Full Events Calendar')}>View All Events <ChevronRight size={16} /></Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {campaigns.map((campaign) => (
              <div key={campaign._id} className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer hover:-translate-y-2" onClick={() => showFeatureAlert(`Event Details: ${campaign.title}`)}>
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors z-10"></div>
                <img src={campaign.imageUrl} alt={campaign.title} className="w-full h-96 object-cover group-hover:scale-110 transition-transform duration-[1.5s]" />
                
                <div className="absolute bottom-0 left-0 p-8 z-20 text-white w-full">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="flex items-center gap-2 text-blood-200 mb-3 font-bold uppercase text-xs tracking-widest">
                        <Calendar size={16} /> {campaign.date}
                      </div>
                      <h3 className="text-3xl font-black mb-2 tracking-tight uppercase">{campaign.title}</h3>
                      <p className="text-gray-200 line-clamp-1 opacity-90">{campaign.description}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-[1.5rem] text-center min-w-[100px] border border-white/20 shadow-2xl">
                       <span className="block text-2xl font-black">{campaign.attendees}</span>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-gray-200">Going</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Us Grid */}
      <div id="learn-more" className="bg-white py-24 relative">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-gray-900 mb-6 uppercase tracking-tight">Why Blood Bank?</h2>
            <p className="text-xl text-gray-500 font-medium">
              We combine advanced technology with human compassion to create the most efficient blood management system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="p-10 rounded-[2.5rem] bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-2xl transition-all group cursor-pointer hover:-translate-y-2" onClick={() => showFeatureAlert('Safety Protocols Document')}>
              <div className="w-16 h-16 bg-blood-100 rounded-2xl flex items-center justify-center text-blood-600 mb-8 group-hover:rotate-12 transition-transform shadow-lg shadow-blood-600/10">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 text-gray-900 tracking-tight uppercase">Verified & Safe</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                Every donor is screened and verified. We use high-security protocols to ensure the integrity of every donation.
              </p>
            </div>
            <div className="p-10 rounded-[2.5rem] bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-2xl transition-all group cursor-pointer hover:-translate-y-2" onClick={() => showFeatureAlert('Live Network Map')}>
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:rotate-12 transition-transform shadow-lg shadow-blue-600/10">
                <Activity size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 text-gray-900 tracking-tight uppercase">Real-Time Network</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                Our live tracking system means no blood goes to waste. Hospitals and recipients connect instantly.
              </p>
            </div>
            <div className="p-10 rounded-[2.5rem] bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-2xl transition-all group cursor-pointer hover:-translate-y-2" onClick={() => showFeatureAlert('Rewards Program Details')}>
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-8 group-hover:rotate-12 transition-transform shadow-lg shadow-orange-600/10">
                <Heart size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 text-gray-900 tracking-tight uppercase">Rewards Program</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                Gamified experience for donors. Earn badges, track your impact, and feel the joy of saving lives.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blood-900 py-32 relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-6xl font-black text-white mb-8 tracking-tighter uppercase leading-none">Ready to Save a Life?</h2>
            <p className="text-xl text-blood-200 mb-12 max-w-2xl mx-auto font-medium opacity-80">
              Join 50,000+ registered donors making a difference today. It only takes a minute to sign up.
            </p>
            <Button 
              onClick={() => onNavigate('register')} 
              className="px-16 py-7 text-xl !bg-white !text-blood-900 hover:!bg-gray-100 shadow-[0_20px_50px_rgba(255,255,255,0.15)] border-none font-black uppercase tracking-widest rounded-full transition-all hover:scale-110 active:scale-95"
            >
              Get Started Now
            </Button>
         </div>
      </div>

      {/* Detailed Footer */}
      <footer className="bg-gray-950 text-gray-400 pt-24 pb-16 border-t border-gray-900">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-24 text-left">
            {/* Contact Info */}
            <div className="space-y-8">
               <div className="flex items-center gap-3">
                 <div className="bg-blood-600 p-2 rounded-xl shadow-lg shadow-blood-600/20"><Droplet className="text-white" size={28} fill="currentColor"/></div>
                 <h4 className="text-white text-3xl font-black tracking-tighter">BloodBank</h4>
               </div>
               <div className="space-y-6">
                 <div className="flex items-start gap-4 group">
                   <div className="p-3 bg-gray-900 rounded-xl group-hover:bg-blood-600 transition-all duration-300"><MapPin className="text-blood-600 group-hover:text-white" size={20} /></div>
                   <p className="font-bold">Nepal, Biratnagar<br/><span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Main Logistics Hub</span></p>
                 </div>
                 <div className="flex items-center gap-4 cursor-pointer hover:text-white group" onClick={() => showFeatureAlert('Calling Support...')}>
                   <div className="p-3 bg-gray-900 rounded-xl group-hover:bg-blue-600 transition-all duration-300"><Phone className="text-blood-600 group-hover:text-white" size={20} /></div>
                   <p className="font-black text-xl tracking-tight">6207286891</p>
                 </div>
                 <div className="flex items-center gap-4 cursor-pointer hover:text-white group" onClick={() => showFeatureAlert('Opening Email Client...')}>
                   <div className="p-3 bg-gray-900 rounded-xl group-hover:bg-purple-600 transition-all duration-300"><Mail className="text-blood-600 group-hover:text-white" size={20} /></div>
                   <p className="font-black truncate">asrajputchauhan@gmail.com</p>
                 </div>
               </div>
            </div>

            {/* Important Links */}
            <div className="space-y-8">
               <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-4 border-l-4 border-blood-600 pl-4 h-4 flex items-center">Important Links</h4>
               <ul className="space-y-5">
                 {['Search Blood Availability', 'Search Blood Center Directory', 'Search Blood Donation Camps', 'Blood Center Login', 'Donor Login'].map((link) => (
                   <li key={link}>
                     <button onClick={() => handleLinkClick(link)} className="hover:text-white hover:translate-x-4 transition-all flex items-center gap-3 font-bold group text-sm uppercase tracking-wider">
                       <ChevronRight size={14} className="text-blood-600 group-hover:scale-150 transition-transform" /> {link}
                     </button>
                   </li>
                 ))}
               </ul>
            </div>

            {/* Policies */}
            <div className="space-y-8">
               <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-4 border-l-4 border-blood-600 pl-4 h-4 flex items-center">Legal Protocols</h4>
               <ul className="space-y-5">
                 {['Terms & Conditions', 'Privacy Policy', 'Accessibility Statement', 'Site Map', 'Hyperlink Policy'].map((link) => (
                   <li key={link}>
                     <button onClick={() => showFeatureAlert(link)} className="hover:text-white hover:translate-x-4 transition-all flex items-center gap-3 font-bold group text-sm uppercase tracking-wider">
                       <ChevronRight size={14} className="text-blood-600 group-hover:scale-150 transition-transform" /> {link}
                     </button>
                   </li>
                 ))}
               </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-12 flex flex-col items-center justify-center gap-10">
             <div className="flex gap-8 justify-center order-1 sm:order-2">
               {[
                 { id: 'fb', url: 'https://facebook.com', label: 'FB' },
                 { id: 'tw', url: 'https://twitter.com', label: 'TW' },
                 { id: 'in', url: 'https://linkedin.com', label: 'IN' },
                 { id: 'ig', url: 'https://instagram.com', label: 'IG' }
               ].map((social) => (
                 <a 
                   key={social.id} 
                   href={social.url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center hover:bg-blood-600 hover:text-white transition-all hover:-translate-y-3 shadow-xl hover:shadow-blood-600/30 text-[10px] font-black uppercase tracking-widest active:scale-90"
                 >
                   {social.label}
                 </a>
               ))}
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-800 text-center order-2 sm:order-1">
               © 2023 Blood Bank Management System BY SAMRAT SINGH RAJPUT.
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
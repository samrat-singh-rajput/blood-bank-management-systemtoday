import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  RefreshCw, 
  Zap, 
  Brain, 
  Info, 
  AlertCircle,
  HelpCircle,
  Heart,
  Droplet
} from 'lucide-react';
import { chatWithSamrat, ChatHistoryItem } from '../services/geminiService';
import { User } from '../types';

interface SamratChatbotProps {
  currentUser: User | null;
  currentView?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export const SamratChatbot: React.FC<SamratChatbotProps> = ({ currentUser, currentView = 'landing' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize greeting message on first open if empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: Message = {
        id: 'welcome-' + Date.now(),
        sender: 'bot',
        text: `Hello ${currentUser ? currentUser.name.split(' ')[0] : 'there'}! 👋 I am **Samrat AI**, your 24/7 intelligent assistant for the Blood Bank Management System.\n\nHow can I help you today? Feel free to ask about:\n• **Blood Donation Eligibility & Guidelines**\n• **Blood Group Compatibility (O±, A±, B±, AB±)**\n• **Emergency Blood Requests**\n• **Navigating Dashboard & Features**\n• **General Health Tips**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([greeting]);
    }
  }, [isOpen, currentUser, messages.length]);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen, isLoading]);

  // Initialize Speech Recognition for voice mode
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError("Microphone permission denied. Please allow mic access in your browser settings.");
        } else {
          setSpeechError("Voice input failed. Please try typing or speak clearly.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const toggleVoiceMode = () => {
    setSpeechError(null);
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error("Could not start speech recognition:", err);
          setIsListening(false);
        }
      } else {
        setSpeechError("Voice mode is not supported by your browser. Please type your message.");
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputMessage;
    if (!messageText.trim() || isLoading) return;

    // Prevent duplicate submission while generating
    setInputMessage('');
    setSpeechError(null);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMsg: Message = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: messageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Prepare context and history for Samrat AI
    const contextStr = currentUser
      ? `Logged in user: ${currentUser.name} (${currentUser.role || 'User'}, Blood Group: ${currentUser.bloodGroup || 'Unknown'}). Current page/view: ${currentView}.`
      : `Guest visitor on ${currentView} page.`;

    // Filter history to send previous user and bot turns (excluding welcome message and errors)
    const historyPayload: ChatHistoryItem[] = updatedMessages
      .filter(m => !m.id.startsWith('welcome-') && !m.isError)
      .slice(-10) // Keep recent 10 turns for token efficiency and relevant memory
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

    try {
      const responseText = await chatWithSamrat(messageText.trim(), contextStr, useThinking, historyPayload);
      
      const botMsg: Message = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Samrat Chatbot error:", error);
      const errorMsg: Message = {
        id: 'err-' + Date.now(),
        sender: 'bot',
        text: "I am having trouble processing your request right now due to a temporary connection issue. Please check your network or try again in a few moments.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const clearChatHistory = () => {
    const greeting: Message = {
      id: 'welcome-' + Date.now(),
      sender: 'bot',
      text: `Chat cleared! How else can **Samrat AI** assist you with the Blood Bank Management System today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([greeting]);
  };

  const formatMessageText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // Bold markdown **text** formatting
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <React.Fragment key={idx}>
          <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
          {idx < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 bg-gradient-to-r from-blood-600 via-rose-600 to-red-600 hover:from-blood-700 hover:to-red-700 text-white font-semibold py-3.5 px-6 rounded-full shadow-2xl hover:shadow-blood-500/50 transform hover:-translate-y-1 transition-all duration-300 border border-white/20 animate-pulse-subtle"
            title="Chat with Samrat AI"
          >
            <div className="relative">
              <Bot size={26} className="text-white transform group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <span className="tracking-wide text-sm md:text-base font-medium flex items-center gap-1.5">
              Samrat AI <Sparkles size={16} className="text-amber-300 animate-spin-slow" />
            </span>
          </button>
        )}
      </div>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[400px] md:w-[440px] h-[82vh] max-h-[640px] flex flex-col bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-fade-in-up transition-all duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blood-600 via-rose-600 to-red-600 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                <Bot size={22} className="text-white" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-blood-600"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base tracking-tight">Samrat AI</h3>
                  <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider text-amber-200 flex items-center gap-1">
                    <Sparkles size={10} /> Assistant
                  </span>
                </div>
                <p className="text-xs text-rose-100 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  24/7 Intelligent Support
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Thinking / Fast Mode Toggle */}
              <button
                onClick={() => setUseThinking(!useThinking)}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border ${
                  useThinking 
                    ? 'bg-amber-500/30 border-amber-300 text-amber-200' 
                    : 'bg-white/10 border-white/20 text-rose-100 hover:bg-white/20'
                }`}
                title={useThinking ? "Deep Reasoning Mode Active (More detailed)" : "Fast Flash Mode Active"}
              >
                {useThinking ? <Brain size={14} className="text-amber-300" /> : <Zap size={14} className="text-yellow-300" />}
                <span className="hidden sm:inline">{useThinking ? 'Pro Mode' : 'Fast'}</span>
              </button>

              <button
                onClick={clearChatHistory}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Reset Conversation"
              >
                <RefreshCw size={15} />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all ml-1"
                title="Close Chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Suggestions Bar (when chat is new or brief) */}
          {messages.length <= 2 && (
            <div className="bg-rose-50/80 dark:bg-gray-800/80 border-b border-rose-100 dark:border-gray-700 p-2.5 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                <span className="font-semibold text-blood-600 dark:text-blood-400 flex items-center gap-1">
                  <HelpCircle size={13} /> Quick Ask:
                </span>
                <button
                  onClick={() => handleQuickQuestion("Who is eligible to donate blood right now?")}
                  className="bg-white dark:bg-gray-700 hover:bg-blood-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 transition-colors shadow-xs"
                >
                  🩸 Eligibility Criteria
                </button>
                <button
                  onClick={() => handleQuickQuestion("What are the universal blood donor and recipient groups?")}
                  className="bg-white dark:bg-gray-700 hover:bg-blood-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 transition-colors shadow-xs"
                >
                  🔄 Blood Groups
                </button>
                <button
                  onClick={() => handleQuickQuestion("How do I raise an emergency blood request quickly?")}
                  className="bg-white dark:bg-gray-700 hover:bg-blood-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 transition-colors shadow-xs"
                >
                  🚨 Emergency Help
                </button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blood-500 to-rose-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-1">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blood-600 to-rose-600 text-white rounded-br-xs'
                      : msg.isError
                      ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-bl-xs'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-xs'
                  }`}
                >
                  <div className="break-words">
                    {msg.sender === 'bot' ? formatMessageText(msg.text) : msg.text}
                  </div>
                  <div
                    className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${
                      msg.sender === 'user' ? 'text-rose-100/80' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0 shadow-sm mt-1">
                    <UserIcon size={16} />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blood-500 to-rose-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Bot size={16} />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-xs p-3.5 shadow-sm flex items-center gap-2.5">
                  <div className="flex space-x-1 items-center">
                    <div className="w-2 h-2 bg-blood-600 dark:bg-blood-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-blood-600 dark:bg-blood-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-blood-600 dark:bg-blood-400 rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {useThinking ? 'Samrat is deep reasoning...' : 'Samrat AI is thinking...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Speech Error Notice */}
          {speechError && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-800 px-3 py-1.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{speechError}</span>
              </div>
              <button onClick={() => setSpeechError(null)} className="text-amber-600 hover:text-amber-900 dark:hover:text-amber-100">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Voice Listening Bar */}
          {isListening && (
            <div className="bg-blood-50 dark:bg-blood-950/40 border-t border-blood-200 dark:border-blood-800 px-3 py-2 flex items-center justify-between text-xs text-blood-700 dark:text-blood-300 animate-pulse">
              <div className="flex items-center gap-2 font-medium">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blood-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blood-600"></span>
                </span>
                Listening... Speak your question clearly
              </div>
              <button
                onClick={toggleVoiceMode}
                className="text-xs bg-blood-600 text-white px-2 py-0.5 rounded font-medium hover:bg-blood-700 transition-colors"
              >
                Stop
              </button>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={isListening ? "Listening..." : "Ask Samrat anything about blood donation..."}
                  disabled={isLoading}
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-xl pl-3.5 pr-10 py-2.5 border border-transparent focus:border-blood-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                
                {/* Voice Mode Mic Button */}
                <button
                  type="button"
                  onClick={toggleVoiceMode}
                  disabled={isLoading}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                    isListening
                      ? 'bg-blood-600 text-white animate-bounce'
                      : 'text-gray-400 hover:text-blood-600 dark:hover:text-blood-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title={isListening ? "Stop Voice Mode" : "Start Voice Mode"}
                >
                  {isListening ? <Mic size={16} /> : <Mic size={16} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-blood-600 to-rose-600 hover:from-blood-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl shadow-md hover:shadow-blood-500/30 transition-all flex items-center justify-center shrink-0"
                title="Send Message"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
            
            {/* Disclaimer */}
            <div className="mt-2 text-[10px] text-center text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
              <Info size={11} className="shrink-0" />
              <span>AI guidance is for general info and not a substitute for professional medical advice.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

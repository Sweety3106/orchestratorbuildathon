'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Globe, BarChart3, Target, TrendingUp, Cpu, 
  Palette, FileText, Code, Megaphone, Presentation, 
  ShieldAlert, Settings, ArrowRight, Play, CheckCircle, 
  Loader2, Copy, Check, Eye, Terminal, RefreshCw, Send, 
  HelpCircle, ExternalLink, Award, Sun, Moon
} from 'lucide-react';
import { StartupAnalysis } from '@/lib/agents/orchestrator';

// Custom canvas-confetti trigger helper
const triggerConfetti = async () => {
  try {
    const confetti = (await import('canvas-confetti')).default;
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#6366f1', '#3b82f6', '#10b981']
    });
  } catch (err) {
    console.error(err);
  }
};

const AGENT_LIST = [
  { name: 'Intent Analyzer Agent', icon: Target, description: 'Extracts core business structures' },
  { name: 'Research Agent', icon: Globe, description: 'Sizes TAM/SAM/SOM & profiles competitors' },
  { name: 'Business Strategy Agent', icon: TrendingUp, description: 'Drafts Lean Canvas & revenue models' },
  { name: 'Product Architect Agent', icon: Cpu, description: 'Architects MVP & technology stack' },
  { name: 'UI/UX Agent', icon: Palette, description: 'Creates layout grids & colors' },
  { name: 'Content Agent', icon: FileText, description: 'Generates blog posts, emails & socials' },
  { name: 'Development Agent', icon: Code, description: 'Codes responsive Tailwind HTML landing page' },
  { name: 'Marketing Agent', icon: Megaphone, description: 'Drafts 3-week GTM launch roadmap' },
  { name: 'Pitch Deck Agent', icon: Presentation, description: 'Creates 10-slide investor presentation' },
  { name: 'Review Agent', icon: ShieldAlert, description: 'Performs logical conflict validation' }
];

export default function Dashboard() {
  // Navigation & States
  const [step, setStep] = useState<'prompt' | 'loading' | 'dashboard'>('prompt');
  const [activeTab, setActiveTab] = useState<'canvas' | 'market' | 'product' | 'content' | 'landing' | 'gtm' | 'pitch' | 'review' | 'boardroom'>('canvas');
  
  // Custom states for Dark/Light mode and Magnetic Cursor
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [trailPos, setTrailPos] = useState({ x: -100, y: -100 });
  
  // API Keys
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.1-flash-lite');
  const [showSettings, setShowSettings] = useState(false);
  const [hasBackendKeys, setHasBackendKeys] = useState(false);

  // User input
  const [prompt, setPrompt] = useState('');

  // Execution states
  const [currentRunningAgent, setCurrentRunningAgent] = useState<string>('');
  const [completedAgents, setCompletedAgents] = useState<string[]>([]);
  const [logs, setLogs] = useState<Array<{ agentName: string; status: 'info' | 'success' | 'warning' | 'error'; message: string; timestamp: Date }>>([]);
  const [result, setResult] = useState<StartupAnalysis | null>(null);
  
  // Boardroom Debate state
  const [boardroomQuestion, setBoardroomQuestion] = useState('Should I launch this startup?');
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateHistory, setDebateHistory] = useState<Array<{ persona: string; statement: string }>>([]);
  const [boardroomScore, setBoardroomScore] = useState(0);

  // Terminal scroll reference
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Copy code handler
  const [copiedCode, setCopiedCode] = useState(false);
  const [landingPreviewTab, setLandingPreviewTab] = useState<'web' | 'code'>('web');

  // Load saved keys from localStorage on mount
  useEffect(() => {
    const savedGroq = localStorage.getItem('groq_api_key');
    const savedGemini = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('gemini_model');
    if (savedGroq) setGroqKey(savedGroq);
    if (savedGemini) setGeminiKey(savedGemini);
    if (savedModel) setGeminiModel(savedModel);

    // Fetch backend keys status
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setHasBackendKeys(data.hasBackendKeys))
      .catch(err => console.error(err));
  }, []);

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Monitor light/dark mode changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
      document.body.classList.add('light-mode');
    }
  }, [isDarkMode]);

  // Track mouse coordinates for custom cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Smooth trail animation loop
  useEffect(() => {
    let requestId: number;
    const updateTrail = () => {
      setTrailPos(prev => {
        const dx = mousePos.x - prev.x;
        const dy = mousePos.y - prev.y;
        return {
          x: prev.x + dx * 0.15,
          y: prev.y + dy * 0.15
        };
      });
      requestId = requestAnimationFrame(updateTrail);
    };
    updateTrail();
    return () => cancelAnimationFrame(requestId);
  }, [mousePos]);

  // Save keys
  const handleSaveKeys = () => {
    localStorage.setItem('groq_api_key', groqKey);
    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('gemini_model', geminiModel);
    setShowSettings(false);
  };

  // Run Orchestration
  const handleOrchestrate = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) return;

    // Reset states
    setPrompt(finalPrompt);
    setStep('loading');
    setLogs([]);
    setCompletedAgents([]);
    setCurrentRunningAgent(AGENT_LIST[0].name);
    setResult(null);
    setDebateHistory([]);
    setBoardroomScore(0);

    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          groqKey,
          geminiKey,
          geminiModel
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start orchestration server connection.');
      }

      if (!response.body) {
        throw new Error('Response stream has no body.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'log') {
              setLogs(prev => [
                ...prev,
                {
                  agentName: data.agentName,
                  status: data.status,
                  message: data.message,
                  timestamp: new Date()
                }
              ]);

              if (data.status === 'success' || data.status === 'warning') {
                setCompletedAgents(prev => {
                  if (!prev.includes(data.agentName)) {
                    return [...prev, data.agentName];
                  }
                  return prev;
                });
              } else if (data.status === 'info') {
                setCurrentRunningAgent(data.agentName);
              }
            } else if (data.type === 'result') {
              setResult(data.data);
              setBoardroomScore(data.data.review.consistencyScore);
              
              // Seed initial debate based on result recommendations
              const initialDebate = data.data.review.warnings.map((warn: string, index: number) => {
                const personas: Array<'CEO' | 'Investor' | 'Marketing' | 'Technical'> = ['Investor', 'Marketing', 'Technical', 'CEO'];
                return {
                  persona: personas[index % 4],
                  statement: warn
                };
              });
              setDebateHistory(initialDebate.length > 0 ? initialDebate : [
                { persona: 'CEO', statement: `Let's launch ${data.data.intent.name}! The strategy is complete, and we are ready to take on the market.` }
              ]);

              setStep('dashboard');
              triggerConfetti();
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error('Failed to parse line:', line, e);
          }
        }
      }
    } catch (err: any) {
      setLogs(prev => [
        ...prev,
        {
          agentName: 'System Orchestrator',
          status: 'error',
          message: err.message || 'Connection crashed during execution.',
          timestamp: new Date()
        }
      ]);
      // Return to prompt page on error after brief delay or stay in loading screen with failure state
      setCurrentRunningAgent('');
    }
  };

  // Run Boardroom Debate
  const handleDebate = async () => {
    if (!result || debateLoading || !boardroomQuestion.trim()) return;

    setDebateLoading(true);
    try {
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup: result,
          question: boardroomQuestion,
          groqKey,
          geminiKey,
          geminiModel
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reach AI boardroom backend.');
      }

      const data = await response.json();
      setDebateHistory(data.debate);
      setBoardroomScore(data.score);
      setBoardroomQuestion('');
    } catch (err: any) {
      console.error(err);
      setDebateHistory(prev => [
        ...prev,
        { persona: 'CEO', statement: 'Wait, there was a communications glitch with the advisory board. Let us try that again.' }
      ]);
    } finally {
      setDebateLoading(false);
    }
  };

  // Fast pre-fill options
  const PREFILLS = [
    { title: "AI Career Counselor", desc: "Indian students career pathway guidance matching skills and parent updates", prompt: "I want to launch an AI-powered career guidance platform for Indian students." },
    { title: "Green Energy Newsletter", desc: "Curated newsletter covering sustainable investments and policy in India", prompt: "I want to launch a newsletter about green-energy startups in India." },
    { title: "SaaS CRM for Micro-Breweries", desc: "Niche tracking customer acquisition and inventory for local craft breweries", prompt: "I want to build a SaaS CRM and inventory tool specifically for micro-breweries in Bengaluru." }
  ];

  const handleCopyCode = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.development.landingPageHtml);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      {/* Background Matrix Grids */}
      <div className="absolute inset-0 grid-bg pointer-events-none z-0"></div>

      {/* Animating Background Blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      {/* Custom Magnetic Cursor */}
      <div 
        className="magnetic-cursor hidden md:block" 
        style={{ left: `${trailPos.x}px`, top: `${trailPos.y}px` }}
      />
      <div 
        className="magnetic-cursor-dot hidden md:block" 
        style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
      />

      {/* Top Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep('prompt')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg text-glow-purple">
              F
            </div>
            <div>
              <span className="font-outfit font-bold text-xl text-white tracking-tight">FounderOS<span className="text-violet-500 font-normal">.AI</span></span>
              <span className="block text-[9px] text-gray-500 font-mono tracking-widest uppercase">Multi-Agent Suite</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicators */}
            {(groqKey || geminiKey || hasBackendKeys) ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse-slow">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LLM Connected
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Simulation Mode
              </span>
            )}

            <button 
              onClick={() => setIsDarkMode(prev => !prev)}
              className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center"
              title="Toggle Light/Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-indigo-400" />}
            </button>

            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center gap-2 text-sm"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </nav>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10 relative">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-violet-500" />
              API Settings Configuration
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Enter your keys to run custom queries live via Groq (Llama 3) or Gemini. If left empty, the orchestrator defaults to high-fidelity, context-aware simulation.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Groq API Key (Llama 3.3 70B)</label>
                <input 
                  type="password"
                  value={groqKey}
                  onChange={e => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Gemini API Key</label>
                <input 
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-1">Gemini Model</label>
                <select
                  value={geminiModel}
                  onChange={e => setGeminiModel(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Fast & High Quota)</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveKeys}
                className="px-4 py-2 text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition"
              >
                Save Config
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex-1">
        
        {/* ============================================================= */}
        {/* SCREEN 1: Prompt Input Landing */}
        {/* ============================================================= */}
        {step === 'prompt' && (
          <div className="max-w-4xl mx-auto text-center space-y-12 py-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-2">
                🚀 AI-Powered Startup Sandbox
              </div>
              <h1 className="font-outfit font-black text-5xl md:text-7xl tracking-tight text-white leading-none">
                One Prompt.<br />
                <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-500 bg-clip-text text-transparent text-glow-purple">Entire Startup Launch.</span>
              </h1>
              <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
                Enter your business idea. Our network of 10 coordinated AI agents will research market gaps, draft lean canvas strategy, generate code, write copy, and pitch to VCs.
              </p>
            </div>

            {/* Prompt input field */}
            <div className="glass-panel p-2 rounded-2xl border border-white/10 shadow-2xl relative max-w-3xl mx-auto group focus-within:border-violet-500/30 focus-within:shadow-[0_0_40px_rgba(139,92,246,0.15)] transition duration-300">
              <div className="flex flex-col md:flex-row gap-2">
                <textarea 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="I want to launch an AI-powered career guidance platform for Indian students..."
                  rows={3}
                  className="flex-1 bg-transparent resize-none outline-none border-none p-4 text-white text-base placeholder-gray-500 leading-relaxed focus:ring-0 font-light"
                />
                <div className="p-2 flex items-end justify-end">
                  <button 
                    onClick={() => handleOrchestrate()}
                    className="glow-btn-purple px-6 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm tracking-wide flex items-center gap-2 group-hover:scale-105 active:scale-95 transition"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Launch Agents
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="space-y-4 max-w-3xl mx-auto">
              <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500">Or pick a template to test</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {PREFILLS.map((p, i) => (
                  <div 
                    key={i}
                    onClick={() => handleOrchestrate(p.prompt)}
                    className="glass-panel glow-card p-5 rounded-xl border border-white/5 cursor-pointer hover:border-violet-500/25 hover:bg-neutral-900/60 transition duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      <h5 className="font-bold text-white mb-2 text-sm group-hover:text-violet-400 transition">{p.title}</h5>
                      <p className="text-xs text-gray-400 leading-relaxed font-light">{p.desc}</p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <span className="text-[10px] text-violet-400 font-mono tracking-wider flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        Run Demo <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SCREEN 2: Live Agent Workflow Simulation */}
        {/* ============================================================= */}
        {step === 'loading' && (
          <div className="max-w-5xl mx-auto space-y-8 py-6">
            
            {/* Upper grid showing all agents status */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {AGENT_LIST.map((agent, i) => {
                const isCompleted = completedAgents.includes(agent.name);
                const isRunning = currentRunningAgent === agent.name;
                const AgentIcon = agent.icon;

                return (
                  <div 
                    key={i}
                    className={`glass-panel p-4 rounded-xl border flex flex-col items-center justify-between text-center transition-all duration-300 ${
                      isCompleted 
                        ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]'
                        : isRunning 
                        ? 'border-violet-500/40 bg-violet-500/5 animate-pulse-slow' 
                        : 'border-white/5 opacity-55'
                    }`}
                  >
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-colors ${
                        isCompleted ? 'bg-emerald-500/10 text-emerald-400' : isRunning ? 'bg-violet-500/10 text-violet-400' : 'bg-white/5 text-gray-500'
                      }`}>
                        <AgentIcon className="w-5 h-5" />
                      </div>
                      {isCompleted && (
                        <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-emerald-500 rounded-full border border-black flex items-center justify-center">
                          <Check className="w-3 h-3 text-black stroke-[3px]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h6 className="text-xs font-bold text-white leading-tight">{agent.name.split(' Agent')[0]}</h6>
                      <span className="block text-[8px] text-gray-500 font-mono tracking-wide mt-1 uppercase">
                        {isCompleted ? 'Complete' : isRunning ? 'Running...' : 'Waiting'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Simulated Live Terminal */}
            <div className="glass-panel rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[500px]">
              <div className="bg-black/80 px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-violet-400" />
                  <span className="font-mono text-xs text-gray-400">FounderOS_Orchestrator_Logs.log</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/50"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/50"></span>
                </div>
              </div>

              {/* Logs terminal body */}
              <div className="flex-1 bg-[#010103] p-6 font-mono text-xs leading-relaxed overflow-y-auto space-y-3">
                {logs.length === 0 ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                    Initializing agent worker threads...
                  </div>
                ) : (
                  logs.map((log, index) => {
                    const isSuccess = log.status === 'success';
                    const isWarning = log.status === 'warning';
                    const isError = log.status === 'error';

                    return (
                      <div key={index} className="terminal-line">
                        <span className="text-gray-600 mr-2">[{log.timestamp.toLocaleTimeString()}]</span>
                        <span className={`font-bold mr-1 ${
                          isSuccess ? 'text-emerald-400' : isWarning ? 'text-amber-400' : isError ? 'text-red-500' : 'text-violet-400'
                        }`}>
                          [{log.agentName}]
                        </span>
                        <span className={isSuccess ? 'text-gray-300' : isWarning ? 'text-amber-200' : isError ? 'text-red-300' : 'text-gray-400'}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={terminalEndRef} />
              </div>

              {/* Loading spinner footer */}
              <div className="bg-black/50 px-4 py-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                  <span>Executing agent workflows... this may take up to 20 seconds.</span>
                </div>
                <div className="text-[10px] text-gray-600 font-mono">
                  {completedAgents.length} / 10 Agents Complete
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SCREEN 3: Results Dashboard */}
        {/* ============================================================= */}
        {step === 'dashboard' && result && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Sidebar navigation */}
            <div className="lg:col-span-1 space-y-4">
              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
                <div>
                  <h3 className="font-outfit font-black text-xl text-white tracking-tight leading-tight">{result.intent.name}</h3>
                  <span className="text-[10px] text-violet-400 font-mono tracking-widest uppercase block mt-1">{result.intent.industry}</span>
                </div>
                <p className="text-xs text-gray-400 italic font-light">"{result.intent.tagline}"</p>
                <div className="h-[1px] bg-white/5" />
                
                {/* Feasibility score summary widget */}
                <div className="flex items-center gap-4 bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="relative flex items-center justify-center">
                    <svg className="w-12 h-12 transform -rotate-90">
                      <circle cx="24" cy="24" r="20" className="stroke-white/5 fill-transparent stroke-[4]" />
                      <circle 
                        cx="24" 
                        cy="24" 
                        r="20" 
                        className="stroke-violet-500 fill-transparent stroke-[4] text-glow-purple" 
                        strokeDasharray={125}
                        strokeDashoffset={125 - (125 * result.review.consistencyScore) / 100}
                      />
                    </svg>
                    <span className="absolute text-xs font-mono font-bold text-white">{result.review.consistencyScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 font-mono uppercase">Launch Feasibility</span>
                    <span className="text-xs text-emerald-400 font-semibold">Ready to test</span>
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="glass-panel rounded-2xl border border-white/10 p-2 space-y-1">
                {[
                  { id: 'canvas', label: 'Lean Canvas', icon: Target },
                  { id: 'market', label: 'Market Research', icon: Globe },
                  { id: 'product', label: 'MVP Architect', icon: Cpu },
                  { id: 'content', label: 'Copy & Content', icon: FileText },
                  { id: 'landing', label: 'Landing Page Component', icon: Code },
                  { id: 'gtm', label: 'Marketing Timeline', icon: Megaphone },
                  { id: 'pitch', label: 'Investor Pitch', icon: Presentation },
                  { id: 'review', label: 'Agent Conflict Audit', icon: ShieldAlert },
                  { id: 'boardroom', label: 'AI Boardroom', icon: Award }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl font-medium transition duration-200 ${
                        isActive 
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/10' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Relaunch button */}
              <button 
                onClick={() => setStep('prompt')}
                className="w-full py-3 border border-white/10 hover:border-white/20 hover:bg-white/5 rounded-xl text-xs text-gray-400 hover:text-white font-mono tracking-wide uppercase transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Orchestrate New Idea
              </button>
            </div>

            {/* Tabs content pane */}
            <div className="lg:col-span-3">
              
              {/* ============================================== */}
              {/* TAB 1: Lean Canvas */}
              {/* ============================================== */}
              {activeTab === 'canvas' && (
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <Target className="w-5 h-5 text-violet-500" />
                          Lean Business Canvas
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Structured 1-page business strategy formulated by Business Strategy Agent.</p>
                      </div>
                      <span className="text-xs font-mono bg-violet-500/10 border border-violet-500/20 text-violet-400 px-3 py-1 rounded-full">
                        Business Model: {result.intent.businessModel}
                      </span>
                    </div>

                    {/* Standard Lean Canvas grid */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Problem Column */}
                      <div className="md:col-span-2 border border-white/5 rounded-xl bg-white/[0.01] p-4 space-y-4">
                        <h4 className="font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">1. Problem</h4>
                        <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside">
                          {result.business.leanCanvas.problem.map((p, i) => <li key={i} className="leading-relaxed">{p}</li>)}
                        </ul>
                      </div>
                      
                      {/* Solution & Metrics */}
                      <div className="md:col-span-1 flex flex-col gap-4">
                        <div className="border border-white/5 rounded-xl bg-white/[0.01] p-4 flex-1 space-y-3">
                          <h4 className="font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">2. Solution</h4>
                          <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside">
                            {result.business.leanCanvas.solution.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
                          </ul>
                        </div>
                        <div className="border border-white/5 rounded-xl bg-white/[0.01] p-4 flex-1 space-y-3">
                          <h4 className="font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">8. Key Metrics</h4>
                          <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                            {result.business.leanCanvas.keyMetrics.map((m, i) => <li key={i} className="leading-relaxed">{m}</li>)}
                          </ul>
                        </div>
                      </div>

                      {/* UVP & Advantage */}
                      <div className="md:col-span-2 border border-white/5 rounded-xl bg-white/[0.01] p-4 space-y-4 flex flex-col justify-between">
                        <div>
                          <h4 className="font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">3. Unique Value Proposition</h4>
                          <p className="text-xs text-white font-medium leading-relaxed mt-2 p-3 bg-violet-950/20 border border-violet-500/10 rounded-lg">
                            {result.business.leanCanvas.uvp}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-mono text-xs font-bold text-violet-400 uppercase tracking-wider mt-4">9. Unfair Advantage</h4>
                          <p className="text-xs text-gray-300 leading-relaxed mt-1">{result.business.leanCanvas.unfairAdvantage}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Channels & Segments */}
                      <div className="md:col-span-2 border border-white/5 rounded-xl bg-white/[0.01] p-4 space-y-3">
                        <h4 className="font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">5. Customer Segments</h4>
                        <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside">
                          {result.business.leanCanvas.customerSegments.map((cs, i) => <li key={i} className="leading-relaxed">{cs}</li>)}
                        </ul>
                      </div>
                      
                      <div className="md:col-span-1 border border-white/5 rounded-xl bg-white/[0.01] p-4 space-y-3">
                        <h4 className="font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">4. Channels</h4>
                        <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside">
                          {result.business.leanCanvas.channels.map((ch, i) => <li key={i} className="leading-relaxed">{ch}</li>)}
                        </ul>
                      </div>

                      {/* Financial Structure Summary */}
                      <div className="md:col-span-2 border border-white/5 rounded-xl bg-white/[0.01] p-4 space-y-3">
                        <h4 className="font-mono text-xs font-bold text-violet-400 uppercase tracking-wider">6. Revenue Streams</h4>
                        <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                          {result.business.leanCanvas.revenueStreams.map((rev, i) => <li key={i} className="leading-relaxed">{rev}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Financial calculation module */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2 border-b border-white/5 pb-3">
                      <BarChart3 className="w-5 h-5 text-indigo-500" />
                      Financial Projection & Model Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="border border-white/5 rounded-xl p-4 bg-white/[0.01]">
                        <span className="block text-[10px] text-gray-500 font-mono uppercase">Pricing Unit</span>
                        <span className="text-2xl font-bold text-white mt-1 block">{result.business.financials.pricingPoint}</span>
                        <span className="block text-[10px] text-gray-400 mt-1 font-light">Per monthly subscription</span>
                      </div>
                      <div className="border border-white/5 rounded-xl p-4 bg-white/[0.01]">
                        <span className="block text-[10px] text-gray-500 font-mono uppercase">Traffic Target</span>
                        <span className="text-2xl font-bold text-white mt-1 block">{result.business.financials.trafficTarget}</span>
                        <span className="block text-[10px] text-gray-400 mt-1 font-light">Monthly unique visitors</span>
                      </div>
                      <div className="border border-white/5 rounded-xl p-4 bg-white/[0.01]">
                        <span className="block text-[10px] text-gray-500 font-mono uppercase">Conversion Rate</span>
                        <span className="text-2xl font-bold text-white mt-1 block">{result.business.financials.conversionRate}</span>
                        <span className="block text-[10px] text-gray-400 mt-1 font-light">Sign-up conversion target</span>
                      </div>
                      <div className="border border-violet-500/20 rounded-xl p-4 bg-violet-950/10">
                        <span className="block text-[10px] text-violet-400 font-mono uppercase">Target MRR</span>
                        <span className="text-2xl font-extrabold text-violet-400 mt-1 block text-glow-purple">{result.business.financials.estimatedMRR}</span>
                        <span className="block text-[10px] text-gray-400 mt-1 font-light">ARR: {result.business.financials.estimatedARR}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================== */}
              {/* TAB 2: Market Research */}
              {/* ============================================== */}
              {activeTab === 'market' && (
                <div className="space-y-6">
                  {/* Competitor list */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-violet-500" />
                        Competitor & Opportunity Analysis
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">Identified and analyzed by Research Agent.</p>
                    </div>

                    <div className="overflow-x-auto border border-white/5 rounded-xl bg-white/[0.01]">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-4 font-mono font-bold text-gray-400 uppercase tracking-wider">Competitor</th>
                            <th className="p-4 font-mono font-bold text-gray-400 uppercase tracking-wider">Strength</th>
                            <th className="p-4 font-mono font-bold text-gray-400 uppercase tracking-wider">Weakness / Gap</th>
                            <th className="p-4 font-mono font-bold text-gray-400 uppercase tracking-wider text-right">Reference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-gray-300">
                          {result.research.competitors.map((c, i) => (
                            <tr key={i} className="hover:bg-white/[0.01] transition">
                              <td className="p-4 font-semibold text-white">{c.name}</td>
                              <td className="p-4 leading-relaxed">{c.strength}</td>
                              <td className="p-4 leading-relaxed text-amber-300/80">{c.weakness}</td>
                              <td className="p-4 text-right">
                                <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 hover:underline">
                                  Visit <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Market sizing & Trends */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        Market Size (TAM / SAM / SOM)
                      </h3>
                      <div className="space-y-3 text-xs font-mono">
                        <div className="p-3 border border-white/5 bg-white/[0.01] rounded-lg">
                          <span className="block text-[10px] text-gray-500 uppercase">Total Addressable Market (TAM)</span>
                          <span className="block text-sm font-bold text-white mt-1">{result.research.marketSize.TAM}</span>
                        </div>
                        <div className="p-3 border border-white/5 bg-white/[0.01] rounded-lg">
                          <span className="block text-[10px] text-gray-500 uppercase">Serviceable Addressable Market (SAM)</span>
                          <span className="block text-sm font-bold text-white mt-1">{result.research.marketSize.SAM}</span>
                        </div>
                        <div className="p-3 border border-violet-500/10 bg-violet-950/10 rounded-lg">
                          <span className="block text-[10px] text-violet-400 uppercase">Serviceable Obtainable Market (SOM)</span>
                          <span className="block text-sm font-bold text-violet-300 mt-1">{result.research.marketSize.SOM}</span>
                        </div>
                        <div className="p-2 text-right">
                          <span className="text-[10px] text-gray-400 font-sans">Growth Rate: </span>
                          <span className="text-[10px] text-emerald-400 font-bold font-sans">{result.research.marketSize.growthRate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Ecosystem Trends & Gaps
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <h5 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">Key Trends</h5>
                          <ul className="space-y-1.5 text-xs text-gray-300 list-disc list-inside">
                            {result.research.trends.map((t, i) => <li key={i} className="leading-relaxed">{t}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">Opportunity Gaps</h5>
                          <ul className="space-y-1.5 text-xs text-amber-200/90 list-disc list-inside">
                            {result.research.gaps.map((g, i) => <li key={i} className="leading-relaxed">{g}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================== */}
              {/* TAB 3: MVP Architect & Tech Stack */}
              {/* ============================================== */}
              {activeTab === 'product' && (
                <div className="space-y-6">
                  {/* Features and flow */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-violet-500" />
                        Product MVP Architecture & Tech Stack
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">Orchestrated by Product Architect Agent.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-gray-400">Core MVP Features</h4>
                        <div className="space-y-3">
                          {result.product.mvpFeatures.map((feat, i) => (
                            <div key={i} className="p-4 border border-white/5 bg-white/[0.01] rounded-xl flex items-start gap-3 justify-between">
                              <div>
                                <h5 className="font-bold text-white text-sm">{feat.title}</h5>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{feat.description}</p>
                              </div>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                                feat.complexity === 'High' 
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                                  : feat.complexity === 'Medium' 
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              }`}>
                                {feat.complexity} Complexity
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-gray-400">User Flow Pipeline</h4>
                        <div className="space-y-3 border-l border-white/10 ml-3 pl-5 relative">
                          {result.product.userFlow.map((flow, i) => (
                            <div key={i} className="relative space-y-1">
                              {/* circular node dot */}
                              <div className="absolute w-3.5 h-3.5 rounded-full bg-violet-600 border border-black -left-[27px] top-0.5 flex items-center justify-center text-[7px] font-bold text-white font-mono">
                                {i+1}
                              </div>
                              <h5 className="text-xs font-bold text-white">{flow.step} ({flow.action})</h5>
                              <p className="text-[11px] text-gray-400 leading-relaxed pb-3">{flow.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tech stack card */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2 border-b border-white/5 pb-3">
                      <Code className="w-5 h-5 text-indigo-500" />
                      Recommended Technology Stack
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                      <div className="p-4 border border-white/5 bg-white/[0.01] rounded-xl">
                        <span className="block text-[9px] text-gray-500 uppercase">Frontend UI</span>
                        <span className="block text-sm font-bold text-white mt-1.5">{result.product.techStack.frontend}</span>
                      </div>
                      <div className="p-4 border border-white/5 bg-white/[0.01] rounded-xl">
                        <span className="block text-[9px] text-gray-500 uppercase">Backend Server</span>
                        <span className="block text-sm font-bold text-white mt-1.5">{result.product.techStack.backend}</span>
                      </div>
                      <div className="p-4 border border-white/5 bg-white/[0.01] rounded-xl">
                        <span className="block text-[9px] text-gray-500 uppercase">Database Layer</span>
                        <span className="block text-sm font-bold text-white mt-1.5">{result.product.techStack.database}</span>
                      </div>
                      <div className="p-4 border border-violet-500/15 bg-violet-950/10 rounded-xl">
                        <span className="block text-[9px] text-violet-400 uppercase">External APIs</span>
                        <ul className="space-y-1.5 mt-2 text-[10px] text-gray-300 list-disc list-inside">
                          {result.product.techStack.additionalAPIs.map((api, idx) => <li key={idx}>{api}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================== */}
              {/* TAB 4: Copy & Content */}
              {/* ============================================== */}
              {activeTab === 'content' && (
                <div className="space-y-6">
                  {/* Email & social cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Social Media Content */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-violet-500" />
                        Generated Social Marketing Copy
                      </h3>
                      <div className="space-y-4 text-xs font-mono">
                        <div>
                          <span className="text-[10px] uppercase text-gray-500 block mb-2">Twitter/X Thread Posts</span>
                          {result.content.socialPosts.twitter.map((post, i) => (
                            <div key={i} className="p-3 border border-white/5 bg-white/[0.01] rounded-lg mb-2 relative group leading-relaxed font-sans text-gray-300">
                              {post}
                            </div>
                          ))}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-gray-500 block mb-2">LinkedIn Announcement</span>
                          <div className="p-3 border border-white/5 bg-white/[0.01] rounded-lg relative font-sans text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {result.content.socialPosts.linkedin[0]}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email campaign copy */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        Email Drip Marketing Campaign
                      </h3>
                      <div className="space-y-4 text-xs font-sans">
                        <div className="border border-white/5 bg-white/[0.01] rounded-lg p-3">
                          <span className="text-[9px] font-mono uppercase text-violet-400 block mb-1">Email 1: Welcome Digest</span>
                          <pre className="text-[11px] text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{result.content.emails.welcome}</pre>
                        </div>
                        <div className="border border-white/5 bg-white/[0.01] rounded-lg p-3">
                          <span className="text-[9px] font-mono uppercase text-violet-400 block mb-1">Email 2: Product Launch Campaign</span>
                          <pre className="text-[11px] text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{result.content.emails.launch}</pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Blog article card */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                      <FileText className="w-5 h-5 text-emerald-500" />
                      1,000-Word SEO Ecosystem Blog Post
                    </h3>
                    <div className="space-y-3">
                      <h4 className="text-xl font-outfit font-black text-white">{result.content.blogPost.title}</h4>
                      <p className="text-xs text-violet-400 italic">"{result.content.blogPost.excerpt}"</p>
                      <div className="h-[1px] bg-white/5 my-4" />
                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-light font-sans max-h-96 overflow-y-auto pr-2">
                        {result.content.blogPost.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================== */}
              {/* TAB 5: Landing Page Code / Render preview */}
              {/* ============================================== */}
              {activeTab === 'landing' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-black/40 border border-white/10 rounded-xl p-2">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setLandingPreviewTab('web')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          landingPreviewTab === 'web' 
                            ? 'bg-violet-600 text-white' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Live Web View
                      </button>
                      <button 
                        onClick={() => setLandingPreviewTab('code')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          landingPreviewTab === 'code' 
                            ? 'bg-violet-600 text-white' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        Source Code View
                      </button>
                    </div>
                    <button 
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>

                  {/* Rendering */}
                  {landingPreviewTab === 'web' ? (
                    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                      {/* Responsive iframe wrapper */}
                      <div className="bg-black/60 px-4 py-2 border-b border-white/5 flex items-center justify-between text-xs text-gray-500">
                        <span className="font-mono">Sandboxed Secure Viewport (Tailwind Rendered)</span>
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-red-500/35 rounded-full"></span>
                          <span className="w-2 h-2 bg-yellow-500/35 rounded-full"></span>
                          <span className="w-2 h-2 bg-green-500/35 rounded-full"></span>
                        </div>
                      </div>
                      <iframe 
                        srcDoc={result.development.landingPageHtml}
                        sandbox="allow-scripts"
                        className="w-full h-[650px] bg-neutral-950"
                        title="Landing Page Live Preview"
                      />
                    </div>
                  ) : (
                    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
                      <div className="bg-black/60 px-4 py-2 border-b border-white/5 text-xs text-gray-500 font-mono">
                        development_landing_page.html
                      </div>
                      <pre className="bg-[#010103] p-6 text-[10px] font-mono text-gray-400 leading-relaxed overflow-auto h-[600px] whitespace-pre">
                        {result.development.landingPageHtml}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================== */}
              {/* TAB 6: Marketing Timeline */}
              {/* ============================================== */}
              {activeTab === 'gtm' && (
                <div className="space-y-6">
                  {/* Timeline cards */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-violet-500" />
                        Go-To-Market & Growth Execution Plan
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">Outlined by Marketing Agent.</p>
                    </div>

                    <div className="space-y-6">
                      {result.marketing.gtmTimeline.map((item, idx) => (
                        <div key={idx} className="relative p-5 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col md:flex-row gap-4 justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center font-mono font-bold text-sm">
                              W{idx+1}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">{item.week} Strategy</h4>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {item.channels.map((ch, idx2) => (
                                  <span key={idx2} className="text-[9px] font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded">
                                    {ch}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1 max-w-xl">
                            <ul className="space-y-1.5 text-xs text-gray-300 list-disc list-inside">
                              {item.tasks.map((task, idx3) => <li key={idx3} className="leading-relaxed">{task}</li>)}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SEO keywords */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-500" />
                        Target SEO Search Keywords
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.marketing.seoKeywords.map((kw, i) => (
                          <span key={i} className="text-xs font-mono border border-white/10 bg-white/5 text-gray-300 px-3 py-1.5 rounded-lg hover:border-violet-500/25 transition">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-500" />
                        Target Influencer Strategy
                      </h3>
                      <p className="text-xs text-gray-300 leading-relaxed font-light font-sans whitespace-pre-line bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                        {result.marketing.influencerStrategy}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================== */}
              {/* TAB 7: Investor Pitch Slide deck */}
              {/* ============================================== */}
              {activeTab === 'pitch' && (
                <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Presentation className="w-5 h-5 text-violet-500" />
                      10-Slide Investor Pitch Presentation
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">Structured slide deck layout formulated by Pitch Deck Agent.</p>
                  </div>

                  {/* Carousel / Slides render */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.pitchDeck.slides.map((slide) => (
                      <div key={slide.slideNo} className="border border-white/15 bg-neutral-900/60 rounded-xl p-5 hover:border-violet-500/20 transition flex flex-col justify-between h-[280px]">
                        <div>
                          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                            <span className="text-xs text-violet-400 font-mono">Slide {slide.slideNo} of 10</span>
                            <span className="text-[10px] text-gray-500 font-mono uppercase">Standard Deck Layout</span>
                          </div>
                          <h4 className="font-outfit font-bold text-white text-base mb-3">{slide.title}</h4>
                          <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                            {slide.bullets.map((b, idx) => <li key={idx} className="truncate">{b}</li>)}
                          </ul>
                        </div>
                        <div className="mt-4 pt-2 border-t border-white/5 bg-black/20 p-2 rounded text-[10px] text-gray-500 font-mono">
                          <span className="font-bold text-gray-400">Speaker Notes:</span> {slide.notes}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================== */}
              {/* TAB 8: Quality Review Audit */}
              {/* ============================================== */}
              {activeTab === 'review' && (
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-violet-500" />
                        Quality & Consistency Conflict Report
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">Cross-analyzed by Quality Review Agent looking for contradictions across agents.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl text-center">
                        <span className="block text-[10px] text-gray-500 font-mono uppercase">Consistency Rating</span>
                        <span className="text-4xl font-black text-white block mt-1">{result.review.consistencyScore}/100</span>
                      </div>
                      <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl text-center">
                        <span className="block text-[10px] text-gray-500 font-mono uppercase">Found Conflicts</span>
                        <span className="text-4xl font-black text-amber-400 block mt-1">{result.review.warnings.length} Alerts</span>
                      </div>
                      <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl text-center">
                        <span className="block text-[10px] text-gray-500 font-mono uppercase">Hallucination Risk</span>
                        <span className="text-4xl font-black text-emerald-400 block mt-1">{result.review.hallucinationRisk}</span>
                      </div>
                    </div>
                  </div>

                  {/* Warnings and solutions list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                        Identified Conflicts
                      </h3>
                      <div className="space-y-3">
                        {result.review.warnings.map((warn, i) => (
                          <div key={i} className="p-3.5 border border-amber-500/10 bg-amber-500/5 text-amber-200/90 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed">
                            <span className="font-bold font-mono text-amber-500">⚠️</span>
                            {warn}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        Strategic Remediation Steps
                      </h3>
                      <div className="space-y-3">
                        {result.review.recommendations.map((rec, i) => (
                          <div key={i} className="p-3.5 border border-emerald-500/10 bg-emerald-500/5 text-emerald-200/90 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed">
                            <span className="font-bold font-mono text-emerald-500">✓</span>
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================== */}
              {/* TAB 9: AI Boardroom Debate Table */}
              {/* ============================================== */}
              {activeTab === 'boardroom' && (
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <Award className="w-5 h-5 text-violet-500" />
                          Virtual AI Boardroom Roundtable
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Personas debate the business concept viability based on compiled metrics.</p>
                      </div>

                      {/* Score gauge */}
                      <div className="flex items-center gap-2 bg-violet-600/10 border border-violet-500/20 px-3 py-1 rounded-full text-violet-300 font-mono text-xs font-semibold">
                        Launch Score: {boardroomScore}/100
                      </div>
                    </div>

                    {/* Round-table layout view */}
                    <div className="flex flex-col md:flex-row gap-6 items-stretch">
                      
                      {/* Virtual Roundtable animated visual */}
                      <div className="flex-1 border border-white/5 bg-black/60 rounded-xl p-6 flex flex-col items-center justify-center relative min-h-[300px] overflow-hidden">
                        {/* Table disk */}
                        <div className="w-44 h-44 rounded-full border border-violet-500/30 bg-violet-950/10 relative flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.15)] animate-pulse-slow">
                          <span className="text-[10px] text-violet-400/80 font-mono font-bold tracking-widest uppercase">Roundtable</span>
                          
                          {/* Personas sitting at cardinal points */}
                          {/* CEO (Top) */}
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-violet-500/20">
                              CEO
                            </div>
                          </div>
                          {/* Investor (Right) */}
                          <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-amber-500/20">
                              INV
                            </div>
                          </div>
                          {/* Marketing (Bottom) */}
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-emerald-500/20">
                              MKT
                            </div>
                          </div>
                          {/* Tech (Left) */}
                          <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-indigo-500/20">
                              TEC
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Debate dialogue streams */}
                      <div className="flex-1 flex flex-col justify-between max-h-[350px] border border-white/5 bg-black/40 rounded-xl overflow-hidden">
                        <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
                          {debateHistory.map((talk, idx) => {
                            const isCEO = talk.persona === 'CEO';
                            const isInv = talk.persona === 'Investor' || talk.persona === 'INV';
                            const isMkt = talk.persona === 'Marketing' || talk.persona === 'MKT';
                            const isTec = talk.persona === 'Technical' || talk.persona === 'TEC';

                            let color = 'bg-violet-600/10 text-violet-400 border-violet-500/20';
                            let nameText = talk.persona;
                            if (isInv) { color = 'bg-amber-600/10 text-amber-400 border-amber-500/20'; nameText = 'Investor Agent'; }
                            if (isMkt) { color = 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'; nameText = 'Marketing Agent'; }
                            if (isTec) { color = 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20'; nameText = 'Technical Agent'; }
                            if (isCEO) { nameText = 'CEO Agent'; }

                            return (
                              <div key={idx} className="space-y-1">
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${color}`}>
                                  {nameText}
                                </span>
                                <p className="text-xs text-gray-300 pl-2 border-l border-white/5 py-1 leading-relaxed">
                                  {talk.statement}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Discussion trigger */}
                        <div className="bg-black/60 p-3 border-t border-white/5 flex gap-2">
                          <input 
                            type="text" 
                            value={boardroomQuestion}
                            onChange={e => setBoardroomQuestion(e.target.value)}
                            placeholder="Ask the boardroom a question..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                            onKeyDown={e => { if (e.key === 'Enter') handleDebate(); }}
                          />
                          <button 
                            onClick={handleDebate}
                            disabled={debateLoading}
                            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs tracking-wider flex items-center gap-1.5 transition disabled:opacity-55"
                          >
                            {debateLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Debate
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 mt-12 bg-black/40 text-center text-xs text-gray-600 font-mono">
        <p>FounderOS AI - Built for the Multi-Agent Business Orchestrator Hackathon 2026</p>
      </footer>
    </div>
  );
}

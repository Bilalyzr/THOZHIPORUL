import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, IconButton, TextField, Paper, Fab, Fade, Chip,
  Avatar, InputAdornment, Divider, Slide
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { keyframes } from '@emotion/react';

import aiLogo from '../assets/vazhiporul_ai_logo.png';
import fabIcon from '../assets/vazhiporul_fab_icon.png';

const pulse = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.08)}`;
const typing = keyframes`0%{opacity:.2}20%{opacity:1}100%{opacity:.2}`;
const float = keyframes`0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.03)}`;

// ─── FULL SITE KNOWLEDGE BASE ───
const SITE_KNOWLEDGE = {
  platform: {
    name: 'THOZHIRPORUL',
    fullName: 'Smart Industrial Monitoring System (SIMS)',
    by: 'NEXORA, Government of Tamil Nadu',
    desc: 'THOZHIRPORUL is the unified digital platform powering Tamil Nadu\'s industrial transformation through real-time monitoring, compliance tracking, and data-driven governance. It connects industries, government officers, and SIPCOT administrators on a single platform.',
  },
  roles: [
    { name: 'Admin', desc: 'Full system access — dashboards, user management, compliance engine, services tracker, analytics, parks explorer, reports, and settings.', loginPath: '/login/admin' },
    { name: 'Industry', desc: 'Workspace dashboard, data submission, compliance tracking, service requests (NOCs, land allotment), reports, and parks explorer.', loginPath: '/login/industry' },
    { name: 'Government Officer', desc: 'Command center with KPIs, parks explorer, services overview, compliance engine, analytics, and report center.', loginPath: '/login/govt' },
  ],
  pages: [
    { path: '/home', name: 'Home', desc: 'Landing page with platform overview, live statistics, capabilities showcase, and GIS parks teaser.', public: true, keywords: ['home','landing','main','start','welcome'] },
    { path: '/about', name: 'About THOZHIRPORUL', desc: 'Platform mission, architecture, team information, and technology stack details.', public: true, keywords: ['about','info','mission','team'] },
    { path: '/features', name: 'Capabilities', desc: 'Detailed breakdown of all platform features — monitoring, compliance, analytics, and unified gateway.', public: true, keywords: ['features','capabilities','what can'] },
    { path: '/parks', name: 'Industrial Parks (Public)', desc: 'GIS interactive map of 8+ industrial parks across Tamil Nadu with search, filters, satellite/terrain views, and plot availability overlays. Public users see basic info; logged-in users get investment, employment, and infrastructure data.', public: true, keywords: ['parks','industrial park','map','gis','explore','oragadam','hosur','siruseri'] },
    { path: '/contact', name: 'Contact & Support', desc: 'Helpdesk contact form, phone numbers, email, and office address for SIPCOT support.', public: true, keywords: ['contact','support','help','phone','email'] },
    { path: '/grievance', name: 'Public Grievance', desc: 'Submit grievances and complaints publicly. Track grievance status.', public: true, keywords: ['grievance','complaint','issue','problem'] },
    { path: '/role-selection', name: 'Portal Selection', desc: 'Choose your login portal — Admin, Industry, or Government Officer. Each has a dedicated login page.', public: true, keywords: ['login','sign in','portal','role','access'] },
    { path: '/registration', name: 'Industry Registration', desc: 'Register a new industry on the platform. Requires company name, type, location, contact details, and password.', public: true, keywords: ['register','sign up','new industry','create account'] },
    { path: '/govt-registration', name: 'Government Registration', desc: 'Register as a government officer with designation, department, jurisdiction, and official email.', public: true, keywords: ['govt register','officer register','government sign up'] },
    { path: '/admin-dashboard', name: 'Admin Dashboard', desc: 'KPIs (industries, investment, employment, power), growth charts, resource consumption comparisons, real-time electricity/water flow with tariffs, AI decision support, and workflow automation engine.', roles: ['admin'], keywords: ['admin','dashboard','overview','kpi'] },
    { path: '/command-center', name: 'Command Center', desc: 'Government-level command center with state-wide KPIs, district heatmap, park rankings, red-flag alerts, investment/employment trends, and real-time activity feed.', roles: ['admin','govt'], keywords: ['command','center','government','heatmap','alerts','rankings'] },
    { path: '/workspace', name: 'Industry Workspace', desc: 'Industry\'s personal dashboard — compliance score, recent submissions, document vault, lease information, and quick action buttons for data submission and service requests.', roles: ['industry'], keywords: ['workspace','my dashboard','industry home'] },
    { path: '/submit-data', name: 'Unified Data Submission', desc: 'Submit quarterly/annual data — financial (revenue, investment), employment, resource usage (water, power, waste), and CSR activities. Multi-step wizard form.', roles: ['industry'], keywords: ['submit','data','quarterly','annual','financial','employment','resource'] },
    { path: '/services', name: 'Services Tracker', desc: 'Track NOCs, land allotments, water/power connections, lease renewals, and more. Kanban board and table views. Industries can create new requests (including plot allotment with acreage). Admins can approve, update status, and allot specific plots.', roles: ['admin','govt','industry'], keywords: ['services','noc','allotment','land','plot','request','track','kanban'] },
    { path: '/compliance', name: 'Compliance Monitoring', desc: 'Industry\'s own compliance status — submission history, scores, violation alerts, and deadline tracking.', roles: ['industry'], keywords: ['compliance','my compliance','violations','score'] },
    { path: '/compliance-engine', name: 'Compliance Engine', desc: 'Admin/Govt compliance dashboard — violations by severity, industry scores, missing submissions, automated reminders, trend analysis, and predictive risk scoring.', roles: ['admin','govt'], keywords: ['compliance engine','violations','rules','enforce'] },
    { path: '/parks-explorer', name: 'Parks Explorer (Authenticated)', desc: 'Full-featured GIS parks explorer with detailed investment, employment, infrastructure metrics, and "Apply for Plot" button that pre-fills a land allotment request.', roles: ['admin','govt','industry'], keywords: ['parks explorer','plot','apply'] },
    { path: '/report-center', name: 'Report & Export Center', desc: 'Generate custom reports — select data categories, date ranges, and export as PDF/Excel/CSV. Template-based reporting.', roles: ['admin','govt','industry'], keywords: ['report','export','pdf','excel','csv','download'] },
    { path: '/analytics', name: 'Analytics Dashboard', desc: 'Visual analytics — charts, graphs, and trend analysis for industrial data across parks.', roles: ['admin','govt'], keywords: ['analytics','charts','trends','graphs'] },
    { path: '/user-management', name: 'User Management', desc: 'Admin panel to view, activate, deactivate, and manage all registered users (industries and govt officers).', roles: ['admin'], keywords: ['users','manage','activate','deactivate'] },
    { path: '/industry-profile', name: 'Company Profile', desc: 'View and edit industry profile — company details, contact info, park/plot assignment.', roles: ['industry'], keywords: ['profile','company','my info'] },
    { path: '/audit-logs', name: 'Audit Logs', desc: 'System-wide audit trail — track who did what and when across the platform.', roles: ['admin','govt'], keywords: ['audit','logs','history','trail'] },
    { path: '/settings', name: 'Settings', desc: 'Platform settings — notification preferences, theme, and system configuration.', roles: ['admin'], keywords: ['settings','preferences','config'] },
  ],
  workflows: [
    { name: 'Plot Allotment', steps: ['1. Industry logs in and goes to Parks Explorer or Services Tracker','2. Selects "Land Allotment" as service type','3. Chooses target Industrial Park and required area in acres','4. Submits the request (status: Applied)','5. Admin reviews the request in Services Tracker','6. Admin updates status through Document Review → Field Inspection → Approved','7. On approval, Admin selects a specific available plot from the park','8. System atomically updates plot status, industry profile, and completes the request'], path: '/services' },
    { name: 'Data Submission', steps: ['1. Industry logs in → Workspace → Submit Data','2. Fills multi-step form: Financial → Employment → Resources → CSR','3. Submits quarterly/annual data','4. System validates and records the submission','5. Compliance score automatically updates'], path: '/submit-data' },
    { name: 'Grievance Filing', steps: ['1. Go to Public Grievance page (no login required)','2. Fill in grievance details and contact info','3. Submit the grievance','4. Receive tracking number','5. Track status on the same page'], path: '/grievance' },
    { name: 'Industry Registration', steps: ['1. Go to Portal Selection → Industry Portal','2. Click "Register your industry"','3. Fill company name, type, location, contact, email, password','4. Submit registration','5. Login with your new credentials'], path: '/registration' },
  ],
  quickFacts: [
    '8 industrial parks across Tamil Nadu are tracked on the platform',
    'The platform supports 3 roles: Admin, Industry, and Government Officer',
    'GIS maps support Street, Satellite, and Terrain views',
    'Real-time electricity and water flow monitoring with government tariff rates',
    'AI Decision Support system helps admins prioritize critical actions',
    'Compliance engine auto-detects violations based on 8 predefined rules',
    'Services Tracker supports Kanban board and Table views',
  ]
};

function findBestResponse(input, isLoggedIn, currentPath) {
  const q = input.toLowerCase().trim();
  const nav = (path) => ({ path });

  // Current Page Context
  if (/(tell me about (this )?page|where am i|what is this page|explain this page)/.test(q)) {
    const page = SITE_KNOWLEDGE.pages.find(p => p.path === currentPath);
    if (page) {
       if (!page.public && !isLoggedIn) {
          return { text: `You are on the **${page.name}** page. This is a restricted internal page. I cannot provide inside details while you are logged out.\n\nHowever, here is what the roles can do generally:\n• **Admin**: Full system access, dashboards, compliance engine.\n• **Industry**: Submit data, track compliance, request services.\n• **Govt Officer**: Monitor park KPIs and violations.`, suggestions: ['How to login?', 'What is this platform?'] };
       }
       const roleInfo = page.public ? '🌐 *Public page — no login required*' : `🔒 *Requires: ${page.roles.join(', ')} role*`;
       return { text: `You are currently on the **${page.name}** page.\n\n${page.desc}\n\n${roleInfo}`, suggestions: ['Show all pages', 'How to use this platform?'] };
    }
    return { text: `I'm not exactly sure which page you're on right now (URL: \`${currentPath}\`), but I can tell you about the platform in general!`, suggestions: ['What is this platform?', 'Show all pages'] };
  }

  // Greetings
  if (/^(hi|hello|hey|greetings|good\s?(morning|evening|afternoon))/.test(q)) {
    return { text: `Hello! 👋 I'm **VazhiPorul AI**, your intelligent assistant for the THOZHIRPORUL platform. I can help you:\n\n• Navigate to any page\n• Explain features & workflows\n• Guide you through processes\n• Answer questions about the platform\n\nWhat would you like to know?`, suggestions: ['How to apply for a plot?', 'Show me industrial parks', 'What is this platform?'] };
  }

  // What is this platform
  if (/what (is|are).*(platform|thozhirporul|sims|site|website|system)/.test(q) || /tell me about/.test(q)) {
    const p = SITE_KNOWLEDGE.platform;
    return { text: `**${p.name}** — ${p.fullName}\n\n${p.desc}\n\n*Built by ${p.by}*`, suggestions: ['What roles are available?', 'Show me features', 'How to login?'] };
  }

  // Roles
  if (/role|who can use|user types|access level/.test(q)) {
    const roleText = SITE_KNOWLEDGE.roles.map(r => `• **${r.name}**: ${r.desc}`).join('\n');
    return { text: `THOZHIRPORUL has 3 user roles:\n\n${roleText}`, suggestions: ['How to register?', 'Login as Admin', 'Login as Industry'] };
  }

  // Dynamic page access / login instructions
  if (/(how.*access|access.*how|how.*login.*to|how.*go.*to)/.test(q)) {
    for (const page of SITE_KNOWLEDGE.pages) {
      for (const kw of page.keywords) {
        if (q.includes(kw) || (page.name.toLowerCase().includes(q.replace(/(how.*access|access.*how|how.*login.*to|how.*go.*to)/g, '').trim()))) {
          if (page.public) {
            return { text: `**Accessing ${page.name}**\n\nThis is a public page. You do not need to log in. Just click the button below to go there immediately.`, suggestions: ['Take me there'], ...nav(page.path) };
          }
          
          if (!isLoggedIn) {
             return { text: `**${page.name}** is a restricted internal page. As you are not logged in, I cannot provide inside details about how this page looks or works.\n\nHowever, here is what the roles can do generally:\n• **Admin**: Full system access, dashboards, compliance engine.\n• **Industry**: Submit data, track compliance, request services.\n• **Govt Officer**: Monitor park KPIs and violations.`, suggestions: ['How to login?', 'What is this platform?'] };
          }

          let loginSteps = '';
          if (page.roles.includes('admin')) {
             loginSteps += `**Admin Access:**\n1. Go to Portal Selection → Admin Portal\n2. Login with Admin credentials\n3. Navigate to ${page.name}\n\n`;
          }
          if (page.roles.includes('industry')) {
             loginSteps += `**Industry Access:**\n1. Go to Portal Selection → Industry Portal\n2. Login with Industry credentials\n3. Navigate to ${page.name}\n\n`;
          }
          if (page.roles.includes('govt')) {
             loginSteps += `**Government Access:**\n1. Go to Portal Selection → Government Portal\n2. Login with Government credentials\n3. Navigate to ${page.name}\n\n`;
          }

          return { text: `**How to access ${page.name}:**\n\nThis page is restricted. Here is the workflow to access it:\n\n${loginSteps.trim()}`, suggestions: ['Take me there'], ...nav(page.path) };
        }
      }
    }
  }

  // Workflow queries
  for (const wf of SITE_KNOWLEDGE.workflows) {
    const wfName = wf.name.toLowerCase();
    if (q.includes(wfName) || (wfName === 'plot allotment' && /(plot|allot|land|apply.*plot|buy.*plot|how.*apply)/.test(q))) {
      return { text: `**${wf.name} Workflow:**\n\n${wf.steps.join('\n')}`, suggestions: ['Take me there', 'What other workflows exist?'], ...nav(wf.path) };
    }
  }

  // Page navigation — match by keywords
  for (const page of SITE_KNOWLEDGE.pages) {
    for (const kw of page.keywords) {
      if (q.includes(kw) || (kw.length > 3 && q.split(/\s+/).some(w => w.includes(kw)))) {
        if (!page.public && !isLoggedIn) {
           return { text: `**${page.name}** is a restricted internal page. I cannot provide inside details while you are logged out.\n\nHowever, here is what the roles can do generally:\n• **Admin**: Full system access, dashboards, compliance engine.\n• **Industry**: Submit data, track compliance, request services.\n• **Govt Officer**: Monitor park KPIs and violations.`, suggestions: ['How to login?', 'What is this platform?'] };
        }
        const roleInfo = page.public ? '🌐 *Public page — no login required*' : `🔒 *Requires: ${page.roles.join(', ')} role*`;
        return { text: `**${page.name}**\n\n${page.desc}\n\n${roleInfo}`, suggestions: ['Take me there', 'Tell me more'], ...nav(page.path) };
      }
    }
  }

  // Navigation commands
  if (/^(go to|take me|navigate|open|show|visit)\s/.test(q)) {
    const target = q.replace(/^(go to|take me to|navigate to|open|show me|visit)\s*/i, '').trim();
    for (const page of SITE_KNOWLEDGE.pages) {
      if (page.name.toLowerCase().includes(target) || page.keywords.some(k => target.includes(k))) {
        return { text: `Taking you to **${page.name}**... 🚀`, ...nav(page.path), autoNavigate: true };
      }
    }
    return { text: `I couldn't find a page matching "${target}". Here are some options:`, suggestions: ['Home', 'Industrial Parks', 'Services Tracker', 'Login'] };
  }

  // All pages / what can I do
  if (/all pages|what can i (do|see|access)|site map|sitemap|list.*pages/.test(q)) {
    const role = localStorage.getItem('role');
    const available = SITE_KNOWLEDGE.pages.filter(p => p.public || (isLoggedIn && (!p.roles || p.roles.includes(role))));
    const pageList = available.slice(0, 10).map(p => `• **${p.name}** → \`${p.path}\``).join('\n');
    return { text: `Here are the pages you can access:\n\n${pageList}`, suggestions: ['Take me to Home', 'Show industrial parks'] };
  }

  // Quick facts
  if (/fact|did you know|interesting|stats|statistics/.test(q)) {
    const fact = SITE_KNOWLEDGE.quickFacts[Math.floor(Math.random() * SITE_KNOWLEDGE.quickFacts.length)];
    return { text: `💡 **Did you know?**\n\n${fact}`, suggestions: ['Another fact', 'What is this platform?'] };
  }

  // How to use
  if (/how.*(use|start|begin|get started)/.test(q)) {
    return { text: `**Getting Started with THOZHIRPORUL:**\n\n1. Visit the **Home** page to learn about the platform\n2. Go to **Portal Selection** to choose your role\n3. **Register** if you're new, or **Login** with existing credentials\n4. Access your role-specific dashboard\n5. Use the sidebar to navigate between features\n\n*Non-registered users can still explore Industrial Parks, Features, and file Grievances!*`, suggestions: ['How to register?', 'Show me parks', 'Login'] };
  }

  // Help
  if (/help|what can you do|how.*work|assist/.test(q)) {
    return { text: `I can help you with:\n\n🗺️ **Navigate** — "Take me to Parks Explorer"\n📋 **Explain** — "What is the Compliance Engine?"\n🔄 **Workflows** — "How to apply for a plot?"\n👥 **Roles** — "What can an admin do?"\n📊 **Facts** — "Tell me a fact"\n🔗 **Quick Links** — "Show me all pages"\n\nJust type naturally and I'll understand!`, suggestions: ['How to apply for a plot?', 'Show all pages', 'What roles exist?'] };
  }

  // Fallback
  return { text: `I'm not sure about that. Try asking me:\n\n• "What is THOZHIRPORUL?"\n• "How to apply for a plot?"\n• "Take me to the services tracker"\n• "What pages can I access?"`, suggestions: ['What is this platform?', 'Help', 'Show all pages'] };
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm **VazhiPorul AI** 🤖\n\nI'm your intelligent guide for the THOZHIRPORUL platform. Ask me anything — I can navigate you to any page, explain workflows, or answer your questions!", suggestions: ['What is this platform?', 'How to apply for a plot?', 'Show industrial parks'] }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput('');

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    setTimeout(() => {
      const response = findBestResponse(userMsg, !!localStorage.getItem('token'), location.pathname);
      setMessages(prev => [...prev, { role: 'ai', ...response }]);
      setIsTyping(false);

      if (response.autoNavigate && response.path) {
        setTimeout(() => navigate(response.path), 800);
      }
    }, 600 + Math.random() * 400);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMessages(prev => [...prev, { role: 'ai', text: `✅ Navigated to **${path}** successfully!` }]);
  };

  const renderMarkdown = (text) => {
    return text.split('\n').map((line, i) => {
      let html = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:#e8f5e9;padding:1px 4px;border-radius:3px;font-size:0.8em">$1</code>');
      return <Typography key={i} variant="body2" sx={{ lineHeight: 1.6, mb: line ? 0.3 : 0.8 }} dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />;
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        onClick={() => setOpen(!open)}
        sx={{
          position: 'fixed', bottom: { xs: 20, md: 28 }, right: { xs: 20, md: 28 },
          zIndex: 9999, width: 60, height: 60,
          background: open ? 'linear-gradient(135deg, #d32f2f, #f44336)' : 'linear-gradient(135deg, #1F4E79, #2E7D32)',
          boxShadow: open ? '0 6px 24px rgba(211,47,47,0.4)' : '0 6px 28px rgba(31,78,121,0.5)',
          animation: !open ? `${pulse} 2s infinite` : 'none',
          '&:hover': { transform: 'scale(1.08)', boxShadow: '0 8px 32px rgba(31,78,121,0.6)' },
          transition: 'all 0.3s ease',
        }}
      >
        {open ? <CloseIcon sx={{ color: 'white', fontSize: 26 }} /> : <img src={fabIcon} alt="AI" style={{ width: 44, height: 44, mixBlendMode: 'screen', objectFit: 'contain', animation: `${float} 3s ease-in-out infinite` }} />}
      </Fab>

      {/* Chat Window */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper elevation={20} sx={{
          position: 'fixed', bottom: { xs: 90, md: 100 }, right: { xs: 12, md: 28 },
          width: { xs: 'calc(100vw - 24px)', sm: 400 }, maxHeight: { xs: '70vh', md: 560 },
          zIndex: 9998, borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          border: '1px solid rgba(31,78,121,0.15)',
        }}>
          {/* Header */}
          <Box sx={{
            background: 'linear-gradient(135deg, #0f172a, #1F4E79)', color: 'white',
            px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 40, height: 40 }}>
              <AutoAwesomeIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>VazhiPorul AI</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>THOZHIRPORUL Intelligent Assistant</Typography>
            </Box>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4CAF50', boxShadow: '0 0 8px #4CAF50' }} />
          </Box>

          {/* Messages */}
          <Box sx={{
            flex: 1, overflowY: 'auto', px: 2, py: 1.5,
            background: 'linear-gradient(180deg, #f8fafc, #f1f5f9)',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 2 },
          }}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', mb: 1.5 }}>
                <Box sx={{
                  maxWidth: '88%', p: 1.5, borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  bgcolor: msg.role === 'user' ? '#1F4E79' : 'white',
                  color: msg.role === 'user' ? 'white' : 'text.primary',
                  boxShadow: msg.role === 'user' ? '0 2px 8px rgba(31,78,121,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                  border: msg.role === 'ai' ? '1px solid #e2e8f0' : 'none',
                }}>
                  {renderMarkdown(msg.text)}

                  {/* Navigation button */}
                  {msg.path && !msg.autoNavigate && (
                    <Chip
                      icon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                      label={`Go to ${msg.path}`}
                      size="small"
                      onClick={() => handleNavigate(msg.path)}
                      sx={{
                        mt: 1, cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem',
                        bgcolor: '#e8f5e9', color: '#2E7D32', border: '1px solid #c8e6c9',
                        '&:hover': { bgcolor: '#c8e6c9' },
                      }}
                    />
                  )}

                  {/* Suggestions */}
                  {msg.suggestions && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {msg.suggestions.map((s, j) => (
                        <Chip key={j} label={s} size="small" variant="outlined"
                          onClick={() => {
                            if (s === 'Take me there' && msg.path) {
                              handleNavigate(msg.path);
                            } else {
                              handleSend(s);
                            }
                          }}
                          sx={{
                            cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600,
                            borderColor: '#1F4E79', color: '#1F4E79',
                            '&:hover': { bgcolor: '#1F4E79', color: 'white' },
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            ))}

            {isTyping && (
              <Box sx={{ display: 'flex', gap: 0.5, p: 1.5, mb: 1 }}>
                {[0, 1, 2].map(i => (
                  <Box key={i} sx={{
                    width: 8, height: 8, borderRadius: '50%', bgcolor: '#94a3b8',
                    animation: `${typing} 1s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box sx={{ p: 1.5, bgcolor: 'white', borderTop: '1px solid #e2e8f0' }}>
            <TextField
              inputRef={inputRef}
              fullWidth size="small" placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3, bgcolor: '#f8fafc',
                  '&:hover': { bgcolor: '#f1f5f9' },
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleSend()} disabled={!input.trim()} size="small"
                      sx={{ bgcolor: input.trim() ? '#1F4E79' : 'transparent', color: input.trim() ? 'white' : 'text.disabled',
                        '&:hover': { bgcolor: '#2E7D32' }, transition: 'all 0.2s' }}>
                      <SendIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.5, color: 'text.disabled', fontSize: '0.6rem' }}>
              Powered by VazhiPorul AI • THOZHIRPORUL Platform
            </Typography>
          </Box>
        </Paper>
      </Slide>
    </>
  );
}

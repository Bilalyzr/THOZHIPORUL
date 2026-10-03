import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assistantService } from '../services/api';
import {
  Box, Typography, IconButton, TextField, Paper, Fab, Fade, Chip,
  Avatar, InputAdornment, Divider, Slide, Tooltip
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { keyframes } from '@emotion/react';

import fabIcon from '../assets/vazhiporul_fab_icon.png';

const pulse = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.08)}`;
const typing = keyframes`0%{opacity:.2}20%{opacity:1}100%{opacity:.2}`;
const float = keyframes`0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.03)}`;
const pulseGreen = keyframes`
  0% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// VAZHIPORUL AI - COMPREHENSIVE SIPCOT KNOWLEDGE BASE v2.0
// ═══════════════════════════════════════════════════════════════════════════════
// The former ~480-line static knowledge base (with hardcoded park
// statistics that could contradict the live dashboards) was REMOVED
// 2026-10-03. The chatbot's PRIMARY path is the real DB-backed
// assistant (POST /api/assistant/chat — RBAC-scoped live data). This
// minimal fallback only covers the "API unreachable / signed out" case
// and fabricates nothing.
function findBestResponse(input, isLoggedIn) {
  const q = input.toLowerCase().trim();

  // Simple navigation intents remain useful offline.
  const navTargets = [
    { match: /park|gis|map/, path: '/parks-explorer', label: 'Parks Explorer' },
    { match: /submit|file|filing|return/, path: '/submit-data', label: 'Submit Data' },
    { match: /compliance|violation/, path: '/compliance-engine', label: 'Compliance Engine' },
    { match: /service|noc|request/, path: '/services', label: 'Services' },
    { match: /report/, path: '/report-center', label: 'Report Center' },
    { match: /grievance|complaint/, path: '/grievance-portal', label: 'Grievance Portal' },
  ];
  for (const t of navTargets) {
    if (t.match.test(q)) {
      return {
        text: `I can take you to **${t.label}**. For data questions (scores, non-filers, forecasts, anomalies), I need the live assistant — please sign in or try again once the server is reachable.`,
        suggestions: ['What is my compliance score?', 'Who has not submitted data?'],
        autoNavigate: true, path: t.path
      };
    }
  }

  return {
    text: isLoggedIn
      ? `_Live assistant unavailable (offline?) — I can't answer data questions without it. Try again in a moment, or use the menu to navigate._`
      : `Please **sign in** so I can answer from your live data (scores, filings, violations, forecasts). Without a session I can only help you navigate.`,
    suggestions: isLoggedIn ? ['What is my compliance score?', 'Any deadlines?'] : ['Take me to login']
  };
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const navigate = useNavigate();

  // Seed the greeting ONLY when the chat is first opened with no history.
  // Previously this ran on every open, wiping the conversation — now the
  // greeting is added only once (when messages is empty), so reopening the
  // panel keeps your prior conversation intact.
  const seedGreeting = () => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');
    const role = localStorage.getItem('role');
    const initialText = (token && name)
      ? `Welcome back **${name}**! 👋\n\nI'm **VazhiPorul AI** - your SIPCOT intelligent assistant.\n\nAs a **${role || 'user'}**, I can help you:\n• Navigate to your dashboard\n• Track services and compliance\n• Answer questions about SIPCOT\n• Find information about parks and schemes`
      : `👋 Welcome to **THOZHIRPORUL**!\n\nI'm **VazhiPorul AI** - your SIPCOT intelligent assistant.\n\nI can help you:\n• Explore our 6 industrial parks\n• Understand services like NOCs and plot allotment\n• Learn about compliance and incentives\n• Navigate to any page`;
    setMessages([
      {
        role: 'ai',
        text: initialText,
        suggestions: ['Show industrial parks', 'How to apply for plot?', 'Available services']
      }
    ]);
  };

  useEffect(() => {
    if (open && messages.length === 0) seedGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset the conversation back to a fresh greeting.
  const handleClearChat = () => {
    setIsTyping(false);
    setInput('');
    seedGreeting();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // PRIMARY: the REAL DB-backed assistant (RBAC-scoped live data — scores,
  // violations, non-filers, anomalies, forecasts). The static knowledge base
  // below is only a labelled fallback for general-info questions when the
  // API is unreachable or the user isn't signed in.
  const handleSend = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, ts: new Date() }]);
    setIsTyping(true);

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await assistantService.chat(userMsg);
        const reply = res.data && res.data.reply;
        if (reply && reply.text) {
          setMessages(prev => [...prev, {
            role: 'ai', ts: new Date(),
            text: reply.text + '\n\n_VazhiPorul Assistant · live data, scoped to your role_',
            suggestions: reply.suggestions || []
          }]);
          setIsTyping(false);
          return;
        }
      } catch {
        // fall through to static KB with an honest label
        setMessages(prev => [...prev, {
          role: 'ai', ts: new Date(),
          text: '_Live assistant unavailable (offline?) — answering from the general knowledge base only._',
        }]);
      }
    }

    // Fallback: static knowledge base (general info; NOT live data).
    const response = findBestResponse(userMsg, !!token);
    setMessages(prev => [...prev, { role: 'ai', ts: new Date(), source: 'knowledge-base', ...response }]);
    setIsTyping(false);

    if (response.autoNavigate && response.path) {
      setTimeout(() => navigate(response.path), 800);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMessages(prev => [...prev, { role: 'ai', text: `✅ Navigated to **${path}** successfully!` }]);
  };

  // Escape HTML entities BEFORE the markdown transforms run. Message text
  // can include user-controlled content (e.g. the account/company name in
  // the greeting, or self-typed chat input), and without this step the
  // dangerouslySetInnerHTML sink below would execute injected HTML/JS.
  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const renderMarkdown = (text) => {
    return String(text || '').split('\n').map((line, i) => {
      let html = escapeHtml(line)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(16,185,129,0.15);color:#34D399;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.85em">$1</code>');
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
          zIndex: 9900, width: 60, height: 60,
          background: open ? 'linear-gradient(135deg, #0f172a, #1e293b)' : 'linear-gradient(135deg, #10B981, #1F4E79)',
          boxShadow: open ? '0 6px 24px rgba(15,23,42,0.4)' : '0 6px 28px rgba(16,185,129,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          animation: !open ? `${pulse} 2s infinite` : 'none',
          '&:hover': { transform: 'scale(1.08)', boxShadow: '0 8px 32px rgba(16,185,129,0.5)' },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {open ? <CloseIcon sx={{ color: 'white', fontSize: 26 }} /> : (
          <Box sx={{
            width: 44, height: 44, borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.95)',
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.3)',
            animation: `${float} 3s ease-in-out infinite`,
          }}>
            <img src={fabIcon} alt="AI Assistant" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          </Box>
        )}
      </Fab>

      {/* Chat Window */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper sx={{
          position: 'fixed', bottom: { xs: 90, md: 100 }, right: { xs: 12, md: 28 },
          width: { xs: 'calc(100vw - 24px)', sm: 400 }, maxHeight: { xs: '70vh', md: 560 },
          zIndex: 9899, borderRadius: 5, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(30px)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}>
          {/* Header */}
          <Box sx={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(31, 78, 121, 0.7))',
            color: 'white',
            px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5,
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', width: 40, height: 40, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <AutoAwesomeIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.2, letterSpacing: '-0.01em' }}>VazhiPorul AI</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.7rem' }}>THOZHIRPORUL Intelligent Assistant</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981',
                boxShadow: '0 0 8px #10B981',
                animation: `${pulseGreen} 2s infinite ease-in-out`,
                mr: 0.5,
              }} />
              <Tooltip title="Clear conversation">
                <IconButton size="small" onClick={handleClearChat} sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: '#34D399', bgcolor: 'rgba(16,185,129,0.12)' } }}>
                  <RestartAltIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>

          {/* Messages */}
          <Box sx={{
            flex: 1, overflowY: 'auto', px: 2.5, py: 2,
            background: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(7, 11, 19, 0.5) 100%)',
            '&::-webkit-scrollbar': { width: 5 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255, 255, 255, 0.12)', borderRadius: 2.5 },
          }}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', mb: 2 }}>
                <Box sx={{
                  maxWidth: '85%', p: 1.8, borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  bgcolor: msg.role === 'user' ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255, 255, 255, 0.04)',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255, 255, 255, 0.04)',
                  color: msg.role === 'user' ? 'white' : 'rgba(255,255,255,0.92)',
                  boxShadow: msg.role === 'user' ? '0 4px 12px rgba(16,185,129,0.2)' : '0 4px 12px rgba(0,0,0,0.15)',
                  border: '1px solid',
                  borderColor: msg.role === 'user' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                }}>
                  {renderMarkdown(msg.text)}

                  {/* Navigation button */}
                  {msg.path && !msg.autoNavigate && (
                    <Chip
                      icon={<ArrowForwardIcon sx={{ fontSize: 13, color: '#10B981 !important' }} />}
                      label={`Go to ${msg.path}`}
                      size="small"
                      onClick={() => handleNavigate(msg.path)}
                      sx={{
                        mt: 1.5, cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem',
                        bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.25)',
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.2)', transform: 'translateY(-1px)' },
                      }}
                    />
                  )}

                  {/* Suggestions */}
                  {msg.suggestions && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1.5 }}>
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
                            cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700,
                            borderColor: 'rgba(16, 185, 129, 0.35)', color: '#34D399',
                            bgcolor: 'rgba(16, 185, 129, 0.04)',
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: '#10B981', color: 'white', borderColor: '#10B981', transform: 'translateY(-1px)' },
                          }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Timestamp */}
                  {msg.ts && (
                    <Typography variant="caption" sx={{ display: 'block', textAlign: msg.role === 'user' ? 'right' : 'left', mt: 0.6, fontSize: '0.6rem', color: msg.role === 'user' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}>
                      {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}

            {isTyping && (
              <Box sx={{ display: 'flex', gap: 0.6, p: 1.5, mb: 1, bgcolor: 'rgba(255,255,255,0.03)', width: 'fit-content', borderRadius: '12px 12px 12px 4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                {[0, 1, 2].map(i => (
                  <Box key={i} sx={{
                    width: 7, height: 7, borderRadius: '50%', bgcolor: '#10B981',
                    animation: `${typing} 1s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, bgcolor: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {/* Quick-start prompts — only when the conversation is just the greeting */}
            {messages.length <= 1 && !isTyping && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5 }}>
                {[
                  { label: '🏭 Parks', q: 'Show industrial parks' },
                  { label: '📋 Services', q: 'Available services' },
                  { label: '📊 Compliance', q: 'What is compliance score?' },
                  { label: '📞 Contact', q: 'How to contact SIPCOT?' },
                ].map((p) => (
                  <Chip
                    key={p.q}
                    label={p.label}
                    size="small"
                    onClick={() => handleSend(p.q)}
                    sx={{
                      cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700,
                      bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: 'rgba(16,185,129,0.15)', color: '#34D399', borderColor: 'rgba(16,185,129,0.4)' },
                    }}
                  />
                ))}
              </Box>
            )}
            <TextField
              inputRef={inputRef}
              fullWidth size="small" placeholder="Ask VazhiPorul AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3.5,
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s',
                  '& fieldset': { border: 'none' },
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)' },
                  '&.Mui-focused': { bgcolor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(16, 185, 129, 0.35)' }
                },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255, 255, 255, 0.45)', opacity: 1 }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleSend()} disabled={!input.trim()} size="small"
                      sx={{
                        bgcolor: input.trim() ? '#10B981' : 'transparent',
                        color: input.trim() ? 'white' : 'rgba(255, 255, 255, 0.25)',
                        '&:hover': { bgcolor: '#059669', transform: 'scale(1.05)' },
                        '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.15)', bgcolor: 'transparent' },
                        transition: 'all 0.2s',
                        p: 0.8
                      }}>
                      <SendIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.8, color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.05em' }}>
              Powered by VazhiPorul AI • THOZHIRPORUL Platform
            </Typography>
          </Box>
        </Paper>
      </Slide>
    </>
  );
}

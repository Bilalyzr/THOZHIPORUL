import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assistantService } from '../services/api';
import {
  Box, Typography, IconButton, TextField, Paper, Fab, Fade, Chip,
  Avatar, InputAdornment, Tooltip
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HistoryIcon from '@mui/icons-material/History';
import { keyframes } from '@emotion/react';

const pulse = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.08)}`;
const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}`;
const slideUp = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`;

// Tamil Unicode range detection (U+0B80–U+0BFF)
const isTamil = (text) => /[\u0B80-\u0BFF]/.test(text);

const NAV_TARGETS = [
  { match: /park|gis|map/, path: '/parks-explorer', label: 'Parks Explorer' },
  { match: /submit|file|filing/, path: '/submit-data', label: 'Submit Data' },
  { match: /compliance|violation/, path: '/compliance-engine', label: 'Compliance Engine' },
  { match: /agent|ai center|forecast/, path: '/agent-center', label: 'VazhiPorul AI Center' },
];

const DEFAULT_SUGGESTIONS = [
  'What is my compliance score?',
  'Show me anomalies',
  'What is the total investment?',
  'Projected power demand next 4 quarters?',
];

export default function AIChatbot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ai_chat_history') || '[]'); } catch { return []; }
  });
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const saveHistory = (q) => {
    const next = [{ q, at: new Date().toISOString() }, ...history.filter(h => h.q !== q)].slice(0, 5);
    setHistory(next);
    sessionStorage.setItem('ai_chat_history', JSON.stringify(next));
  };

  const handleSend = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, ts: new Date() }]);
    setIsTyping(true);

    const token = localStorage.getItem('token');
    const langNote = isTamil(userMsg) ? '\n\n_(Tamil detected — answering in English; Tamil model output requires a configured LLM runtime)_' : '';

    if (token) {
      try {
        const res = await assistantService.chat(userMsg);
        const reply = res.data?.reply;
        if (reply?.text) {
          saveHistory(userMsg);
          setMessages(prev => [...prev, {
            role: 'ai', ts: new Date(),
            text: reply.text + langNote,
            suggestions: reply.suggestions || DEFAULT_SUGGESTIONS.slice(0, 2)
          }]);
          setIsTyping(false);
          return;
        }
      } catch {
        setMessages(prev => [...prev, { role: 'ai', ts: new Date(),
          text: '_Live assistant unavailable — I can only help you navigate. Please sign in for data questions._' }]);
        setIsTyping(false);
        return;
      }
    }

    for (const t of NAV_TARGETS) {
      if (t.match.test(userMsg.toLowerCase())) {
        setMessages(prev => [...prev, { role: 'ai', ts: new Date(),
          text: `I can take you to **${t.label}**. Sign in for data questions.`,
          suggestions: DEFAULT_SUGGESTIONS.slice(0, 2) }]);
        setIsTyping(false);
        setTimeout(() => navigate(t.path), 800);
        return;
      }
    }

    setMessages(prev => [...prev, { role: 'ai', ts: new Date(),
      text: token
        ? '_I couldn\'t answer that. Try asking about compliance, anomalies, investment, or forecasts._'
        : 'Please **sign in** so I can answer from your live data.' }]);
    setIsTyping(false);
  };

  const renderMessage = (msg, idx) => {
    const isUser = msg.role === 'user';
    return (
      <Fade in key={idx}>
        <Box sx={{
          display: 'flex', gap: 1.5, mb: 2,
          flexDirection: isUser ? 'row-reverse' : 'row',
          animation: `${slideUp} 0.3s ease-out`,
        }}>
          <Avatar sx={{
            width: 32, height: 32, flexShrink: 0,
            bgcolor: isUser ? 'primary.main' : 'secondary.main',
            fontSize: 14,
          }}>
            {isUser ? '👤' : <SmartToyIcon sx={{ fontSize: 18 }} />}
          </Avatar>
          <Paper elevation={0} sx={{
            maxWidth: '78%', px: 2, py: 1.5, borderRadius: 3,
            bgcolor: isUser ? 'primary.main' : 'grey.100',
            color: isUser ? 'white' : 'text.primary',
          }}>
            <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {msg.text}
            </Typography>
            {msg.suggestions && !isUser && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                {msg.suggestions.map(s => (
                  <Chip key={s} label={s} size="small" variant="outlined"
                    onClick={() => handleSend(s)}
                    sx={{ fontSize: '0.68rem', height: 22, borderColor: 'divider' }} />
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      </Fade>
    );
  };

  if (!open) {
    return (
      <Tooltip title="VazhiPorul AI Assistant" placement="left">
        <Fab
          color="secondary"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 1300,
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #1F4E79, #2E7D32)',
            animation: `${float} 3s ease-in-out infinite`,
            '&:hover': { transform: 'scale(1.1)' },
            transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 8px 32px rgba(31,78,121,0.4)',
          }}
        >
          <AutoAwesomeIcon sx={{ color: 'white', fontSize: 26 }} />
        </Fab>
      </Tooltip>
    );
  }

  return (
    <Fade in>
      <Paper elevation={8} sx={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1300,
        width: { xs: 'calc(100vw - 48px)', sm: 400 },
        height: { xs: '70vh', sm: 560 },
        maxHeight: 560, borderRadius: 4, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)',
      }}>
        <Box sx={{
          p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
          background: 'linear-gradient(135deg, #1F4E79, #143656)',
          color: 'white',
        }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>
            <AutoAwesomeIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>VazhiPorul AI</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.65rem' }}>
              {isTyping ? 'Thinking…' : 'Industrial intelligence assistant'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{
          flex: 1, overflowY: 'auto', p: 2,
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
        }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AutoAwesomeIcon sx={{ fontSize: 48, color: '#1F4E79', opacity: 0.3, mb: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ask about compliance, anomalies, investment, forecasts, or missing filings.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
              {DEFAULT_SUGGESTIONS.map(s => (
                <Chip key={s} label={s} size="small" variant="outlined" onClick={() => handleSend(s)}
                  sx={{ fontSize: '0.72rem', mb: 0.5, borderColor: 'rgba(31,78,121,0.2)', color: '#1F4E79' }} />
              ))}
            </Box>
            {history.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center', mb: 1 }}>
                  <HistoryIcon sx={{ fontSize: 12 }} /> Recent
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {history.slice(0, 3).map((h, i) => (
                    <Chip key={i} label={h.q.slice(0, 25)} size="small"
                      onClick={() => handleSend(h.q)}
                      sx={{ fontSize: '0.65rem', height: 20 }} />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          messages.map(renderMessage)
        )}
        {isTyping && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
              <SmartToyIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <Paper elevation={0} sx={{ px: 2, py: 1.5, borderRadius: 3, bgcolor: 'grey.100' }}>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {[0, 1, 2].map(i => (
                  <Box key={i} sx={{
                    width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.disabled',
                    animation: `${pulse} 1s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </Box>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
        </Box>

        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
          <TextField
            fullWidth size="small" placeholder="Ask about your data…"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            inputRef={inputRef}
            disabled={isTyping}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" color="secondary" onClick={() => handleSend()} disabled={isTyping || !input.trim()}>
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 3 },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
            }}
          />
        </Box>
      </Paper>
    </Fade>
  );
}

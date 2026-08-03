import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent,
  Box, IconButton, Typography, Switch, Tooltip, Chip, Divider, Button,
  InputAdornment, TextField
} from '@mui/material';
import {
  AccessibilityNew, Close, FormatSize, TextFormat, FormatLineSpacing,
  Spellcheck, Psychology, InvertColors, Contrast, Palette,
  Link, VolumeUp, Mouse, PlayDisabled, HideImage, Refresh,
  Visibility, Hearing, TouchApp, Bolt, Check, Search
} from '@mui/icons-material';

// ─── Category metadata ──────────────────────────────────────────
const CATEGORIES = [
  { key: 'vision', label: 'Vision', icon: '👁', color: '#1F4E79', desc: 'Text, color & contrast' },
  { key: 'cognitive', label: 'Cognitive', icon: '🧠', color: '#7B1FA2', desc: 'Focus & readability' },
  { key: 'motor', label: 'Motor', icon: '✋', color: '#E65100', desc: 'Cursor & animation' },
  { key: 'audio', label: 'Audio', icon: '🔊', color: '#2E7D32', desc: 'Sound output' },
];

// ─── Preset profiles ────────────────────────────────────────────
const PRESETS = {
  lowVision: ['biggerText', 'contrastMode', 'highlightLinks', 'largeCursor'],
  adhdFocus: ['adhdMode', 'pauseAnimations', 'textSpacing', 'lineHeight'],
};

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);

  // ─── Toggle states (persisted to localStorage) ──────────────
  const [flags, setFlags] = useState({
    biggerText:     localStorage.getItem('acc_biggerText') === 'true',
    smallerText:    localStorage.getItem('acc_smallerText') === 'true',
    textSpacing:    localStorage.getItem('acc_textSpacing') === 'true',
    lineHeight:     localStorage.getItem('acc_lineHeight') === 'true',
    dyslexiaFriendly: localStorage.getItem('acc_dyslexiaFriendly') === 'true',
    adhdMode:       localStorage.getItem('acc_adhdMode') === 'true',
    saturation:     localStorage.getItem('acc_saturation') === 'true',
    contrastMode:   localStorage.getItem('acc_contrastMode') === 'true',
    invertColors:   localStorage.getItem('acc_invertColors') === 'true',
    highlightLinks: localStorage.getItem('acc_highlightLinks') === 'true',
    textToSpeech:   localStorage.getItem('acc_textToSpeech') === 'true',
    largeCursor:    localStorage.getItem('acc_largeCursor') === 'true',
    pauseAnimations: localStorage.getItem('acc_pauseAnimations') === 'true',
    hideImages:     localStorage.getItem('acc_hideImages') === 'true',
  });

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState('');

  // Open via header event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-accessibility-panel', handler);
    return () => window.removeEventListener('open-accessibility-panel', handler);
  }, []);

  // ─── Helper: toggle one flag, with mutual-exclusion for text size ─
  const toggle = (key) => {
    setFlags(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // bigger/smaller text are mutually exclusive
      if (key === 'biggerText' && next.biggerText) next.smallerText = false;
      if (key === 'smallerText' && next.smallerText) next.biggerText = false;
      return next;
    });
  };

  // ─── Apply all flags to <html> + localStorage ───────────────
  const classMap = {
    biggerText: 'acc-text-big', smallerText: 'acc-text-small',
    textSpacing: 'acc-spacing', lineHeight: 'acc-line-height',
    dyslexiaFriendly: 'acc-dyslexic', saturation: 'acc-grayscale',
    contrastMode: 'acc-contrast-dark', invertColors: 'acc-invert',
    highlightLinks: 'acc-highlight-links', largeCursor: 'acc-large-cursor',
    pauseAnimations: 'acc-pause-animations', hideImages: 'acc-hide-images',
  };
  useEffect(() => {
    Object.entries(classMap).forEach(([key, cls]) => {
      localStorage.setItem('acc_' + key, flags[key]);
      document.documentElement.classList.toggle(cls, flags[key]);
    });
    localStorage.setItem('acc_adhdMode', flags.adhdMode);
    localStorage.setItem('acc_textToSpeech', flags.textToSpeech);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags]);

  // ─── ADHD focus mask ────────────────────────────────────────
  useEffect(() => {
    if (!flags.adhdMode) return;
    const handler = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [flags.adhdMode]);

  // ─── Text-to-speech hover reader ────────────────────────────
  useEffect(() => {
    if (!flags.textToSpeech) return;
    const handler = (e) => {
      const t = e.target;
      const text = t.innerText || t.textContent;
      if (text && text.trim() && t.tagName !== 'BODY' && t.tagName !== 'HTML') {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.trim().substring(0, 150));
        u.rate = 1.0;
        window.speechSynthesis.speak(u);
      }
    };
    document.body.addEventListener('mouseover', handler);
    return () => {
      document.body.removeEventListener('mouseover', handler);
      window.speechSynthesis.cancel();
    };
  }, [flags.textToSpeech]);

  // ─── Preset application ─────────────────────────────────────
  const applyPreset = (presetKey) => {
    const presetFlags = PRESETS[presetKey] || [];
    const blank = Object.fromEntries(Object.keys(flags).map(k => [k, false]));
    presetFlags.forEach(k => { blank[k] = true; });
    setFlags(blank);
  };

  const handleReset = () => {
    setFlags(Object.fromEntries(Object.keys(flags).map(k => [k, false])));
  };

  // ─── Active count ───────────────────────────────────────────
  const activeCount = useMemo(
    () => Object.values(flags).filter(Boolean).length,
    [flags]
  );

  // ─── Option definitions grouped by category ─────────────────
  const grouped = {
    vision: [
      { key: 'biggerText', icon: <FormatSize sx={{ fontSize: 20 }} />, label: 'Bigger Text' },
      { key: 'smallerText', icon: <TextFormat sx={{ fontSize: 18 }} />, label: 'Smaller Text' },
      { key: 'contrastMode', icon: <Contrast sx={{ fontSize: 20 }} />, label: 'High Contrast' },
      { key: 'invertColors', icon: <InvertColors sx={{ fontSize: 20 }} />, label: 'Invert Colors' },
      { key: 'saturation', icon: <Palette sx={{ fontSize: 20 }} />, label: 'Desaturate' },
      { key: 'highlightLinks', icon: <Link sx={{ fontSize: 20 }} />, label: 'Highlight Links' },
    ],
    cognitive: [
      { key: 'dyslexiaFriendly', icon: <Spellcheck sx={{ fontSize: 20 }} />, label: 'Dyslexia Friendly' },
      { key: 'textSpacing', icon: <TextFormat sx={{ fontSize: 20 }} />, label: 'Letter Spacing' },
      { key: 'lineHeight', icon: <FormatLineSpacing sx={{ fontSize: 20 }} />, label: 'Line Height' },
      { key: 'adhdMode', icon: <Psychology sx={{ fontSize: 20 }} />, label: 'ADHD Focus Mask' },
    ],
    motor: [
      { key: 'largeCursor', icon: <Mouse sx={{ fontSize: 20 }} />, label: 'Large Cursor' },
      { key: 'pauseAnimations', icon: <PlayDisabled sx={{ fontSize: 20 }} />, label: 'Pause Animations' },
      { key: 'hideImages', icon: <HideImage sx={{ fontSize: 20 }} />, label: 'Hide Images' },
    ],
    audio: [
      { key: 'textToSpeech', icon: <VolumeUp sx={{ fontSize: 20 }} />, label: 'Text to Speech', hint: 'Hover to read aloud' },
    ],
  };

  const categoryIcon = { vision: <Visibility fontSize="small" />, cognitive: <Psychology fontSize="small" />, motor: <TouchApp fontSize="small" />, audio: <Hearing fontSize="small" /> };

  // Search filter — match against the option label + hint + category label.
  const q = search.trim().toLowerCase();
  const filteredGrouped = useMemo(() => {
    if (!q) return grouped;
    const out = {};
    for (const cat of CATEGORIES) {
      const matches = grouped[cat.key].filter(opt =>
        opt.label.toLowerCase().includes(q) ||
        (opt.hint || '').toLowerCase().includes(q) ||
        cat.label.toLowerCase().includes(q)
      );
      if (matches.length) out[cat.key] = matches;
    }
    return out;
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasResults = Object.keys(filteredGrouped).length > 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: { className: 'acc-safe', sx: styles.dialogPaper },
        }}
      >
        {/* ── Header ── */}
        <Box sx={styles.header}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={styles.headerIcon}>
              <AccessibilityNew className="acc-icon-keep" sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography sx={styles.headerTitle}>Accessibility Assistant</Typography>
              <Typography sx={styles.headerSubtitle}>
                Customize your experience · {activeCount} setting{activeCount !== 1 ? 's' : ''} active
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {activeCount > 0 && (
              <Chip
                size="small"
                color="success"
                label={`${activeCount} active`}
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700, backdropFilter: 'blur(4px)' }}
              />
            )}
            <IconButton onClick={() => setOpen(false)} sx={styles.closeBtn}>
              <Close />
            </IconButton>
          </Box>
        </Box>

        {/* ── Quick Presets + Search ── */}
        <Box sx={styles.presetBar}>
          <Typography sx={styles.presetLabel}>
            <Bolt sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
            Quick Profiles
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" onClick={() => applyPreset('lowVision')} sx={styles.presetBtn}>
              <Visibility sx={{ fontSize: 15, mr: 0.5 }} /> Low Vision
            </Button>
            <Button size="small" onClick={() => applyPreset('adhdFocus')} sx={styles.presetBtn}>
              <Psychology sx={{ fontSize: 15, mr: 0.5 }} /> ADHD Focus
            </Button>
            <Button size="small" onClick={handleReset} sx={{ ...styles.presetBtn, color: '#b91c1c', borderColor: '#fecaca' }}>
              <Refresh sx={{ fontSize: 15, mr: 0.5 }} /> Reset All
            </Button>
          </Box>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Search settings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '20px', bgcolor: '#fff', height: 36 } }}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><Search sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment>),
              endAdornment: search ? (
                <InputAdornment position="end" sx={{ cursor: 'pointer' }} onClick={() => setSearch('')}>
                  <Close sx={{ fontSize: 16, color: '#94a3b8' }} />
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>

        <DialogContent sx={styles.body}>
          {!hasResults ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Search sx={{ fontSize: 40, color: '#cbd5e1' }} />
              <Typography sx={{ mt: 1.5, color: '#64748b', fontWeight: 600 }}>
                No settings match "{search}"
              </Typography>
              <Button size="small" onClick={() => setSearch('')} sx={{ mt: 1, textTransform: 'none' }}>
                Clear search
              </Button>
            </Box>
          ) : (
            CATEGORIES.filter(cat => filteredGrouped[cat.key]).map((cat) => (
            <Box key={cat.key} sx={{ mb: 3.5 }}>
              {/* Category header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                <Box sx={{ ...styles.catBadge, bgcolor: cat.color + '15', color: cat.color }}>
                  {categoryIcon[cat.key]}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', fontFamily: '"Outfit",sans-serif' }}>
                    {cat.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                    {cat.desc}
                  </Typography>
                </Box>
                <Divider sx={{ flex: 1, ml: 1, borderColor: '#f1f5f9' }} />
              </Box>

              {/* Options grid */}
              <Box sx={styles.optionGrid}>
                {filteredGrouped[cat.key].map((opt) => {
                  const active = flags[opt.key];
                  return (
                    <Box
                      key={opt.key}
                      onClick={() => toggle(opt.key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(opt.key); } }}
                      sx={{
                        ...styles.optionCard,
                        ...(active ? styles.optionCardActive : {}),
                        borderLeft: `3px solid ${active ? cat.color : 'transparent'}`,
                      }}
                    >
                      <Box sx={{ ...styles.optionIcon, ...(active ? { bgcolor: cat.color, color: '#fff' } : {}) }}>
                        {opt.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{
                          fontSize: '0.85rem', fontWeight: 700,
                          color: active ? cat.color : '#1e293b',
                          fontFamily: '"Outfit",sans-serif',
                          lineHeight: 1.2,
                        }}>
                          {opt.label}
                        </Typography>
                        {opt.hint && (
                          <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', mt: 0.25 }}>
                            {opt.hint}
                          </Typography>
                        )}
                        {active && !opt.hint && (
                          <Typography sx={{ fontSize: '0.7rem', color: cat.color, mt: 0.25, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <Check sx={{ fontSize: 12 }} /> Enabled
                          </Typography>
                        )}
                      </Box>
                      <Switch
                        size="small"
                        checked={active}
                        onClick={(e) => { e.stopPropagation(); toggle(opt.key); }}
                        sx={{ ...styles.switch, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: cat.color + '60' }, '& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb': { bgcolor: cat.color } }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </Box>
            ))
          )}
        </DialogContent>

        {/* ── Footer ── */}
        <Box sx={styles.footer}>
          <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Settings save automatically and persist across sessions.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setOpen(false)}
            sx={styles.doneBtn}
          >
            Done
          </Button>
        </Box>
      </Dialog>

      {/* ── ADHD Focus Mask Overlay ── */}
      {flags.adhdMode && (
        <Box
          sx={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999,
            background: `linear-gradient(to bottom,
              rgba(0,0,0,0.65) 0%,
              rgba(0,0,0,0.65) ${Math.max(0, mousePos.y - 100)}px,
              transparent ${Math.max(0, mousePos.y - 100)}px,
              transparent ${Math.min(window.innerHeight, mousePos.y + 100)}px,
              rgba(0,0,0,0.65) ${Math.min(window.innerHeight, mousePos.y + 100)}px,
              rgba(0,0,0,0.65) 100%)`,
          }}
        />
      )}
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = {
  dialogPaper: {
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
    border: '1px solid #e2e8f0',
    maxWidth: 720,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    px: 3, py: 2,
    background: 'linear-gradient(135deg, #1F4E79 0%, #2c5f8a 100%)',
    color: '#fff',
  },
  headerIcon: {
    width: 44, height: 44, borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.2,
    fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.01em',
  },
  headerSubtitle: {
    fontSize: '0.75rem', opacity: 0.85, mt: 0.25, fontWeight: 500,
  },
  closeBtn: {
    color: '#fff',
    bgcolor: 'rgba(255,255,255,0.1)',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'rotate(90deg)' },
    transition: 'all 0.25s ease',
  },
  presetBar: {
    display: 'flex', alignItems: 'center', gap: 1.5,
    px: 3, py: 1.5, flexWrap: 'wrap',
    bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
  },
  presetLabel: {
    fontSize: '0.7rem', fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'flex', alignItems: 'center',
  },
  presetBtn: {
    textTransform: 'none', fontWeight: 600, fontSize: '0.78rem',
    borderRadius: '20px', px: 1.75, py: 0.5,
    border: '1px solid #e2e8f0', color: '#334155',
    bgcolor: '#fff',
    '&:hover': { bgcolor: '#f1f5f9', borderColor: '#cbd5e1', transform: 'translateY(-1px)' },
    transition: 'all 0.2s ease',
    fontFamily: '"Outfit",sans-serif',
  },
  body: {
    px: { xs: 2, sm: 3 }, py: 3,
    bgcolor: '#ffffff',
    maxHeight: '58vh',
    '&::-webkit-scrollbar': { width: 8 },
    '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 4 },
    '&::-webkit-scrollbar-track': { bgcolor: '#f1f5f9' },
  },
  catBadge: {
    width: 32, height: 32, borderRadius: '9px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
    gap: 1.25,
  },
  optionCard: {
    display: 'flex', alignItems: 'center', gap: 1.25,
    p: 1.75, borderRadius: '12px',
    bgcolor: '#f8fafc',
    border: '1px solid #eef2f6',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: 68,
    '&:hover': {
      bgcolor: '#f1f5f9',
      borderColor: '#cbd5e1',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
    },
    '&:focus-visible': {
      outline: '2px solid #1F4E79',
      outlineOffset: '2px',
    },
  },
  optionCardActive: {
    bgcolor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  optionIcon: {
    width: 40, height: 40, borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    bgcolor: '#e2e8f0', color: '#64748b',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  switch: {
    '& .MuiSwitch-track': { borderRadius: 12, bgcolor: '#cbd5e1' },
    '& .MuiSwitch-thumb': { bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  },
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    px: 3, py: 2,
    bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0',
  },
  doneBtn: {
    borderRadius: '10px', px: 4, py: 0.95,
    fontWeight: 700, textTransform: 'none', fontSize: '0.85rem',
    fontFamily: '"Outfit",sans-serif',
    background: 'linear-gradient(135deg, #1F4E79 0%, #143656 100%)',
    boxShadow: '0 3px 10px rgba(31,78,121,0.3)',
    '&:hover': { boxShadow: '0 5px 14px rgba(31,78,121,0.4)', transform: 'translateY(-1px)' },
    transition: 'all 0.2s ease',
  },
};

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, Card, CardContent, Typography, Box, IconButton
} from '@mui/material';
import {
  AccessibilityNew, Close, FormatSize, TextFormat, FormatLineSpacing,
  Spellcheck, Psychology, InvertColors, Contrast, Palette,
  Link, VolumeUp, Mouse, PlayDisabled, HideImage, Refresh, Check
} from '@mui/icons-material';

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);

  // States: Booleans for toggling
  const [biggerText, setBiggerText] = useState(() => localStorage.getItem('acc_biggerText') === 'true');
  const [smallerText, setSmallerText] = useState(() => localStorage.getItem('acc_smallerText') === 'true');
  const [textSpacing, setTextSpacing] = useState(() => localStorage.getItem('acc_textSpacing') === 'true');
  const [lineHeight, setLineHeight] = useState(() => localStorage.getItem('acc_lineHeight') === 'true');
  const [dyslexiaFriendly, setDyslexiaFriendly] = useState(() => localStorage.getItem('acc_dyslexiaFriendly') === 'true');
  const [adhdMode, setAdhdMode] = useState(() => localStorage.getItem('acc_adhdMode') === 'true');
  const [saturation, setSaturation] = useState(() => localStorage.getItem('acc_saturation') === 'true'); // grayscale on/off
  const [contrastMode, setContrastMode] = useState(() => localStorage.getItem('acc_contrastMode') === 'true'); // dark contrast on/off
  const [invertColors, setInvertColors] = useState(() => localStorage.getItem('acc_invertColors') === 'true');
  const [highlightLinks, setHighlightLinks] = useState(() => localStorage.getItem('acc_highlightLinks') === 'true');
  const [textToSpeech, setTextToSpeech] = useState(() => localStorage.getItem('acc_textToSpeech') === 'true');
  const [largeCursor, setLargeCursor] = useState(() => localStorage.getItem('acc_largeCursor') === 'true');
  const [pauseAnimations, setPauseAnimations] = useState(() => localStorage.getItem('acc_pauseAnimations') === 'true');
  const [hideImages, setHideImages] = useState(() => localStorage.getItem('acc_hideImages') === 'true');

  // Mouse coordinate tracker for ADHD Focus Mask
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Event listener to open dialog from header button
  useEffect(() => {
    const handleOpenEvent = () => setOpen(true);
    window.addEventListener('open-accessibility-panel', handleOpenEvent);
    return () => window.removeEventListener('open-accessibility-panel', handleOpenEvent);
  }, []);

  const handleReset = () => {
    setBiggerText(false);
    setSmallerText(false);
    setTextSpacing(false);
    setLineHeight(false);
    setDyslexiaFriendly(false);
    setAdhdMode(false);
    setSaturation(false);
    setContrastMode(false);
    setInvertColors(false);
    setHighlightLinks(false);
    setTextToSpeech(false);
    setLargeCursor(false);
    setPauseAnimations(false);
    setHideImages(false);
  };

  // Effects to synchronize classes to html element
  useEffect(() => {
    localStorage.setItem('acc_biggerText', biggerText);
    document.documentElement.classList.toggle('acc-text-big', biggerText);
  }, [biggerText]);

  useEffect(() => {
    localStorage.setItem('acc_smallerText', smallerText);
    document.documentElement.classList.toggle('acc-text-small', smallerText);
  }, [smallerText]);

  useEffect(() => {
    localStorage.setItem('acc_textSpacing', textSpacing);
    document.documentElement.classList.toggle('acc-spacing', textSpacing);
  }, [textSpacing]);

  useEffect(() => {
    localStorage.setItem('acc_lineHeight', lineHeight);
    document.documentElement.classList.toggle('acc-line-height', lineHeight);
  }, [lineHeight]);

  useEffect(() => {
    localStorage.setItem('acc_dyslexiaFriendly', dyslexiaFriendly);
    document.documentElement.classList.toggle('acc-dyslexic', dyslexiaFriendly);
  }, [dyslexiaFriendly]);

  useEffect(() => {
    localStorage.setItem('acc_adhdMode', adhdMode);
  }, [adhdMode]);

  useEffect(() => {
    localStorage.setItem('acc_saturation', saturation);
    document.documentElement.classList.toggle('acc-grayscale', saturation);
  }, [saturation]);

  useEffect(() => {
    localStorage.setItem('acc_contrastMode', contrastMode);
    document.documentElement.classList.toggle('acc-contrast-dark', contrastMode);
  }, [contrastMode]);

  useEffect(() => {
    localStorage.setItem('acc_invertColors', invertColors);
    document.documentElement.classList.toggle('acc-invert', invertColors);
  }, [invertColors]);

  useEffect(() => {
    localStorage.setItem('acc_highlightLinks', highlightLinks);
    document.documentElement.classList.toggle('acc-highlight-links', highlightLinks);
  }, [highlightLinks]);

  useEffect(() => {
    localStorage.setItem('acc_textToSpeech', textToSpeech);
  }, [textToSpeech]);

  useEffect(() => {
    localStorage.setItem('acc_largeCursor', largeCursor);
    document.documentElement.classList.toggle('acc-large-cursor', largeCursor);
  }, [largeCursor]);

  useEffect(() => {
    localStorage.setItem('acc_pauseAnimations', pauseAnimations);
    document.documentElement.classList.toggle('acc-pause-animations', pauseAnimations);
  }, [pauseAnimations]);

  useEffect(() => {
    localStorage.setItem('acc_hideImages', hideImages);
    document.documentElement.classList.toggle('acc-hide-images', hideImages);
  }, [hideImages]);

  // ADHD Mask movement listener
  useEffect(() => {
    if (!adhdMode) return;

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [adhdMode]);

  // Text-To-SpeechHover reader
  useEffect(() => {
    if (!textToSpeech) return;

    const handleMouseOver = (e) => {
      const target = e.target;
      const text = target.innerText || target.textContent;
      if (text && text.trim().length > 0 && target.tagName !== 'BODY' && target.tagName !== 'HTML') {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.trim().substring(0, 150));
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    };

    document.body.addEventListener('mouseover', handleMouseOver);
    return () => {
      document.body.removeEventListener('mouseover', handleMouseOver);
      window.speechSynthesis.cancel();
    };
  }, [textToSpeech]);

  const options = [
    {
      title: 'Bigger Text',
      icon: <FormatSize sx={{ fontSize: 32 }} />,
      desc: biggerText ? 'Active' : 'Off (Default)',
      active: biggerText,
      onClick: () => {
        const nextVal = !biggerText;
        setBiggerText(nextVal);
        if (nextVal) setSmallerText(false);
      }
    },
    {
      title: 'Smaller Text',
      icon: <FormatSize sx={{ fontSize: 24 }} />,
      desc: smallerText ? 'Active' : 'Off (Default)',
      active: smallerText,
      onClick: () => {
        const nextVal = !smallerText;
        setSmallerText(nextVal);
        if (nextVal) setBiggerText(false);
      }
    },
    {
      title: 'Text Spacing',
      icon: <TextFormat sx={{ fontSize: 30 }} />,
      desc: textSpacing ? 'Extra Spacing' : 'Default',
      active: textSpacing,
      onClick: () => setTextSpacing(!textSpacing)
    },
    {
      title: 'Line Height',
      icon: <FormatLineSpacing sx={{ fontSize: 30 }} />,
      desc: lineHeight ? 'Increased height' : 'Default',
      active: lineHeight,
      onClick: () => setLineHeight(!lineHeight)
    },
    {
      title: 'Dyslexia Friendly',
      icon: <Spellcheck sx={{ fontSize: 30 }} />,
      desc: dyslexiaFriendly ? 'Active' : 'Off (Default)',
      active: dyslexiaFriendly,
      onClick: () => setDyslexiaFriendly(!dyslexiaFriendly)
    },
    {
      title: 'ADHD Mode',
      icon: <Psychology sx={{ fontSize: 30 }} />,
      desc: adhdMode ? 'Focus bar active' : 'Off (Default)',
      active: adhdMode,
      onClick: () => setAdhdMode(!adhdMode)
    },
    {
      title: 'Saturation',
      icon: <Palette sx={{ fontSize: 30 }} />,
      desc: saturation ? 'Monochrome Grayscale' : 'Off (Default)',
      active: saturation,
      onClick: () => setSaturation(!saturation)
    },
    {
      title: 'Light-Dark',
      icon: <Contrast sx={{ fontSize: 30 }} />,
      desc: contrastMode ? 'Yellow/Black Contrast' : 'Off (Default)',
      active: contrastMode,
      onClick: () => setContrastMode(!contrastMode)
    },
    {
      title: 'Invert Colors',
      icon: <InvertColors sx={{ fontSize: 30 }} />,
      desc: invertColors ? 'Colors Inverted' : 'Off (Default)',
      active: invertColors,
      onClick: () => setInvertColors(!invertColors)
    },
    {
      title: 'Highlight Links',
      icon: <Link sx={{ fontSize: 30 }} />,
      desc: highlightLinks ? 'Highlighted' : 'Off (Default)',
      active: highlightLinks,
      onClick: () => setHighlightLinks(!highlightLinks)
    },
    {
      title: 'Text To Speech',
      icon: <VolumeUp sx={{ fontSize: 30 }} />,
      desc: textToSpeech ? 'Hover to read' : 'Off (Default)',
      active: textToSpeech,
      onClick: () => setTextToSpeech(!textToSpeech)
    },
    {
      title: 'Cursor',
      icon: <Mouse sx={{ fontSize: 30 }} />,
      desc: largeCursor ? 'Extra Large' : 'Off (Default)',
      active: largeCursor,
      onClick: () => setLargeCursor(!largeCursor)
    },
    {
      title: 'Pause Animation',
      icon: <PlayDisabled sx={{ fontSize: 30 }} />,
      desc: pauseAnimations ? 'Paused' : 'Off (Default)',
      active: pauseAnimations,
      onClick: () => setPauseAnimations(!pauseAnimations)
    },
    {
      title: 'Hide Images',
      icon: <HideImage sx={{ fontSize: 30 }} />,
      desc: hideImages ? 'Images Hidden' : 'Off (Default)',
      active: hideImages,
      onClick: () => setHideImages(!hideImages)
    }
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            boxShadow: '0 32px 64px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.4)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)'
          }
        }}
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2.5, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'linear-gradient(135deg, #1F4E79 0%, #2E7D32 100%)', 
          color: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AccessibilityNew className="acc-icon-keep" sx={{ fontSize: '1.75rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
            <Typography variant="h6" fontWeight={800} sx={{ fontFamily: '"Outfit", sans-serif', letterSpacing: '0.02em', fontSize: '1.25rem' }}>
              Accessibility Assistant
            </Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', transform: 'rotate(90deg)' }, transition: 'all 0.3s ease' }}>
            <Close />
          </IconButton>
        </DialogTitle>
 
        <DialogContent sx={{ px: { xs: 2, sm: 4 }, py: 4, bgcolor: '#F8FAFC', borderTop: 'none', borderBottom: '1px solid #E2E8F0' }}>
          <Grid container spacing={2.5}>
            {options.map((opt, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Card
                  onClick={opt.onClick}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: opt.active ? 'rgba(46, 125, 50, 0.35)' : 'rgba(226, 232, 240, 0.8)',
                    background: opt.active 
                      ? 'linear-gradient(135deg, rgba(46, 125, 50, 0.05) 0%, rgba(46, 125, 50, 0.12) 100%)' 
                      : 'rgba(255, 255, 255, 0.95)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: opt.active 
                      ? '0 8px 24px rgba(46, 125, 50, 0.12), inset 0 0 0 1px rgba(46, 125, 50, 0.1)' 
                      : '0 4px 12px rgba(0,0,0,0.02)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-3px) scale(1.02)',
                      borderColor: opt.active ? '#2E7D32' : 'rgba(31, 78, 121, 0.4)',
                      boxShadow: '0 12px 28px rgba(0,0,0,0.08)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 52, height: 52, borderRadius: '12px',
                      background: opt.active 
                        ? 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)' 
                        : 'rgba(15, 23, 42, 0.04)',
                      color: opt.active ? 'white' : '#64748B',
                      boxShadow: opt.active ? '0 4px 12px rgba(46, 125, 50, 0.3)' : 'none',
                      transition: 'all 0.3s ease',
                      '& svg': { fontSize: '1.6rem' }
                    }}>
                      {opt.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: '"Outfit", sans-serif', color: opt.active ? '#1B5E20' : '#1E293B', fontSize: '0.9rem' }}>
                        {opt.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4, fontSize: '0.75rem', fontWeight: 500 }}>
                        {opt.desc}
                      </Typography>
                    </Box>
                    {opt.active && (
                      <Box sx={{
                        position: 'absolute', right: 10, top: 10,
                        width: 20, height: 20, borderRadius: '50%',
                        bgcolor: '#2E7D32', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(46, 125, 50, 0.4)',
                        animation: 'scaleIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        '@keyframes scaleIn': {
                          '0%': { transform: 'scale(0)' },
                          '100%': { transform: 'scale(1)' }
                        }
                      }}>
                        <Check sx={{ fontSize: 13 }} />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
 
        <DialogActions sx={{ p: 3, bgcolor: '#F8FAFC', justifyContent: 'space-between' }}>
          <Button 
            variant="outlined" 
            startIcon={<Refresh />} 
            onClick={handleReset} 
            color="warning"
            sx={{
              borderRadius: '24px',
              px: 3,
              py: 1,
              fontWeight: 700,
              textTransform: 'none',
              fontFamily: '"Outfit", sans-serif'
            }}
          >
            Reset Preferences
          </Button>
          <Button 
            variant="contained" 
            onClick={() => setOpen(false)} 
            sx={{ 
              borderRadius: '24px',
              px: 5,
              py: 1,
              fontWeight: 800,
              textTransform: 'none',
              fontFamily: '"Outfit", sans-serif',
              background: 'linear-gradient(135deg, #1F4E79 0%, #143656 100%)',
              boxShadow: '0 4px 14px rgba(31, 78, 121, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(31, 78, 121, 0.4)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Close Panel
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADHD Mode Focus Mask Overlay */}
      {adhdMode && (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 99999,
            background: `linear-gradient(to bottom,
              rgba(0,0,0,0.65) 0%,
              rgba(0,0,0,0.65) ${Math.max(0, mousePos.y - 100)}px,
              transparent ${Math.max(0, mousePos.y - 100)}px,
              transparent ${Math.min(window.innerHeight, mousePos.y + 100)}px,
              rgba(0,0,0,0.65) ${Math.min(window.innerHeight, mousePos.y + 100)}px,
              rgba(0,0,0,0.65) 100%)`
          }}
        />
      )}
    </>
  );
}

import React from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@emotion/react';
import logoTransparent from '../assets/logo-transparent.png';

// Animations
const logoFadeIn = keyframes`
  0% { opacity: 0; transform: scale(0.6); }
  100% { opacity: 1; transform: scale(1); }
`;

const logoPulse = keyframes`
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.06); filter: brightness(1.1); }
`;

const ringRotate = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const gradientFill = keyframes`
  0% { stroke-dashoffset: 314; }
  60% { stroke-dashoffset: 40; }
  80% { stroke-dashoffset: 20; }
  100% { stroke-dashoffset: 314; }
`;

const outerGlow = keyframes`
  0%, 100% { opacity: 0.08; transform: scale(1); }
  50% { opacity: 0.18; transform: scale(1.08); }
`;

const textSlideUp = keyframes`
  0% { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const dotPulse = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const particleFloat = (x, y) => keyframes`
  0% { opacity: 0; transform: translate(0, 0) scale(0); }
  20% { opacity: 0.6; transform: translate(${x * 0.3}px, ${y * 0.3}px) scale(1); }
  100% { opacity: 0; transform: translate(${x}px, ${y}px) scale(0); }
`;

// Floating particles around the logo
const PARTICLES = [
  { x: -50, y: -60, size: 3, delay: 0 },
  { x: 55, y: -45, size: 2, delay: 0.4 },
  { x: 65, y: 30, size: 3, delay: 0.8 },
  { x: -60, y: 40, size: 2, delay: 1.2 },
  { x: 30, y: -65, size: 2.5, delay: 1.6 },
  { x: -40, y: 55, size: 2, delay: 2.0 },
  { x: 50, y: 55, size: 2.5, delay: 0.6 },
  { x: -55, y: -20, size: 2, delay: 1.4 },
];

export default function LoadingScreen({ message = 'Loading THOZHIRPORUL' }) {
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden',
      }}
    >
      {/* Outer ambient glow */}
      <Box sx={{
        position: 'absolute',
        width: 240, height: 240,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(31,78,121,0.12) 0%, rgba(46,125,50,0.06) 50%, transparent 70%)',
        animation: `${outerGlow} 2.5s ease-in-out infinite`,
      }} />

      {/* Spinner container */}
      <Box sx={{
        position: 'relative',
        width: 140, height: 140,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 4,
      }}>
        {/* Rotating ring track (background) */}
        <svg
          width="140" height="140"
          viewBox="0 0 140 140"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <circle
            cx="70" cy="70" r="62"
            fill="none"
            stroke="rgba(31,78,121,0.1)"
            strokeWidth="3"
          />
        </svg>

        {/* Gradient progress ring */}
        <svg
          width="140" height="140"
          viewBox="0 0 140 140"
          style={{
            position: 'absolute', top: 0, left: 0,
            animation: `${ringRotate} 2.2s linear infinite`,
          }}
        >
          <defs>
            <linearGradient id="loading-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1F4E79" />
              <stop offset="40%" stopColor="#3A74A7" />
              <stop offset="70%" stopColor="#2E7D32" />
              <stop offset="100%" stopColor="#4CAF50" />
            </linearGradient>
          </defs>
          <circle
            cx="70" cy="70" r="62"
            fill="none"
            stroke="url(#loading-gradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="314"
            style={{
              animation: `${gradientFill} 2.2s ease-in-out infinite`,
            }}
          />
        </svg>

        {/* Inner subtle ring */}
        <svg
          width="140" height="140"
          viewBox="0 0 140 140"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <circle
            cx="70" cy="70" r="52"
            fill="none"
            stroke="rgba(31,78,121,0.05)"
            strokeWidth="1"
          />
        </svg>

        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: p.size, height: p.size,
              borderRadius: '50%',
              bgcolor: i % 2 === 0 ? 'rgba(31,78,121,0.5)' : 'rgba(46,125,50,0.5)',
              animation: `${particleFloat(p.x, p.y)} 3s ${p.delay}s ease-out infinite`,
              opacity: 0,
            }}
          />
        ))}

        {/* Logo in center */}
        <Box sx={{
          width: 64, height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: `${logoFadeIn} 0.6s ease-out forwards, ${logoPulse} 2.5s 0.6s ease-in-out infinite`,
          zIndex: 1,
        }}>
          <img
            src={logoTransparent}
            alt="THOZHIRPORUL"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 10px rgba(31,78,121,0.25))',
            }}
          />
        </Box>
      </Box>

      {/* Brand text */}
      <Box sx={{
        textAlign: 'center',
        animation: `${textSlideUp} 0.8s 0.3s ease-out both`,
      }}>
        <Typography
          sx={{
            fontWeight: 900,
            letterSpacing: '0.2em',
            fontSize: '1.1rem',
            mb: 0.3,
            background: 'linear-gradient(90deg, #1F4E79 0%, #2E7D32 50%, #1F4E79 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: `${shimmer} 3s linear infinite`,
          }}
        >
          THOZHIRPORUL
        </Typography>
        <Typography
          sx={{
            color: 'rgba(15,23,42,0.4)',
            fontWeight: 600,
            letterSpacing: '0.12em',
            fontSize: '0.5rem',
            display: 'block',
            mb: 3,
          }}
        >
          BY NEXORA
        </Typography>

        {/* Loading message with dots */}
        <Typography
          sx={{
            color: 'rgba(15,23,42,0.45)',
            fontWeight: 500,
            fontSize: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            letterSpacing: '0.05em',
          }}
        >
          {message}
          <Box component="span" sx={{ display: 'inline-flex', gap: '3px', ml: 0.5 }}>
            {[0, 1, 2].map(i => (
              <Box
                key={i}
                component="span"
                sx={{
                  width: 3.5, height: 3.5, borderRadius: '50%',
                  bgcolor: 'rgba(31,78,121,0.45)',
                  animation: `${dotPulse} 1.4s ${i * 0.2}s ease-in-out infinite`,
                }}
              />
            ))}
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { keyframes, css } from '@emotion/react';

/* ── Animations ────────────────────────────────────────────── */
const shimmer = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-18px) scale(1.04); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(32px); }
  to { opacity: 1; transform: translateY(0); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.94) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

const glowPulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
`;

/* ── Reduced-motion global override (WCAG 2.2, Apple HIG) ── */
const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

/**
 * PageHero – Shared hero banner for all public landing pages.
 *
 * UI/UX Pro Max compliance:
 *   - prefers-reduced-motion: all animations disabled under reduced motion
 *   - Contrast: label gradient text gets glow shadow for 4.5:1 on dark bg
 *   - Line-length: subtitle maxWidth constrained to ~65ch for readability
 *   - Typography: h1 with proper line-height (1.08), no tighter
 *   - Focus: CTA children get visible focus ring styles via MUI theme
 *   - Performance: no images loaded above 7KB CSS; orbs are pure CSS
 *   - Visual hierarchy: size + weight + gradient, not color alone
 *   - Mobile-first: xs padding tightened; text sizes scale from mobile up
 *   - Bottom fade: smooth gradient transition to the next section
 */
export default function PageHero({
  icon,
  label,
  title,
  titleHighlight,
  subtitle,
  accentColor = '#2E7D32',
  accentColor2 = '#1F4E79',
  bgImage,
  children,
}) {
  return (
    <Box css={reducedMotion}>
      <Box
        sx={{
          pt: { xs: 12, sm: 16, md: 22 },
          pb: { xs: 10, sm: 12, md: 16 },
          background: `linear-gradient(145deg, #060d1a 0%, #0d1f38 35%, #0a2018 100%)`,
          backgroundSize: '200% 200%',
          animation: `${shimmer} 18s ease infinite`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          /* Bottom fade — smooth transition to next section */
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: { xs: 40, md: 80 },
            background: 'linear-gradient(to bottom, transparent, #f8fafc)',
            pointerEvents: 'none',
            zIndex: 3,
          },
        }}
      >
        {/* Optional blurred background image — 7% opacity, no CLS impact */}
        {bgImage && (
          <Box
            component="img"
            src={bgImage}
            alt=""
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.07,
              filter: 'blur(6px)',
              transform: 'scale(1.05)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Blur orb 1 — top-right, accent (decorative, hidden from a11y tree) */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: { xs: 240, md: 440 },
            height: { xs: 240, md: 440 },
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}50 0%, transparent 65%)`,
            filter: 'blur(72px)',
            animation: `${float} 9s ease-in-out infinite`,
            pointerEvents: 'none',
          }}
        />

        {/* Blur orb 2 — bottom-left, secondary */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            bottom: '-15%',
            left: '-8%',
            width: { xs: 200, md: 380 },
            height: { xs: 200, md: 380 },
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor2}40 0%, transparent 65%)`,
            filter: 'blur(80px)',
            animation: `${float} 12s ease-in-out infinite 2s`,
            pointerEvents: 'none',
          }}
        />

        {/* Blur orb 3 — center glow, subtle pulse */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: '20%',
            left: '35%',
            width: { xs: 140, md: 300 },
            height: { xs: 140, md: 300 },
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
            filter: 'blur(60px)',
            animation: `${glowPulse} 8s ease-in-out infinite`,
            pointerEvents: 'none',
          }}
        />

        {/* Subtle dot grid overlay — decorative */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Box sx={{ animation: `${fadeInUp} 0.7s cubic-bezier(0.22,1,0.36,1)` }}>
            {/* Label pill badge — accessible with glow for contrast */}
            {(icon || label) && (
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: { xs: 3, md: 4 },
                  px: 2.5,
                  py: 1,
                  borderRadius: '50px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                {icon && (
                  <Box component="span" sx={{ color: accentColor, display: 'flex', alignItems: 'center' }} aria-hidden="true">
                    {React.cloneElement(icon, { sx: { fontSize: 16, ...(icon.props?.sx || {}) } })}
                  </Box>
                )}
                {label && (
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: '0.7rem', md: '0.78rem' },
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.9)',
                      textShadow: `0 0 20px ${accentColor}66`,
                    }}
                  >
                    {label}
                  </Typography>
                )}
              </Box>
            )}

            {/* Main heading — h1, proper hierarchy, gradient highlight */}
            <Typography
              component="h1"
              variant="h1"
              fontWeight={900}
              sx={{
                mb: { xs: 2, md: 3 },
                fontSize: { xs: '2rem', sm: '2.6rem', md: '3.8rem', lg: '4.2rem' },
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
                textWrap: 'balance',
              }}
            >
              {title}{' '}
              {titleHighlight && (
                <Box
                  component="span"
                  sx={{
                    background: `linear-gradient(100deg, ${accentColor}, ${accentColor}bb, ${accentColor2}dd)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    /* Glow behind gradient text for readability on dark bg */
                    filter: `drop-shadow(0 0 24px ${accentColor}25)`,
                    paddingBottom: '0.08em',
                  }}
                >
                  {titleHighlight}
                </Box>
              )}
            </Typography>

            {/* Subtitle — constrained to ~65ch for readability */}
            {subtitle && (
              <Typography
                variant="h6"
                component="p"
                sx={{
                  opacity: 0.85,
                  maxWidth: '65ch',
                  fontSize: { xs: '0.95rem', md: '1.12rem' },
                  lineHeight: 1.75,
                  fontWeight: 300,
                  color: 'rgba(255,255,255,0.87)',
                  textWrap: 'pretty',
                }}
              >
                {subtitle}
              </Typography>
            )}

            {/* CTA children — staggered entrance, focus-visible styled */}
            {children && (
              <Box
                sx={{
                  mt: { xs: 4, md: 5 },
                  animation: `${scaleIn} 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both`,
                  '& .MuiButton-root:focus-visible': {
                    outline: '2px solid rgba(255,255,255,0.7)',
                    outlineOffset: '3px',
                    borderRadius: '12px',
                  },
                  '& .MuiButton-root': {
                    minHeight: 48,
                    px: { xs: 3, md: 4 },
                    py: { xs: 1.5, md: 1.8 },
                  },
                }}
              >
                {children}
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

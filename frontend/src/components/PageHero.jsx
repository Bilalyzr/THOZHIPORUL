import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { keyframes } from '@emotion/react';

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
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
`;

/**
 * PageHero – Shared hero banner for all public landing pages.
 *
 * Props:
 *   icon         – React element shown in the label pill (e.g. <SpeedIcon />)
 *   label        – Uppercase badge text (e.g. "Platform Features")
 *   title        – Main heading text (before the gradient highlight)
 *   titleHighlight – The portion of the heading rendered in gradient color
 *   subtitle     – Sub-paragraph text below the heading
 *   accentColor  – CSS color for the three blur orbs (unique per page)
 *   accentColor2 – Optional secondary orb color (defaults to navy #1F4E79)
 *   bgImage      – Optional background image URL (rendered at low opacity with blur)
 *   children     – Optional CTA buttons rendered below the subtitle
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
    <Box
      sx={{
        pt: { xs: 18, md: 26 },
        pb: { xs: 14, md: 20 },
        background: `linear-gradient(145deg, #060d1a 0%, #0d1f38 40%, #0a2018 100%)`,
        backgroundSize: '200% 200%',
        animation: `${shimmer} 18s ease infinite`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Optional blurred background image */}
      {bgImage && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.07,
            filter: 'blur(6px)',
            transform: 'scale(1.05)',
          }}
        />
      )}

      {/* Blur orb 1 – top-right, accent */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: { xs: 280, md: 480 },
          height: { xs: 280, md: 480 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}55 0%, transparent 65%)`,
          filter: 'blur(72px)',
          animation: `${float} 9s ease-in-out infinite`,
          pointerEvents: 'none',
        }}
      />

      {/* Blur orb 2 – bottom-left, secondary */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '-15%',
          left: '-8%',
          width: { xs: 240, md: 420 },
          height: { xs: 240, md: 420 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor2}44 0%, transparent 65%)`,
          filter: 'blur(80px)',
          animation: `${float} 12s ease-in-out infinite 2s`,
          pointerEvents: 'none',
        }}
      />

      {/* Blur orb 3 – center-top, subtle */}
      <Box
        sx={{
          position: 'absolute',
          top: '30%',
          left: '40%',
          width: { xs: 160, md: 320 },
          height: { xs: 160, md: 320 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
          filter: 'blur(60px)',
          animation: `${float} 15s ease-in-out infinite 4s`,
          pointerEvents: 'none',
        }}
      />

      {/* Subtle dot grid overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ animation: `${fadeInUp} 0.7s ease-out` }}>
          {/* Label pill badge */}
          {(icon || label) && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                mb: 4,
                px: 3,
                py: 1.5,
                borderRadius: '50px',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: `0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)`,
              }}
            >
              {icon && (
                <Box sx={{ color: accentColor, display: 'flex', alignItems: 'center' }}>
                  {React.cloneElement(icon, { sx: { fontSize: 18, ...(icon.props?.sx || {}) } })}
                </Box>
              )}
              {label && (
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    background: `linear-gradient(90deg, ${accentColor}, ${accentColor2})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {label}
                </Typography>
              )}
            </Box>
          )}

          {/* Main heading */}
          <Typography
            variant="h1"
            fontWeight={900}
            sx={{
              mb: 3,
              fontSize: { xs: '2.4rem', md: '4.5rem' },
              lineHeight: 1.06,
              letterSpacing: '-0.025em',
            }}
          >
            {title}{' '}
            {titleHighlight && (
              <Box
                component="span"
                sx={{
                  background: `linear-gradient(90deg, ${accentColor}, ${accentColor}aa, ${accentColor2}cc)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {titleHighlight}
              </Box>
            )}
          </Typography>

          {/* Subtitle */}
          {subtitle && (
            <Typography
              variant="h6"
              sx={{
                opacity: 0.88,
                maxWidth: 780,
                fontSize: { xs: '1rem', md: '1.2rem' },
                lineHeight: 1.85,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              {subtitle}
            </Typography>
          )}

          {/* CTA children */}
          {children && (
            <Box sx={{ mt: 6, animation: `${scaleIn} 0.6s ease-out 0.25s both` }}>
              {children}
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
}

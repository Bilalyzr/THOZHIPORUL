// uiEnhancements.js — shared UI/UX Pro Max utilities
// Applied across the app per the skill's priority guidelines.

import { css, keyframes } from '@emotion/react';

// ── Reduced-motion global override (WCAG 2.2, Apple HIG) ──
export const reducedMotionCSS = css`
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

// ── Shared animation presets ──
export const animations = {
  fadeInUp: keyframes`
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  `,
  fadeIn: keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
  `,
  scaleIn: keyframes`
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  `,
  float: keyframes`
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  `,
};

// ── Standardized design tokens (replaces scattered hardcoded values) ──
export const tokens = {
  borderRadius: {
    input: 2,
    card: 3,
    panel: 4,
    hero: 5,
  },
  fontWeight: {
    body: 400,
    subtitle: 600,
    heading: 700,
    display: 800,
  },
  spacing: (n) => `${n * 8}px`, // 8px grid system
};

// ── Shared loading skeleton wrapper ──
export const skeletonStyles = {
  rounded: { borderRadius: 2 },
  rect: (height = 200) => ({
    height,
    borderRadius: 3,
    bgcolor: 'rgba(0,0,0,0.06)',
    '&::after': {
      content: '""',
      display: 'block',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      animation: 'shimmer 1.5s infinite',
    },
    '@keyframes shimmer': {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
  }),
};

// ── Empty state styles ──
export const emptyStateStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: 8,
    px: 4,
    textAlign: 'center',
  },
  icon: {
    fontSize: 64,
    color: 'text.disabled',
    mb: 2,
    opacity: 0.5,
  },
  title: {
    fontWeight: 600,
    color: 'text.secondary',
    mb: 1,
  },
  description: {
    color: 'text.disabled',
    maxWidth: 400,
    lineHeight: 1.7,
    mb: 3,
  },
};

// ── Focus-visible styles (WCAG 2.2 AA) ──
export const focusStyles = css`
  &:focus-visible {
    outline: 2px solid #1F4E79;
    outline-offset: 3px;
    border-radius: 4px;
  }
`;

// ── Chart color palette (uses theme colors) ──
export const chartColors = [
  '#1F4E79', '#2E7D32', '#F57C00', '#7B1FA2', '#D32F2F',
  '#00838F', '#E65100', '#4527A0', '#2E7D32', '#1565C0',
];

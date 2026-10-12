/**
 * Mockeefy Design System Tokens
 * Standardized Brand Identity, Typography Scale, and Spacing Tokens
 */

export const brandTokens = {
  // Brand colors
  primary: '#0755E8',
  primaryHover: '#0645C7',
  primaryActive: '#073AA3',
  primaryLight: '#EAF2FF',
  primarySubtle: '#F0F6FF',
  primaryBorder: '#93B8FF',
  focusRing: '#93B8FF',

  // Neutral colors
  neutral: {
    bg: '#F5F8FF',
    card: '#FFFFFF',
    navbar: '#FFFFFF',
    navbarBorder: '#E2E8F0',
    heading: '#172B4D',
    body: '#334155',
    secondary: '#64748B',
    muted: '#94A3B8',
    border: '#E2E8F0',
    subtle: '#F0F6FF',
  },

  // Semantic colors
  semantic: {
    success: '#15803D',
    successBg: '#F0FDF4',
    warning: '#B45309',
    warningBg: '#FFFBEB',
    error: '#B91C1C',
    errorBg: '#FEF2F2',
    info: '#1D4ED8',
    infoBg: '#EFF6FF',
  },

  // Typography scale (Source Sans 3)
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", Arial, sans-serif',
    pageTitle: {
      fontSize: '1.875rem', // 30px
      lineHeight: '1.25',
      fontWeight: '700',
    },
    sectionHeading: {
      fontSize: '1.375rem', // 22px
      lineHeight: '1.3',
      fontWeight: '600',
    },
    cardTitle: {
      fontSize: '1.0625rem', // 17px
      lineHeight: '1.35',
      fontWeight: '600',
    },
    bodyText: {
      fontSize: '0.9375rem', // 15px
      lineHeight: '1.5',
      fontWeight: '400',
    },
    navLabel: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.4',
      fontWeight: '600',
    },
    formLabel: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.4',
      fontWeight: '600',
    },
    supportingText: {
      fontSize: '0.84375rem', // 13.5px
      lineHeight: '1.45',
      fontWeight: '400',
    },
    metadata: {
      fontSize: '0.78125rem', // 12.5px
      lineHeight: '1.4',
      fontWeight: '400',
    },
    button: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.25',
      fontWeight: '600',
    },
  },

  // Sizing & Radii
  radii: {
    sm: '0.375rem', // 6px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    '2xl': '1.25rem', // 20px
    full: '9999px',
  },

  // Spacing standard (multiples of 4px)
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },
} as const;

export type BrandTokens = typeof brandTokens;

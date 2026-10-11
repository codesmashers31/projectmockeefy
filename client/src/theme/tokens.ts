/**
 * Mockeefy Design System Tokens
 * Standardized Brand Identity, Typography Scale, and Spacing Tokens
 */

export const brandTokens = {
  // Brand colors
  primary: '#5B4BDB',
  primaryHover: '#4938C8',
  primaryActive: '#3F2FB3',
  primaryLight: '#F0EDFF',
  primaryBorder: '#D8D1FF',

  // Neutral colors
  neutral: {
    bg: '#F5F6FA',
    card: '#FFFFFF',
    text: '#111827',
    secondary: '#4B5563',
    muted: '#6B7280',
    border: '#E5E7EB',
    subtle: '#F3F4F6',
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

  // Typography scale
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
    formLabel: {
      fontSize: '0.84375rem', // 13.5px
      lineHeight: '1.4',
      fontWeight: '500',
    },
    supportingText: {
      fontSize: '0.84375rem', // 13.5px
      lineHeight: '1.4',
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

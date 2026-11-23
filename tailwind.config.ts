import type { Config } from 'tailwindcss';

/** Fresh Counter design tokens (UI spec §2). */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '480px', md: '768px', lg: '1025px', xl: '1280px' },
    extend: {
      colors: {
        'surface-cream': '#FBF6EF',
        'surface-card': '#FFFFFF',
        'surface-card-warm': '#FFFDF9',
        'border-sand': '#F3E8DC',
        'border-sand-strong': '#EAD7C5',
        'text-primary': '#2B211B',
        'text-secondary': '#6E5D53',
        primary: { DEFAULT: '#C2410C', hover: '#EA580C', active: '#9A3412', tint: '#FFF1EA', fixed: '#FFDBD0' },
        veg: { DEFAULT: '#15803D', bg: '#F0FDF4' },
        'non-veg': '#7C2D12',
        warning: { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
        error: { DEFAULT: '#BA1A1A', bg: '#FFDAD6', text: '#93000A' },
        'chart-bar': '#F0A684',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'headline-xl': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'headline-xl-m': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'headline-lg': ['26px', { lineHeight: '34px', fontWeight: '700' }],
        'headline-md': ['19px', { lineHeight: '28px', fontWeight: '600' }],
        'headline-sm': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-md': ['14px', { lineHeight: '20px' }],
        'body-sm': ['12px', { lineHeight: '16px' }],
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'ticket-code-lg': ['32px', { lineHeight: '36px', letterSpacing: '8px', fontWeight: '700' }],
        'ticket-code-sm': ['14px', { lineHeight: '18px', fontWeight: '600' }],
      },
      borderRadius: { btn: '8px', tile: '12px', card: '16px', dialog: '20px' },
      boxShadow: {
        l1: '0 2px 4px rgba(43,33,27,0.04)',
        l3: '0 16px 24px -4px rgba(43,33,27,0.12)',
        focus: '0 0 0 3px #F3E8DC',
      },
      maxWidth: { content: '1240px' },
    },
  },
  plugins: [],
} satisfies Config;

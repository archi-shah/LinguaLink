/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "'Poppins'", "sans-serif"],
        body:    ["'Inter'", "sans-serif"],
        mono:    ["'Inter'", "monospace"],
      },
      colors: {
        primary:  { DEFAULT: '#4F6EF7', light: '#EEF2FF', dark: '#3451D1' },
        accent:   { DEFAULT: '#7C3AED', light: '#F5F0FF' },
        cyan:     { DEFAULT: '#06B6D4', light: '#ECFEFF' },
      },
      animation: {
        float:     'float 6s ease-in-out infinite',
        floatSlow: 'float 9s ease-in-out infinite',
        pulse2:    'pulse2 2s ease-in-out infinite',
        shimmer:   'shimmer 1.6s linear infinite',
        slideUp:   'slideUp 0.4s ease-out',
        fadeIn:    'fadeIn 0.3s ease-out',
        scaleIn:   'scaleIn 0.25s ease-out',
      },
      keyframes: {
        float:   { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-18px)' } },
        pulse2:  { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        slideUp: { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.94)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
      boxShadow: {
        glass:    '0 8px 32px rgba(79,110,247,0.10), 0 2px 8px rgba(0,0,0,0.04)',
        'glass-lg': '0 20px 60px rgba(79,110,247,0.15), 0 4px 16px rgba(0,0,0,0.06)',
        primary:  '0 4px 16px rgba(79,110,247,0.35)',
        'primary-lg': '0 8px 28px rgba(79,110,247,0.45)',
      },
    },
  },
  plugins: [],
}

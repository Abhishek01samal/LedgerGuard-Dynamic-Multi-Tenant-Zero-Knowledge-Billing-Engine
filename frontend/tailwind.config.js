/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050505',
        panel: '#111111',
        line: '#2b2b2b',
        accent: '#ffffff',
        warn: '#b8b8b8',
        danger: '#f2f2f2',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          '0%': { transform: 'translate3d(-2%, -1%, 0) scale(1)' },
          '100%': { transform: 'translate3d(2%, 1%, 0) scale(1.08)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 450ms ease-out both',
        drift: 'drift 18s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};

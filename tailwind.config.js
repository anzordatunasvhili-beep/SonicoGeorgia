/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0F0F10', 800: '#1A1A1C', 700: '#2A2A2E', 500: '#5B5B63', 400: '#8A8A93', 300: '#B9B9C0' },
        paper: { DEFAULT: '#F5F4F1', 50: '#FBFAF8', 100: '#F5F4F1', 200: '#ECEAE5', 300: '#DEDBD4' },
        ember: { DEFAULT: '#FF7A1A', 50: '#FFF3EA', 100: '#FFE3CC', 400: '#FF9346', 500: '#FF7A1A', 600: '#E9650A', 700: '#B84E06' },
        moss: { DEFAULT: '#123B2C', 50: '#E8F0EC', 600: '#1A4D3A', 700: '#123B2C' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,15,16,.04), 0 8px 24px rgba(15,15,16,.06)',
        lift: '0 2px 4px rgba(15,15,16,.05), 0 20px 40px -12px rgba(15,15,16,.18)',
        glow: '0 0 0 1px rgba(255,122,26,.25), 0 10px 30px -8px rgba(255,122,26,.55)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        eq: { '0%,100%': { transform: 'scaleY(.35)' }, '50%': { transform: 'scaleY(1)' } },
        'fade-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        spinslow: { to: { transform: 'rotate(360deg)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        eq: 'eq 1s ease-in-out infinite',
        'fade-up': 'fade-up .5s ease-out both',
        spinslow: 'spinslow 6s linear infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};

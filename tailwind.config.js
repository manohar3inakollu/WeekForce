/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0F0F11',
          raised: '#18181C',
          overlay: '#222228',
        },
        border: {
          DEFAULT: '#2A2A32',
          subtle: '#1E1E24',
        },
        accent: {
          DEFAULT: '#5B5EF4',
          hover: '#6B6EFF',
          muted: '#2A2B5E',
        },
        text: {
          primary: '#F0F0F5',
          secondary: '#8888A0',
          muted: '#55556A',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        xp: '#A855F7',
        rank: {
          starter: '#6B7280',
          specialist: '#3B82F6',
          leader: '#F59E0B',
          prestige: '#8B5CF6',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};

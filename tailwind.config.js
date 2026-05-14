/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0b0b14',
          raised: '#13131e',
          overlay: '#1A1A22',
        },
        border: {
          DEFAULT: '#252535',
          subtle: '#1A1A24',
        },
        accent: {
          DEFAULT: '#5B5EF4',
          hover: '#6B6EFF',
          muted: '#2A2B5E',
        },
        text: {
          primary: '#E8E8F2',
          secondary: '#8888AA',
          muted: '#44445A',
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

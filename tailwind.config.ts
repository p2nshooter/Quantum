import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Tiga warna logo Quantum: biru (utama), emas (aksen), merah (bahaya/urgent).
      colors: {
        quantum: {
          50: '#eef3ff',
          100: '#dde6ff',
          200: '#c1d1ff',
          300: '#97b1ff',
          400: '#6a87fb',
          500: '#4361f2',
          600: '#1b4fd8', // biru papan nama
          700: '#173fb4',
          800: '#173792',
          900: '#193274',
          950: '#101d47'
        },
        // Emas logo — dipakai untuk CTA sekunder, prioritas, dan penanda perhatian.
        gold: {
          50: '#fffaeb',
          100: '#fff1c6',
          200: '#ffe088',
          300: '#ffca4a',
          400: '#ffb420',
          500: '#f2b705', // emas papan nama
          600: '#d18f00',
          700: '#a66604',
          800: '#89500c',
          900: '#74420f'
        }
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Biru industrial — warna utama identitas Quantum.
        quantum: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdcff',
          300: '#8ec6ff',
          400: '#59a6ff',
          500: '#3383fb',
          600: '#1d63f0',
          700: '#164edc',
          800: '#1841b2',
          900: '#1a3b8c',
          950: '#142555'
        },
        // Oranye bengkel untuk aksen (peringatan, prioritas, CTA sekunder).
        steel: {
          50: '#fff8ed',
          100: '#ffefd4',
          200: '#ffdba8',
          300: '#ffc071',
          400: '#ff9c38',
          500: '#ff7f11',
          600: '#f06207',
          700: '#c74808',
          800: '#9e390f',
          900: '#7f3110'
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

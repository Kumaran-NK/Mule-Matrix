/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: '#000000',
        paper: '#F4F4F2',
        line: '#E3E3E0',
        mute: '#666666',
        flame: {
          50: '#FFF4EC',
          100: '#FFE3D0',
          200: '#FFC49B',
          400: '#FF8B3D',
          500: '#FF6A13',
          600: '#EB5600',
          700: '#B84300',
        },
      },
    },
  },
  plugins: [],
};
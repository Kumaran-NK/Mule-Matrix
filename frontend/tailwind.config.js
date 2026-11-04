// Ledger theme. The old dark "slate" scale and neon hues are remapped, so every

// existing page re-skins with no edits. mono = serif with aligned digits (amounts).

const ramp = (a) => Object.fromEntries([50,100,200,300,400,500,600,700,800,900,950].map((k,i)=>[k,a[i]]));

/** @type {import('tailwindcss').Config} */

export default {

  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],

  darkMode: 'class',

  theme: { extend: {

    fontFamily: {

      sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],

      mono: ['Newsreader', 'Georgia', 'serif'],

      serif: ['Newsreader', 'Georgia', 'serif'],

    },

    borderRadius: { lg: '5px', xl: '7px', '2xl': '9px', '3xl': '10px' },

    boxShadow: { sm: 'none', DEFAULT: 'none', md: 'none', lg: 'none', xl: 'none', '2xl': '0 8px 24px rgba(27,36,51,.18)' },

    colors: {

      slate:   ramp(['#0E1420','#1B2433','#232D35','#3A4740','#5C6B63','#7A8A80','#98A595','#B9C5B4','#D4DDD0','#F6F8F3','#EEF2EC']),

      blue:    ramp(['#0A172C','#10223F','#182D4F','#213C66','#2A4B7C','#2E3A50','#1B2433','#9FB2C6','#BFCCDA','#DCE4EC','#E8EDF2']),

      indigo:  ramp(['#26215C','#2F2A70','#383383','#433D99','#4F49AA','#5B55BB','#4F49AA','#BDBAE3','#D3D1EE','#E6E5F6','#F1F0FA']),

      purple:  ramp(['#26215C','#2F2A70','#383383','#433D99','#4F49AA','#5B55BB','#4F49AA','#BDBAE3','#D3D1EE','#E6E5F6','#F1F0FA']),

      rose:    ramp(['#6E1A0F','#85200F','#9A2713','#A82B18','#C23520','#D9402B','#D9402B','#E69A8C','#EFB9AE','#F6D6CF','#FBEAE6']),

      emerald: ramp(['#10331F','#14432A','#1A5436','#21663F','#2F7A52','#3A8D61','#2F7A52','#A6CDB5','#C4DECD','#DCEBE1','#EBF3EE']),

      amber:   ramp(['#5C3A06','#6E4508','#83520A','#97600C','#A86A0E','#C27A10','#B8720E','#EACB8A','#F2DDAE','#FAEBCB','#FDF6E6']),

    },

  } },

  plugins: [],

};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#D31728',
          'red-dark': '#B30F1E',
          'red-light': '#FFF0F1',
          yellow: '#F5A623',
          'yellow-light': '#FEF7E7',
          orange: '#F47B20',
          cream: '#FFF9F2',
          'cream-2': '#FFF2DE',
          'cream-card': '#FFFDF9',
        },
        whatsapp: {
          DEFAULT: '#16B959',
          hover: '#13A24D',
          light: '#E8F8EE',
        },
        text: {
          main: '#151820',
          muted: '#667085',
          light: '#98A2B3',
        },
        line: '#EAEAEA',
        // Rediseño 2026-10: neutros cálidos minimalistas
        ink: {
          DEFAULT: '#141414',
          soft: '#55555A',
          muted: '#6B6B6B',
        },
        surface: {
          DEFAULT: '#FAFAF8',
          2: '#F0EEEA',
          3: '#F2EFEA',
        },
        'line-soft': '#ECEAE6',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'system-ui', 'sans-serif'],
        handwriting: ['Caveat', 'Dancing Script', 'cursive'],
      },
      boxShadow: {
        card: '0 2px 12px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 14px 30px -18px rgba(0, 0, 0, 0.25)',
        header: '0 2px 10px 0 rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      keyframes: {
        'rq-bump': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'rq-bump': 'rq-bump .4s ease-out',
      },
    },
  },
  plugins: [],
};

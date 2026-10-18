/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#202020',
          secondary: '#282828',
          card: '#303030',
          border: '#3A3A3A',
          muted: '#404040',
          hover: '#353535',
        },
        primary: {
          DEFAULT: '#19B5D5',
          hover: '#169fb9',
          light: '#e0f7fa',
          dark: '#0d7389',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B8B8B8',
          muted: '#808080',
        },
        risk: {
          high: '#EF4444',
          medium: '#F59E0B',
          low: '#10B981',
          highBg: 'rgba(239, 68, 68, 0.15)',
          medBg: 'rgba(245, 158, 11, 0.15)',
          lowBg: 'rgba(16, 185, 129, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

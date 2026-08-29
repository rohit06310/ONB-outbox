/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#05B851',
          600: '#00A859',
          700: '#15803D',
        },
        badge: {
          orange: '#FFF3E0',
          orangeText: '#D97706',
          gray: '#F3F4F6',
          grayText: '#4B5563',
        }
      }
    },
  },
  plugins: [],
}

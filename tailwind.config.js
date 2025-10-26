/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './public/index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Light Theme
        'light-primary': '#1B8C56',
        'light-secondary': '#F68C1F',
        'light-bg': '#FAFAF5',
        'light-card': '#FFFFFF',
        'light-border': '#E9ECEF',
        'light-text': '#333333',
        'light-text-secondary': '#666666',
        'light-hover': '#e6f4ea',
        // Dark Theme
        'dark-primary': '#00FF7F',
        'dark-secondary': '#FF7B00',
        'dark-bg': '#121212',
        'dark-card': '#1E1E1E',
        'dark-border': '#2A2A2A',
        'dark-text': '#FFFFFF',
        'dark-text-secondary': '#BBBBBB',
        'dark-hover': '#1A1A1A',
      },
      boxShadow: {
        soft: '0 6px 18px rgba(0,0,0,0.08)',
        glow: '0 0 12px rgba(0, 255, 127, 0.35)'
      },
      borderRadius: {
        xl2: '16px',
        xl3: '20px'
      },
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        poppins: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [],
};
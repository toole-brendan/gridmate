/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'gridmate-primary': '#1a365d',
        'gridmate-secondary': '#2c5282',
        'gridmate-accent': '#3182ce',
        'gridmate-success': '#38a169',
        'gridmate-warning': '#d69e2e',
        'gridmate-error': '#e53e3e',
        'gridmate-dark': '#1a202c',
        'gridmate-light': '#f7fafc'
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
}
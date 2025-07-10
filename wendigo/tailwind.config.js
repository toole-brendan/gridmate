/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'wendigo-primary': '#1a365d',
        'wendigo-secondary': '#2c5282',
        'wendigo-accent': '#3182ce',
        'wendigo-success': '#38a169',
        'wendigo-warning': '#d69e2e',
        'wendigo-error': '#e53e3e',
        'wendigo-dark': '#1a202c',
        'wendigo-light': '#f7fafc'
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
}
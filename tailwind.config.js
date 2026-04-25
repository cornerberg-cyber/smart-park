/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.js"
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0c',
        surface: '#151518',
        border: '#2a2a30',
        primary: '#3b82f6',
        success: '#10b981',
        danger: '#ef4444',
        textMain: '#ffffff',
        textMuted: '#9ca3af',
      }
    },
  },
  plugins: [],
}

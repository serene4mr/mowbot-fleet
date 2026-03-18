/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          // Matching your Mowbot professional dark theme
          primary: "#00ff88", 
          background: "#0e1117",
          secondary: "#262730",
          surface: "#1a1c23",
        }
      },
    },
    plugins: [],
  }
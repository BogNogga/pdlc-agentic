/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#17212B',
          soft: '#4A5664',
          faint: '#7A8593',
        },
        paper: '#F4F6F8',
        line: '#DCE1E7',
        // The route colour marks progress and the primary action.
        route: {
          DEFAULT: '#1F5E8C',
          dark: '#174A6E',
          soft: '#E4EEF6',
        },
        // Decision colours, used only for go / hold / drop.
        go: { DEFAULT: '#1E7A46', soft: '#E3F2E9' },
        hold: { DEFAULT: '#A86A12', soft: '#FBF1DD' },
        drop: { DEFAULT: '#B42318', soft: '#FBE6E4' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F4F0E8',       // primary background
        espresso: '#302A25',    // headings, nav, primary buttons
        olive: '#777F65',       // accents, active controls
        'olive-deep': '#5C6450',// olive for small text / hover (AA on ivory)
        sand: '#DDD3C4',        // product sections, hero background
        tan: '#B58D6C',         // secondary decorative accent
        muted: '#6B6158',       // secondary text (AA on ivory)
        hairline: 'rgba(48,42,37,0.12)',
      },
      fontFamily: {
        display: ["'DM Serif Display'", "'Cormorant Garamond'", 'Georgia', 'serif'],
        sans: ["'DM Sans'", 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(48,42,37,0.04), 0 8px 24px -12px rgba(48,42,37,0.14)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ivory: 'rgb(var(--c-ivory) / <alpha-value>)',       // primary background
        espresso: 'rgb(var(--c-espresso) / <alpha-value>)',    // headings, nav, primary buttons
        olive: 'rgb(var(--c-olive) / <alpha-value>)',       // accents, active controls
        'olive-deep': 'rgb(var(--c-olive-deep) / <alpha-value>)',// olive for small text / hover (AA on ivory)
        sand: 'rgb(var(--c-sand) / <alpha-value>)',        // product sections, hero background
        tan: 'rgb(var(--c-tan) / <alpha-value>)',         // secondary decorative accent
        muted: 'rgb(var(--c-muted) / <alpha-value>)',       // secondary text (AA on ivory)
        hairline: 'rgb(var(--c-espresso) / 0.12)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)', // cards, inputs (white in light mode)
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

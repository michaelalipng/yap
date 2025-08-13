/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'monsie-graffiti': ['var(--font-monsie-graffiti)', 'cursive'],
        'old-english-gothic': ['var(--font-old-english-gothic)', 'serif'],
        'gotham-medium': ['var(--font-gotham-medium)', 'sans-serif'],
        'gotham-medium-italic': ['var(--font-gotham-medium-italic)', 'sans-serif'],
        'gotham-ultra': ['var(--font-gotham-ultra)', 'sans-serif'],
        'gotham-ultra-italic': ['var(--font-gotham-ultra-italic)', 'sans-serif'],
        'goldplay-black': ['var(--font-goldplay-black)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

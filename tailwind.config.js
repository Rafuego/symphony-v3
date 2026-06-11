/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'symphony-gold': '#8B7355',
        'symphony-cream': '#F5F0EB',
      },
      fontFamily: {
        serif: ['Louize Display', 'Georgia', 'serif'],
        sans: ['FFF Acid Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

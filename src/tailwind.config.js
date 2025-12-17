/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  variants: {
  extend: {
    backgroundColor: ['checked'],
    borderColor: ['checked'],
    ringWidth: ['checked'],
  },
},
  theme: {
    extend: {},
  },
  plugins: [],
}

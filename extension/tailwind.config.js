/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./popup/**/*.{ts,tsx}",
    "./contents/**/*.{ts,tsx}",
    "./options/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}


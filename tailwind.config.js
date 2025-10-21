/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          background: "#F5F1E8",
          primary: "#D4846E",
          primaryHover: "#C16F59",
          secondary: "#5A7D6A",
          secondaryHover: "#4C6A5A",
          neutral: "#6B6B6B",
          neutralSoft: "#877F76",
          surface: "#FFFFFF",
          surfaceAlt: "#F0E7DC",
        },
        emerald: {
          50: "#F9EDE3",
          100: "#F2D3C3",
          200: "#EAB9A3",
          300: "#E09F84",
          400: "#D88A71",
          500: "#D4846E",
          600: "#C16F59",
          700: "#A75B49",
          800: "#8D4A3C",
          900: "#5F3126",
          950: "#3E1D16",
        },
        teal: {
          50: "#EEF3F0",
          100: "#DDE7E1",
          200: "#CAD7CE",
          300: "#AABDB3",
          400: "#7F9A8D",
          500: "#5A7D6A",
          600: "#4C6A5A",
          700: "#3E564A",
          800: "#2F4239",
          900: "#1F2D27",
          950: "#131D19",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        button: "12px",
      },
      backgroundImage: {
        "hero-banner": "url('/banner.jpg')",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          background: "#F5F1E8",
          primary: "#B64C30",
          primaryHover: "#9B4129",
          secondary: "#5A7D6A",
          secondaryHover: "#4C6A5A",
          neutral: "#6B6B6B",
          neutralSoft: "#877F76",
          surface: "#FFFFFF",
          surfaceAlt: "#F0E7DC",
        },
        emerald: {
          50: "#FBF6F5",
          100: "#F8EDEA",
          200: "#F0DBD6",
          300: "#E5C0B7",
          400: "#DAA698",
          500: "#B64C30",
          600: "#9B4129",
          700: "#7F3522",
          800: "#642A1A",
          900: "#401B11",
          950: "#240F0A",
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

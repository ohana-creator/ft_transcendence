import { Black_And_White_Picture } from "next/font/google";
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // VAKS Brand Colors
        vaks: {
          // Base colors
          white: "#FFFFFF",
          platinum: "#F5F7FA",
          black: "#0A0E1A",
          cobalt: "#7C3AED",
          facebook: "#3B5998",
          google: "#FFFFFF",
          'blue-french': "#361965",
          'blue-charcoal': "#525252",
          
          // Light theme colors
          'light-primary': "#F5F3FF",
          'light-secondary': "#F5F7FA",
          'light-main-txt': "#361965",
          'light-alt-txt': "#A891CE",
          'light-purple-card': "#FFFFFF",
          'light-purple-card-hover': "#EDE9FE",
          'light-purple-button': "#7C3AED",
          'light-black': "#0A0E1A",
          'light-success': "#3B9B8F",
          'light-warning': "#E89C5C",
          'light-error': "#D65E5E",
          'light-info': "#7144B7",
          'light-input': "#EDE9FE",
          'light-stroke': "#C4B5F4",
          'light-google-stroke': "#DADCE0",
          'light-facebook': "#3B5998",
          
          // Dark theme colors
          'dark-primary': "#1A1033",
          'dark-secondary': "#7144B7",
          'dark-main-txt': "#F0EEFF",
          'dark-alt-txt': "#E6CFFE",
          'dark-purple-card': "#241550",
          'dark-purple-card-hover': "#2E1D66",
          'dark-purple-button': "#9810FA",
          'dark-black': "#0A0E1A",
          'dark-success': "#4DAFA1",
          'dark-warning': "#F5AA6D",
          'dark-error': "#E27070",
          'dark-info': "#7144B7",
          'dark-input': "#3B2468",
          'dark-stroke': "#5B3D8A",
          'dark-google-stroke': "#DADCE0",
          'dark-facebook': "#3B5998"
        },
      },
      fontFamily: {
        sans: ['Source Sans 3', 'system-ui', 'sans-serif'],
        charlie: ['Source Sans 3', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;

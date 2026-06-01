import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#0a0f1f",
        panel: "#101828",
        orbital: "#2dd4bf",
        solar: "#fbbf24",
        nebula: "#c084fc"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(45, 212, 191, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;

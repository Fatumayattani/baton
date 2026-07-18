import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1B2D",
        panel: "#152238",
        steel: "#8A99B0",
        steelDark: "#3A4B65",
        cream: "#F1EDE3",
        brass: "#E9B152",
        brassLight: "#F0C46E",
        brassDark: "#C4862B",
      },
    },
  },
  plugins: [],
};
export default config;

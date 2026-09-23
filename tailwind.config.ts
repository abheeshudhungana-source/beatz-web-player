import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: "#1DB954",
          "green-hover": "#1ed760",
          dark: "#121212",
          surface: "#181818",
          elevated: "#242424",
          highlight: "#2a2a2a",
          subtext: "#a7a7a7",
          border: "#282828",
        },
      },
    },
  },
  plugins: [],
};
export default config;

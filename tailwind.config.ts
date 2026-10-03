import type { Config } from "tailwindcss";

// Tailwind supplies only the base reset. All styling lives in app/globals.css, built on the tokens there.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;

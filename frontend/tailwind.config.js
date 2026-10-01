/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#efece4",
        paper2: "#e5e0d4",
        surface: "#f7f4ee",
        ink: "#1c1915",
        muted: "#5c564c",
        line: "#d5cfc2",
        pine: "#1f4d38",
        pine2: "#2f6a4e",
        copper: "#8a4b32",
        slate: "#2c455c",
        bark: "#6b5644",
        warn: "#8a5a12",
        bad: "#7c2e2e",
        sidebar: "#14211c",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "sans-serif"],
        serif: ["IBM Plex Serif", "serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(28,25,21,0.04)",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'null-bg': '#0B0F12',
        'null-surface': '#11171B',
        'null-surface-raised': '#161D22',
        'null-border': '#23303A',
        'null-text': '#E6EEF1',
        'null-muted': '#7E8C93',
        'null-signal': '#3DF2C4',
        'null-signal-dim': '#1E5C4D',
        'null-warn': '#F2B53D',
        'null-deny': '#F2543D',
        'null-deny-dim': '#3D2420',
        'null-info': '#3D9DF2',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
}

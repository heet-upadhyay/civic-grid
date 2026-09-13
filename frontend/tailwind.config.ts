import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        indigo: {
          600: '#4f46e5',
        },
        slate: {
          900: '#0f172a',
        }
      }
    },
  },
  plugins: [],
} satisfies Config

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        coral: 'var(--coral)',
        paper: 'var(--paper)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
      },
      boxShadow: {
        panel: '0 24px 70px rgba(41, 37, 28, .09)',
        soft: '0 10px 30px rgba(37, 34, 27, .08)',
        book: '0 18px 28px rgba(28, 24, 17, .18)',
      },
    },
  },
  plugins: [],
}
export default config

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef1ff',
          100: '#dbe2ff',
          500: '#3f51b5',
          700: '#2e419e',
          900: '#1f2f7a',
        },
        accent: '#ff9800',
        success: '#4caf50',
        ink: '#20304f',
      },
      fontFamily: {
        display: ['"Baloo 2"', '"Nunito"', '"Noto Sans SC"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 20px 44px rgba(63, 81, 181, 0.12)',
        float: '0 28px 64px rgba(63, 81, 181, 0.16)',
      },
      keyframes: {
        'task-pop': {
          '0%': { transform: 'scale(1) translateY(0)', opacity: '1' },
          '35%': { transform: 'scale(1.03) translateY(-6px)', opacity: '1' },
          '100%': { transform: 'scale(0.94) translateY(8px)', opacity: '0' },
        },
        'success-bloom': {
          '0%': {
            transform: 'scale(0.92)',
            opacity: '0',
            boxShadow: '0 0 0 rgba(16, 185, 129, 0)',
          },
          '45%': {
            transform: 'scale(1.03)',
            opacity: '1',
            boxShadow: '0 16px 45px rgba(16, 185, 129, 0.22)',
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1',
            boxShadow: '0 12px 30px rgba(16, 185, 129, 0.14)',
          },
        },
        'badge-pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 rgba(28, 163, 111, 0)',
          },
          '50%': {
            transform: 'scale(1.04)',
            boxShadow: '0 0 0 10px rgba(28, 163, 111, 0.08)',
          },
        },
        'float-spark': {
          '0%': { transform: 'translateY(6px) scale(0.7)', opacity: '0' },
          '25%': { opacity: '1' },
          '100%': { transform: 'translateY(-10px) scale(1)', opacity: '0' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'task-pop': 'task-pop 420ms ease-out forwards',
        'success-bloom': 'success-bloom 420ms ease-out forwards',
        'badge-pulse': 'badge-pulse 1.2s ease-in-out infinite',
        'float-spark': 'float-spark 1s ease-out infinite',
        bob: 'bob 3s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;

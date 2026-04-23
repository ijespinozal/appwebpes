/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Gaming Dark
        'g-bg':     '#0f0f1a',   // fondo principal
        'g-card':   '#1a1a2e',   // tarjetas
        'g-border': '#16213e',   // bordes
        'g-accent': '#e94560',   // rojo vibrante (CTA, highlights)
        'g-blue':   '#0f3460',   // azul oscuro de apoyo
        'g-cyan':   '#00d4ff',   // cyan neón (focus, links)
        'g-gold':   '#ffd700',   // 1er lugar
        'g-silver': '#a8a9ad',   // 2do lugar
        'g-muted':  '#4a5568',   // texto secundario
      },
      fontFamily: {
        display: ['Rajdhani', 'Barlow Condensed', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-red':  '0 0 24px rgba(233, 69, 96, 0.45)',
        'neon-cyan': '0 0 24px rgba(0, 212, 255, 0.45)',
        'neon-gold': '0 0 24px rgba(255, 215, 0, 0.45)',
      },
      backgroundImage: {
        'gradient-gaming': 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f3460 100%)',
        'gradient-versus': 'linear-gradient(90deg, rgba(233,69,96,0.15) 0%, rgba(15,15,26,1) 50%, rgba(0,212,255,0.15) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow':       'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%':   { boxShadow: '0 0 10px rgba(233,69,96,0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(233,69,96,0.8)' },
        },
      },
    },
  },
  plugins: [],
};

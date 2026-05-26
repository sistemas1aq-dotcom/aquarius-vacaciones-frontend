/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', '-apple-system', 'sans-serif'],
      },
      // Paleta corporativa AQUARIUS:
      //   Azul oscuro (brand dark):  #16589e
      //   Azul claro  (brand light): #3b93d0
      // Sobrescribimos la escala 'blue' de Tailwind para que cualquier
      // bg-blue-*, text-blue-*, focus:ring-blue-*, from-blue-*, to-blue-*
      // del proyecto adopte automáticamente los tonos corporativos.
      colors: {
        blue: {
          50:  '#eaf3fb',
          100: '#d1e5f3',
          200: '#a8cce8',
          300: '#7eb4dc',
          400: '#5ba3d4',
          500: '#3b93d0', // BRAND LIGHT
          600: '#2876b7',
          700: '#16589e', // BRAND DARK
          800: '#114777',
          900: '#0a3360',
        },
        aq: {
          dark:  '#16589e',
          light: '#3b93d0',
        },
      },
      backgroundImage: {
        'aq-gradient':    'linear-gradient(135deg, #16589e 0%, #3b93d0 100%)',
        'aq-gradient-b':  'linear-gradient(to bottom, #16589e 0%, #3b93d0 100%)',
        'aq-gradient-r':  'linear-gradient(to right,  #16589e 0%, #3b93d0 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

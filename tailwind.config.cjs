import('tailwindcss').Config

const colors = require('tailwindcss/colors')

module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{html,js,svelte,ts}",
    ],
    theme: {
        extend: {
            height: {
                '5p': '5%',
                '10p': '10%',
                '20p': '20%',
                '60p': '60%',
                '80p': '80%',
                '85p': '85%',
                '90p': '90%',
                '100p': '100%'
              }
        },
        colors: {
            transparent: "transparent",
            current: 'currentColor',
            accent: "#EB5E28",
            light: "#CCC5B9",
            medium: "#403D39",
            dark: "#252422",
            danger: "#ff0000",
            blue: colors.blue,
            purple: colors.purple,
            black: colors.black,
            white: colors.white,
            gray: colors.gray,
            emerald: colors.emerald,
            indigo: colors.indigo,
            yellow: colors.yellow,
            red: colors.red,
        },
        gridTemplateColumns:
        {
            '20/80': '20% 80%',
            '20/40/20': '20% 60% 20%',
            'fixed': '40px 260px',
        }
    },
    plugins: [],
}

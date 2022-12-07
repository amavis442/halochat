import('tailwindcss').Config

const colors = require('tailwindcss/colors')

module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{html,js,svelte,ts}",
    ],
    theme: {
        extend: {},
        colors: {
            transparent: "transparent",
            current: 'currentColor',
            white: "#FFFCF2",
            accent: "#EB5E28",
            light: "#CCC5B9",
            medium: "#403D39",
            dark: "#252422",
            danger: "#ff0000",
            blue: "#080048",
            purple: colors.purple,
            black: colors.black,
            white: colors.white,
            gray: colors.gray,
            emerald: colors.emerald,
            indigo: colors.indigo,
            yellow: colors.yellow,
        },
    },
    plugins: [],
}

import('tailwindcss').Config
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{html,js,svelte,ts}",
    ],
    theme: {
        extend: {},
        colors: {
            transparent: "transparent",
            black: "#0f0f0e",
            white: "#FFFCF2",
            accent: "#EB5E28",
            light: "#CCC5B9",
            medium: "#403D39",
            dark: "#252422",
            danger: "#ff0000",
            blue: "#080048",
            gray: '#6F6B6A'
        },
    },
    plugins: [],
}

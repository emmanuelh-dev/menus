/** @type {import('tailwindcss').Config} */

// PALETA — gemela de la que vive en admin-menus/app/globals.css. Si cambias un
// valor aquí, cámbialo allá: el panel y el sitio público tienen que verse como
// el mismo producto, y hoy no lo parecían (el sitio iba en verde esmeralda, el
// panel en índigo con degradados).
//
// El gris es la escala `neutral` que ya trae Tailwind y por eso no se
// redefine. Lo que sí se define es la marca: el 600 es el #1052BA que eligió
// el dueño, y el resto es esa misma tinta (H 217°, S 84%) con más o menos luz.
//
// Contraste medido:
//   marca-600 sobre blanco ..... 7.15:1  (AAA hasta en texto chico)
//   blanco sobre marca-600 ..... 7.15:1  (botón primario)
//   marca-600 sobre #0a0a0a .... 2.77:1  ← no usar sobre fondo oscuro
//   marca-400 sobre #0a0a0a .... 5.87:1  (texto e iconos en oscuro)
const marca = {
	50: '#f0f6fe',
	100: '#e0ebfd',
	200: '#bfd6fa',
	300: '#90b8f6',
	400: '#4b8bee',
	500: '#1464e4',
	600: '#1052ba',
	700: '#0c439a',
	800: '#08367f',
	900: '#052c68',
	950: '#031c45',
};

// Estado. Los únicos colores además de la marca, y sólo cuando algo salió mal
// o algo se confirmó. Los tonos son los que pasan 4.5:1 como texto sobre
// blanco, no los que se ven más vivos.
const peligro = '#dc2626';
const exito = '#047857';

export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				marca,
				peligro: { DEFAULT: peligro, suave: '#fef2f2' },
				exito: { DEFAULT: exito, suave: '#ecfdf5' },
			},
			fontFamily: {
				'more-sugar': ['More Sugar', 'serif'],
				'inter': ['Inter', 'sans-serif'],
			},
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
	],
}

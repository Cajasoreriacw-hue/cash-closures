/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
	],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['Poppins', 'system-ui', 'sans-serif']
			},
			colors: {
				// Paleta Fresh Sky (Azul Vibrante / Neumorphic inspired)
				'fresh-sky': {
					50: '#e9f7fc',
					100: '#d2eff9',
					200: '#a5def3',
					300: '#78ceed',
					400: '#4bbde7',
					500: '#1fade0',
					600: '#188ab4',
					700: '#126887',
					800: '#0c455a',
					900: '#06232d',
					950: '#04181f'
				},
				// Primary mapped to fresh-sky for consistency
				primary: {
					50: '#e9f7fc',
					100: '#d2eff9',
					200: '#a5def3',
					300: '#78ceed',
					400: '#4bbde7',
					500: '#1fade0',
					600: '#188ab4',
					700: '#126887',
					800: '#0c455a',
					900: '#06232d',
					950: '#04181f'
				}
			},
			boxShadow: {
				// Soft shadows tinted with the primary blue (RGB: 31, 173, 224)
				'soft': '0 4px 6px -1px rgba(31, 173, 224, 0.1), 0 2px 4px -1px rgba(31, 173, 224, 0.06)',
				'soft-lg': '0 10px 15px -3px rgba(31, 173, 224, 0.1), 0 4px 6px -2px rgba(31, 173, 224, 0.05)',
				'soft-xl': '0 20px 25px -5px rgba(31, 173, 224, 0.1), 0 10px 10px -5px rgba(31, 173, 224, 0.04)',
				'glow': '0 0 20px rgba(31, 173, 224, 0.5)',
				'glow-lg': '0 0 40px rgba(31, 173, 224, 0.6)',
				// Neumorphic Inner Shadows
				'inner-soft': 'inset 2px 2px 5px rgba(0, 0, 0, 0.05), inset -2px -2px 5px rgba(255, 255, 255, 1)'
			},
			borderRadius: {
				'xl': '1rem',
				'2xl': '1.5rem',
				'3xl': '2rem'
			},
			animation: {
				'fade-in': 'fadeIn 0.3s ease-in-out',
				'slide-up': 'slideUp 0.4s ease-out',
				'scale-in': 'scaleIn 0.3s ease-out'
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				slideUp: {
					'0%': { transform: 'translateY(10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				scaleIn: {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				}
			}
		}
	},
	plugins: [require('flowbite/plugin')]
};

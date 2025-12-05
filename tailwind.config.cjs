/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Poppins', 'system-ui', 'sans-serif']
			},
			colors: {
				'dark-orange': {
					50: '#fff3e5',
					100: '#ffe7cc',
					200: '#ffcf99',
					300: '#ffb866',
					400: '#ffa033',
					500: '#ff8800',
					600: '#cc6d00',
					700: '#995200',
					800: '#663600',
					900: '#331b00',
					950: '#241300'
				},
				primary: {
					50: '#fff3e5',
					100: '#ffe7cc',
					200: '#ffcf99',
					300: '#ffb866',
					400: '#ffa033',
					500: '#ff8800',
					600: '#cc6d00',
					700: '#995200',
					800: '#663600',
					900: '#331b00',
					950: '#241300'
				}
			},
			boxShadow: {
				'soft': '0 2px 8px rgba(255, 136, 0, 0.08)',
				'soft-lg': '0 4px 16px rgba(255, 136, 0, 0.12)',
				'soft-xl': '0 8px 24px rgba(255, 136, 0, 0.16)',
				'glow': '0 0 20px rgba(255, 136, 0, 0.3)',
				'glow-lg': '0 0 40px rgba(255, 136, 0, 0.4)'
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

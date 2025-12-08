import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig(({ mode }) => {
	const isProd = mode === 'production';
	const isDev = mode === 'development';

	return {
		plugins: [
			sveltekit(),
			// PWA Plugin con configuración corregida para Cloudflare
			SvelteKitPWA({
				srcDir: './src',
				strategies: 'injectManifest',
				filename: 'service-worker.ts',
				// IMPORTANTE: selfDestroying puede causar problemas
				selfDestroying: false,
				manifest: {
					name: 'Monit - Control de Caja',
					short_name: 'Monit',
					description: 'Sistema ERP para gestión y control de cierres de caja',
					theme_color: '#1fade0',
					background_color: '#1fade0',
					display: 'standalone',
					start_url: '/',
					scope: '/',
					icons: [
						{
							src: '/icon-192.svg',
							sizes: '192x192',
							type: 'image/svg+xml',
							purpose: 'any maskable'
						},
						{
							src: '/icon-512.svg',
							sizes: '512x512',
							type: 'image/svg+xml',
							purpose: 'any maskable'
						}
					]
				},
				injectManifest: {
					// Patrón correcto para la estructura de build de Cloudflare
					globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
					globIgnores: ['**/node_modules/**/*', '**/server/**/*'],
					injectionPoint: undefined
				},
				// CRÍTICO: Desactiva en dev para evitar problemas
				devOptions: {
					enabled: false, // Cambiado a false
					suppressWarnings: true,
					type: 'module'
				}
			})
		],

		// Optimizaciones
		optimizeDeps: {
			include: ['chart.js', '@supabase/supabase-js', 'fuse.js'],
			exclude: ['html2canvas-pro', 'jspdf', 'xlsx', 'papaparse']
		},

		build: {
			minify: isProd ? 'esbuild' : false,
			target: 'es2015',
			cssMinify: isProd ? 'esbuild' : false,
			sourcemap: false,

			rollupOptions: {
				output: {
					manualChunks: (id) => {
						// Svelte core
						if (id.includes('node_modules/@sveltejs')) {
							return 'svelte-core';
						}

						// Chart.js
						if (id.includes('node_modules/chart.js')) {
							return 'chart';
						}

						// Librerías pesadas de documentos
						if (id.includes('node_modules/html2canvas')) {
							return 'html2canvas';
						}

						if (id.includes('node_modules/xlsx')) {
							return 'xlsx';
						}

						if (id.includes('node_modules/papaparse')) {
							return 'papaparse';
						}

						if (id.includes('node_modules/jspdf')) {
							return 'jspdf';
						}

						// UI
						if (id.includes('node_modules/flowbite-svelte')) {
							return 'flowbite';
						}

						// Supabase
						if (id.includes('node_modules/@supabase')) {
							return 'supabase';
						}

						// Fuse.js
						if (id.includes('node_modules/fuse.js')) {
							return 'fuse';
						}

						// Vendors
						if (id.includes('node_modules')) {
							return 'vendor';
						}
					}
				}
			},

			chunkSizeWarningLimit: 1000
		},

		test: {
			expect: { requireAssertions: true },
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'client',
						browser: {
							enabled: true,
							provider: playwright(),
							instances: [{ browser: 'chromium', headless: true }]
						},
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**']
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		},

		// SSR config para Cloudflare Workers
		ssr: {
			noExternal: []
		}
	};
});
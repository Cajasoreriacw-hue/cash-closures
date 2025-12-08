import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			srcDir: './src',
			strategies: 'injectManifest',
			filename: 'service-worker.ts',
			selfDestroying: true,
			manifest: {
				name: 'Monit - Control de Caja',
				short_name: 'Monit',
				description: 'Sistema ERP para gestión y control de cierres de caja',
				theme_color: '#1fade0',
				background_color: '#1fade0',
				display: 'standalone',
				start_url: '/',
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
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
				injectionPoint: undefined
			},
			devOptions: {
				enabled: true,
				suppressWarnings: process.env.SUPPRESS_WARNING === 'true',
				type: 'module',
				navigateFallback: '/'
			}
		})
	],
	// Optimizaciones de desarrollo
	optimizeDeps: {
		include: ['chart.js', '@supabase/supabase-js', 'fuse.js'],
		exclude: ['html2canvas-pro', 'jspdf', 'xlsx', 'papaparse']
	},
	build: {
		// Usar esbuild para minificación (más rápido que terser)
		minify: 'esbuild',
		// Reducir tamaño de chunks
		target: 'es2015',
		// Optimizar CSS
		cssMinify: 'esbuild',
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					// Split Chart.js into its own chunk
					if (id.includes('node_modules/chart.js')) {
						return 'chart';
					}
					// Split html2canvas into its own chunk
					if (id.includes('node_modules/html2canvas')) {
						return 'html2canvas';
					}
					// Split xlsx into its own chunk
					if (id.includes('node_modules/xlsx')) {
						return 'xlsx';
					}
					// Split papaparse into its own chunk
					if (id.includes('node_modules/papaparse')) {
						return 'papaparse';
					}
					// Split flowbite-svelte into its own chunk
					if (id.includes('node_modules/flowbite-svelte')) {
						return 'flowbite';
					}
					// Split @supabase into its own chunk
					if (id.includes('node_modules/@supabase')) {
						return 'supabase';
					}
					// Split jsPDF into its own chunk
					if (id.includes('node_modules/jspdf')) {
						return 'jspdf';
					}
					// Group other vendor dependencies
					if (id.includes('node_modules')) {
						return 'vendor';
					}
				}
			}
		},
		chunkSizeWarningLimit: 1000 // Increased for large libraries (Chart.js, xlsx, etc.)
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
	}
});
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess({
		style: {
			css: {
				global: true
			}
		}
	}),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter()
	},
	onwarn: (warning, handler) => {
		// Ignorar warnings de state_referenced_locally en archivos generados
		if (warning.code === 'state_referenced_locally' &&
			warning.filename?.includes('.svelte-kit/generated/')) {
			return;
		}

		// Dejar pasar otros warnings al handler por defecto
		handler(warning);
	}
};

export default config;

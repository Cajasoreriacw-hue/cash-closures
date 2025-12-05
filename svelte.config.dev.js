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
        // Using adapter-auto for local development to avoid macOS version issues
        // Switch back to adapter-cloudflare before deploying to production
        adapter: adapter()
    },
    onwarn: (warning, handler) => {
        // Ignorar warnings de state_referenced_locally en archivos generados
        if (
            warning.code === 'state_referenced_locally' &&
            warning.filename?.includes('.svelte-kit/generated/')
        ) {
            return;
        }

        // Dejar pasar otros warnings al handler por defecto
        handler(warning);
    }
};

export default config;
